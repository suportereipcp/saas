import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const catalogToolDefinition: FunctionDeclaration = {
    name: "search_catalog",
    description: "Busca informações técnicas, códigos e aplicações de peças no catálogo da Suporte Rei. Use SEMPRE que o usuário perguntar sobre um produto, peça ou código específico.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            query: {
                type: SchemaType.STRING,
                description: "O código da peça para buscar (ex: 'R-025', 'S-305', 'R-1083')."
            }
        },
        required: ["query"]
    }
};

// Real implementation - Uses the site's actual search URL
export async function performCatalogSearch(query: string) {
    console.log(`[Tool] Searching catalog for: ${query}`);

    try {
        // Use the correct search URL that always shows results on first page
        const searchUrl = `https://suporterei.com.br/pagina/pesquisar-produto/?s=${encodeURIComponent(query)}`;
        console.log(`[Tool] Searching at: ${searchUrl}`);

        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
            return {
                found: false,
                message: `Erro ao acessar a busca (HTTP ${searchResponse.status}).`,
                suggestion: "Tente novamente."
            };
        }

        const searchHtml = await searchResponse.text();

        // Normalize query for comparison
        const normalizedQuery = query.toLowerCase().trim();

        // Match all product cards in search results, explicitly excluding navigation/language links
        // We look for links that likely contain product slugs (longer than 3 chars, ignoring common nav links)
        const cardPattern = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>[\s\S]*?<div\s+class=["']titulo["']>\s*([^<]+)\s*<\/div>/gi;
        const potentialMatches = [...searchHtml.matchAll(cardPattern)];

        let linkMatch = null;

        // Filter out obvious non-product links (like 'en', 'es', '#', etc)
        const validMatches = potentialMatches.filter(m => {
            const url = m[1].toLowerCase();
            return url.length > 3 && !['en', 'es', 'pt', 'home', 'contato'].includes(url) && !url.startsWith('?');
        });

        // 1. Try EXACT match on the product code (e.g. "R-878" vs "R-878A")
        const strictMatch = validMatches.find(m => m[2].trim().toUpperCase() === normalizedQuery.toUpperCase());
        if (strictMatch) {
            linkMatch = strictMatch;
        }
        // 2. Fallback: Try match where code contains query (e.g. searching "878" finds "R-878")
        else {
            const looseMatch = validMatches.find(m => m[2].trim().toUpperCase().includes(normalizedQuery.toUpperCase()));
            if (looseMatch) {
                linkMatch = looseMatch;
            }
        }

        // 3. Fallback: Original regex patterns for older search layouts or simple links
        // Exclude /en /es matches here too
        if (!linkMatch) {
            // Look for href that contains the query (common in slug) but isn't just the query
            const exactPattern = new RegExp(`<a\\s+href=["']([^"']*(?!en|es|pt)${normalizedQuery.replace(/[-]/g, '[-]?')}[^"']*)["']`, 'i');
            linkMatch = searchHtml.match(exactPattern);
        }

        // 4. Fallback: "VEJA MAIS" logic
        if (!linkMatch && searchHtml.includes('VEJA MAIS')) {
            const vejaPattern = /<a\s+href="([^"]+)"[^>]*>\s*VEJA MAIS/gi;
            const vejaMatch = searchHtml.match(vejaPattern);
            if (vejaMatch && vejaMatch.length === 1) {
                const singleLinkMatch = vejaMatch[0].match(/href="([^"]+)"/i);
                if (singleLinkMatch) linkMatch = singleLinkMatch;
            }
        }

        if (!linkMatch) {
            return {
                found: false,
                message: `Produto "${query}" não foi encontrado no catálogo.`
            };
        }

        // Build full product URL (href is relative or absolute)
        const href = linkMatch[1];
        const productUrl = href.startsWith('http') ? href : `https://suporterei.com.br/${href.replace(/^\//, '')}`;
        console.log(`[Tool] Found product URL: ${productUrl}`);

        // Fetch the product page to get details
        const productResponse = await fetch(productUrl);
        if (!productResponse.ok) {
            return {
                found: true,
                url: productUrl,
                message: `⚠️ Produto encontrado mas houve erro ao acessar: ${productUrl}`
            };
        }

        const productHtml = await productResponse.text();


        // === EXTRACT PRODUCT DETAILS ===

        // 1. Title from <title> tag
        const titleMatch = productHtml.match(/<title>(.*?)<\/title>/i);
        const fullTitle = titleMatch ? titleMatch[1].replace(' - Suporte Rei', '').trim() : '';

        // 2. Product code from title
        const codeMatch = fullTitle.match(/^([A-Z]-?\d+[A-Za-z]?)/i);
        const extractedCode = codeMatch ? codeMatch[1].toUpperCase() : query.toUpperCase();

        // 3. Product Name (part of title after code)
        const productName = fullTitle.replace(/^[A-Z]-?\d+[A-Za-z]?\s*-?\s*/i, '').trim();

        // 4. Weight - look for "PESO:" pattern
        const weightMatch = productHtml.match(/PESO[:\s]*([0-9,.]+)\s*\(?(KG|kg)?/i);
        const weight = weightMatch ? `${weightMatch[1]} kg` : null;

        // 5. Packaging - look for "EMBALAGEM COM X PEÇA"
        const packagingMatch = productHtml.match(/EMBALAGEM\s+COM\s+(\d+)\s+PE[ÇC]A/i);
        const packaging = packagingMatch ? `${packagingMatch[1]} peça(s)` : null;

        // === EXTRACT FROM div.texto-editavel (where all technical data lives) ===
        // Find the texto-editavel section which contains structured info
        const textoEditavelMatch = productHtml.match(/class="texto-editavel"[^>]*>([\s\S]*?)<\/div>/i);
        const textoEditavel = textoEditavelMatch ? textoEditavelMatch[1] : '';

        // Extract raw text content from texto-editavel, preserving line breaks
        // Remove HTML tags but keep the text content exactly as written
        const rawTextContent = textoEditavel
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // Parse individual fields from raw text - exact as written
        let originalPartNumber: string | null = null;
        let technicalDescription: string | null = null;
        let rosca: string | null = null;
        let material: string | null = null;
        let observation: string | null = null;
        let suggestionRei: string | null = null;

        for (const line of rawTextContent) {
            // Substitui Nº... (exact match)
            if (line.match(/^Substitui\s+N[º°]/i)) {
                originalPartNumber = line;
            }
            // Rosca... (exact match)
            else if (line.match(/^Rosca\s/i)) {
                rosca = line;
            }
            // (Tarja...) or (Fabricado em...)
            else if (line.match(/^\(Tarja/i) || line.match(/^\(Fabricado\s+em/i)) {
                material = line;
            }
            // OBS:...
            else if (line.match(/^OBS[:\s]/i)) {
                observation = line;
            }
            // Sugestão Rei:...
            else if (line.match(/^Sugest[ãa]o\s+Rei/i)) {
                suggestionRei = line;
            }
            // Technical description (Coxim, Suporte, etc.)
            else if (line.match(/^(Coxim|Suporte|Bucha|Anel|Mola|Parafuso|Pino)/i) && !technicalDescription) {
                technicalDescription = line;
            }
        }

        // 10. Specifications (furos, etc.)
        const specsMatch = productHtml.match(/\(\d+\s*furos?\)[^<]*/i);
        const specifications = specsMatch ? specsMatch[0].trim() : null;

        // 13. Vehicle models by brand - extract from div.grupo structure
        const vehiclesByBrand: { [key: string]: string[] } = {};

        // Pattern for div.grupo with grupo-titulo and span.modelo
        // Robust regex to capture full content of each group
        const grupoPattern = /<div\s+class="grupo">([\s\S]*?)class="modelos-wrapper"[\s\S]*?<\/div>\s*<\/div>/gi;
        // Alternative simple loop over "grupo-titulo" occurrences if regex fails
        const titulos = [...productHtml.matchAll(/class="[^"]*grupo-titulo[^"]*"[^>]*>([^<]+)/gi)];

        // Scan for groups using a simpler block approach if possible, or stick to robust regex parsing
        // Let's use string splitting for maximum reliability if regex is tricky with nested divs
        const groupSplit = productHtml.split('class="grupo"');

        for (let i = 1; i < groupSplit.length; i++) {
            const fragment = groupSplit[i];
            // Check if this fragment has a title and models before the next group start
            const titleMatch = fragment.match(/class="[^"]*grupo-titulo[^"]*"[^>]*>([^<]+)/i);
            // Verify this fragment belongs to a real group (heuristic)
            if (titleMatch) {
                const brand = titleMatch[1].replace(':', '').trim();

                // Extract models (span.modelo)
                const models: string[] = [];
                const modelMatches = [...fragment.matchAll(/class="[^"]*modelo[^"]*"[^>]*>([^<]+)/gi)];

                for (const m of modelMatches) {
                    if (m[1] && m[1].trim()) models.push(m[1].trim());
                }

                if (models.length > 0) {
                    if (!vehiclesByBrand[brand]) vehiclesByBrand[brand] = [];
                    // Avoid duplicates
                    for (const model of models) {
                        if (!vehiclesByBrand[brand].includes(model)) {
                            vehiclesByBrand[brand].push(model);
                        }
                    }
                }
            }
        }

        // Convert to array for display
        const vehicleModels: string[] = Object.entries(vehiclesByBrand)
            .map(([brand, models]) => `${brand}: ${models.join(', ')}`);

        // 14. Montadoras/Manufacturers
        const montadorasSection = productHtml.match(/Montadoras[^<]*<[^>]*>([^<]+)/gi);
        let montadoras: string[] = [];
        if (montadorasSection) {
            for (const section of montadorasSection) {
                const brandMatch = section.match(/(MERCEDES-BENZ|VOLKSWAGEN|VOLVO|SCANIA|MAN|IVECO|DAF|FORD|GM|CHEVROLET)/gi);
                if (brandMatch) montadoras.push(...brandMatch);
            }
            montadoras = [...new Set(montadoras.map(m => m.toUpperCase()))];
        }

        // 15. Compatibility text
        const compatMatch = productHtml.match(/\([A-Z]-?\d+[A-Za-z]?\)\s+compat[ií]vel\s+com\s+([^.<]+)/i);
        const compatibility = compatMatch ? compatMatch[1].trim() : null;

        // 16. Product Image URL - look for a.swipebox href
        // HTML: <a class="swipebox" data-rel="gal-10650" href="uploads/produto/...">
        let imageUrl: string | null = null;

        // Method 1: Find a tag with swipebox class and extract href
        // Regex to find the tag and then extract href attribute, handling various quote styles and relative paths
        const swipeboxTagMatch = productHtml.match(/<a\s+[^>]*class=["'][^"']*swipebox[^"']*["'][^>]*>/i);
        if (swipeboxTagMatch) {
            const tagHtml = swipeboxTagMatch[0];
            console.log('[Tool] Found swipebox tag:', tagHtml);

            // Extract href value
            const hrefMatch = tagHtml.match(/href=["']([^"']+)["']/i) || tagHtml.match(/href=([^ >]+)/i);

            if (hrefMatch && hrefMatch[1]) {
                let href = hrefMatch[1];
                // Resolve relative URLs
                if (!href.startsWith('http') && !href.startsWith('//')) {
                    // Remove leading slash if present to avoid double slashes when appending
                    href = href.replace(/^\//, '');
                    imageUrl = `https://suporterei.com.br/${href}`;
                } else {
                    imageUrl = href;
                }
                console.log('[Tool] Image URL from swipebox:', imageUrl);
            } else {
                console.log('[Tool] Failed to extract href from swipebox tag');
            }
        } else {
            console.log('[Tool] No swipebox tag found');
        }

        // Method 2: Fallback to img with uploads in src
        if (!imageUrl) {
            const imgMatch = productHtml.match(/<img[^>]+src=["']([^"']*uploads\/produto[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
            if (imgMatch && imgMatch[1]) {
                const src = imgMatch[1];
                imageUrl = src.startsWith('http') ? src : `https://suporterei.com.br/${src.replace(/^\//, '')}`;
                console.log('[Tool] Image URL from img fallback:', imageUrl);
            }
        }

        console.log('[Tool] Final image URL:', imageUrl);

        // Build comprehensive response - use exact text as extracted
        // Force a standardized Markdown structure
        let details = `🔹 **CÓDIGO: ${extractedCode}**\n`;
        details += `**Produto:** ${productName}\n\n`;

        if (originalPartNumber) details += `🔢 **Nº Original:** ${originalPartNumber.replace(/Substitui N[º°]/i, '').trim()}\n`;
        if (technicalDescription) details += `📋 **Descrição Técnica:** ${technicalDescription}\n`;
        if (rosca) details += `🔩 **Rosca:** ${rosca.replace('Rosca ', '')}\n`;
        if (material) details += `🏭 **Material:** ${material}\n`;
        if (weight) details += `⚖️ **Peso:** ${weight}\n`;
        if (packaging) details += `📦 **Embalagem:** ${packaging}\n`;
        if (specifications) details += `🔧 **Especificações:** ${specifications}\n`;
        if (observation) details += `⚠️ **Observação:** ${observation.replace('OBS:', '').trim()}\n`;
        if (suggestionRei) details += `💡 **Sugestão Rei:** ${suggestionRei.replace(/Sugest[ãa]o Rei:?/i, '').trim()}\n`;

        if (vehicleModels.length > 0) {
            details += `\n🚗 **Veículos (Aplicações):**\n`;
            // List each vehicle on a new line to prevent summarization
            vehicleModels.forEach(v => {
                details += `- ${v}\n`;
            });
        }

        if (montadoras.length > 0) details += `\n🏭 **Montadoras:** ${montadoras.join(', ')}\n`;

        if (imageUrl) {
            details += `\n📷 [Ver imagem](${imageUrl})\n`;
        } else {
            details += `\n(Imagem não disponível)\n`;
        }

        // Instructions for the LLM
        details += `\n\n⚠️ **INSTRUÇÃO AO ASSISTENTE:**\n`;
        details += `1. VOCÊ DEVE APRESENTAR OS DADOS ACIMA EXATAMENTE NESTE FORMATO.\n`;
        details += `2. NÃO RESUMA A LISTA DE VEÍCULOS. COPIE TODOS.\n`;
        details += `3. OBRIGATÓRIO INCLUIR O LINK DA IMAGEM NO FINAL.\n`;
        details += `4. Se faltar algum dado acima, apenas não o mencione, mas mantenha a estrutura.`;

        // Link is passed in structured data, AI will use it if needed

        return {
            found: true,
            productCode: extractedCode,
            title: fullTitle,
            productName: productName,
            originalPartNumber: originalPartNumber,
            rosca: rosca,
            material: material,
            weight: weight,
            packaging: packaging,
            technicalDescription: technicalDescription,
            specifications: specifications,
            observation: observation,
            suggestionRei: suggestionRei,
            vehicleModels: vehicleModels,
            vehiclesByBrand: vehiclesByBrand,
            compatibility: compatibility,
            montadoras: montadoras,
            imageUrl: imageUrl,
            url: productUrl,
            message: details
        };

    } catch (error: any) {
        console.error('[Tool] Catalog search error:', error);
        return {
            found: false,
            message: `❌ Erro ao buscar produto: ${error.message}`
        };
    }
}
import { tavily } from "@tavily/core";

export const internetSearchToolDefinition: FunctionDeclaration = {
    name: "search_internet",
    description: "Realiza buscas na internet para encontrar informações atualizadas, notícias, dados de mercado ou qualquer conteúdo que não esteja no seu conhecimento interno. Use para perguntas sobre atualidades.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            query: {
                type: SchemaType.STRING,
                description: "O termo de busca otimizado para encontrar a melhor resposta."
            }
        },
        required: ["query"]
    }
};

export async function performInternetSearch(query: string) {
    console.log(`[Tool] Searching internet for: ${query}`);
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
        return {
            error: "TAVILY_API_KEY not configured."
        };
    }

    try {
        const client = tavily({ apiKey });
        const response = await client.search(query, {
            searchDepth: "basic",
            maxResults: 5,
            includeAnswer: true
        });

        return {
            query: query,
            answer: response.answer,
            results: response.results.map(r => ({
                title: r.title,
                url: r.url,
                snippet: r.content
            }))
        };

    } catch (error: any) {
        console.error('[Tool] Internet search error:', error);
        return {
            error: `Failed to search: ${error.message}`
        };
    }
}

// --- NEW TOOL: NOTES SEARCH ---

export const searchNotesToolDefinition: FunctionDeclaration = {
    name: "search_notes",
    description: "Busca nas anotações e memórias do usuário. Use para listar anotações, buscar por marcadores (tags) ou conteúdo transcrito. Ex: 'Liste anotações do Rafael', 'O que anotei sobre o projeto X?'.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            query: {
                type: SchemaType.STRING,
                description: "Termo de busca textual para encontrar em títulos, transcrições ou tags."
            },
            tag: {
                type: SchemaType.STRING,
                description: "Nome de uma tag/marcador específico para filtrar (ex: 'Rafael', 'PCP', 'Urgente'). Opcional."
            }
        },
        required: ["query"]
    }
};

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function performNotesSearch(query: string, tag?: string) {
    console.log(`[Tool] Searching notes for: "${query}" tag: "${tag}"`);

    try {
        let dbQuery = supabaseAdmin
            .schema('app_anotacoes')
            .from('notes')
            .select('id, title, transcription, tags, created_at')
            .order('created_at', { ascending: false })
            .limit(10); // Limit to recent/relevant

        if (tag) {
            // Filter by specific tag if provided (Mandatory Filter)
            // This ensures we only look within notes related to this person/sector
            dbQuery = dbQuery.contains('tags', [tag]);
        }

        if (query) {
            // Smart Search: Replace spaces with % to allow "Cobrar Rafael" to match "Cobrar o Rafael"
            const fuzzyQuery = query.trim().split(/\s+/).join('%');

            // Search text in title OR transcription
            // If tag was applied above, this searches text WITHIN that tag's results
            dbQuery = dbQuery.or(`title.ilike.%${fuzzyQuery}%,transcription.ilike.%${fuzzyQuery}%`);
        }

        const { data, error } = await dbQuery;

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            return {
                found: false,
                message: "Nenhuma anotação encontrada com esses critérios."
            };
        }

        return {
            found: true,
            count: data.length,
            notes: data.map(n => ({
                title: n.title,
                date: new Date(n.created_at).toLocaleDateString('pt-BR'),
                tags: n.tags,
                preview: n.transcription ? n.transcription.substring(0, 200) + "..." : "(Sem transcrição)"
            }))
        };

    } catch (error: any) {
        console.error('[Tool] Notes search error:', error);
        return {
            error: `Erro ao buscar anotações: ${error.message}`
        };
    }
}

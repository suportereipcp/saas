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

        // Extract product links from search results
        // The query might be "R-1221" - we need to handle the hyphen properly
        // Build a regex pattern that matches the product code with optional hyphen
        const normalizedQuery = query.toLowerCase().trim();

        // Try multiple patterns to find the product link
        let linkMatch = null;

        // Pattern 1: exact match with the query in the URL (e.g., r-1221 in "...vw-r-1221...")
        const exactPattern = new RegExp(`<a\\s+href="([^"]*${normalizedQuery.replace(/[-]/g, '[-]?')}[^"]*)"`, 'i');
        linkMatch = searchHtml.match(exactPattern);

        // Pattern 2: if starts with letter-number, try without hyphen too (r1221)
        if (!linkMatch) {
            const noHyphenQuery = normalizedQuery.replace(/-/g, '');
            const noHyphenPattern = new RegExp(`<a\\s+href="([^"]*${noHyphenQuery}[^"]*)"`, 'i');
            linkMatch = searchHtml.match(noHyphenPattern);
        }

        // Pattern 3: Look for product cards with the code visible
        if (!linkMatch) {
            // Search for the code in the page content and find nearby link
            const codeInPagePattern = new RegExp(`<a\\s+href="([^"]+)"[^>]*>\\s*[^<]*${normalizedQuery}`, 'i');
            linkMatch = searchHtml.match(codeInPagePattern);
        }

        // Pattern 4: Try to find any product link on the search results page
        if (!linkMatch && searchHtml.includes('VEJA MAIS')) {
            // Find links near "VEJA MAIS" buttons - these are product links
            const vejaPattern = /<a\s+href="([^"]+)"[^>]*>\s*VEJA MAIS/gi;
            const vejaMatch = searchHtml.match(vejaPattern);
            if (vejaMatch && vejaMatch.length === 1) {
                // Only one result, use it
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

        // Build full product URL (href is relative, product pages are at root)
        const productSlug = linkMatch[1];
        const productUrl = `https://suporterei.com.br/${productSlug}`;
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
        const grupoPattern = /<div[^>]*class="[^"]*grupo[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
        const grupoMatches = productHtml.matchAll(grupoPattern);

        for (const grupoMatch of grupoMatches) {
            const grupoContent = grupoMatch[1];
            // Get the brand name from grupo-titulo
            const tituloMatch = grupoContent.match(/class="[^"]*grupo-titulo[^"]*"[^>]*>([^<]+)/i);
            if (tituloMatch) {
                const brand = tituloMatch[1].replace(':', '').trim();
                // Get all models from span.modelo
                const modeloMatches = grupoContent.matchAll(/class="[^"]*modelo[^"]*"[^>]*>([^<]+)/gi);
                const models: string[] = [];
                for (const m of modeloMatches) {
                    if (m[1] && m[1].trim()) models.push(m[1].trim());
                }
                if (models.length > 0) {
                    vehiclesByBrand[brand] = models;
                }
            }
        }

        // Fallback: also try link-based extraction for older formats
        const brandSectionPatterns = [
            /<strong>([^<]+)<\/strong>:?\s*(?:<br\s*\/?>)?\s*((?:<a[^>]*>[^<]+<\/a>\s*\|?\s*)+)/gi,
            /(Scania|Ônibus|MB|VW|Volvo|Mercedes|Delivery)[:\s]*(?:<br\s*\/?>)?\s*((?:<a[^>]*>[^<]+<\/a>\s*\|?\s*)+)/gi
        ];

        for (const pattern of brandSectionPatterns) {
            const matches = productHtml.matchAll(pattern);
            for (const match of matches) {
                const brand = (match[1] || '').trim();
                const linksSection = match[2] || '';
                const modelLinks = linksSection.matchAll(/<a[^>]*>([^<]+)<\/a>/gi);
                const models: string[] = [];
                for (const m of modelLinks) {
                    if (m[1] && m[1].trim()) models.push(m[1].trim());
                }
                if (brand && models.length > 0) {
                    if (!vehiclesByBrand[brand]) vehiclesByBrand[brand] = [];
                    vehiclesByBrand[brand].push(...models);
                }
            }
        }

        // Remove duplicates from each brand
        for (const brand in vehiclesByBrand) {
            vehiclesByBrand[brand] = [...new Set(vehiclesByBrand[brand])];
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
        const swipeboxTagMatch = productHtml.match(/<a\s+[^>]*swipebox[^>]*>/i);
        if (swipeboxTagMatch) {
            const tagHtml = swipeboxTagMatch[0];
            const hrefMatch = tagHtml.match(/href=["']([^"']+)["']/i);
            if (hrefMatch && hrefMatch[1]) {
                const href = hrefMatch[1];
                imageUrl = href.startsWith('http') ? href : `https://suporterei.com.br/${href.replace(/^\//, '')}`;
                console.log('[Tool] Image URL from swipebox:', imageUrl);
            }
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
        let details = `**${extractedCode}** - ${productName}\n\n`;

        if (originalPartNumber) details += `🔢 ${originalPartNumber}\n`;
        if (technicalDescription) details += `📋 ${technicalDescription}\n`;
        if (rosca) details += `🔩 ${rosca}\n`;
        if (material) details += `🏭 ${material}\n`;
        if (weight) details += `⚖️ **Peso:** ${weight}\n`;
        if (packaging) details += `📦 **Embalagem:** ${packaging}\n`;
        if (specifications) details += `🔧 ${specifications}\n`;
        if (observation) details += `\n⚠️ ${observation}\n`;
        if (suggestionRei) details += `💡 ${suggestionRei}\n`;
        if (vehicleModels.length > 0) details += `\n🚗 **Veículos:**\n${vehicleModels.map(v => `  • ${v}`).join('\n')}\n`;
        if (montadoras.length > 0) details += `\n🏭 **Montadoras:** ${montadoras.join(', ')}\n`;
        if (imageUrl) details += `\n📷 [Ver imagem](${imageUrl})\n`;

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
            // Filter by specific tag if provided
            dbQuery = dbQuery.contains('tags', [tag]);
        } else if (query) {
            // If no specific tag, try to match text in title, transcription OR tags
            // Note: 'or' syntax in Supabase for text search
            dbQuery = dbQuery.or(`title.ilike.%${query}%,transcription.ilike.%${query}%`);
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

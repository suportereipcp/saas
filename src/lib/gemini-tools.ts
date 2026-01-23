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
        // Links are relative URLs like: href="coxim-dianteiro-e-traseiro-da-suspensao-do-motor-mercedes-benz-r-025"
        const cleanQuery = query.toLowerCase().replace(/[^a-z0-9-]/g, '');
        const linkPattern = `<a\\s+href="([^"]*${cleanQuery}[^"]*)"`;
        const linkRegex = new RegExp(linkPattern, 'i');
        const linkMatch = searchHtml.match(linkRegex);

        if (!linkMatch) {
            return {
                found: false,
                message: `Produto "${query}" não encontrado.`,
                suggestion: `Acesse ${searchUrl} para verificar manualmente.`
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

        // Extract product title
        const titleMatch = productHtml.match(/<title>(.*?)<\/title>/i);
        const fullTitle = titleMatch ? titleMatch[1].replace(' - Suporte Rei', '').trim() : '';

        // Extract product code from beginning of title
        const codeMatch = fullTitle.match(/^([A-Z]-?\d+[A-Z]?)/i);
        const extractedCode = codeMatch ? codeMatch[1].toUpperCase() : query.toUpperCase();

        return {
            found: true,
            productCode: extractedCode,
            title: fullTitle,
            url: productUrl,
            message: `✅ **${fullTitle}**\n\n📎 ${productUrl}\n\n💡 Acesse para ver foto, aplicações em veículos e especificações técnicas completas.`
        };

    } catch (error: any) {
        console.error('[Tool] Catalog search error:', error);
        return {
            found: false,
            message: `❌ Erro ao buscar: ${error.message}`,
            suggestion: "Verifique o código do produto e sua conexão."
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

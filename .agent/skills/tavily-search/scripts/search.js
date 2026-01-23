const { tavily } = require("@tavily/core");
const process = require("process");

// Configuration
// Get API Key from arguments or env or fallback
// Note: In a real script, parsing args properly is better.
const main = async () => {
    // Parse arguments manually to avoid extra dependencies like 'yargs'
    // Expected format: node search.js --query "term"
    const args = process.argv.slice(2);
    let query = "";

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--query" && args[i + 1]) {
            query = args[i + 1];
            break;
        }
    }

    if (!query) {
        console.error(JSON.stringify({ error: "Missing --query argument", status: "failed" }));
        return;
    }

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        console.error(JSON.stringify({ error: "Missing TAVILY_API_KEY environment variable", status: "failed" }));
        return;
    }

    try {
        const client = tavily({ apiKey });

        const response = await client.search(query, {
            searchDepth: "basic",
            maxResults: 5,
            includeAnswer: true
        });

        const output = {
            query: query,
            answer: response.answer || "",
            results: response.results.map(r => ({
                title: r.title,
                url: r.url,
                content: r.content,
                score: r.score
            }))
        };

        console.log(JSON.stringify(output, null, 2));

    } catch (error) {
        console.error(JSON.stringify({ error: error.message, status: "failed" }));
    }
};

main();

import argparse
import os
import json
from tavily import TavilyClient

# Configuration
# Prefer environment variable, fallback to hardcoded key as requested
API_KEY = os.getenv("TAVILY_API_KEY", "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")

def search(query):
    try:
        # Initialize client
        client = TavilyClient(api_key=API_KEY)
        
        # Perform search with LLM-optimized settings
        response = client.search(
            query=query,
            search_depth="basic", # or "advanced" for deeper search
            max_results=5,
            include_answer=True,
            include_domains=[],
            exclude_domains=[]
        )
        
        # Format output for LLM consumption
        output = {
            "query": query,
            "answer": response.get("answer", ""),
            "results": []
        }
        
        for result in response.get("results", []):
            output["results"].append({
                "title": result.get("title"),
                "url": result.get("url"),
                "content": result.get("content"),
                "score": result.get("score")
            })
            
        print(json.dumps(output, indent=2, ensure_ascii=False))
        
    except Exception as e:
        error_output = {
            "error": str(e),
            "status": "failed"
        }
        print(json.dumps(error_output, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Tavily Search for LLMs")
    parser.add_argument("--query", type=str, required=True, help="Search query")
    
    args = parser.parse_args()
    search(args.query)

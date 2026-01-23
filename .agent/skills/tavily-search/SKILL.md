---
name: tavily-search
description: Real-time web search capability using Tavily API. Optimized for LLM context retrieval.
---

# Tavily Search Skill

This skill allows the agent to perform real-time web searches using the Tavily API. It is designed to return concise, high-quality, and context-aware results suitable for LLM consumption.

## Usage

Use the `search.py` script to perform searches.

### Parameters

- `query` (required): The search query string.

### Example

```bash
node .agent/skills/tavily-search/scripts/search.js --query "latest news about Next.js 15"
```

## Dependencies

- `@tavily/core` (Install via `npm install @tavily/core`)

import { ToolCardProps } from "@/types/tool-search";


/**
 * Filters tools based on search query against title, description, long description, and tags.
 * Supports tokenized matching (e.g., "json formator" matches "json" and partially matches "formatter").
 * 
 * @param tools Array of tools to search
 * @param query Search query string
 * @returns Filtered array of tools sorted by relevance
 */
export const searchTools = (tools: ToolCardProps[], query: string): ToolCardProps[] => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
        return tools;
    }

    const queryTokens = trimmedQuery.split(/\s+/).filter(t => t.length > 0);

    const scoredTools = tools.map(tool => {
        let score = 0;
        
        // Stringify all searchable text for exact phrase matching
        const searchableText = [
            tool.title.toLowerCase(),
            ...tool.metadata.map(m => m.toLowerCase())
        ].join(' ');

        // Huge boost for an exact phrase match anywhere in the content
        if (searchableText.includes(trimmedQuery)) {
            score += 50;
        }

        // Score based on individual tokens
        for (const token of queryTokens) {
            // Title exact match
            if (tool.title.toLowerCase().includes(token)) {
                score += 10;
            }
            // Tags/Metadata exact match
            else if (tool.metadata.some(m => m.toLowerCase().includes(token))) {
                score += 8;
            }
            // Basic typo tolerance (if token length >= 3, check if any word starts with those 3 chars)
            else if (token.length >= 3) {
                const prefix = token.slice(0, 3);
                if (tool.title.toLowerCase().split(/\s+/).some(w => w.startsWith(prefix))) {
                    score += 1;
                } else if (tool.metadata.some(m => m.toLowerCase().startsWith(prefix))) {
                    score += 1;
                }
            }
        }

        return { tool, score };
    });


    // Return tools that matched at least something, sorted by highest score first
    return scoredTools
        .filter(st => st.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(st => st.tool);
};

import { ToolCardProps } from "@/types/tool-search";

/**
 * Filters tools based on search query against title and metadata.
 * Case-insensitive.
 * 
 * @param tools Array of tools to search
 * @param query Search query string
 * @returns Filtered array of tools
 */
export const searchTools = (tools: ToolCardProps[], query: string): ToolCardProps[] => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
        return tools;
    }

    return tools.filter(tool => {
        const titleMatch = tool.title.toLowerCase().includes(trimmedQuery);
        const metadataMatch = tool.metadata.some(meta =>
            meta.toLowerCase().includes(trimmedQuery)
        );

        return titleMatch || metadataMatch;
    });
};

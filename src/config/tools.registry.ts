import { ToolCategory, ToolMeta, ToolMetaLite } from "@/types/tool-search";
import { TOOLS_LITE } from "./registry.lite";

/**
 * LIGHTWEIGHT registry for the home page and search.
 * Heavy configurations are moved to separate files and dynamic-imported.
 */
export const TOOLS: ToolMetaLite[] = TOOLS_LITE;

/** 
 * Lazily load the full tool metadata including TIP configurations.
 * This keeps the main bundle small.
 */
export const getFullToolMeta = async (id: string): Promise<ToolMeta | undefined> => {
  switch (id) {
    case 'magic-pdf': return (await import("@/app/(tools)/magic-pdf/config")).magicPdfConfig;
    case 'pixels': return (await import("@/app/(tools)/pixels/config")).pixelsConfig;
    case 'data-lens': return (await import("@/app/(tools)/data-lens/config")).dataLensConfig;
    case 'redact-secrets': return (await import("@/app/(tools)/redact-secrets/config")).redactSecretsConfig;
    case 'base64': return (await import("@/app/(tools)/base64/config")).base64Config;
    case 'json-to-interface': return (await import("@/app/(tools)/json-to-interface/config")).jsonToInterfaceConfig;
    case 'open-draw': return (await import("@/app/(tools)/open-draw/config")).openDrawConfig;
    case 'ping-tester': return (await import("@/app/(tools)/ping-tester/config")).pingTesterConfig;
    case 'speed-test': return (await import("@/app/(tools)/speed-test/config")).speedTestConfig;
    case 'pipeline': return (await import("@/app/(tools)/pipeline/config")).pipelineConfig;
    case 'passwordx': return (await import("@/app/(tools)/passwordx/config")).passwordxConfig;
    case 'format-studio': return (await import("@/app/(tools)/format-studio/config")).formatStudioConfig;
    case 'data-builder': return (await import("@/app/(tools)/data-builder/config")).dataBuilderConfig;
    case 'archive-kit': return (await import("@/app/(tools)/archive-kit/config")).archiveKitConfig;
    case 'note-vault': return (await import("@/app/(tools)/note-vault/config")).noteVaultConfig;
    case 'qr-forge': return (await import("@/app/(tools)/qr-forge/config")).qrForgeConfig;
    case 'bgremover': return (await import("@/app/(tools)/bgremover/config")).bgremoverConfig;
    default: return undefined;
  }
};

export const getAllTools = (): ToolMetaLite[] => TOOLS;

export const getToolById = (id: string): ToolMetaLite | undefined =>
  TOOLS.find((tool) => tool.id === id);

export const getToolsByCategory = (category: ToolCategory): ToolMetaLite[] =>
  TOOLS.filter((tool) => tool.category === category);

export const getFeaturedTools = (): ToolMetaLite[] =>
  TOOLS.filter((tool) => tool.isFeatured);

export const getWasmTools = (): ToolMetaLite[] =>
  TOOLS.filter((tool) => tool.wasmPowered);

export const getActiveCategories = (): ToolCategory[] =>
  [...new Set(TOOLS.map((tool) => tool.category))];

export const searchToolsFromRegistry = (query: string): ToolMetaLite[] => {
  const trimmedQuery = query.toLowerCase().trim();
  if (!trimmedQuery) return TOOLS;
  const queryTokens = trimmedQuery.split(/\s+/).filter(t => t.length > 0);
  const scoredTools = TOOLS.map((tool) => {
    let score = 0;
    const searchableText = [tool.name.toLowerCase(), tool.description.toLowerCase(), ...tool.tags.map(t => t.toLowerCase())].join(' ');
    if (searchableText.includes(trimmedQuery)) score += 50;
    for (const token of queryTokens) {
      if (tool.name.toLowerCase().includes(token)) score += 10;
      else if (tool.tags.some(t => t.toLowerCase().includes(token))) score += 8;
      else if (tool.description.toLowerCase().includes(token)) score += 5;
    }
    return { tool, score };
  });
  return scoredTools.filter(st => st.score > 0).sort((a, b) => b.score - a.score).map(st => st.tool);
};

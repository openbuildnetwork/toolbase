// src/config/tools.registry.ts
// ============================================================
// SINGLE SOURCE OF TRUTH for all Toolbase tools.
// This file aggregates individual configurations from src/config/tools/*
// ============================================================

import { ToolCategory, ToolMeta } from "@/types/tool-search";
import { magicPdfConfig } from "./tools/magic-pdf";
import { pixelAxeConfig } from "./tools/pixel-axe";
import { dataLensConfig } from "./tools/data-lens";
import { redactSecretsConfig } from "./tools/redact-secrets";
import { base64Config } from "./tools/base64";
import { jsonToInterfaceConfig } from "./tools/json-to-interface";
import { openDrawConfig } from "./tools/open-draw";
import { pingTesterConfig } from "./tools/ping-tester";
import { speedTestConfig } from "./tools/speed-test";
import { pipelineConfig } from "./tools/pipeline";
import { passwordxConfig } from "./tools/passwordx";
import { omniParseConfig } from "./tools/omni-parse";
import { dataForgeConfig } from "./tools/data-forge";
import { archiveKitConfig } from "./tools/archive-kit";
import { systemConfig } from "./tools/system";

// ============================================================
// REGISTERED TOOLS
// ============================================================

export const TOOLS: ToolMeta[] = [
  magicPdfConfig,
  pixelAxeConfig,
  dataLensConfig,
  redactSecretsConfig,
  base64Config,
  jsonToInterfaceConfig,
  openDrawConfig,
  pingTesterConfig,
  speedTestConfig,
  pipelineConfig,
  passwordxConfig,
  omniParseConfig,
  dataForgeConfig,
  archiveKitConfig,
  systemConfig,
];

// ============================================================
// HELPERS — use these throughout the app, never filter TOOLS directly
// ============================================================

/** Get all tools */
export const getAllTools = (): ToolMeta[] => TOOLS;

/** Get a single tool by ID */
export const getToolById = (id: string): ToolMeta | undefined =>
  TOOLS.find((tool) => tool.id === id);

/** Get tools by category */
export const getToolsByCategory = (category: ToolCategory): ToolMeta[] =>
  TOOLS.filter((tool) => tool.category === category);

/** Get featured tools */
export const getFeaturedTools = (): ToolMeta[] =>
  TOOLS.filter((tool) => tool.isFeatured);

/** Get WASM-powered tools */
export const getWasmTools = (): ToolMeta[] =>
  TOOLS.filter((tool) => tool.wasmPowered);

/** Get all unique categories that have at least one tool */
export const getActiveCategories = (): ToolCategory[] =>
  [...new Set(TOOLS.map((tool) => tool.category))];

/**
 * Search tools by query — searches name, description, and tags.
 * This is the canonical search function used by the app.
 */
export const searchToolsFromRegistry = (query: string): ToolMeta[] => {
  const q = query.toLowerCase().trim();
  if (!q) return TOOLS;
  const tokens = q.split(/\s+/).filter(Boolean);
  
  return TOOLS.filter((tool) => {
    const searchContent = [
      tool.name,
      tool.description,
      ...tool.tags
    ].map(s => s.toLowerCase());

    // Every token in the query must match at least one attribute of the tool
    return tokens.every(token => 
      searchContent.some(attr => attr.includes(token))
    );
  });
};

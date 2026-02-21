// src/config/tools.registry.ts
// ============================================================
// SINGLE SOURCE OF TRUTH for all Toolbase tools.
// To add a new tool: add one entry to the TOOLS array below.
// Do NOT hardcode tool metadata anywhere else in the codebase.
// ============================================================

export type ToolCategory =
  | 'pdf'
  | 'image'
  | 'text'
  | 'data'
  | 'network'
  | 'security'
  | 'drawing'
  | 'developer';

export type ToolStatus = 'stable' | 'beta' | 'experimental';

export interface ToolMeta {
  /** Unique identifier — matches the folder name in src/app/tools/ */
  id: string;
  /** Display name shown in the UI */
  name: string;
  /** Short one-liner shown on tool cards */
  description: string;
  /** Longer description for tool detail page and SEO */
  longDescription?: string;
  /** Primary category for filtering */
  category: ToolCategory;
  /** Next.js route to the tool */
  route: string;
  /** Path to thumbnail image in /public/assets/thumbnails/ */
  thumbnail: string;
  /** Search tags — used by the search engine */
  tags: string[];
  /** Shows "NEW" badge on tool card */
  isNew?: boolean;
  /** Featured on home/landing page */
  isFeatured?: boolean;
  /** Shows WASM badge — communicates performance and privacy */
  wasmPowered?: boolean;
  /** Subset of wasmPowered — powered by Python via Pyodide */
  pythonPowered?: boolean;
  /** Stability status */
  status: ToolStatus;
  /** ISO date string — when this tool was added */
  addedAt: string;
  /** GitHub username of the contributor who built this tool */
  author?: string;
}

// ============================================================
// REGISTERED TOOLS
// ============================================================

export const TOOLS: ToolMeta[] = [
  {
    id: 'magic-pdf',
    name: 'Magic PDF',
    description: 'Compress, merge, split, protect, sign and convert PDFs — all in your browser.',
    longDescription:
      'Magic PDF is a full-featured PDF toolkit that runs entirely in your browser using WebAssembly. Compress PDFs without quality loss, merge multiple files, split by page range, add password protection, sign documents, convert to images, and more. No file ever leaves your machine.',
    category: 'pdf',
    route: '/tools/magic-pdf',
    thumbnail: '/assets/thumbnails/magic-pdf.png',
    tags: ['pdf', 'compress', 'merge', 'split', 'protect', 'sign', 'convert', 'word', 'image'],
    isNew: false,
    isFeatured: true,
    wasmPowered: true,
    pythonPowered: true,
    status: 'stable',
    addedAt: '2025-01-01',
  },
  {
    id: 'pixel-axe',
    name: 'Pixel Axe',
    description: 'Compress, resize, upscale images and hide messages with steganography.',
    longDescription:
      'Pixel Axe is a powerful image processing toolkit. Compress images without visible quality loss, resize to exact dimensions, upscale with AI-like algorithms, and even hide secret messages inside images using steganography — all processed locally in your browser.',
    category: 'image',
    route: '/tools/pixel-axe',
    thumbnail: '/assets/thumbnails/pixel-axe.png',
    tags: ['image', 'compress', 'resize', 'upscale', 'steganography', 'png', 'jpg', 'webp'],
    isNew: false,
    isFeatured: true,
    wasmPowered: true,
    pythonPowered: true,
    status: 'stable',
    addedAt: '2025-01-01',
  },
  {
    id: 'data-lens',
    name: 'Data Lens',
    description: 'Analyze CSV and JSON data with SQL queries, Python scripts and charts.',
    longDescription:
      'Data Lens turns your browser into a data analysis workbench. Load CSV or JSON files, run SQL queries against them, execute Python (Pandas, NumPy) for deep analysis, visualize with charts, and filter with a visual query builder. Your data stays completely local.',
    category: 'data',
    route: '/tools/data-lens',
    thumbnail: '/assets/thumbnails/data-lens.png',
    tags: ['csv', 'json', 'sql', 'python', 'pandas', 'chart', 'data', 'analysis', 'filter'],
    isNew: false,
    isFeatured: true,
    wasmPowered: true,
    pythonPowered: true,
    status: 'stable',
    addedAt: '2025-01-01',
  },
  {
    id: 'redact-secrets',
    name: 'Redact Secrets',
    description: 'Automatically detect and redact API keys, passwords and sensitive data from files.',
    longDescription:
      'Redact Secrets scans text, code, config files and documents for sensitive information — API keys, passwords, tokens, private keys, credit card numbers — and redacts them. Perfect for sanitizing files before sharing. All scanning happens locally in your browser.',
    category: 'security',
    route: '/tools/redact-secrets',
    thumbnail: '/assets/thumbnails/redact-secrets.png',
    tags: ['redact', 'secrets', 'api-keys', 'passwords', 'tokens', 'security', 'privacy', 'scan'],
    isNew: false,
    isFeatured: true,
    wasmPowered: true,
    pythonPowered: true,
    status: 'stable',
    addedAt: '2025-01-01',
  },
  {
    id: 'base64',
    name: 'Base64',
    description: 'Encode and decode text, files and images to and from Base64.',
    longDescription:
      'Instantly encode any text, file or image to Base64, or decode Base64 strings back to their original form. Supports URL-safe Base64, handles binary files, and processes everything locally with no size limits imposed by server uploads.',
    category: 'developer',
    route: '/tools/base64',
    thumbnail: '/assets/thumbnails/b64EnDc.png',
    tags: ['base64', 'encode', 'decode', 'binary', 'text', 'image', 'file', 'url-safe'],
    isNew: false,
    isFeatured: false,
    wasmPowered: false,
    pythonPowered: false,
    status: 'stable',
    addedAt: '2025-01-01',
  },
  {
    id: 'json-to-interface',
    name: 'JSON to Interface',
    description: 'Convert any JSON object into TypeScript interfaces instantly.',
    longDescription:
      'Paste any JSON and instantly get a typed TypeScript interface. Handles nested objects, arrays, optional fields, and complex structures. Saves developers hours of manual type writing. Runs entirely in the browser — paste sensitive API responses without worry.',
    category: 'developer',
    route: '/tools/json-to-interface',
    thumbnail: '/assets/thumbnails/json-to-interface.png',
    tags: ['json', 'typescript', 'interface', 'types', 'convert', 'developer'],
    isNew: false,
    isFeatured: false,
    wasmPowered: false,
    pythonPowered: false,
    status: 'stable',
    addedAt: '2025-01-01',
  },
  {
    id: 'open-draw',
    name: 'Open Draw',
    description: 'Create diagrams, flowcharts and system designs with a full diagramming canvas.',
    longDescription:
      'Open Draw is a privacy-first diagramming tool inspired by draw.io. Create system architecture diagrams, flowcharts, entity relationship diagrams, network diagrams and more. Export to SVG, PNG or XML. Everything stays in your browser — no cloud sync required.',
    category: 'drawing',
    route: '/tools/open-draw',
    thumbnail: '/assets/thumbnails/open-draw.png',
    tags: ['diagram', 'flowchart', 'draw', 'architecture', 'erd', 'svg', 'canvas', 'shapes'],
    isNew: false,
    isFeatured: true,
    wasmPowered: false,
    pythonPowered: false,
    status: 'stable',
    addedAt: '2025-01-01',
  },
  {
    id: 'ping-tester',
    name: 'Ping Tester',
    description: 'Test network latency and reachability of any host directly from your browser.',
    longDescription:
      'Test network latency and check if hosts are reachable directly from your browser. Useful for quick network diagnostics without installing command-line tools.',
    category: 'network',
    route: '/tools/ping-tester',
    thumbnail: '/assets/thumbnails/ping-tester.png',
    tags: ['ping', 'network', 'latency', 'connectivity', 'host', 'diagnostic'],
    isNew: false,
    isFeatured: false,
    wasmPowered: false,
    pythonPowered: false,
    status: 'beta',
    addedAt: '2025-01-01',
  },
  {
    id: 'speed-test',
    name: 'Speed Test',
    description: 'Test your internet connection download and upload speed.',
    longDescription:
      'Measure your real internet connection speed with download and upload tests. Get accurate results directly in your browser without installing any extensions or apps.',
    category: 'network',
    route: '/tools/speed-test',
    thumbnail: '/assets/thumbnails/speed-test.png',
    tags: ['speed', 'network', 'internet', 'download', 'upload', 'bandwidth', 'test'],
    isNew: false,
    isFeatured: false,
    wasmPowered: false,
    pythonPowered: false,
    status: 'beta',
    addedAt: '2025-01-01',
  },
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
  return TOOLS.filter(
    (tool) =>
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.tags.some((tag) => tag.toLowerCase().includes(q))
  );
};
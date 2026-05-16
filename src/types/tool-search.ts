import { StaticImageData } from "next/image";

export type ToolCategory =
  | 'pdf'
  | 'image'
  | 'text'
  | 'data'
  | 'network'
  | 'security'
  | 'drawing'
  | 'developer'
  | 'ai';

export type ToolStatus = 'stable' | 'beta' | 'experimental';

export interface ToolMetaLite {
  /** Unique identifier — matches the folder name in src/app/tools/ */
  id: string;
  /** Display name shown in the UI */
  name: string;
  /** Short one-liner shown on tool cards */
  description: string;
  /** Primary category for filtering */
  category: ToolCategory;
  /** Next.js route to the tool (must be same as tool folder name)*/
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
  /** Whether this tool is optimized for mobile devices */
  mobileOptimized: boolean;
  /** GitHub username of the contributor who built this tool */
  author?: string;
}

export interface ToolMeta extends ToolMetaLite {
  /** Longer description for tool detail page and SEO */
  longDescription?: string;
  /** 
   * If defined, this tool supports the TIP Protocol and can be chained
   * in the Pipeline Builder. An array is used because some UI tools
   * (like Magic PDF) expose multiple distinct TIP-operations.
   */
  tip?: {
    id: string; // e.g. "magic-pdf/compress"
    name: string;
    description: string;
    consumes: import('@/tip/protocol').TIPContentType[];
    produces: import('@/tip/protocol').TIPContentType[];
    configSchema: import('@/tip/protocol').TIPConfigSchema;
    /**
     * DYNAMIC IMPORT of the execution logic. 
     * Keeps the registry lightweight.
     */
    getExecutor: () => Promise<(input: import('@/tip/protocol').TIPBundle, config: import('@/tip/protocol').TIPConfig, hooks: import('@/tip/protocol').TIPHooks) => Promise<import('@/tip/protocol').TIPBundle>>;

    /** Whether this specific operation is optimized for mobile */
    mobileOptimized: boolean;
    /**
     * INP: when true, this operation requires user interaction before execution.
     * The pipeline ToolNode shows a Configure button and amber indicator.
     */
    interactable?: true;
    /**
     * INP: lazily loads the interaction component.
     * Only present when interactable === true.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getInteractionComponent?: () => Promise<(props: import('@/tip/protocol').TIPInteractionProps) => any>;

  }[];
}



export interface ToolCardProps {
    title: string;
    route: string; // Must be same as tool folder name
    icon: StaticImageData | string;
    metadata: string[];
    /** Tool registry ID used for favouriting and recents tracking */
    toolId?: string;
    /** Internal tool folder name — kept for BottomNav compat */
    toolFolderName?: string;
}

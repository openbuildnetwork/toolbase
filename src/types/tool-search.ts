import { StaticImageData } from "next/image";

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
  /** GitHub username of the contributor who built this tool */
  author?: string;
}


export interface ToolCardProps {
    title: string;
    route: string; // Must be same as tool folder name
    icon: StaticImageData | string;
    metadata: string[];
}
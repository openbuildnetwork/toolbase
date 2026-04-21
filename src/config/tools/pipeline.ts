import { ToolMeta } from "@/types/tool-search";

export const pipelineConfig: ToolMeta = {
  id: 'pipeline',
  name: 'Pipeline Builder',
  description: 'Chain any tools together into an automated workflow. Powered by TIP.',
  longDescription:
    'Pipeline Builder lets you chain Toolbase tools together into reusable automated workflows. Compress a PDF, extract images, then compress those — in one click. Powered by the Toolbase Interoperability Protocol (TIP). All processing stays in your browser.',
  category: 'developer',
  route: 'pipeline',
  thumbnail: '/assets/thumbnails/pipeline.png',
  tags: ['pipeline', 'chain', 'workflow', 'automate', 'tip', 'batch', 'combine'],
  isNew: true,
  isFeatured: true,
  wasmPowered: true,
  pythonPowered: true,
  status: 'beta',
  addedAt: '2026-02-27',
};

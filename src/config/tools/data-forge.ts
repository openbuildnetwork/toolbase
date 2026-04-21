import { ToolMeta } from "@/types/tool-search";

export const dataForgeConfig: ToolMeta = {
  id: 'data-forge',
  name: 'Data Forge',
  description: 'Generate realistic mock datasets from field definitions or blueprint schemas.',
  longDescription:
    'Data Forge helps you create structured mock data for testing and prototyping. Build datasets from field-level controls or advanced nested blueprints, then export in JSON or XML locally in your browser.',
  category: 'data',
  route: 'data-forge',
  thumbnail: '/assets/thumbnails/data-forge.svg',
  tags: ['data', 'mock data', 'generator', 'json', 'xml', 'schema', 'testing', 'seed data', 'blueprint'],
  isNew: false,
  isFeatured: false,
  wasmPowered: false,
  pythonPowered: false,
  status: 'beta',
  addedAt: '2025-01-01',
};

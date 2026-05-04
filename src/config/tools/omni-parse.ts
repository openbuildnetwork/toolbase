import { ToolMeta } from "@/types/tool-search";

export const omniParseConfig: ToolMeta = {
  id: 'omni-parse',
  name: 'OmniParse',
  description: 'Convert, validate, and format JSON/XML/YAML/TOML with visual schema and graph generation.',
  longDescription:
    'OmniParse is a browser-native structured data toolbase for converting formats, validating payloads, formatting content, and generating markdown or graph documentation from JSON, XML, and YAML.',
  category: 'data',
  route: 'omni-parse',
  thumbnail: '/assets/thumbnails/omni-parse.svg',
  tags: ['data', 'json', 'xml', 'yaml', 'toml', 'convert', 'validate', 'formatter', 'schema', 'graph'],
  isNew: false,
  isFeatured: false,
  wasmPowered: false,
  pythonPowered: false,
  status: 'beta',
  addedAt: '2025-01-01',
  mobileOptimized: false,
  tip: [
    {
      id: 'omni-parse/beautify',
      name: 'Beautify',
      description: 'Format and indent JSON, XML, or YAML for readability.',
      consumes: ['application/json', 'text/plain'],
      produces: ['text/plain'],
      mobileOptimized: false,
      configSchema: {
        fields: [
          {
            key: 'format',
            label: 'Format',
            type: 'select',
            default: 'json',
            options: [
              { label: 'JSON', value: 'json' },
              { label: 'XML', value: 'xml' },
              { label: 'YAML', value: 'yaml' },
            ],
          },
        ],
      },
      getExecutor: async () => {
        const { createOmniParseTipExecutor } = await import('@/tip/omni-parse-executor');
        return createOmniParseTipExecutor('beautify');
      },
    },
    {
      id: 'omni-parse/minify',
      name: 'Minify',
      description: 'Remove all whitespace and comments to compress the payload.',
      consumes: ['application/json', 'text/plain'],
      produces: ['text/plain'],
      mobileOptimized: false,
      configSchema: {
        fields: [
          {
            key: 'format',
            label: 'Format',
            type: 'select',
            default: 'json',
            options: [
              { label: 'JSON', value: 'json' },
              { label: 'XML', value: 'xml' },
              { label: 'YAML', value: 'yaml' },
            ],
          },
        ],
      },
      getExecutor: async () => {
        const { createOmniParseTipExecutor } = await import('@/tip/omni-parse-executor');
        return createOmniParseTipExecutor('minify');
      },
    },
    {
      id: 'omni-parse/clean',
      name: 'Clean Payload',
      description: 'Recursively remove nulls, undefineds, and empty collections.',
      consumes: ['application/json', 'text/plain'],
      produces: ['application/json'],
      mobileOptimized: false,
      configSchema: {
        fields: [
          {
            key: 'format',
            label: 'Format',
            type: 'select',
            default: 'json',
            options: [
              { label: 'JSON', value: 'json' },
              { label: 'XML', value: 'xml' },
              { label: 'YAML', value: 'yaml' },
            ],
          },
        ],
      },
      getExecutor: async () => {
        const { createOmniParseTipExecutor } = await import('@/tip/omni-parse-executor');
        return createOmniParseTipExecutor('clean');
      },
    },
    {
      id: 'omni-parse/normalize',
      name: 'Normalize Keys',
      description: 'Transform all object keys to camelCase for consistency.',
      consumes: ['application/json', 'text/plain'],
      produces: ['application/json'],
      mobileOptimized: false,
      configSchema: {
        fields: [
          {
            key: 'format',
            label: 'Format',
            type: 'select',
            default: 'json',
            options: [
              { label: 'JSON', value: 'json' },
              { label: 'XML', value: 'xml' },
              { label: 'YAML', value: 'yaml' },
            ],
          },
        ],
      },
      getExecutor: async () => {
        const { createOmniParseTipExecutor } = await import('@/tip/omni-parse-executor');
        return createOmniParseTipExecutor('normalize');
      },
    },
  ],
};

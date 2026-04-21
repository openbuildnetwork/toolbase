import { ToolMeta } from "@/types/tool-search";

export const omniParseConfig: ToolMeta = {
  id: 'omni-parse',
  name: 'OmniParse',
  description: 'Convert, validate, and format JSON/XML/YAML/TOML with visual schema and graph generation.',
  longDescription:
    'OmniParse is a browser-native structured data toolkit for converting formats, validating payloads, formatting content, and generating markdown or graph documentation from JSON, XML, and YAML.',
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
};

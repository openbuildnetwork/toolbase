import { ToolMeta } from "@/types/tool-search";

export const base64Config: ToolMeta = {
  id: 'base64',
  name: 'Base64',
  description: 'Encode and decode text, files and images to and from Base64.',
  longDescription:
    'Instantly encode any text, file or image to Base64, or decode Base64 strings back to their original form. Supports URL-safe Base64, handles binary files, and processes everything locally with no size limits imposed by server uploads.',
  category: 'developer',
  route: 'base64',
  thumbnail: '/assets/thumbnails/b64EnDc.png',
  tags: ['base64', 'encode', 'decode', 'binary', 'text', 'image', 'file', 'url-safe'],
  isNew: false,
  isFeatured: false,
  wasmPowered: false,
  pythonPowered: false,
  status: 'stable',
  addedAt: '2025-01-01',
};

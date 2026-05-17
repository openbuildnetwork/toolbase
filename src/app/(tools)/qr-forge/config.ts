import { ToolMeta } from "@/types/tool-search";

export const qrForgeConfig: ToolMeta = {
  id: 'qr-forge',
  name: 'QR Forge',
  description: 'Complete toolkit to generate and decode QR codes entirely locally.',
  longDescription:
    'Four modes to handle everything QR: encode URLs or text into clean vectors, scan QR codes from images to extract links, embed custom logos directly into your QR codes, or clean up scanned QR codes into perfect PNGs.',
  category: 'developer',
  route: 'qr-forge',
  thumbnail: '/assets/thumbnails/qr-forge.png', // We'll assume a thumbnail exists or falls back
  tags: ['qr', 'qrcode', 'barcode', 'scan', 'decode', 'encode', 'logo', 'generator'],
  isNew: true,
  isFeatured: false,
  wasmPowered: false,
  pythonPowered: false,
  status: 'stable',
  addedAt: '2026-05-14',
  mobileOptimized: true,
  tip: [
    {
      id: 'qr-forge/generate',
      name: 'Generate QR Code',
      description: 'Generate a QR code from text or URL with optional logo overlay.',
      consumes: ['text/plain', 'image/png', 'image/jpeg', 'image/webp'], // Can consume text or image (logo)
      produces: ['image/png'],
      mobileOptimized: true,
      configSchema: {
        fields: [
          { key: 'text', label: 'Content', type: 'string', default: 'https://toolbase.in', description: 'URL or text to encode' }
        ]
      },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { qrForgeWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(
          qrForgeWorker,
          'generate',
          (uint8, config) => ({
            data: uint8,
            text: config.text
          }),
          () => 'image/png',
          'Generate QR Code'
        );
      }
    },
    {
      id: 'qr-forge/decode',
      name: 'Decode QR Code',
      description: 'Decode a QR code from an image file.',
      consumes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      produces: ['text/plain'],
      mobileOptimized: true,
      configSchema: {
        fields: []
      },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { qrForgeWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(
          qrForgeWorker,
          'decode',
          (uint8) => ({
            data: uint8
          }),
          () => 'text/plain',
          'Decode QR Code'
        );
      }
    }
  ]
};

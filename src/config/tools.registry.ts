// src/config/tools.registry.ts
// ============================================================
// SINGLE SOURCE OF TRUTH for all Toolbase tools.
// To add a new tool: add one entry to the TOOLS array below.
// Do NOT hardcode tool metadata anywhere else in the codebase.
// ============================================================


import { ToolCategory, ToolMeta } from "@/types/tool-search";

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
    route: 'magic-pdf',
    thumbnail: '/assets/thumbnails/magic-pdf.png',
    tags: ['pdf', 'compress', 'merge', 'split', 'protect', 'sign', 'convert', 'word', 'image'],
    isNew: false,
    isFeatured: true,
    wasmPowered: true,
    pythonPowered: true,
    status: 'stable',
    addedAt: '2025-01-01',
    tip: [
      {
      id: 'magic-pdf/compress',
      name: 'Compress PDF',
      description: 'Reduce PDF file size while preserving quality.',
      consumes: ['application/pdf'],
      produces: ['application/pdf'],
      configSchema: { fields: [
      {
        key: 'quality',
        label: 'Quality',
        type: 'number',
        default: 75,
        min: 1,
        max: 100,
        step: 1,
        unit: '%',
        description: 'Higher = better quality, larger file.',
      },
    ] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { magicPdfWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(magicPdfWorker, 'compress', (b, c) => ({ file_bytes: b, ...c }), () => 'application/pdf', 'Compress PDF');
      }
    },
      {
      id: 'magic-pdf/split',
      name: 'Split PDF',
      description: 'Split a PDF into individual pages or custom page ranges.',
      consumes: ['application/pdf'],
      produces: ['application/pdf'],
      configSchema: { fields: [
      {
        key: 'pageRanges',
        label: 'Page Ranges',
        type: 'string',
        default: '',
        description:
          'Comma-separated ranges e.g. "1-3,5,7-9". Leave blank to split every page.',
      },
    ] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { magicPdfWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(magicPdfWorker, 'split', (b, c) => ({ file_bytes: b, page_ranges: c.pageRanges || '' }), () => 'application/pdf', 'Split PDF');
      }
    },
      {
      id: 'magic-pdf/merge',
      name: 'Merge PDFs',
      description: 'Merge multiple PDF files into a single PDF document.',
      consumes: ['application/pdf'],
      produces: ['application/pdf'],
      configSchema: { fields: [] },
      // INP: requires user interaction to set file order before execution
      interactable: true as const,
      getInteractionComponent: async () => {
        const { default: MergePdf } = await import('@/components/features/magic-pdf/MergePdf');
        return MergePdf;
      },
      getExecutor: async () => {
        const { createBatchTIPExecutor } = await import('@/tip/executor');
        const { magicPdfWorker } = await import('@/workers/instances');
        return createBatchTIPExecutor(magicPdfWorker, 'merge', (b, c) => ({ files_bytes: b, ...c }), () => 'application/pdf', 'Merge PDFs', 'merged.pdf');
      }
    },
      {
      id: 'magic-pdf/protect',
      name: 'Protect PDF',
      description: 'Password-protect a PDF so it requires a password to open.',
      consumes: ['application/pdf'],
      produces: ['application/pdf'],
      configSchema: { fields: [
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        default: '',
        required: true,
        description: 'The password required to open the protected PDF.',
      },
    ] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { magicPdfWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(magicPdfWorker, 'protect', (b, c) => ({ file_bytes: b, ...c, permissions: typeof c.permissions === 'string' ? JSON.parse(c.permissions) : c.permissions }), () => 'application/pdf', 'Protect PDF');
      }
    },
      {
      id: 'magic-pdf/pdf-to-images',
      name: 'PDF to Images',
      description: 'Convert each PDF page to a PNG image. Output is one image per page.',
      consumes: ['application/pdf'],
      produces: ['image/png'],
      configSchema: { fields: [
      {
        key: 'dpi',
        label: 'Resolution',
        type: 'number',
        default: 150,
        min: 72,
        max: 600,
        step: 1,
        unit: 'DPI',
        description: 'Higher DPI = sharper images, larger files.',
      },
    ] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { magicPdfWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(magicPdfWorker, 'pdf_to_images', (b, c) => ({ file_bytes: b, image_format: 'png', ...c }), () => 'image/png', 'PDF to Images');
      }
    },
      {
      id: 'magic-pdf/html-to-pdf',
      name: 'HTML to PDF',
      description: 'Convert an HTML document into a PDF file.',
      consumes: ['text/html'],
      produces: ['application/pdf'],
      configSchema: { fields: [
      {
        key: 'pageSize',
        label: 'Page Size',
        type: 'select',
        default: 'A4',
        options: [
          { label: 'A4', value: 'A4' },
          { label: 'Letter', value: 'Letter' },
          { label: 'Legal', value: 'Legal' },
        ] }
      ] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { magicPdfWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(magicPdfWorker, 'html_to_pdf', (b, c) => ({ file_bytes: b, page_size: c.pageSize, ...c }), () => 'application/pdf', 'HTML to PDF');
      }
    },
      {
      id: 'magic-pdf/images-to-pdf',
      name: 'Images to PDF',
      description: 'Convert multiple images into a single PDF document.',
      consumes: ['image/png', 'image/jpeg', 'image/webp'],
      produces: ['application/pdf'],
      configSchema: { fields: [] },
      getExecutor: async () => {
        const { createBatchTIPExecutor } = await import('@/tip/executor');
        const { magicPdfWorker } = await import('@/workers/instances');
        return createBatchTIPExecutor(magicPdfWorker, 'images_to_pdf', (b, c) => ({ files_bytes_list: b, ...c }), () => 'application/pdf', 'Images to PDF', 'images.pdf');
      }
    },
      {
      id: 'magic-pdf/pdf-to-word',
      name: 'PDF to Word',
      description: 'Convert a PDF into an editable Word Document.',
      consumes: ['application/pdf'],
      produces: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      configSchema: { fields: [] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { magicPdfWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(magicPdfWorker, 'pdf_to_word', (b, c) => ({ file_bytes: b, ...c }), () => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'PDF to Word');
      }
    }
    ]
  },
  {
    id: 'pixel-axe',
    name: 'Pixel Axe',
    description: 'Compress, resize, upscale images and hide messages with steganography.',
    longDescription:
      'Pixel Axe is a powerful image processing toolkit. Compress images without visible quality loss, resize to exact dimensions, upscale with AI-like algorithms, and even hide secret messages inside images using steganography — all processed locally in your browser.',
    category: 'image',
    route: 'pixel-axe',
    thumbnail: '/assets/thumbnails/pixel-axe.png',
    tags: ['image', 'compress', 'resize', 'upscale', 'steganography', 'png', 'jpg', 'webp'],
    isNew: false,
    isFeatured: true,
    wasmPowered: true,
    pythonPowered: true,
    status: 'stable',
    addedAt: '2025-01-01',
    tip: [
      {
      id: 'pixel-axe/compress',
      name: 'Compress Images',
      description: 'Compress PNG, JPEG, or WebP images to reduce file size.',
      consumes: ['image/png', 'image/jpeg', 'image/webp'],
      produces: ['image/png', 'image/jpeg', 'image/webp'],
      configSchema: { fields: [
      {
        key: 'quality',
        label: 'Quality',
        type: 'number',
        default: 80,
        min: 1,
        max: 100,
        step: 1,
        unit: '%',
        description: 'Higher = better quality, larger file.',
      },
      {
        key: 'format',
        label: 'Output Format',
        type: 'select',
        default: 'JPEG',
        options: [
          { label: 'JPEG', value: 'JPEG' },
          { label: 'PNG',  value: 'PNG'  },
          { label: 'WEBP', value: 'WEBP' },
        ],
        description: 'Output image format.',
      },
      {
        key: 'resizeFactor',
        label: 'Image Scale',
        type: 'number',
        default: 1.0,
        min: 0.1,
        max: 1.0,
        step: 0.1,
        unit: '×',
        description: 'Scale the image before compression (1.0 = original size).',
      },
      {
        key: 'enhance',
        label: 'Auto Enhance',
        type: 'boolean',
        default: false,
        description: 'Apply subtle auto-enhancement to contrast and sharpness.',
      },
      {
        key: 'stripMetadata',
        label: 'Strip Metadata',
        type: 'boolean',
        default: true,
        description: 'Remove GPS, camera, and EXIF data from the output image.',
      },
    ] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { pixelAxeWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(
          pixelAxeWorker,
          'compress',
          // Explicit mapping: JS camelCase → Python snake_case
          (buffer, config) => ({
            image_data:      buffer,
            quality:         config.quality,
            format:          config.format,
            resize_factor:   config.resizeFactor,
            enhance:         config.enhance,
            strip_metadata:  config.stripMetadata,
          }),
          (payload, config) => (config.format ? `image/${String(config.format).toLowerCase()}` as any : payload.contentType),
          'Compress Images'
        );
      }
    },
      {
      id: 'pixel-axe/resize',
      name: 'Resize Images',
      description: 'Resize images to a specific width and height.',
      consumes: ['image/png', 'image/jpeg', 'image/webp'],
      produces: ['image/png', 'image/jpeg', 'image/webp'],
      configSchema: { fields: [
      {
        key: 'width',
        label: 'Width',
        type: 'number',
        default: 1920,
        min: 1,
        max: 8192,
        step: 1,
        unit: 'px',
      },
      {
        key: 'height',
        label: 'Height',
        type: 'number',
        default: 1080,
        min: 1,
        max: 8192,
        step: 1,
        unit: 'px',
      },
      {
        key: 'quality',
        label: 'Quality',
        type: 'number',
        default: 90,
        min: 1,
        max: 100,
        step: 1,
        unit: '%',
      },
      {
        key: 'format',
        label: 'Output Format',
        type: 'select',
        default: 'JPEG',
        options: [
          { label: 'JPEG', value: 'JPEG' },
          { label: 'PNG',  value: 'PNG'  },
          { label: 'WEBP', value: 'WEBP' },
        ],
      },
      {
        key: 'mode',
        label: 'Fit Mode',
        type: 'select',
        default: 'stretch',
        options: [
          { label: 'Stretch (exact fit)', value: 'stretch' },
          { label: 'Contain (letterbox)', value: 'contain' },
        ],
      },
      {
        key: 'fillColor',
        label: 'Fill Color',
        type: 'string',
        default: 'transparent',
        description: 'Background fill color when fit mode is Contain (hex or "transparent").',
      },
    ] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { pixelAxeWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(
          pixelAxeWorker,
          'resize',
          // Explicit mapping: JS camelCase → Python snake_case
          (buffer, config) => ({
            image_data:  buffer,
            width:       config.width,
            height:      config.height,
            quality:     config.quality,
            format:      config.format,
            mode:        config.mode,
            fill_color:  config.fillColor,
          }),
          (payload, config) => (config.format ? `image/${String(config.format).toLowerCase()}` as any : payload.contentType),
          'Resize Images'
        );
      }
    },
      {
      id: 'pixel-axe/upscale',
      name: 'Upscale Images',
      description: 'Upscale images to a larger size with quality enhancement. Always outputs PNG.',
      consumes: ['image/png', 'image/jpeg', 'image/webp'],
      produces: ['image/png'],
      configSchema: { fields: [
      {
        key: 'resizeFactor',
        label: 'Scale Factor',
        type: 'number',
        default: 2.0,
        min: 1.0,
        max: 4.0,
        step: 0.25,
        unit: '×',
        description: 'How much to enlarge the image.',
      },
      {
        key: 'quality',
        label: 'Quality',
        type: 'number',
        default: 90,
        min: 1,
        max: 100,
        step: 1,
        unit: '%',
        description: 'Output image quality.',
      },
      {
        key: 'format',
        label: 'Output Format',
        type: 'select',
        default: 'PNG',
        options: [
          { label: 'PNG',  value: 'PNG'  },
          { label: 'JPEG', value: 'JPEG' },
          { label: 'WEBP', value: 'WEBP' },
        ],
        description: 'Output image format (PNG recommended for quality).',
      },
      {
        key: 'denoise',
        label: 'Reduce Noise',
        type: 'boolean',
        default: false,
        description: 'Apply median filter to smooth grain.',
      },
      {
        key: 'vibrant',
        label: 'Vibrant Colors',
        type: 'boolean',
        default: false,
        description: 'Boost saturation and contrast for punchier colors.',
      },
      {
        key: 'printDpi',
        label: 'Print Ready (300 DPI)',
        type: 'boolean',
        default: false,
        description: 'Set output DPI to 300 for print-quality output.',
      },
    ] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { pixelAxeWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(
          pixelAxeWorker,
          'compress',  // upscale goes through the 'compress' action in main.py (which routes to upscale_image when resize_factor > 1)
          // Explicit mapping: JS camelCase → Python snake_case
          (buffer, config) => ({
            image_data:    buffer,
            quality:       config.quality,
            format:        config.format,
            resize_factor: config.resizeFactor,
            enhance:       true,            // always true for upscale
            denoise:       config.denoise,
            vibrant:       config.vibrant,
            print_dpi:     config.printDpi,
          }),
          (payload, config) => (config.format ? `image/${String(config.format).toLowerCase()}` as any : 'image/png'),
          'Upscale Images'
        );
      }
    },
      {
      id: 'pixel-axe/hide-data',
      name: 'Hide Data in Image',
      description: 'Hide a secret text message inside an image using steganography. Optionally encrypt it with a password.',
      consumes: ['image/png', 'image/jpeg', 'image/webp'],
      produces: ['image/png'],
      configSchema: { fields: [
      {
        key: 'message',
        label: 'Secret Message',
        type: 'string',
        default: '',
        required: true,
      },
      {
        key: 'key',
        label: 'Encryption Key',
        type: 'string',
        default: '',
        description: 'Optional password to encrypt the message.',
      }
      ] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { pixelAxeWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(
          pixelAxeWorker,
          'hide_text',
          (buffer, config) => ({ image_data: buffer, ...config }),
          () => 'image/png',
          'Hide Data'
        );
      }
    },
      {
      id: 'pixel-axe/reveal-data',
      name: 'Reveal Data from Image',
      description: 'Extract and decrypt a hidden text message from an image.',
      consumes: ['image/png', 'image/jpeg', 'image/webp'],
      produces: ['text/plain'],
      configSchema: { fields: [
      {
        key: 'key',
        label: 'Decryption Key',
        type: 'string',
        default: '',
        description: 'Password to decrypt the message, if one was used during hiding.',
      }
      ] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { pixelAxeWorker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(
          pixelAxeWorker,
          'reveal_text',
          (buffer, config) => ({ image_data: buffer, ...config }),
          () => 'text/plain',
          'Reveal Data'
        );
      }
    }
    ]
  },
  {
    id: 'data-lens',
    name: 'Data Lens',
    description: 'Analyze CSV and JSON data with SQL queries, Python scripts and charts.',
    longDescription:
      'Data Lens turns your browser into a data analysis workbench. Load CSV or JSON files, run SQL queries against them, execute Python (Pandas, NumPy) for deep analysis, visualize with charts, and filter with a visual query builder. Your data stays completely local.',
    category: 'data',
    route: 'data-lens',
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
    route: 'redact-secrets',
    thumbnail: '/assets/thumbnails/redact-secrets.png',
    tags: ['redact', 'secrets', 'api-keys', 'passwords', 'tokens', 'security', 'privacy', 'scan'],
    isNew: false,
    isFeatured: true,
    wasmPowered: true,
    pythonPowered: true,
    status: 'stable',
    addedAt: '2025-01-01',
    tip: [
      {
      id: 'redact-secrets/redact',
      name: 'Redact Secrets',
      description: 'Scan and redact secrets, API keys, PII, and sensitive data from text or JSON.',
      consumes: ['text/plain', 'application/json'],
      produces: ['text/plain', 'application/json'],
      configSchema: { fields: [
      {
        key: 'maskingStyle',
        label: 'Masking Style',
        type: 'select',
        default: 'partial',
        options: [
          { label: 'Partial (show first/last chars)', value: 'partial' },
          { label: 'Full (replace entirely)',         value: 'full'    },
          { label: 'Hash (SHA-256 digest)',            value: 'hash'   },
        ] }
      ] },
      getExecutor: async () => {
        const mod = await import('@/features/redact-secrets/tip/redact.tip');
        return mod.redactSecretsTool.invoke;
      }
    }
    ]
  },
  {
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
    tip: [
      {
      id: 'base64/encode',
      name: 'Base64 Encode',
      description: 'Encode binary or text data as a Base64 string.',
      consumes: ['application/octet-stream', 'text/plain'],
      produces: ['text/plain'],
      configSchema: { fields: [
      {
        key: 'urlSafe',
        label: 'URL-Safe Encoding',
        type: 'boolean',
        default: false,
        description: 'Use URL-safe Base64 alphabet (replaces + and / with - and _).',
      },
    ] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { base64Worker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(
          base64Worker, 
          'PROCESS', 
          (buffer, config) => ({ mode: 'file_encode', data: Array.from(buffer), url_safe: config.urlSafe }),
          () => 'text/plain', 
          'Base64 Encode'
        );
      }
    },
      {
      id: 'base64/decode',
      name: 'Base64 Decode',
      description: 'Decode a Base64 string back to its original binary or text data.',
      consumes: ['text/plain'],
      produces: ['application/octet-stream'],
      configSchema: { fields: [
      {
        key: 'urlSafe',
        label: 'URL-Safe Decoding',
        type: 'boolean',
        default: false,
        description: 'Use URL-safe Base64 alphabet when decoding (- and _ instead of + and /).',
      },
    ] },
      getExecutor: async () => {
        const { createPerPayloadTIPExecutor } = await import('@/tip/executor');
        const { base64Worker } = await import('@/workers/instances');
        return createPerPayloadTIPExecutor(
          base64Worker, 
          'PROCESS', 
          (buffer, config) => {
            // Read string from buffer
            const text = new TextDecoder().decode(buffer);
            return { mode: 'text_decode', data: text, url_safe: config.urlSafe };
          },
          () => 'application/octet-stream', 
          'Base64 Decode'
        );
      }
    }
    ]
  },
  {
    id: 'json-to-interface',
    name: 'JSON to Interface',
    description: 'Convert any JSON object into TypeScript interfaces instantly.',
    longDescription:
      'Paste any JSON and instantly get a typed TypeScript interface. Handles nested objects, arrays, optional fields, and complex structures. Saves developers hours of manual type writing. Runs entirely in the browser — paste sensitive API responses without worry.',
    category: 'developer',
    route: 'json-to-interface',
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
    route: 'open-draw',
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
    route: 'ping-tester',
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
    route: 'speed-test',
    thumbnail: '/assets/thumbnails/speed-test.png',
    tags: ['speed', 'network', 'internet', 'download', 'upload', 'bandwidth', 'test'],
    isNew: false,
    isFeatured: false,
    wasmPowered: false,
    pythonPowered: false,
    status: 'beta',
    addedAt: '2025-01-01',
  },
  {
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
  },
  {
    id: 'passwordx',
    name: 'PasswordX',
    description: 'Generate secure passwords and test their strength.',
    longDescription:
      'Generate secure passwords and test their strength. Get accurate results directly in your browser without installing any extensions or apps.',
    category: 'security',
    route: 'passwordx',
    thumbnail: '/assets/thumbnails/passwordx.png',
    tags: ['password', 'security', 'generate', 'test', 'secure', 'passwordx'],
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
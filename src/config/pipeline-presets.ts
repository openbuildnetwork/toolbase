/**
 * Pipeline Presets
 * 4 ready-to-use pipeline definitions that ship with Toolbase.
 * Each preset is a valid PipelineDefinition — loadable directly into the builder.
 */

import type { PipelineDefinition } from '@/types/pipeline';
import { TIP_VERSION } from '@/tip/version';

// ─── Preset 1: Compress & Protect PDF ────────────────────────────────────────
// Simple, powerful. The go-to preset for anyone sharing a PDF securely.

export const presetCompressAndProtect: PipelineDefinition = {
  id: 'preset-compress-protect',
  name: 'Compress & Protect PDF',
  description: 'Shrink your PDF then lock it with a password — ideal before sharing.',
  isPreset: true,
  tipVersion: TIP_VERSION,
  createdAt: '2025-01-01T00:00:00.000Z',
  steps: [
    {
      id: 'step-1',
      toolId: 'magic-pdf/compress',
      config: { quality: 75 },
    },
    {
      id: 'step-2',
      toolId: 'magic-pdf/protect',
      config: { password: '' }, // User fills this in the config panel
    },
  ],
};

// ─── Preset 2: PDF to Web-Ready Images ───────────────────────────────────────
// The 3-step showcase preset. Uses THE BRIDGE tool (pdf-to-images) proving
// TIP can chain across completely different tool families.

export const presetPdfToWebImages: PipelineDefinition = {
  id: 'preset-pdf-to-web-images',
  name: 'PDF to Web-Ready Images',
  description: 'Convert a PDF to compressed images — perfect for embedding on the web.',
  isPreset: true,
  tipVersion: TIP_VERSION,
  createdAt: '2025-01-01T00:00:00.000Z',
  steps: [
    {
      id: 'step-1',
      toolId: 'magic-pdf/compress',
      config: { quality: 80 },
    },
    {
      id: 'step-2',
      toolId: 'magic-pdf/pdf-to-images',
      config: { dpi: 150 },
    },
    {
      id: 'step-3',
      toolId: 'pixel-axe/compress',
      config: { quality: 82, enhance: false },
    },
  ],
};

// ─── Preset 3: Shrink Everything ─────────────────────────────────────────────
// Aggressive compression at every step. Maximum size reduction.

export const presetShrinkEverything: PipelineDefinition = {
  id: 'preset-shrink-everything',
  name: 'Shrink Everything',
  description: 'Compress a PDF aggressively then compress each output image too.',
  isPreset: true,
  tipVersion: TIP_VERSION,
  createdAt: '2025-01-01T00:00:00.000Z',
  steps: [
    {
      id: 'step-1',
      toolId: 'magic-pdf/compress',
      config: { quality: 60 },
    },
    {
      id: 'step-2',
      toolId: 'magic-pdf/pdf-to-images',
      config: { dpi: 120 },
    },
    {
      id: 'step-3',
      toolId: 'pixel-axe/compress',
      config: { quality: 70, enhance: false },
    },
  ],
};

// ─── Preset 4: Sanitize Text File ────────────────────────────────────────────
// Proves cross-family chaining works: text → redact → base64 encode
// Two completely unrelated tool families chained automatically via TIP.

export const presetSanitizeText: PipelineDefinition = {
  id: 'preset-sanitize-text',
  name: 'Sanitize Text File',
  description: 'Redact secrets from a text file then Base64-encode it for safe sharing.',
  isPreset: true,
  tipVersion: TIP_VERSION,
  createdAt: '2025-01-01T00:00:00.000Z',
  steps: [
    {
      id: 'step-1',
      toolId: 'redact-secrets/redact',
      config: { maskingStyle: 'full' },
    },
    {
      id: 'step-2',
      toolId: 'base64/encode',
      config: { urlSafe: false },
    },
  ],
};

// ─── All Presets ──────────────────────────────────────────────────────────────

export const PIPELINE_PRESETS: PipelineDefinition[] = [
  presetCompressAndProtect,
  presetPdfToWebImages,
  presetShrinkEverything,
  presetSanitizeText,
];

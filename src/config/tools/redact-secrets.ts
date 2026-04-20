import { ToolMeta } from "@/types/tool-search";

export const redactSecretsConfig: ToolMeta = {
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
  pythonPowered: false,
  status: 'stable',
  addedAt: '2025-01-01',
};

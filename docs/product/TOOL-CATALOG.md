# Tool Catalog

Product-level inventory of registered tools. Update this file whenever tools are added, renamed, or removed.

## Current tools

| ID | Name | Category | Route | Engine |
|----|------|----------|-------|--------|
| `note-vault` | NoteVault | developer | `/note-vault` | Browser |
| `magic-pdf` | Magic PDF | pdf | `/magic-pdf` | Pyodide |
| `pixels` | Pixels | image | `/pixels` | Pyodide |
| `data-lens` | Data Lens | data | `/data-lens` | Pyodide |
| `redact-secrets` | Redact Secrets | security | `/redact-secrets` | Rust WASM |
| `base64` | Base64 | developer | `/base64` | Browser |
| `json-to-interface` | JSON to Interface | developer | `/json-to-interface` | Browser |
| `open-draw` | Open Draw | drawing | `/open-draw` | Pyodide |
| `ping-tester` | Ping Tester | network | `/ping-tester` | Browser |
| `speed-test` | Speed Test | network | `/speed-test` | Browser |
| `pipeline` | Pipeline Builder | developer | `/pipeline` | Pyodide + WASM (TIP) |
| `passwordx` | PasswordX | security | `/passwordx` | Browser |
| `format-studio` | Format Studio | data | `/format-studio` | Browser |
| `data-builder` | DataBuilder | data | `/data-builder` | Browser |
| `archive-kit` | Archive Kit | developer | `/archive-kit` | Rust WASM |
| `qr-forge` | QR Forge | developer | `/qr-forge` | Browser |

## Source of truth

Runtime metadata and search:

- `src/config/tools.registry.ts`
- Per-tool config: `src/app/(tools)/<tool>/config.ts`

## Governance rule

Any tool addition, rename, or route change must update:

1. `src/config/tools.registry.ts` and the tool's `config.ts`
2. Route under `src/app/(tools)/<tool>/`
3. This catalog
4. Root `README.md` tools table (summary)
5. `docs/architecture/ARCHITECTURE.md` scope list when the product surface changes

## Retired names

These names are no longer in the registry:

- **Pixel Axe** → **Pixels** (`pixels`)
- **OmniParse** → removed (use **Format Studio** for JSON/XML formatting utilities)
- **Data Forge** → removed (use **DataBuilder** for mock data generation)

# OmniParse

OmniParse is a browser-only data utility for converting, validating, and documenting structured data. It is designed for privacy: all parsing and transformation runs locally in your browser.

## What It Does

- Convert: transform between JSON, XML, YAML, and TOML.
- Validators & Formatters: auto-detect format, validate syntax, beautify/minify, and sort keys.
- Generator Hub: generate Markdown documentation from a JSON object structure.

## Convert

Supported formats:
- Input: `json`, `xml`, `yaml`, `toml`
- Output: `json`, `xml`, `yaml`, `toml`

Notes:
- XML attributes are represented using the `@_` prefix (from `fast-xml-parser`). This makes XML round-trips possible but the JSON shape may look slightly “annotated”.
- Conversions are “structure preserving” where possible, but some conversions are inherently lossy (for example, XML does not have a native array/object distinction the same way JSON does).

## Validators & Formatters

Auto-detect:
- The tool attempts to identify the input as JSON, then XML, then YAML.
- The detected type is displayed as a pill next to the Valid/Invalid status.

Actions:
- Beautify: pretty-prints the detected format.
- Minify: compacts JSON (other formats use their standard serializer).
- Sort Keys: sorts object keys (best for JSON/YAML). Useful for stable diffs and reviews.

Validation:
- JSON: parses JSON and reports syntax errors.
- XML: checks for well-formed XML (XSD validation is not supported in the current in-browser implementation).
- YAML: parses YAML and reports syntax errors.

## Generator Hub (Auto-Documentation)

Auto-Documentation:
- Paste a JSON object and generate a basic Markdown “shape” document (keys and inferred types).
- This is intended to produce quick human-readable docs for payloads and configs.

## Related Tool

Mock data generation (flat fields + constraints, and advanced blueprint-driven generation) lives in the separate OBN tool:
- `Mock Data Engine` (`/tools/data-forge`)

## Tech Notes

This tool is client-side only:
- Next.js UI with Monaco editor for editing and highlighting.
- Parsing/serialization libraries: `yaml`, `@iarna/toml`, `fast-xml-parser`.
- JSON Schema enforcement is not currently exposed in the OmniParse UI (syntax validation is).

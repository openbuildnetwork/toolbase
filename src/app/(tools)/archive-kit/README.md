# Archive Kit

Archive Kit is a browser-local archive utility for ZIP and TAR workflows.

## Features
1. Create archives from selected files (`.zip` or `.tar`).
2. Inspect archive contents (list entries and sizes).
3. Extract files from archives and save locally.

## Privacy
All processing runs in the browser. No files are uploaded.

## Notes
1. ZIP creation currently uses the `store` method (no compression) for broad compatibility.
2. ZIP extraction supports stored files and deflate entries when browser `DecompressionStream` is available.
3. Archive Kit can use an optional Rust WASM engine when built.

## Optional Rust Engine
Rust source lives in:
- `rust/archive-kit`

Manual build command:
```bash
npm run build:archive-kit:wasm
```

This generates browser artifacts under:
- `public/wasm/archive-kit/pkg`

At runtime, the tool auto-detects the Rust engine and falls back to TypeScript if unavailable.

## Dev Workflow (project-wide)
`npm run dev` now starts:
1. Next.js dev server
2. Python bundle watcher
3. Rust WASM watcher (`rust/**` -> `public/wasm/**`)

When Rust files change, WASM artifacts are rebuilt automatically.

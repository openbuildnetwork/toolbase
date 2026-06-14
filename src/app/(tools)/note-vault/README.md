# NoteVault

## Purpose
A developer-centric local note-taking app that treats notes as typed, structured artifacts, featuring a premium Markdown editor with a live preview pane, formatting toolbar, and multi-file drag-and-drop import.

## Inputs
- Raw text (Markdown, JSON, XML, Code, etc.)
- Auto-detect formats when pasting or importing files
- Drag and drop files (`.md`, `.txt`, `.json`, etc.) directly into the workspace
- File import via manual picker

## Outputs
- Download files in their raw formats (.json, .md, .txt)
- Live Markdown preview modes (Write, Split, Preview)
- View parsed content and metadata
- Export collections to ZIP

## Limits
- IndexedDB storage limits apply (usually gigs of data allowed, but bound by browser constraints).
- Designed for snippets and textual configuration, not multi-gigabyte files.

## Privacy Guarantee
All processing, format detection, conversions, and storage happen entirely client-side using Web Workers and IndexedDB. Nothing is ever sent to a server.

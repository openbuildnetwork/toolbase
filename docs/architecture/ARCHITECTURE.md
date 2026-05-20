# Toolbase Architecture

## Scope
This architecture applies to the full product and all registered tools (see [`docs/product/TOOL-CATALOG.md`](../product/TOOL-CATALOG.md)), including:

NoteVault, Magic PDF, Pixels, Data Lens, Redact Secrets, Base64, JSON to Interface, Open Draw, Ping Tester, Speed Test, Pipeline Builder, PasswordX, Format Studio, DataBuilder, Archive Kit, and QR Forge.

## Principles
1. Local-first processing (privacy by default).
2. Thin route layer, feature logic in modules.
3. Shared UX and error semantics across tools.
4. Predictable boundaries between product code and runtime infrastructure.
5. Incremental migration without breaking existing routes.

## Key References
1. [Rust and WebAssembly in Toolbase](./RUST-WASM-IN-TOOLBASE.md)
2. [Migration Plan](./migration-plan.md)

## Target Package Structure
```text
src/
  app/                      # Next.js routes only (thin composition)
    (tools)/
      <tool>/page.tsx
      <tool>/layout.tsx

  modules/                  # feature modules by tool
    magic-pdf/
      ui/
      hooks/
      lib/
      types.ts
      index.ts
    pixel-axe/
    data-lens/
    redact-secrets/
    open-draw/
    base64/
    json-to-interface/
    ping-tester/
    speed-test/
    passwordx/
    omni-parse/
    data-forge/

  shared/                   # reusable cross-tool code
    ui/
    hooks/
    lib/
    types/
    config/

  platform/                 # runtime and infrastructure concerns
    workers/
    python/
    performance/
    storage/
```

## Dependency Rules
Allowed:
1. `app -> modules`
2. `modules -> shared`
3. `modules -> platform`
4. `shared -> shared`
5. `platform -> shared`

Disallowed:
1. `shared -> modules`
2. `module A -> module B` (cross-module direct import)
3. `app -> platform` (except framework bootstrapping)

## UI Shell Standard
All tools use the same shell contract:
1. Left tool sidebar.
2. Top context header.
3. Full-width content panel (within main area).
4. Standard status, error, empty, and loading blocks.

Reference: `docs/architecture/standards/ui-shell.md`

## Error Model Standard
All tools should expose a normalized operation result:
```ts
type OperationResult<T> = {
  ok: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
};
```

Reference: `docs/architecture/standards/error-handling.md`

## Testing Strategy
1. Unit tests for `modules/*/lib`.
2. Integration tests for tool workflows.
3. Visual regression tests for tool shells.

Reference: `docs/architecture/standards/testing-strategy.md`

# Release Process

## Release criteria

1. Local or CI checks pass on the target branch: `pnpm lint`, `pnpm type-check`, and `pnpm build` (or `pnpm build:strict-wasm` when `rust/` crates changed).
2. Tool metadata and route integrity verified (`src/config/tools.registry.ts`).
3. PWA behavior validated (cache and update path) when service worker or assets changed.
4. Critical tool smoke tests completed (see below).

## Pre-release checklist

1. Confirm no broken tool routes.
2. Validate no stale or misleading tool descriptions in registry configs.
3. Confirm privacy-first behavior for changed tools (no new server-side data paths).
4. Update docs for architecture, catalog, or deployment changes.
5. If infra or domains changed, coordinate with **toolbase-infra** (Terraform variables, ACM, secrets).

## Shipping

| Target | Action |
|--------|--------|
| **Production** | Merge to `main` in toolbase → app workflow dispatches infra deploy |
| **Development** | Merge to `dev` in toolbase-infra (or push `dev` on app + infra per [DEPLOYMENT.md](./DEPLOYMENT.md)) |

Details: [DEPLOYMENT.md](./DEPLOYMENT.md).

## Post-release checks

1. Open the deployed URL and verify home + tool navigation.
2. Smoke-test critical tools:
   - **Magic PDF** (compress or merge)
   - **Data Lens** (load sample CSV)
   - **Pixels** (compress image)
   - **Pipeline Builder** (open editor)
   - **Archive Kit** (create/extract archive if WASM changed)
3. Confirm worker- and WASM-based tools initialize without console errors.
4. After CDN deploy, hard-refresh once to avoid stale cached bundles.

## Rollback

Revert the offending commit on `main` (or `dev`) and push to trigger a redeploy. See [DEPLOYMENT.md](./DEPLOYMENT.md) for infra-specific rollback notes.

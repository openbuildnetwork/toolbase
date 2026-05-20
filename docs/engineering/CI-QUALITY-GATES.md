# CI and Quality Gates

## Local gates (required before merge)

Run from the toolbase repo root:

```bash
pnpm install
pnpm lint
pnpm type-check
```

For changes touching `rust/` or WASM consumers:

```bash
pnpm build:strict-wasm
```

Otherwise a standard production build check is enough:

```bash
pnpm build
```

## GitHub Actions (toolbase)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | Push to `main` | Dispatch deploy to **toolbase-infra** (not a lint gate) |

There is no separate lint workflow in this repo yet; contributors must run the local gates above. Infra runs the full `pnpm build` on deploy.

## GitHub Actions (toolbase-infra)

Deploy workflow builds the app and runs Terraform — see [DEPLOYMENT.md](../operations/DEPLOYMENT.md).

## Suggested future pipeline stages

1. `lint`
2. `type-check`
3. `build` or `build:strict-wasm`
4. `unit-tests` (as introduced per module)
5. `integration-tests`
6. `visual-regression` (for changed tool UI)

## Merge rules

1. No failing local gate.
2. No architecture boundary violation.
3. Registry metadata must stay accurate.
4. Docs updated for behavior, architecture, or deployment changes.


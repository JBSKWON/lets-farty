# Architecture

The repository currently contains design documents, agent instructions, and a verification harness. There is no mobile app, share page, API deployment, or product package yet. The [approved layering design](doc/design/completed/2026-10-15-lightweight-layering-design.md) owns the boundary rationale; the [MVP design](doc/design/active/2026-10-14-lets-farty-mvp-design.md) retains pending product and stack decisions.

## Existing components

- `tools/verify.mjs` checks Node/npm versions, runs fixture tests, then scans architecture, Markdown links/lifecycle, and formatting. Any failed child ends verification with exit 1.
- `tools/architecture/graph.mjs` discovers source under existing `apps/`, `services/`, and `packages/` directories and resolves imports with dependency-cruiser. Each source group uses its nearest `tsconfig.json`, including inherited settings. Relative imports, aliases, package exports, type-only imports, re-exports, and literal dynamic imports enter the same graph.
- `tools/architecture/policy.mjs` owns the executable allowed-edge table, external allowlists, public module entries, and cycle checks. Unknown project areas and unresolved imports fail visibly. Test source follows its area's boundary rules; production cycles are rejected.
- `tools/architecture/source-checks.mjs` uses TypeScript's AST to reject computed module loading and ambient runtime access in portable/business code. Direct use of `process`, `fetch`, `globalThis`, `window`, or `global` is conservatively rejected there, including aliases and shadowed identifiers. Pass providers/configuration under explicit domain names. Computed loaders, `eval`, and `Function` are forbidden throughout checked source. These static rules are not a security sandbox.
- `tools/docs/` checks Markdown paths/fragments/references and [document lifecycle rules](doc/README.md), using Markdown ASTs so examples do not become real metadata or links. External URLs are not fetched. Metadata checks do not establish approval or semantic accuracy.
- `.markdownlint-cli2.jsonc` owns Markdown style; `CLAUDE.md` alone is exempt from the first-heading rule because it imports `AGENTS.md`.
- `tools/test/` builds disposable repositories with the same resolver and policy used for project source. Fixtures prove rejection of forbidden imports even while product directories are absent.
- `.github/workflows/verify.yml` runs `npm ci` and the same `npm run verify` command on pushes and pull requests, using pinned action revisions and read-only repository permissions. Workflow configuration does not enable branch protection.

## Future product boundaries

These are proposed consumer locations, not existing components or empty scaffolds. See the approved design for its complete dependency table.

| Area | Boundary |
| --- | --- |
| `packages/contracts` | Schemas and derived types; external schema allowlist initially permits `zod` |
| `packages/scoring` | Portable deterministic calculations; contracts may be imported as types |
| `apps/mobile`, `apps/share` | Independent clients; no API-source imports or imports between apps |
| `services/api/src/modules/<domain>` | Domain business logic and provider interfaces; no direct cross-domain imports |
| Module `transport/` | Parse input and map outcomes; invoke its module's public business entry |
| API `adapters/` | Implement provider interfaces imported as types through module public entries |
| API `runtime/` | Configuration and composition; consume module `index` and `transport/index` entries |

The API remains one deployable service when it arrives. Ranking, sharing consent, private health data, and authorization correctness require their own behavioral and access-policy tests; architecture verification does not replace those checks. Platform launches remain part of the separate foundation app-shell milestone.

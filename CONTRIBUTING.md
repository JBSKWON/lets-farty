# Contributing

Read [AGENTS.md](AGENTS.md), the [architecture map](ARCHITECTURE.md), and the relevant design and execution plan before making changes. Follow the [documentation workflow](doc/README.md); update affected docs alongside implementation and record actual verification evidence in the active plan.

## Tooling setup

Install exactly Node.js 24.19.0 (also recorded in `.node-version`) and npm 11.9.0. With a Node version manager, select that file's version first. If needed, install the npm pin with `npm install --global npm@11.9.0`.

```sh
npm ci
npm run verify
```

The install requires registry access. Verification uses no product credentials or external services. The lockfile and exact dev dependency pins define the install; do not replace `npm ci` with an unbounded update. TypeScript is pinned to 6.0.3 because the chosen dependency-cruiser and compiler API require TypeScript below 7.

No application setup or launch commands exist yet. Expo/React Native and Supabase remain proposed product choices in the MVP design.

## Commands

| Command | Checks |
| --- | --- |
| `npm run verify` | Exact Node/npm pins, fixture tests, architecture, documentation, Markdown formatting |
| `npm test` | Runner behavior, graph/resolver/AST fixtures, documentation fixtures, and CLI exit codes |
| `npm run check:architecture` | Existing project source and tests under `apps/`, `services/`, `packages/` |
| `npm run check:docs` | Local Markdown links/anchors and document metadata/status/location |
| `npm run check:format` | Markdown style, including references and design/plan files |
| `git diff --check` | Diff whitespace errors |

Checks return nonzero when they fail. Architecture and docs CLIs also accept `--root PATH` for disposable repositories. A source-free architecture scan is valid; it does not replace fixture tests proving that forbidden edges fail.

## Boundary changes and tests

Use `tools/architecture/policy.mjs` for allowed edges and external allowlists; consult the approved design before changing that policy. Resolve relative, alias, package, and re-export forms to their actual destination. Do not suppress an unresolved dependency to make a check pass. Unsupported product source placements fail until their boundary is reviewed.

Add a failing fixture in `tools/test/architecture.test.mjs` or `tools/test/docs.test.mjs` before changing checker behavior. Keep product fixtures in temporary directories through `withRepository`; never leave artificial packages in the product tree. Tests obey the boundary of their production subject. New application features still need behavior, permission, platform, and access-policy tests in their own execution plans.

When a rule intentionally changes, record its rationale and approval scope in the design/plan and update the architecture map. Keep a narrowly scoped external allowlist rather than a generic SDK exception. Fix offending imports through contracts or runtime-injected providers instead of moving implementation into an allowed package to evade its responsibility.

## CI and evidence

GitHub Actions uses the same lockfile and root command. Record local commands/results separately from an actual remote Actions URL and conclusion. A configured workflow is not evidence of a successful remote run or enabled branch protection. Repository protections and deployment environments remain separate account configuration.

Before handoff, run verification, review the final diff, and update affected docs. The [active layering plan](doc/exec/active/2026-10-16-lightweight-layering-plan.md) records clean-install checks, deliberate-violation evidence, and remaining work. Keep required missing checks visible instead of marking a plan completed.

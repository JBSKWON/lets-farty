# Lightweight Layering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** 🟡 In progress

**Date:** 2026-10-16

**Updated:** 2026-10-16

**Next action:** Execute the remaining tasks inline and record local and remote verification evidence.

**Review:** Owner authorized implementation of this layering/tooling plan using inline execution on 2026-10-16; broader MVP choices remain pending.

**Lifecycle:** [Documentation rules](../../README.md)

**Goal:** Make dependency boundaries discoverable and mechanically checked, with the same reproducible verification command locally and in CI.

**Architecture:** Use dependency-cruiser to resolve the project graph and apply a shared boundary policy. Add a TypeScript AST check for computed module loading and ambient runtime access, and Markdown checks for links and document lifecycle. Test disposable repositories with the same checks used for real source; create product directories only when features consume them.

**Tech Stack:** Node.js 24.19.0, npm 11.9.0, JavaScript ES modules, Node's built-in test runner, dependency-cruiser, TypeScript's compiler API, markdownlint-cli2, unified/remark-parse/remark-gfm, and github-slugger. These are tooling choices for review, not approval of the proposed application stack.

**Spec:** [Lightweight layering design](../../design/completed/2026-10-15-lightweight-layering-design.md), with the [MVP bootstrap context](../../design/active/2026-10-14-lets-farty-mvp-design.md).

## Global Constraints

- “Retain one API deployment.”
- “Product directories are created with their consuming features.”
- “Rules apply to production and test source.”
- “Keep domains independent initially: one domain module cannot import another domain module.”
- “Reject dependency cycles across production source.”
- “The runtime is the composition root.”
- “Local and CI execution use the same command.”
- “Repository protection and deployment settings remain separate account configuration; this tooling change does not claim to enable them.”
- Preserve `doc/design/{active,completed}` and `doc/exec/{active,completed}`. Keep approval evidence separate from verification evidence.
- No mobile/API scaffolding, Supabase setup, product credentials, native launches, or deployment is included. The foundation milestone still requires its separate app-shell plan and checks.

## Review Focus

1. Alternate import syntax and resolution must not bypass boundaries: aliases, package exports, re-exports, type-only imports, literal dynamic imports, and `require` get equivalent checks (Task 2).
2. An empty checkout must pass honestly, while a newly added or unclassified source file must be scanned or rejected visibly (Tasks 1–2).
3. Portable/business code must not acquire runtime access through built-ins, SDKs, `process.env`, `import.meta.env`, global `fetch`, or computed loaders (Task 2).
4. Markdown examples must not become real links/metadata, and reference links, fragments, duplicate headings, and moved files must be checked correctly (Task 3).
5. A failed child check must fail the root command and CI; fixtures must never contaminate production discovery (Tasks 1 and 4).

## Starting state and decisions

- Base: `338a04d` on `set-up`; the working tree was clean when planning began. `main` has not been merged or modified by this planning task.
- Existing shared guidance (`AGENTS.md` and `CLAUDE.md`) is adopted already; extend it with runnable commands rather than recreate it.
- There is no package manifest, application source, CI workflow, or automated test suite. Node 24.19.0 and npm 11.9.0 were observed in this environment; remote installation and package compatibility have not been tested.
- Resolve dev dependency versions once in Task 1 using `--save-exact`; record the actual versions here and commit `package-lock.json`. Subsequent local/CI installs use `npm ci`, never unbounded installs. If a tool does not support the pinned runtime or required resolver behavior, record the concrete failure and revise this plan before substituting it.
- Use Node `.mjs` tooling so this slice does not require a product TypeScript build. Fixture projects have their own `package.json`/`tsconfig.json` and use a fixture package export for package-resolution tests.
- Diagnostics use `{file, line?, rule, message, suggestion}`; CLIs print `file[:line] [rule] message; suggestion` and return 1 on violations or tool failure, 0 on success.

## Files and responsibilities

| Path | Responsibility |
| --- | --- |
| `.node-version`, `.npmrc`, `package.json`, `package-lock.json`, `.gitignore` | Runtime/package-manager pins, exact dev dependencies, scripts, generated-file exclusions |
| `tools/verify.mjs` | Root orchestration; version check and failure propagation |
| `tools/architecture/policy.mjs` | Area classification, allowed edges, external dependency allowlists, diagnostic rule IDs |
| `tools/architecture/graph.mjs` | Source discovery and dependency-cruiser adapter with TypeScript/package resolution |
| `tools/architecture/source-checks.mjs` | TypeScript AST checks for loaders and ambient runtime access |
| `tools/architecture/check.mjs` | Combine graph, policy, and AST diagnostics; architecture CLI |
| `tools/docs/check.mjs`, `links.mjs`, `lifecycle.mjs` | Markdown discovery, AST link/anchor checks, lifecycle metadata checks |
| `.markdownlint-cli2.jsonc` | Markdown formatting policy compatible with existing docs |
| `tools/test/{verify,architecture,docs}.test.mjs` | Tests of observable checker/CLI behavior and runner failure propagation |
| `tools/test/fixtures.mjs` | `withRepository(files, run)` temporary-repository helper; always cleans up |
| `.github/workflows/verify.yml` | Checkout, pinned Node/npm, `npm ci`, `npm run verify` |
| `ARCHITECTURE.md`, `CONTRIBUTING.md`, `AGENTS.md`, `README.md` | Current-state map, human setup, executable agent commands, entry links |
| This plan, its design, `doc/README.md`, MVP current-state paragraph | Progress, reciprocal links, observed verification, accurate implementation state |

Fixture contents live in test data maps and are written to temporary directories, never to root `apps/`, `services/`, or `packages/`. Each fixture supplies the same logical paths that real consumers will use.

## Task 1: Establish a reproducible verification runner

**Files:** Create the runtime/package files, `tools/verify.mjs`, `tools/test/fixtures.mjs`, and `tools/test/verify.test.mjs` from the map above.

**Interfaces:** Produces `runChecks(commands: string[][], cwd: string): Promise<number>` from `tools/verify.mjs`; importing the module does not run its CLI. Produces `withRepository(files: Record<string,string>, run: (root: string) => Promise<void>): Promise<void>` from the fixture helper. Task 4 supplies the final child commands.

- [ ] **Step 1: Write failing runner tests.** Use Node `test`/`assert` to assert `runChecks([[process.execPath,'-e','process.exit(0)']], root) === 0`, that an exit-7 child yields 1, a nonexistent executable yields 1 with a diagnostic, and failure prevents a later marker-writing child from running. Assert temporary directories are removed even when the callback throws.

```js
test('runner propagates child failure', async () => {
  assert.equal(await runChecks([[process.execPath, '-e', 'process.exit(7)']], process.cwd()), 1);
});
test('runner accepts successful child', async () => {
  assert.equal(await runChecks([[process.execPath, '-e', 'process.exit(0)']], process.cwd()), 0);
});
```

- [ ] **Step 2: Run `node --test tools/test/verify.test.mjs`.** Expect failure because the runner/helper exports do not exist; distinguish this expected failure from syntax or unrelated environment errors.
- [ ] **Step 3: Implement the interfaces and bootstrap.** Pin `24.19.0` in `.node-version`, `node: "24.19.0"` in `engines`, `packageManager: "npm@11.9.0"`, `private: true`, `type: "module"`, and `engine-strict=true` in `.npmrc`. Exclude `node_modules/`, coverage, and temporary output. Runner verifies exact Node/npm versions and uses child processes with inherited output; no shell interpolation. Initial `verify` runs the test script; Task 4 adds real scans.
- [ ] **Step 4: Install and lock tooling.** Run `npm install --save-dev --save-exact dependency-cruiser typescript markdownlint-cli2 unified remark-parse remark-gfm github-slugger`. Record resolved versions and compatibility evidence in this plan. Set `test` to `node --test tools/test/*.test.mjs`, then run `npm ci` and `npm test`; expect exit 0 and all runner tests passing without product secrets.
- [ ] **Step 5: Commit.** `git add .node-version .npmrc package.json package-lock.json .gitignore tools/verify.mjs tools/test/fixtures.mjs tools/test/verify.test.mjs doc/exec/active/2026-10-16-lightweight-layering-plan.md`; commit as `chore: establish pinned verification tooling`.

## Task 2: Enforce architecture through the resolver and source AST

**Files:** Create `tools/architecture/{policy,graph,source-checks,check}.mjs` and `tools/test/architecture.test.mjs`.

**Interfaces:** Consumes Task 1's fixture helper. `graph.mjs` exports `readGraph(root: string): Promise<{files: string[], edges: Edge[]}>`, where `Edge = {from: string, to?: string, specifier: string, external: boolean, unresolved: boolean, typeOnly: boolean}` and paths are repository-relative POSIX paths. Preserve type-only information from the resolver/source AST for adapter-provider checks. `policy.mjs` exports `checkGraph(graph): Diagnostic[]`; `source-checks.mjs` exports `checkSource(root: string, files: string[]): Diagnostic[]`; `check.mjs` exports `checkArchitecture(root: string): Promise<Diagnostic[]>` and its CLI accepts optional `--root PATH` (default cwd). `Diagnostic` is the shape in Starting state.

- [ ] **Step 1: Write table-driven failing fixture tests.** Each row below is a separate temporary repository; assert allowed cases produce `[]`, forbidden cases include the named rule plus the offending file and a nonempty suggestion. Spawn the CLI for one passing case, one violation, and one resolver failure; assert exit codes 0, 1, 1. Check actual source graphs, not handwritten `Edge` objects alone.

| Fixture | Assertion |
| --- | --- |
| No product directories; README only | Pass, zero discovered source files |
| Contracts schema + scoring type import + mobile consumers + share contracts | Pass |
| Scoring business ports + transport via own module `index.ts` + adapter type import via `index.ts` + runtime wiring | Pass |
| Mobile app-local Supabase adapter | Pass; this is permitted client integration |
| Mobile → API, mobile → share, share → mobile/scoring, contracts → scoring/API | `boundary` for each edge |
| Business → transport/adapter/runtime; adapter → transport/runtime; transport → adapter/runtime | `boundary` for each reversed edge |
| Scoring domain → ranking domain | `cross-domain` |
| Transport or adapter → another module's private `service.ts`/`ports.ts` | `module-private` |
| Adapter uses a runtime import from business `index.ts` instead of exported provider types | `adapter-provider-types` |
| Runtime imports module internals instead of `index.ts` or transport entry | `module-private` |
| Production A → B → A within an otherwise allowed area | `cycle` |
| Scoring/business imports `node:fs`, `fs/promises`, `https`, `react-native`, or `@supabase/supabase-js` | `portable-runtime` / `business-implementation` |
| Scoring/business reads `process.env`, computed `process['env']`, `import.meta.env`, `globalThis.process.env`, or calls `fetch`/`globalThis.fetch` | `ambient-runtime` |
| `import(variable)`, nonliteral `require`, `require.resolve`, `createRequire`, or loader alias attempts | `computed-loader`; document static-analysis limits |
| Missing relative target, unresolved alias, missing package, or unsupported source placement | `unresolved` / `unclassified-source`; never silently skip |
| `.test.ts` beside business code importing adapters | Same `boundary` violation as production |

For the mobile → API violation, repeat through relative import, tsconfig alias, fixture package self-reference export, re-export barrel, type-only import, string-literal dynamic import, and literal `require`. For aliases/package exports also test an allowed contracts target; assert the resolved target, not just the specifier. Use a fixture root package name/exports for self-references and local stub `node_modules` package manifests for SDK/schema imports, so fixtures need no network install. Include `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, and `.cjs`; test Windows path normalization and `node_modules`/fixture exclusions.

- [ ] **Step 2: Run `node --test tools/test/architecture.test.mjs`.** Expect failure on missing checker exports; confirm each new negative case fails its assertion if the responsible rule is disabled during development.
- [ ] **Step 3: Implement graph discovery and policy.** Discover source recursively inside existing `apps/`, `services/`, and `packages/`, including colocated tests; exclude only dependencies/generated output, not unknown project areas. Classify all discovered files or emit `unclassified-source`. Use dependency-cruiser's programmatic API with TypeScript precompilation dependencies, tsconfig resolution, package exports, literal dynamic imports, unresolved-edge reporting, and cycle detection; keep its adapter isolated in `graph.mjs`. Discover consumer tsconfigs/package manifests under each present area; duplicate aliases or incompatible resolver settings must fail explicitly instead of selecting a different consumer's config. Do not follow third-party source into the project graph.

Copy the design's allowed-project-dependency table into executable data in `policy.mjs`; the design remains the rationale. Within-module tests may reach their own business internals. Outside consumers use module `index` entry files; runtime may also import `transport/index` entries, with the supported source extensions above. Adapters consume only exported provider types, not business operation implementations. Include type-only edges in boundary checks; cycles apply to production files, with test-only cycles outside that requirement. Contracts allow external schema libraries through a named explicit allowlist, initially `zod`; portable scoring and business allow no external runtime SDKs. A new library or domain edge requires a documented policy review, not a wildcard exception. Put stable rule IDs and concrete correction messages beside their rules.

- [ ] **Step 4: Implement AST checks.** Parse all discovered source with the TypeScript compiler API, including type-only and re-export syntax. Reject unresolved/computed module loading, including template interpolation and loader aliasing, with file/line diagnostics. Detect the ambient runtime forms above in scoring/business, including aliased access; reject unsupported indirection visibly. This is a conservative source policy, not a security sandbox or proof of authorization. Use the exact same policy and resolver for fixture roots and the real root.
- [ ] **Step 5: Run `node --test tools/test/architecture.test.mjs` and `node tools/architecture/check.mjs`.** Expect all positive/negative fixture assertions to pass, and the real checkout to report zero product files without pretending enforcement was tested by that empty scan alone.
- [ ] **Step 6: Commit.** Stage `tools/architecture/`, `tools/test/architecture.test.mjs`, and this plan's progress; commit as `feat: verify dependency boundaries with fixture graphs`.

## Task 3: Check Markdown links, formatting, and lifecycle

**Files:** Create `tools/docs/{check,links,lifecycle}.mjs`, `.markdownlint-cli2.jsonc`, and `tools/test/docs.test.mjs`.

**Interfaces:** Consumes Task 1's fixture helper and the shared diagnostic shape. `links.mjs` exports `checkLinks(root: string, documents: Map<string,string>): Diagnostic[]`; `lifecycle.mjs` exports `checkLifecycle(documents: Map<string,string>): Diagnostic[]`; `check.mjs` exports `checkDocs(root: string): Promise<Diagnostic[]>` and a CLI with optional `--root PATH`. Document keys are repository-relative POSIX paths. Formatting is a separate package script, invoked by the root runner.

- [ ] **Step 1: Write failing fixture tests.** Assert valid current docs pass. Assert `missing-file`, `missing-anchor`, `undefined-reference`, `metadata`, `status-location`, `approval-fields`, `completion-fields`, and `blocked-fields` diagnostics for their respective violations. Include reference/image links, percent-encoded spaces, same-file and cross-file fragments, duplicate-heading suffixes, explicit HTML anchors, and a moved design with stale incoming links. Ignore links and metadata inside fenced/inline code; external URLs are not fetched. Symlinks resolving outside the fixture/repository root fail visibly. Dates must be real calendar dates and `Updated >= Date`; filenames retain their original date.

Exercise all three statuses from `doc/README.md`, with and without emoji. Active accepts In progress/Blocked; completed accepts only Completed. Blocked requires `Blocked by` and `Next action`; completed design requires `Approved by`, `Approved on`, and recorded approval scope; completed plan requires `Completed on`, outcomes, verification evidence, deferred-work disposition, and next action. Living references have no lifecycle requirement. Metadata validates presence/shape, never whether approval or success actually happened.

- [ ] **Step 2: Run `node --test tools/test/docs.test.mjs`.** Expect missing-export failures; add the disposable fixture violations before implementing their checks.
- [ ] **Step 3: Implement Markdown/lifecycle checks.** Use unified + remark-parse/remark-gfm ASTs for links, definitions, headings, and top-of-document metadata paragraphs; github-slugger supplies GitHub heading IDs. Resolve case-sensitive local paths relative to the containing document, enforce repository containment, and validate fragments in Markdown targets. Exclude `.git`, dependencies, generated output, and fixture data from discovery. Check only `doc/design/{active,completed}` and `doc/exec/{active,completed}` for lifecycle; report unexpected lifecycle directories. Do not require existing future-layout examples to exist as files. Handle explicit HTML anchors by parsing anchor attributes, not treating arbitrary HTML as a link.
- [ ] **Step 4: Add formatting policy.** Use markdownlint-cli2 defaults with `MD013` disabled for prose/tables, `MD024` scoped to siblings, and `MD033` allowing only `a` elements for explicit anchors. Set globs to `**/*.md` with dependency/generated directories excluded. Add scripts `check:docs` and `check:format`. Fix only formatting violations actually reported, preserving meaning and recording any additional affected files in this plan.
- [ ] **Step 5: Run `node --test tools/test/docs.test.mjs`, `npm run check:docs`, and `npm run check:format`.** Expect passing fixture assertions, no real broken links/lifecycle violations, and formatting exit 0. Introduce each broken-link/status fixture independently so one error cannot mask the other.
- [ ] **Step 6: Commit.** Stage the documentation tools/tests/config, any necessary formatting fixes, and plan progress; commit as `feat: validate Markdown links and document lifecycle`.

## Task 4: Wire CI, publish current guidance, and verify a clean checkout

**Files:** Create `.github/workflows/verify.yml`, `ARCHITECTURE.md`, and `CONTRIBUTING.md`; modify `tools/verify.mjs`, `package.json`, `AGENTS.md`, `README.md`, `doc/README.md`, the two design current-state/handoff sections, and this plan.

**Interfaces:** Consumes `checkArchitecture(root)`, `checkDocs(root)`, and `runChecks(commands, cwd)`. Final scripts: `check:architecture = node tools/architecture/check.mjs`, `check:docs = node tools/docs/check.mjs`, `check:format = markdownlint-cli2`, `test = node --test tools/test/*.test.mjs`, `verify = node tools/verify.mjs`. Runner executes `npm test`, `npm run check:architecture`, `npm run check:docs`, and `npm run check:format` in that order; tests never recursively invoke the full root `verify`.

- [ ] **Step 1: Wire scripts and CI.** Use `ubuntu-latest`, a 10-minute timeout, `push` and `pull_request` triggers, and `permissions: contents: read`. Pin checkout and setup-node actions to reviewed immutable release SHAs, read Node from `.node-version`, cache npm by the lockfile, and install exact npm 11.9.0 before `npm ci` and `npm run verify`. Record chosen action releases/SHAs here. Do not use `continue-on-error` or event-dependent bypass. Install needs registry access; verification needs no product network/services or secrets. Repository protection remains separate.
- [ ] **Step 2: Update guidance.** `ARCHITECTURE.md` maps existing tooling, the boundary policy/checker paths, and clearly labeled future product examples, linking to the design for rationale. `CONTRIBUTING.md` documents pinned setup, `npm ci`, all scripts, fixture failures, and reviewing rule changes. `AGENTS.md` links these owners and replaces unavailable-command statements with tested commands; retain the one-line Claude import. README distinguishes tooling setup from future application setup. Update `doc/README.md` to report only the enforcement that now exists and link to it, rather than retaining its blanket “not implemented” statement. Update both design state descriptions without silently approving pending product choices.
- [ ] **Step 3: Verify locally and from a clean temporary checkout.** Run `npm run verify` and `git diff --check`; record exit codes and test totals. Stage the intended changes, export the index with `git checkout-index --all --prefix=/tmp/lets-farty-layering-clean/` into a newly created empty directory, then run `npm ci` and `npm run verify` there with the pinned runtime. This must work without ignored local files or product credentials. In that disposable copy, independently add the mobile → API fixture and a broken Markdown link; run `npm run verify` after each mutation and require exit 1 with the expected diagnostic, restoring the copy between cases. Record unavailable registry/network access as a failed required clean-install check rather than substituting a warm cache claim.
- [ ] **Step 4: Commit and observe CI when publishing is authorized.** Commit the workflow, guidance, final runner, and progress as `ci: verify layering and documentation consistently`. Record the actual remote Actions run URL/conclusion separately from local evidence. In a disposable branch, introduce one forbidden import and then one broken local link; each must produce a failing `verify` check in Actions. Keep those commits out of the implementation branch. If publication or Actions access is unavailable, leave remote evidence pending and the plan active.

## Acceptance and completion record

| Design criterion | Evidence owner |
| --- | --- |
| 1. Pinned clean install and verification without product services | Tasks 1 and 4: versions, lockfile, clean-checkout log |
| 2. Concise guidance and preserved lifecycle/feature order | Task 4: current-state docs and link checks |
| 3. Allowed/forbidden edges and cycles | Task 2: named fixture assertions and CLI exit checks |
| 4. Resolution variants, unresolved imports, computed loaders | Task 2: resolver/AST fixtures |
| 5. Links and lifecycle disposable fixtures | Task 3: valid/invalid fixture assertions |
| 6. Shared local/CI command and recorded observations | Task 4: root-command failures, local log, Actions evidence |
| 7. No empty product scaffold; later feature tests remain separate | Task 4: final diff inspection and documented deferred scope |

Before implementation, record owner approval of the layering scope and tooling choices; do not infer approval of the wider MVP. If the design is then completed, record approval fields, move it to `doc/design/completed/`, and update reciprocal links together. Keep this execution plan active during implementation. After every acceptance criterion and required check is satisfied, add `Completed on`, outcomes, exact commands/results, and a next action; then move it to `doc/exec/completed/` and update incoming links. Foundation app-shell, private recording, identity/ranking, sharing, and digestive guidance remain deferred to the named slices in the MVP design.

## Progress and verification evidence

- 2026-10-16: Drafted at the owner's request using Superpowers writing-plans. No implementation, design approval, merge, or CI run is claimed.
- Planning baseline: clean `set-up` at `338a04d`; Node `v24.19.0`, npm `11.9.0`. No automated checks exist yet; commands in task checkboxes are future work.
- Plan-only verification (2026-10-16): `git diff --check` exited 0. A one-off Python check over tracked and untracked Markdown confirmed 30 local links resolve, active document metadata is valid, four tasks map all seven design criteria, and no implementation checkbox is marked complete. Self-review corrected type-only edge information and fixture package resolution, and replaced workflow-shape tests with observable root-command/CI failure checks. Implementation dependency resolution, test results, clean-install results, action SHAs, and CI outcomes remain unobserved until execution.

- 2026-10-16 Task 1: runner tests observed RED (missing implementation), then GREEN (5/5). `npm ci` and `npm test` exited 0. Tool versions: dependency-cruiser 18.6.0, github-slugger 2.0.0, markdownlint-cli2 0.23.3, remark-gfm 4.0.1, remark-parse 11.0.0, typescript 6.0.3, unified 11.0.5. TypeScript 7 lacked the required compiler API and was incompatible with dependency-cruiser (<7); pinned supported TypeScript 6 instead.

- 2026-10-16 Task 2: 95 architecture fixtures and 5 runner tests passed (100 total); `node tools/architecture/check.mjs` passed against the source-free product checkout. Resolver uses consumer tsconfig, explicit package exports, and unbounded graph traversal followed by input-group filtering; a depth limit was rejected after cycle/barrel fixtures exposed skipped edges.

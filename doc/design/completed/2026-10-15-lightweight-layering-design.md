# Lightweight Layering Design

**Status:** ✅ Completed

**Date:** 2026-10-15

**Updated:** 2026-10-16

**Review:** Owner approved layering/tooling implementation through the explicit inline-execution request on 2026-10-16.

**Approved by:** Repository owner (this conversation)

**Approved on:** 2026-10-16

**Approval scope:** Dependency-boundary guidance, verification tooling, documentation validation, and CI in the linked plan; application stack and product slices remain deferred to the MVP design.

**Next action:** Follow the active execution plan and record implementation verification there.

**Lifecycle:** [Documentation rules](../../README.md)

**Related design:** [MVP and repository bootstrap](../active/2026-10-14-lets-farty-mvp-design.md)

**Execution plan:** [Lightweight layering implementation plan](../../exec/active/2026-10-16-lightweight-layering-plan.md), approved for inline execution by the owner on 2026-10-16; implementation progress is tracked in the plan.

## Intent and scope

The owner asked to implement the lightweight layering recommended after reviewing [OpenAI's harness-engineering article](https://openai.com/index/harness-engineering/). The outcome is a repository whose dependency boundaries are easy to discover and mechanically checked as application code arrives.

The checkout currently contains documentation only. The proposed Expo/React Native stack and the full MVP are still awaiting review. This specification covers repository architecture guidance and verification tooling. It does not approve the other MVP choices or replace the foundation app-shell milestone.

The first implementation adds concise root instructions, a current-state architecture map, dependency rules, and local/CI verification. Product directories are created with their consuming features. Existing `doc/design` and `doc/exec` lifecycle folders remain in place.

**Adoption update (2026-10-15):** At the owner's explicit request, the root [AGENTS.md](../../../AGENTS.md) now adopts the open AGENTS.md convention, and [CLAUDE.md](../../../CLAUDE.md) imports it. This completes the shared-instructions portion independently; the architecture map and verification tooling remain proposed. The request does not establish approval of the rest of this specification.

## Approach and alternatives

- **Recommended: explicit boundaries in a small workspace.** Retain one API deployment. Check package imports and domain boundaries automatically. Add transport, business logic, and adapters only as real code requires them.
- **Documentation alone.** Requires fewer tools but leaves dependency rules to every future contributor and review; it cannot demonstrate that forbidden imports fail verification.
- **A complete multilayer scaffold now.** Establishes many interfaces before their requirements exist and expands this change into application bootstrapping. Defer that work to the existing feature slices.

## Ownership and dependency rules

| Area | Responsibility | Allowed project dependencies |
| --- | --- | --- |
| `packages/contracts` | Runtime request/response schemas and their derived types | Other files in this package; external schema libraries are allowed |
| `packages/scoring` | Portable, deterministic score calculations | Other files in this package; contracts only where a shared type is needed |
| `apps/mobile` | Native UI, recording, playback, and client integration | Contracts and portable scoring; its own platform adapters |
| `apps/share` | Shared-result presentation | Contracts; its own client integration |
| API module business code | Domain operations, domain types, and provider interfaces | Contracts, portable scoring where relevant, and its own business files |
| API module `transport` | Parse requests, invoke operations, map outcomes to responses | Contracts, its own module's business interface, and HTTP framework libraries |
| API `adapters` | Implement provider interfaces using storage, database, audio, and other SDKs | Contracts, module provider interfaces/types, and external SDKs |
| API `runtime` | Load configuration, construct adapters, compose operations, and register handlers | API modules, adapters, and shared packages |

Rules apply to production and test source. Tests may import their subject's internal files within its own boundary; they cannot introduce otherwise forbidden imports.

Contracts cannot import applications, API internals, or scoring. Portable scoring cannot import applications, API internals, platform SDKs, filesystem/network APIs, or runtime environment configuration. Apps cannot import each other or API source.

Business code cannot import transport, adapters, runtime, framework/SDK implementations, or ambient configuration. It receives provider interfaces and configuration explicitly. Adapters cannot import transport or runtime. Transport cannot import concrete adapters or runtime. The runtime is the composition root.

Keep domains independent initially: one domain module cannot import another domain module. Runtime composition passes the required operations through explicit interfaces. If a real use case later justifies a direct domain dependency, record and review that edge before allowing it. Reject dependency cycles across production source.

Client-side Supabase Auth and owner-scoped data access remain possible through app-local adapters, consistent with the MVP proposal. The ranked-score write path remains server-owned. Import rules complement behavioral and access-policy tests; they do not establish authorization correctness.

## Layout as features arrive

```text
services/api/src/
  modules/
    scoring/
      index.ts             Public business operations and types
      service.ts           Operations with injected providers
      ports.ts             Provider interfaces, when needed
      transport/           HTTP parsing and response mapping
    ranking/               Added with verified ranking
    sharing/               Added with sharing
    insights/              Added with digestive guidance
  adapters/                Concrete provider implementations
  runtime/                 Configuration and composition
packages/
  contracts/               Added with the first API consumer
  scoring/                 Extracted when mobile and API both need it
```

The tree illustrates responsibilities, not required empty directories or files. A pure calculation needs neither a provider interface nor a service wrapper. Adapters consume exported provider types through the module's `index.ts`; runtime consumes its public business interface and transport entry points. Business internals remain private to their module.

For example, a future scoring handler parses an upload request using contracts, obtains the authenticated actor from trusted server middleware, and invokes a scoring operation. Runtime supplies the audio-processing and persistence providers. The operation returns a domain outcome; transport maps invalid input, unusable audio, and provider failures into stable API responses. Private audio and health entries stay out of error messages and logs, as required by the MVP design. Endpoint schemas, error codes, and processing limits are designed in the upload slice.

## Repository guidance

- `AGENTS.md` maps tasks to the architecture, documentation lifecycle, and actual verification commands. Keep it short; link to rule owners.
- `CLAUDE.md` imports `AGENTS.md` and holds only Claude-specific additions.
- `ARCHITECTURE.md` describes components that exist, the dependency policy, and where its checks live. Clearly identify future layout examples as proposed.
- `CONTRIBUTING.md` documents setup for the verification tooling, boundary changes, and verification evidence.
- The root README links to these entry points and continues to report that application setup does not exist until the app shell lands.

## Mechanical enforcement

Introduce a root `verify` package script and GitHub Actions workflow for the tooling slice. Pin the tooling runtime and package manager and commit their dependency lockfile. This prepares the verification harness; it does not scaffold the mobile app or API.

Use an established parser-based dependency checker with TypeScript resolution support. Resolve relative imports, package imports, re-exports, and configured path aliases before applying the rules. Include statically resolvable dynamic imports. Reject computed module loading in checked project source when the dependency cannot be established. Keep the rule configuration in the repository and give failures a file, rule, and suggested correction.

The checker discovers source in present project areas, so an absent application directory is valid. Its verification must also run fixture graphs that exercise forbidden edges; a successful scan of an empty repository is not sufficient evidence that enforcement works. Fixtures remain separate from production-source discovery and are evaluated with the same rules and resolver.

The root command also checks Markdown links and the metadata/status/location requirements already owned by the documentation workflow. Local and CI execution use the same command. Repository protection and deployment settings remain separate account configuration; this tooling change does not claim to enable them.

## Acceptance criteria

1. A clean checkout can install the pinned verification tooling from the committed lockfile and run `verify` with documented commands, without product credentials or external services.
2. Root instructions link to one source for each rule; the existing documentation lifecycle and future feature order remain intact.
3. Allowed fixture graphs pass. Forbidden app-to-server imports, reversed layer imports, cross-domain imports, portable-code platform imports, and dependency cycles each fail with actionable diagnostics.
4. Equivalent forbidden edges through relative paths, package entry points, re-exports, aliases, and static dynamic imports are caught. Unresolvable project imports and computed module loading fail visibly rather than silently bypassing the policy.
5. Documentation checks accept valid current files and reject broken local links and lifecycle violations in disposable fixtures. They do not infer owner approval or semantic accuracy from metadata.
6. The GitHub Actions workflow runs the root verification command. Record actual local commands and results in the execution plan, and distinguish workflow configuration from an observed remote run.
7. No empty product packages or invented product behavior are needed to demonstrate the checker. Later feature plans include the relevant domain behavior, access-policy, and platform tests.

## Deferred work and handoff

The foundation app-shell slice owns application stack approval, native prerequisites, and launching iOS/Android. Private recording owns microphone and playback checks and scoring fixtures. Identity/ranking owns the initial API, Supabase migrations, access-policy tests, and authoritative scoring. Sharing and digestive guidance own their modules and domain-specific acceptance checks.

The owner requested a draft execution plan on 2026-10-16. The linked plan specifies tooling choices, commands, fixtures, and implementation steps for review. Record the scope and evidence of approval according to the documentation workflow before implementation. Approval was recorded on 2026-10-16; this approved design snapshot is completed, while implementation continues in the active plan.

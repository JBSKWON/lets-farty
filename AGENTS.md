# Agent instructions

This repository follows the [AGENTS.md convention](https://github.com/agentsmd/agents.md). These instructions apply throughout the repository. Nested instructions take precedence within their subproject when they conflict; explicit user instructions take precedence over repository guidance. `CLAUDE.md` imports this file.

## Project context

Let's Farty has design documents and verification tooling; no application code exists yet. Expo/React Native, TypeScript for the product, and Supabase remain proposed choices awaiting review. Tooling uses pinned Node/npm independently of those product decisions.

## Start here

1. Inspect `git status --short`, `git diff`, and relevant history. Preserve existing work.
2. Read the [documentation lifecycle](doc/README.md), relevant design/plan, and [current architecture](ARCHITECTURE.md).
3. Distinguish proposals, recorded approvals, and implemented behavior in changes and handoffs.

## Task map

- Product scope, private data, consent, and bootstrap: [MVP design](doc/design/active/2026-10-14-lets-farty-mvp-design.md).
- Dependency boundaries and tooling scope: [approved layering design](doc/design/completed/2026-10-15-lightweight-layering-design.md).
- Layering implementation and verification: [execution plan](doc/exec/completed/2026-10-16-lightweight-layering-plan.md).
- Setup, commands, boundary-change review, and fixture conventions: [CONTRIBUTING.md](CONTRIBUTING.md).
- Human overview and cloud setup: [README.md](README.md).

## Verification

Use Node 24.19.0 and npm 11.9.0. Run `npm ci` for locked dependencies, then `npm run verify` for fixture tests, architecture boundaries, Markdown links/lifecycle, and formatting. Run `git diff --check` before handoff. Individual commands are documented in CONTRIBUTING.md. No application build, server, or native-launch commands exist yet.

Report checks actually run, including failures or unavailable checks. A configured workflow does not prove a remote run or repository protection. Keep commands/results and remaining work in the active execution plan.

## Change guidance

- Keep instructions concise and link to each rule's owner. Update affected docs in the same change.
- Follow `doc/design/{active,completed}` and `doc/exec/{active,completed}` lifecycle; record real approval/completion evidence.
- Add product packages and modules only with their consuming feature; label future layouts clearly.
- Add failing fixtures before checker changes; tests follow their production subject's boundary. Review new domain edges or library exceptions instead of suppressing diagnostics.
- Add nested instructions only for real subprojects needing distinct guidance; inherit common rules.

The MVP design owns detailed product boundaries: ranked scores are server-calculated; ranking and audio sharing have separate consent; health entries stay private; the fun score is not a health assessment.

# Agent instructions

This repository follows the [AGENTS.md convention](https://github.com/agentsmd/agents.md). These instructions apply throughout the repository. If a subproject later needs different guidance, add a nested `AGENTS.md`; its instructions take precedence within that directory when they conflict with this file. Explicit user instructions take precedence over repository guidance.

## Project context

Let's Farty is currently in design. The checkout contains documentation and agent instructions; there is no application code, package manager configuration, CI workflow, or automated test suite yet. Expo/React Native, TypeScript, and Supabase are proposed choices awaiting review.

## Start here

1. Inspect `git status --short`, `git diff`, and relevant history. Preserve existing work.
2. Read the [documentation index and lifecycle rules](doc/README.md), then the design or execution plan relevant to the task.
3. Distinguish proposals, recorded approvals, and implemented behavior. Keep those distinctions explicit in changes and handoffs.

## Task map

- Product scope, data boundaries, and bootstrap sequence: [MVP design](doc/design/active/2026-10-14-lets-farty-mvp-design.md).
- Proposed dependency rules and verification tooling: [lightweight layering design](doc/design/completed/2026-10-15-lightweight-layering-design.md).
- Design/plan status, metadata, approvals, and document moves: [documentation workflow](doc/README.md).
- Human overview and Codex Cloud setup: [README](README.md).

## Setup and verification

No dependency installation, build, development-server, or test commands exist yet. The root `verify` command is planned, not available. Add the actual commands here when the corresponding tooling lands.

For documentation changes:

- Run `git diff --check` to detect whitespace errors.
- Check that changed local Markdown links resolve, including links affected by moves.
- Check design and plan metadata against the documentation workflow.
- Inspect the final diff and report the checks actually run. Identify unavailable checks explicitly; do not describe them as passing.

## Change and review guidance

- Keep instructions concise and link to the document that owns each rule. Update affected documentation alongside changes.
- Follow the existing `doc/design/{active,completed}` and `doc/exec/{active,completed}` lifecycle. Record real approval and verification evidence according to the documentation workflow.
- Create application packages and domain modules when their consuming feature needs them. Keep proposed layouts clearly labeled until implemented.
- Keep changes focused. Describe the resulting behavior, verification, and remaining limitations in handoffs and pull requests.
- Add nested agent instructions only when a real subproject needs distinct commands or rules; inherit common guidance instead of duplicating it.

## Product boundaries

The MVP design owns the detailed requirements. In particular, ranked scores are calculated by the server; ranking and audio sharing have separate consent; health entries stay private; and the fun score is not a health assessment. Preserve these boundaries when implementing their feature slices.

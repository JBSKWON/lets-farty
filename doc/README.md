# Documentation workflow

This file owns the lifecycle rules for design documents and execution plans. Update affected Markdown alongside the change it describes, including progress, decisions, blockers, and verification evidence. [Root agent instructions](../AGENTS.md) link here; the contribution guide should also link here when introduced.

## Layout and current work

```text
doc/
├── README.md
├── design/
│   ├── active/
│   └── completed/
└── exec/
    ├── active/
    └── completed/
```

Keep the existing `design` and `exec` names. Each contains exactly two lifecycle folders. Empty folders use `.gitkeep` so Git preserves them; remove the placeholder when the first document arrives.

- Active design: [Let's Farty MVP](design/active/2026-10-14-lets-farty-mvp-design.md), awaiting owner review; includes the repository bootstrap order and its verification criteria.
- Completed design: [Lightweight layering](design/completed/2026-10-15-lightweight-layering-design.md), approved for implementation on 2026-10-16; defines dependency boundaries and the verification-tooling scope before application code arrives.
- Active execution plan: [Lightweight layering](exec/active/2026-10-16-lightweight-layering-plan.md), approved for inline execution; verification tooling is in progress.
- Completed execution plans: none yet.

Agent guidance is maintained in the root [AGENTS.md](../AGENTS.md), following the [open convention](https://github.com/agentsmd/agents.md). [CLAUDE.md](../CLAUDE.md) imports it. Add nested instruction files only when an implemented subproject needs distinct guidance.

## Status and metadata

Every design document and execution plan starts with a title and these fields. Use `YYYY-MM-DD` dates and keep the original date in the filename when moving a document.

```markdown
# Document title

**Status:** 🟡 In progress

**Date:** YYYY-MM-DD

**Updated:** YYYY-MM-DD

**Next action:** A concrete next step.
```

| Status | Location | Meaning |
| --- | --- | --- |
| 🟡 In progress | `active/` | Drafting, review, or execution is underway. |
| 🔴 Blocked | `active/` | Work cannot advance until a named dependency is resolved. |
| ✅ Completed | `completed/` | The document's completion conditions below are met. |

The words are required; emoji supplement them for scanning. Automation should recognize the text label rather than depend on an emoji. Routine owner review remains `In progress`; use `Blocked` when a specific unresolved dependency prevents further work. Blocked documents also include `Blocked by` and a `Next action` naming who or what can resolve it. Resume them by changing the status to `In progress` and recording the resolution.

This lifecycle applies to designs and execution plans. Living reference files such as this guide, `AGENTS.md`, and `ARCHITECTURE.md` remain maintained references and do not get marked completed.

## Completion and moves

**Design:** completion means the owner has approved the design and its open decisions are resolved or explicitly deferred to a named later slice. Record `Approved by`, `Approved on`, and the scope of approval before setting `Completed`. Approval completes the design activity; implementation progress belongs in linked execution plans. An agent must not infer owner approval from having written the document.

**Execution plan:** completion means its agreed acceptance criteria are met, required verification has run successfully, and affected documentation is current. Record `Completed on`, outcomes, exact verification commands/results, and links to any explicitly deferred work. Outstanding required checks keep the plan active. Record a next action for handoff and update progress after meaningful work, discoveries, or blockers.

When completing a document, change its status and move it into the matching `completed/` directory in the same change. Update this index, incoming links, and relative links inside the moved document. Keep design and plan links reciprocal once both exist. Do not maintain duplicate active and completed copies.

For a material revision of an approved design, create a new active design linking to the earlier snapshot. Keep the earlier approval history. Cancelled or superseded work must not be labeled `Completed` merely to clear the active folder; record its disposition and replacement link, and agree on an archive convention if that case arises.

## Planned CI enforcement

The foundation slice establishes a runnable app shell and CI before recording features. It will add these checks to the root verification command and GitHub Actions:

- Require the metadata fields and one of the three status labels for design and plan Markdown.
- Reject `Completed` under `active/`, and reject other statuses under `completed/`.
- Require blocker details for blocked work and approval/completion fields for completed work.
- Check Markdown formatting and local links, including links affected by moves.

These checks are not implemented yet. Reviewers must still assess approval evidence, acceptance criteria, and documentation accuracy; metadata alone cannot establish completion.

## Research behind this convention

Reviewed on 2026-10-14. These are documented practices and examples, not a universal repository standard.

- [VTCode's harness index](https://github.com/vinhnx/VTCode/blob/main/docs/harness/INDEX.md) documents `exec-plans/active/` and `exec-plans/completed/`, plus documentation updates during changes and reviews for stale content.
- [harnesskit](https://github.com/hashwnath/harnesskit#what-gets-generated) generates active and completed execution-plan directories. It is a scaffolding example; its existence does not establish production maturity.
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) describes durable progress notes, explicit feature criteria, incremental work, and testing before marking features complete. Our execution plans will hold the progress and verification record without adding a second competing progress file.
- [Anthropic: How Claude remembers your project](https://code.claude.com/docs/en/memory) recommends concise, concrete, consistent instructions and supports `@path` imports. The root `CLAUDE.md` imports `@AGENTS.md`; detailed lifecycle rules stay here and are linked from the shared instructions. Instructions guide behavior; CI and repository settings provide enforcement.
- [Anthropic: Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) explores explicit deliverables and evaluation during incremental development. We adopt clear acceptance criteria and verification without requiring its experimental multi-agent architecture.

The repository examples above support the execution-plan folder split. Extending the same split to designs, choosing these three status labels, and adding emoji are conventions chosen for Let's Farty. The cited Anthropic guidance does not prescribe this directory layout or emoji scheme.

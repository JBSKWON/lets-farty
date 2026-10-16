# Design Decisions

## Architecture patterns

The [architecture map](../ARCHITECTURE.md) owns the current component map. The [approved layering design](design/completed/2026-10-15-lightweight-layering-design.md) owns dependency-policy rationale; `tools/architecture/policy.mjs` owns executable edges and exceptions.

Use contracts, explicit provider interfaces, and runtime composition as real features arrive. Keep domain modules independent and retain one API deployment. Do not replace these boundaries with the template's generic numbered layers.

## API and data model

No application API or database schema is implemented. The [MVP design](design/active/2026-10-14-lets-farty-mvp-design.md) contains proposals requiring their own feature review, contracts, and access-policy tests.

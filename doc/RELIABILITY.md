# Reliability

## Current checks

`npm run verify` fails on a failed fixture test, forbidden/unresolved dependency, broken local Markdown link, invalid lifecycle state, missing harness reference, invalid generated-source header, or formatting error. The pre-commit hook checks the staged snapshot; CI verifies every published change independently of local hook configuration.

## Known limits

Static source rules are conservative and do not establish authorization or product correctness. Metadata validates recorded fields, not approval authenticity. Entropy findings are advisory and can be false positives; commit age is a prompt to review documentation, not proof that it is stale.

## Product monitoring

No product health endpoints, uptime targets, incident alerts, or operational deployments exist. The [MVP operations scope](design/active/2026-10-14-lets-farty-mvp-design.md#cicd-and-production-control) owns future monitoring, private-data logging boundaries, and release controls.

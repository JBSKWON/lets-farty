# Security

## Authentication and private data

Product sign-in, server authorization, storage policies, and retention are not implemented. Follow the privacy and consent requirements in the [MVP design](design/active/2026-10-14-lets-farty-mvp-design.md); add cross-user access and deletion tests with their feature slices.

## Credentials

Keep real credentials out of source and documentation; use runtime configuration or an appropriate secret manager when external services are introduced. Commit only safe examples. The entropy scanner reports possible literal credentials without printing their values; this heuristic is not secret scanning and can miss credentials or report harmless examples.

## Tooling and network

The GitHub verification workflow requests read-only repository permissions and pins action revisions. Dependency installation requires registry access; verification does not need product credentials or external services. Hook installation is local to the checkout. No machine-global editor rules or service configuration are installed by this adaptation.

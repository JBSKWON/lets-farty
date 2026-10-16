# Harness Template Adaptation

**Applied:** 2026-10-16

**Source:** User-supplied `harness-template-master@bc3dcf4badd.zip`, archive identifier `bc3dcf4badd`.

**Archive SHA-256:** `4c08283668da1c6e01f6d738ebfc464b6379f474fa6ff742e984867569987d6c`.

The owner requested application to the existing `set-up` branch. This record maps the supplied template to Let's Farty's established harness and records verification; it does not approve the pending application stack or product decisions.

## Template mapping

| Supplied component | Applied form |
| --- | --- |
| Agent and architecture entry points | Existing root AGENTS/ARCHITECTURE gain progressive-disclosure and maintenance links; CLAUDE imports shared instructions |
| `docs/design-docs/` index | Existing [doc index](../README.md), retaining `design/{active,completed}` and its approval history |
| `docs/exec-plans/` | Existing `doc/exec/{active,completed}`; [debt tracker](../tech-debt-tracker.md) is a living reference outside lifecycle folders |
| Core beliefs and domain references | [Core beliefs](../core-beliefs.md), DESIGN, FRONTEND, PLANS, PRODUCT_SENSE, DEPLOYMENT, RELIABILITY, SECURITY, and QUALITY_SCORE under `doc/` |
| Product specs, generated docs, dependency references | `doc/product-specs/`, `doc/generated/`, `doc/references/`; no generated content is invented without a producer |
| Doc linter | Python-compatible entry point delegates to the existing Markdown AST checks plus `check:harness` for required references, indexes, and generated-source headers |
| Architecture linter | Python-compatible entry point delegates to the existing tested dependency-cruiser/TypeScript checker |
| Entropy scanner | `scan:entropy` and Python-compatible entry point; comment debt, size hints, redacted credential hints, Git-history staleness |
| Pre-commit hook | Conditional checks against an exported staged snapshot, including deletions and filenames with spaces |
| Cursor/global rules | Project-local `.cursor/rules/` links to shared rule owners; no global editor configuration changes |
| Firmware instructions | Omitted because this is not a firmware project |
| Initialization skill and raw templates | One-time initialization completed; no installer or unfilled template copies retained |

## Adaptation decisions

Preserve the existing `doc/` layout and the three lifecycle status labels from [doc/README.md](../README.md). The template's generic numbered layers and alternate status emojis do not replace the approved domain boundaries or approval history.

The supplied architecture script defines a layer table but never checks imports; replacing the existing checker would remove tested enforcement. Its command therefore delegates to our existing parser/resolver. The supplied doc linter also treats broken links as warnings; our existing check continues to fail them.

Python scripts are compatibility entry points; npm remains the canonical verification system. No `uv` dependency is added. Entropy uses Git commit times rather than filesystem modification times, which vary across checkouts. Findings are advisory, and credentials are never echoed. The scanner does not claim production security coverage.

The hook is installed via the checkout-local `core.hooksPath=.githooks`. New clones must opt in using the contributor setup command; Git does not distribute local hook configuration. Existing external hook configuration should be reviewed before changing that setting.

## Verification

The baseline `npm run verify` passed 141 tests and all scans at `52dedf8`. New structural/scanner tests and staged-snapshot hook tests were written before implementation and observed failing on missing modules, then passing. Final suite, compatibility-command smoke checks, installed-hook behavior, and remote CI results are recorded after execution below.

### Observed implementation checks

- `npm run verify`: 155/155 tests and all architecture, Markdown, harness-structure, and formatting checks passed.
- Nine new harness fixtures passed: required references, actual index links, generated-source headers, placeholder detection, comment-only debt, redacted credential hints, Git-history staleness, and absent product directories.
- Five real Git-index fixtures passed: empty staging, broken staged content hidden by an unstaged fix, valid staged content with broken working files, staged deletion, and filenames containing spaces.
- `python3 scripts/lint-docs.py`, `python3 scripts/lint-arch.py`, and `python3 scripts/scan-entropy.py --check staleness` exited 0.
- `npm run scan:entropy` completed with zero current advisory findings. No product directories or machine-global editor settings were introduced.
- `git diff --check` passed; the supplied templates were populated or mapped to existing rule owners rather than retained as initialization artifacts.

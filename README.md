# Let's Farty

The product is in design; repository verification tooling is available. The [MVP design](doc/design/active/2026-10-14-lets-farty-mvp-design.md) describes the proposed app and repository bootstrap. [Documentation rules](doc/README.md) track design and execution progress.

Coding agents start with [AGENTS.md](AGENTS.md), which follows the [open AGENTS.md convention](https://github.com/agentsmd/agents.md). Claude Code imports the same instructions through [CLAUDE.md](CLAUDE.md).

## Verify the repository

Use Node 24.19.0 and npm 11.9.0, then run `npm ci` and `npm run verify`. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and individual checks, and [ARCHITECTURE.md](ARCHITECTURE.md) for the current tooling and future product boundaries.

## Work in Codex Cloud

1. In Codex, choose **Work in > Cloud > Select environment > Create environment**.
2. Connect GitHub if prompted and select `JBSKWON/lets-farty`.
3. Let Codex inspect the repository, review its setup report, and publish the environment.
4. Start a new task using the published environment.

The cloud environment can install tooling with `npm ci` and run `npm run verify` using the pinned runtime. Application dependencies, services, and native launch commands will arrive with the separate foundation app shell. See the [official OpenAI Docs for cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environments).

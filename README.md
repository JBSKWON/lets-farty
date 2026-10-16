# Let's Farty

The project is in design. The [MVP design](doc/design/active/2026-10-14-lets-farty-mvp-design.md) describes the proposed app and repository bootstrap. [Documentation rules](doc/README.md) track design and execution progress.

Coding agents start with [AGENTS.md](AGENTS.md), which follows the [open AGENTS.md convention](https://github.com/agentsmd/agents.md). Claude Code imports the same instructions through [CLAUDE.md](CLAUDE.md).

## Work in Codex Cloud

1. In Codex, choose **Work in > Cloud > Select environment > Create environment**.
2. Connect GitHub if prompted and select `JBSKWON/lets-farty`.
3. Let Codex inspect the repository, review its setup report, and publish the environment.
4. Start a new task using the published environment.

There are no application dependencies, install commands, services, or tests yet. Add those to the cloud setup when the foundation app shell is built. See the [official OpenAI Docs for cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environments).

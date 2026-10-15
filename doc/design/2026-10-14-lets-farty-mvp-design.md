# Let's Farty MVP Design

**Status:** Revised proposal for owner review

**Date:** 2026-10-14

## Shared understanding

The app should be fun to record and share, on both iPhone and Android. A user gets a playful score, can sign in with Apple or Google, and can opt into a global ranking. Sharing a result may include a playable recording, but audio sharing is a separate choice. The app should also give useful, serious digestive guidance over time from optional food, perceived smell, and symptom entries. The repository should help human and AI contributors work consistently and should support controlled CI/CD releases.

The user approved iPhone and Android, a managed backend model such as Supabase, and a small scoring service that we own and deploy on managed infrastructure. The service exists because the public ranking cannot trust a score calculated only on a user's phone.

**Proposed choices for review:** Expo/React Native with TypeScript, Supabase as the managed provider, recording and provisional scoring before sign-in, a 0–100 score, a 20-second recording limit, one best score per person for each scoring version, and an unlisted playable web link for shares. These choices were not specified by the user and can change in this review.

## Evidence boundary

The fun score describes audible qualities. It is never a digestive-health score. A user's recordings can establish a personal acoustic baseline, but there is no validated interpretation of phone-recorded fart sound that diagnoses digestive disease. Published work on abdominal bowel sounds studies a different signal and remains preliminary. [Bowel-sound systematic review](https://pubmed.ncbi.nlm.nih.gov/30115115/).

The first health insights will use logged symptoms and food alongside descriptive audio trends. A note can say, for example, that the user logged bloating after a particular food several times and suggest what to track next. It must name the observations behind the note, avoid claiming causation, and link to reviewed evidence. NIDDK describes symptom and food diaries as useful in evaluating gas symptoms. [NIDDK diagnosis guidance](https://www.niddk.nih.gov/health-information/digestive-diseases/gas-digestive-tract/diagnosis).

Health-facing rules and copy need qualified clinical review before public release. They will not diagnose a condition, recommend medication, or imply that a quiet recording proves good health. Changed or persistent symptoms, and symptoms accompanied by pain, diarrhea, constipation, or weight loss, prompt a clear care-seeking message. [NIDDK symptoms guidance](https://www.niddk.nih.gov/health-information/digestive-diseases/gas-digestive-tract/symptoms-causes). Any future claim that audio predicts health requires a separate validation study and regulatory review before it reaches users. [FDA general wellness guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices).

## User flow

1. The user starts a foreground recording, replays it, and gets a provisional sound score with a short, playful explanation. An empty or unreadable clip asks for a retry.
2. Apple or Google sign-in lets the user save a history. Optional food, smell, and symptom entries are private. Smell is self-reported; audio does not measure it.
3. Joining the global ranking requires a separate opt-in and an audio upload. The service checks the recording and calculates the ranked score itself. The ranking shows a chosen display name and that user's best verified score for the current scoring version. Changing the scoring method starts a new ranking version rather than comparing incompatible scores.
4. Sharing a result is separate from ranking. The default shared page shows the score. The user may add playable audio explicitly. Shared pages contain no health entries. The user can disable the link; recipients can report misuse. A recipient may still keep a copy of audio already downloaded, which the app explains before sharing.
5. After repeated private entries, the app shows simple personal trends and evidence-linked gut notes. Audio changes are labeled as observations without a disease interpretation.

## Architecture and data boundaries

```text
Expo/React Native app (TypeScript)
  ├─ local recording, playback, provisional score
  ├─ private history and optional check-ins
  └─ Apple/Google sign-in
          │
          ├─ Supabase Auth + Postgres + private Storage
          │     └─ per-user access policies and migrations in Git
          └─ one TypeScript API service on managed hosting
                ├─ authoritative scoring and ranking writes
                ├─ share-link access and audio playback
                └─ versioned, evidence-linked insight rules
```

The app and API share request and response schemas and pure scoring logic only when the same implementation can run in both environments. The API remains one deployable service with focused modules. A small web page handles shared results. Platform permissions, sign-in, audio behavior, and builds are tested on both iOS and Android. [React Native TypeScript](https://reactnative.dev/docs/typescript); [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/); [Supabase social auth](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth).

Private recordings, check-ins, and derived features are accessible only to their owner. Ranking and audio sharing use separate opt-ins. A shared link checks whether the share remains active; storage itself stays private. The API restricts audio size, format, duration, and processing time, and never logs recordings or health entries. Nonshared uploads are deleted after scoring and a bounded retry period. The exact retry period, backup behavior, and account-deletion timing must be specified and tested in the upload slice before that feature is built. [Supabase storage controls](https://supabase.com/docs/guides/storage/security/access-control); [OWASP MASVS](https://mas.owasp.org/MASVS/).

Server scoring reduces easy leaderboard cheating but cannot prove who made a sound. The app must describe the ranking as a game, not a verified human competition.

## Repository harness

Use one GitHub repository and a small workspace. Create directories when a slice needs them rather than maintaining empty packages.

```text
AGENTS.md                 Agent task map and relevant commands
CLAUDE.md                Imports AGENTS.md; Claude-specific notes only
ARCHITECTURE.md          Current components and data boundaries
README.md                Human setup and product overview
CONTRIBUTING.md          Change, review, and verification workflow
SECURITY.md              Vulnerability reporting
apps/mobile/             Cross-platform app
apps/share/              Shared-result web page, when sharing is built
services/api/            Scoring, ranking, sharing, insights, as slices land
packages/contracts/      Shared schemas, when an API is introduced
packages/scoring/        Shared scoring code, only if needed on both sides
infra/supabase/          Migrations and access policies
doc/design/              Approved designs
doc/exec/                Checkable execution plans
doc/decisions/           Decisions that change system boundaries
doc/health/              Evidence and approved health claims
doc/operations/          Release and incident runbooks
.github/                 Workflows, PR template, ownership rules
```

`AGENTS.md` stays short and points to the right document for a task. `CLAUDE.md` imports it to avoid duplicated instructions. A root `verify` command runs the checks used by CI. [AGENTS.md convention](https://agents.md/); [OpenAI Docs on concise agent instructions](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra); [Claude Code project instructions](https://code.claude.com/docs/en/memory).

### Documentation is part of completion

Markdown files are maintained as the service changes. A task is complete only when its checks pass **and its affected documentation is updated in the same change**. The implementation plan records decisions and progress during the work, not only after it finishes. The pull request template asks which documents changed or why no document was affected. CI checks Markdown format and local links; a reviewer checks whether the content still matches the behavior.

Each document has one job:

- `AGENTS.md` owns agent workflow and points to relevant commands and documents; `CLAUDE.md` imports it and holds only tool-specific additions.
- `ARCHITECTURE.md` describes the system as it runs now; `doc/design/` describes approved changes; `doc/decisions/` records why a lasting boundary changed.
- `README.md` and `CONTRIBUTING.md` own human setup, local commands, and the contribution workflow.
- `doc/health/` owns the evidence and approved wording behind every health-facing rule; `doc/operations/` owns deployment, rollback, and incident steps.
- `doc/exec/` holds the active plan, its progress, verification evidence, and any change in scope.

Update only documents affected by a change. Do not copy the same rule across files: link to its owner so agents and humans read the same current instruction.

## CI/CD and production control

- **For every pull request:** GitHub Actions runs the repository's `verify` command. As features land, it covers formatting, types, focused tests, API contracts, scoring fixtures, and cross-user access tests. A lockfile, dependency checks, and secret scanning protect the build.
- **For merges:** protect `main` with required checks and review. Changes to health claims, access policies, and deployment workflows get named owners when those owners exist. These settings must be enabled on GitHub; files in the checkout cannot enforce them by themselves.
- **For staging and release:** CI builds both mobile platforms and deploys backend changes to staging. Smoke checks precede a protected production promotion. The release record identifies the app, API, migration, scoring, and insight-rule versions. A documented API rollback and a compatible mobile rollout path are required before launch.
- **For operations:** monitor failed recordings/uploads, scoring failures, API errors, and share-page availability. Logs exclude private audio and health content. The runbook states who responds and how to disable sharing or ranking during an incident.

GitHub rulesets and deployment environments provide the merge and promotion controls. Cloud credentials should use short-lived identity where available. [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets); [GitHub deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments); [NIST SSDF](https://csrc.nist.gov/pubs/sp/800/218/final).

## Delivery scope and checks

This product spans independent subsystems. Each gets its own design review and execution plan. The next plan covers **only the first slice**:

1. **Foundation and private recording:** create the harness, runnable iOS/Android app, foreground record/replay flow, provisional fun score, and real CI checks. Include the documentation update rule in `AGENTS.md`, `CONTRIBUTING.md`, and the PR template, with one owning source for each rule. Verify local setup from a clean clone, score fixtures, and recording on both platforms. No account, upload, ranking, sharing, or health claim ships in this slice.
2. **Identity and verified ranking:** design Apple/Google sign-in, private storage, authoritative scoring, ranking, deletion timing, and access tests before implementation.
3. **Optional audio sharing:** design playable links, consent, reporting, and revocation before implementation.
4. **Digestive guidance:** design the entry schema, minimum data for a note, evidence register, clinical review, and safety copy before implementation.
5. **Public release:** complete store review materials, privacy and retention policy, staging checks, monitoring, and rollback rehearsal. Select release regions during this slice; the current design does not assume a country list.

The first slice is complete when a contributor can run the documented setup and verification commands, CI runs those same checks, a tester can record, replay, and score a clip on both iPhone and Android, and the repository instructions correctly describe the working app. Later slices have their own acceptance criteria in their designs.

## Current repository state

The local checkout contains this design commit but no configured Git remote. Inspect the supplied `JBSKWON/lets-farty` remote before connecting, pulling, or pushing, so any existing GitHub history is preserved. Activating GitHub protection, cloud deployment, Apple/Google sign-in, and store delivery requires the corresponding external projects and credentials.

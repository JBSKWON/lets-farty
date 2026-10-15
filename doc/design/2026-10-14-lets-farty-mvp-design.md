# Let's Farty MVP Design

**Status:** Proposed for owner review

**Date:** 2026-10-14

**Repository:** `JBSKWON/lets-farty`

**Audience:** Product owner, human contributors, and coding agents

## Purpose and success

Let's Farty is a lighthearted iPhone and Android app for recording a fart, getting a reproducible fun score, and optionally sharing a result with playable audio. Users may enter a global ranking under an opt-in display name. The same app offers serious, source-backed digestive guidance from optional food, smell, and symptom entries over time. It shows personal audio trends as observations and does not interpret fart acoustics as a diagnosis without clinical validation.

The MVP succeeds when a new user can record and score a clip, sign in with Apple or Google, opt into a server-verified ranking, share a result with or without audio, and receive useful private pattern notes after repeated entries. The owner can reproduce these flows on both iPhone and Android, trace every health statement to a source, and promote or roll back a release through documented CI/CD steps.

## Product boundaries

### Recording and scoring

- Recording is started and stopped by the user while the app is in the foreground. The app requests microphone permission in context and stops after 20 seconds.
- The app rejects an empty, undecodable, or badly clipped recording with a retry prompt. It does not claim to prove the sound came from a human.
- A local provisional score from 0 to 100 provides immediate feedback. Score copy is playful and describes audible properties such as length, variation, and rhythm. It never describes digestive health.
- The scoring algorithm, its parameters, and its audio fixture corpus are versioned together. Each result records its scoring version. A score version change starts a new ranking season and archives the previous one, so scores from different versions are never compared silently.
- A ranked result requires explicit submission of the recording to the backend. The backend computes the authoritative score from the uploaded audio. A client-supplied score is never trusted for ranking.

### Accounts, ranking, and sharing

- Recording and provisional scoring work without an account. Guest recordings and tags remain on the device for that session. Sign-in with Apple or Google is required to save a history, join the ranking, or host a shared result. Both providers are available on iOS and Android, using the platform-appropriate native or browser-based flow.
- The global ranking shows each opted-in user's best verified score in the current scoring season. Ties use the earlier verified submission. It shows a chosen public display name and score, never food entries, symptom entries, smell tags, or an email address.
- Ranking is opt-in and revocable. Leaving it removes the user's entry from public ranking. Deleting the account removes server-held recordings, feature history, and public identity according to the retention policy below, and clears this app's local history on that device.
- The default share contains a score card without audio. A separate choice adds a playable recording. Hosted results use an unlisted link and a minimal web playback page so recipients do not need the app. The owner can disable the link and report misuse; link recipients can report a clip. The public page contains no health data.
- A shared audio clip may be copied by a recipient. The app explains this before the user enables audio sharing. Disabling a link prevents future access through the service but cannot erase copies already downloaded.

### Personal baseline and digestive guidance

- Users may add simple food, perceived smell, gas frequency, bloating, abdominal pain, and bowel-habit tags after a recording. Guest tags stay in the local session; signed-in users may save them to a private history. Smell is self-reported; the microphone does not measure it.
- The baseline summarizes observable changes in that user's audio features and entries over time. It labels small sample sizes and missing data. It does not map acoustic changes to a disease, risk score, or reassurance of health.
- Guidance uses versioned, evidence-linked rules and states which user entries led to each note. Examples include recurring associations between a logged food and symptoms, what to keep tracking, and when changed or persistent symptoms warrant a clinician conversation. These are associations, not proof of a cause.
- Health-facing copy is reviewed by a qualified clinician before public release. Rules do not diagnose, recommend medication, or advise delaying care. Potentially concerning symptom entries route to a clearly worded care-seeking message instead of a playful interpretation.
- Audio-based medical claims remain a research track. Before release of such a claim, the team must define the intended use and reference outcome, collect consented and appropriately labeled data, test across users and devices on held-out data, assess calibration and error harms, obtain clinical review, and review applicable regulatory requirements.

## Technical approach

### Components and data flow

1. **Mobile:** Expo and React Native with TypeScript target iOS and Android from one codebase. Platform-specific microphone, Apple/Google sign-in, permissions, and release settings remain explicitly tested on both platforms.
2. **Managed data services:** Supabase provides authentication, Postgres, and private object storage. Database migrations and row-level access policies live in the repository. Client credentials have the minimum access needed; service credentials never ship in the app.
3. **Application API:** One containerized TypeScript service on managed hosting verifies authentication, reads a submitted private recording, decodes it, computes the authoritative score, maintains ranking records, serves unlisted share pages and playback, and evaluates versioned gut-insight rules. It is modular within one deployable service for the MVP.
4. **Shared contracts:** Typed request and response schemas are shared between mobile, API, and the share page. Contract changes include compatibility tests.
5. **Share page:** A small mobile-friendly web page plays a shared clip after checking that the link remains active. It includes a report control and no private health fields.

The mobile app computes provisional acoustic features. A signed-in user can save those features without uploading raw audio. For a ranked or hosted result, the API recomputes them from the uploaded clip and stores the verified version. A ranking-only upload is removed within 24 hours after processing unless the user separately enables hosted audio sharing. A hosted clip remains until its owner disables sharing or deletes the account. Private health entries and derived features remain until the user deletes them or the account. Production backups follow the managed provider's documented retention and deletion behavior, which must be reflected in the published privacy policy before launch.

### Trust boundaries

- Audio, food, smell, and symptoms are private user data. Sharing and ranking have separate consents.
- Postgres policies enforce per-user reads and writes. The API performs authorization again for privileged operations. Access-policy tests cover cross-user reads and writes.
- Public ranking reads from a narrow published projection. Public share access uses an opaque link token checked by the API on every request; the underlying storage bucket remains private.
- Uploaded audio is treated as untrusted input. The API limits file size, duration, format, and processing time. It rate-limits submissions and logs abuse signals without logging raw audio or health entries.
- The leaderboard is a game feature. Server verification raises the cost of basic cheating, but does not establish that a recording is genuine.

## Repository convention

The repository is a pnpm workspace. Directories appear when their first implementation lands; empty placeholder packages are not maintained.

```text
AGENTS.md                  Agent task map, safe commands, and completion rules
CLAUDE.md                 Imports AGENTS.md; only Claude-specific additions
ARCHITECTURE.md           Current component map and trust boundaries
README.md                 Product overview and first-run instructions
CONTRIBUTING.md           Local workflow and pull request expectations
SECURITY.md               Private vulnerability reporting process
apps/mobile/              Expo app
apps/share/               Minimal shared-result web page
services/api/             Scoring, ranking, sharing, and insight modules
packages/contracts/       Shared schemas and generated types
packages/scoring/         Pure scoring logic and audio fixtures
infra/supabase/           Migrations, policies, storage configuration
doc/design/               Approved product and architecture designs
doc/exec/                 Executable plans with progress and verification
doc/decisions/            Architecture decision records
doc/health/               Sources, claim register, clinical review, research protocol
doc/operations/           Deployment, rollback, privacy, and incident runbooks
.github/                  CI/CD workflows, PR template, CODEOWNERS
```

`AGENTS.md` is concise and points agents to documents by task. `CLAUDE.md` imports `AGENTS.md` so the two instruction files do not drift. Local verification uses one documented root command, `pnpm verify`, which CI runs unchanged. Architecture decisions record context, choice, consequences, and a review trigger. Design changes update the relevant document and tests in the same pull request.

## CI/CD and production control

- **Pull requests:** GitHub Actions installs from the committed lockfile and runs formatting, linting, type checks, unit tests, API contract tests, scoring fixture tests, data access policy tests, and a build check. Dependency and secret checks run on every pull request. Platform smoke checks use iOS and Android development builds for release candidates.
- **Protected main:** GitHub rules require a pull request, passing required checks, and review. `CODEOWNERS` covers health claims, database policies, and deployment workflows. Actual GitHub rules and environment protections must be configured on the remote; repository files alone cannot enforce them.
- **Staging:** A merge deploys database migrations and the API to staging, then runs smoke tests. Mobile preview builds point to staging. Schema changes are additive or use a documented expand-and-contract migration.
- **Production:** A tagged release creates reproducible mobile builds and an API artifact. Promotion requires successful staging evidence and a protected GitHub production environment. The release record includes app version, API revision, migration version, and scoring and insight-rule versions.
- **Rollback:** The API can return to a prior image; mobile releases use store rollout controls and compatible APIs; risky features have kill switches. Database migration rollback is a documented forward fix when a destructive reverse migration would lose data.
- **Operations:** Structured logs, error rates, score job failures, upload failures, and share-page availability are monitored. Logs and analytics exclude audio and health-entry content. A runbook identifies owners, alert thresholds, and incident response steps before production launch.

The GitHub repository and cloud projects need their own credentials and settings. CI uses least-privilege tokens and short-lived cloud identity where supported. No production credential is committed to Git.

## Delivery slices and acceptance

1. **Harness and runnable shell:** repository instructions, docs, workspace, verification command, CI checks, empty mobile/API entry points, and a staging release path. A new contributor can run the documented setup and checks.
2. **Private recording and score:** permission flow, local capture/playback, scoring fixtures, and result card work on iOS and Android.
3. **Accounts and ranking:** Apple/Google sign-in, authoritative upload scoring, opt-in global ranking, access policies, and abuse limits work in staging.
4. **Sharing:** score-only and opt-in playable-audio links, link disabling, misuse reporting, and deletion behavior work end to end.
5. **Gut insights:** optional entries, baseline observations, evidence-linked rules, clinician-reviewed copy, sample-size language, and privacy/deletion tests work end to end.
6. **Release readiness:** both mobile builds, store metadata and privacy disclosures, staging smoke checks, monitoring, and rollback rehearsal are complete before production promotion.

Each slice is independently reviewable and has an execution plan under `doc/exec/` before product code is written.

## Evidence and reference standards

- [NIDDK: diagnosis of gas symptoms](https://www.niddk.nih.gov/health-information/digestive-diseases/gas-digestive-tract/diagnosis) supports using symptoms, diet history, and a diary for guidance.
- [NIDDK: symptoms and causes](https://www.niddk.nih.gov/health-information/digestive-diseases/gas-digestive-tract/symptoms-causes) supports the care-seeking messages.
- [Systematic review of bowel-sound analysis](https://pubmed.ncbi.nlm.nih.gov/30115115/) describes preliminary evidence on abdominal bowel sounds, a different signal from phone-recorded flatulence.
- [FDA general wellness guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices) informs claim boundaries for a US release.
- [React Native TypeScript documentation](https://reactnative.dev/docs/typescript), [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/), and [Flutter's single-codebase documentation](https://flutter.dev/development) inform the cross-platform choice.
- [Supabase React Native social authentication](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth) and [private storage access controls](https://supabase.com/docs/guides/storage/security/access-control) inform the managed backend design.
- [AGENTS.md convention](https://agents.md/) and [OpenAI Docs on agent instructions](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) inform the agent-facing repository contract.
- [Claude Code project instructions](https://code.claude.com/docs/en/memory) supports importing `AGENTS.md` from `CLAUDE.md`.
- [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) and [deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments) inform merge and promotion controls.
- [OWASP MASVS](https://mas.owasp.org/MASVS/) is the mobile security verification baseline.
- [NIST Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final) informs repository, build, and release security practices.

## Risks and deliberate limits

- A personal audio baseline can show change, but currently has no validated digestive interpretation. Health guidance derives from user entries and reviewed sources until a separate validation study supports more.
- Microphone hardware, distance, room acoustics, and background noise affect scores. The fixture corpus and device testing constrain regressions but do not make scores comparable across every environment.
- Unlisted audio links can be forwarded. Sharing is separate from ranking, audio starts off, and users can disable hosted access.
- Store approval, medical claims, and privacy requirements vary by release region. The first public release scope is Canada and the United States, subject to store and regulatory review before submission.
- The local checkout currently has no commits or remote. The supplied GitHub repository must be inspected and connected before branch protection or deployment can be configured.

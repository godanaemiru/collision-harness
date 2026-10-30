# Collision Harness

Original, dependency-free Node.js coordination for Collision Course. Requires Node 20.12+ and Git. No Agent HQ, orchestration framework, npm install or external package is used.

## Quick start (PowerShell)

1. Keep the supplied challenge repository at `../collision-course-ledger`, with the challenge backlog and test lock committed. The harness never publishes it.
2. Run `node cli.mjs check` to verify the baseline without any model calls.
3. Run `node cli.mjs models` to list currently available free models. Put **two distinct IDs ending in `:free`** into `models` in `config.json`. Select coding-capable models with enough context and at least 8,000 output tokens. Availability changes, so no model IDs are hardcoded.
4. Run `./set-key.ps1` locally to store your OpenRouter API key in the ignored `.env` file. Never paste it into chat or commit it. The script prompts privately; it makes no network request.
5. Run **`node cli.mjs run`**. This is the one-command challenge run. It transmits the backlog, source and documentation to the selected OpenRouter models. Keep that provider processing in mind when selecting models. No API request is made by tests or `check`.
6. Resume with `node cli.mjs resume --run C:/dev/collision-private-runs/<run-folder>`. Keep the original configuration and challenge files unchanged.

The $5 cap is configurable down to $0. This version deliberately supports **free-only execution**: paid model IDs, automatic routers, nonzero catalog pricing and paid fallbacks are rejected. Requests have a zero-price provider ceiling, a persistent request ledger, a maximum of 45 dispatches by default, and at least 3.2 seconds between starts. OpenRouter free availability/quota is not guaranteed. Request ceilings apply to this run, so other account usage still counts against provider quotas.

## Coordination and verification

A planner infers a dependency graph, contradictory requirements, and source file ownership from the entire backlog, API documentation and file inventory. Invalid references and dependency cycles stop the run. Ownership falls back to all source files when uncertain. At most three independent worker conversations run together, in separate detached Git worktrees, using two configured models. Worker identities rotate even when conservative ownership serializes tasks.

Workers return full-file JSON changes, not shell commands. Only ordinary JavaScript paths under `src/` can be written. Tests, scripts, backlog, lock files and package files cannot be patched. Each candidate must pass its acceptance test, regression suite and integrity check. Merges run one at a time and must also preserve every already-verified task. Bad merges roll back only the dedicated integration worktree. The original checkout is not reset or edited.

The grader's exit status does not prove task completion. The harness parses `grade-report.json` and saves each report plus grader output. Worker claims are kept separately from verified results. Conflicting requirements are deferred once an incompatible task verifies. Failed dependencies block dependents. Two attempts per task are permitted by default; failures and integration feedback are supplied on retry.

State is atomically checkpointed before dispatch and merge. Resuming rechecks accepted work, rolls back an interrupted integration, and requeues interrupted workers within attempt limits. A process lock prevents two processes resuming the same run. Interruptions with a zero-price request outstanding remain explicitly **cost unconfirmed**, with the pre-request zero-price upper bound recorded. Missing usage on a received response or any unexpected nonzero cost stops new calls; provider activity must then be reconciled before continuing. No cost is invented.

## Private results and submission

Default run folders are in `C:/dev/collision-private-runs`, outside this public harness repository:

- `events.jsonl`: timestamped scheduling, ownership, model, verification and merge events.
- `state.json`: durable tasks, attempts, commits and per-request spending evidence.
- `summary.json`: confirmed spend, unresolved costs, verified tasks, actual models and whether three workers/two models really completed calls.
- `evidence/`: prompts, raw responses, token/cost usage and test outputs.
- `integrated/`: final result checkout, with the accepted commits.
- `writeup.md`: run-specific draft for the required one-page write-up. Review its failures and limitations before submission.

Do not publish run folders, hidden backlog, result Git history containing that backlog, or prompts before results are out. The public harness repository contains only coordinator code. Share complete private evidence and resulting code with the organizer through an approved private submission route; public harness code alone does not demonstrate the produced ledger changes. No submission or publishing is automated.

## Validation

`node --test` runs guard, path, ownership, graph, catalog and checkpoint tests, plus an offline fixture run. The fixture uses three workers and two mock models, deliberately creates an integration regression, verifies rollback and truthful failure reporting, then simulates an interrupted merge and resumes without duplicate calls. Fixture logs are not challenge evidence.

## Limits

No real challenge run has been performed merely by installing this project. An API key and two selected free models are required. Model quality, provider context limits and free quota may prevent completion. Dependency and contradiction inference is imperfect, and there is no automatic graph replanning. Full-file responses can exceed output limits. Generated source is executed by local Node tests, without an OS sandbox; only trusted test commands are selected, but their imported source is model-generated. Confirmed spend and unresolved requests are reported separately. Organizer hidden tests, rather than local acceptance tests, determine the final score.

Official API references: https://openrouter.ai/docs/api_reference/overview and https://openrouter.ai/docs/guides/routing/provider-selection .

## Hidden backlog handling
If a task has no local acceptance file, source changes may be accepted only after regression and integrity checks, and are reported as implemented_unverified. Such changes can support later dependencies but are not claimed to pass organizer tests. Use --replay-saved with resume to test unused complete saved worker responses without making new model calls. Malformed summaries may be discarded only when the complete files array itself parses as strict JSON; source strings are never repaired or evaluated by the parser.

Private contract checks may be placed at <run>/checks/contracts.mjs. They execute against worker and integration worktrees; accepted changes must preserve earlier passing contracts. Passing these author-written checks never changes a hidden task to verified. Resumes may use --worker-model with one configured model to avoid a known failing provider, while the report retains every actual worker model from the entire run. Model metadata and explicit endpoint refusals determine whether reasoning must stay enabled. Operator interventions are recorded in events.jsonl.

To package a stopped run: ./package-submission.ps1 -RunFolder <private-run-folder> -OutputFolder <deliverables-folder>. The public archive contains committed harness files only. The separate private bundle contains hidden task data and is intended only for the organizer.

## Public submission evidence
See [the redacted run evidence](submission/run-evidence/README.md) for timestamped worker activity, all 45 dispatch records, reported token usage, spending, task outcomes and recorded operator interventions. The [one-page write-up](submission/writeup.pdf) describes the partial result. Hidden task content and raw transcripts remain private; organizer acceptance of a redacted export is not assumed.

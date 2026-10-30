# Public run evidence (redacted)

This is an audit export of the actual run, not a raw transcript. The original private files remain intact.

- events.redacted.jsonl retains all 329 original event rows, their order and timestamps. Details are exported through an explicit allowlist.
- requests.json records all 45 dispatches, reported token usage, request outcomes, zero-price bounds and cost reconciliation.
- task-statuses.json uses anonymous task aliases and records statuses, attempts, dependencies and conflicts.
- summary.json records the partial result and regression/integrity checks.
- provider-usage.json records the final aggregate key usage without an API key or account identifier.

Intentionally excluded: hidden task IDs, titles and bodies; prompts; model source responses; custom check code and assertion values; raw error payloads; account/provider user IDs; generation IDs; private filesystem paths; and credentials. Missing cost or token fields are not invented. Reconciled zero-cost requests are distinguished from successful requests with returned usage.

Operator interventions are retained as timestamped event types; their private narrative fields are removed. The live run mostly serialized edits conservatively. Two tasks pass author-written local checks, all 33 starter regression tests pass, and no organizer hidden-test pass is claimed. Recorded model usage is USD 0 under a USD 5 cap.

This redacted evidence may be useful for judging, but it is not represented as the full raw log requested by the organizer. The unredacted organizer bundle remains available privately if required.

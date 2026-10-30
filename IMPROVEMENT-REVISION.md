# Improvement revision

This branch is separate from the submitted master branch and its original run.

Implemented: exact unique-anchor edits validated before writing; Windows line-ending handling; detailed stale-anchor diagnostics; provider cooldowns and configured free-model fallback; cached candidate verification after ownership expansion; preservation of earlier local contracts; setup-failure handling; and cached-candidate verification even after the dispatch cap is reached.

Validation: all 15 offline tests pass. The end-to-end fixture covers three workers, two mock models, protected files, a rejected integration, candidate reuse without another inference call, and interrupted-merge recovery.

A separate merchant/payment trial made 5 of at most 6 free dispatches with a USD 0 budget. No additional task passed the independent local checks; the two inherited passing tasks remain intact. It rejected an invalid anchor, malformed output, and an account-kind default regression. Provider timeout and rate-limit failures prevented a verified repair. No target source was manually edited to disguise that outcome.

OpenRouter records USD 0 usage. Original state, event-log and summary hashes match the protected pre-trial snapshots. The submitted website entry and master branch have not been updated with these trial results. Private task content and raw trial logs are not published here.

Next useful step: retry the small repair with a reliably available model. Paid calls remain disabled.

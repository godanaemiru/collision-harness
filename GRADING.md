# Collision Course: how Collision Harness was graded

Organizer grading for the Collision Course hackathon (Kolaborate Academy, 23 to 30 October 2026). These scores are a draft until the leaderboard is published on the platform.

**Total: 0.506 of 1.000, currently ranked 2 of 3.**

| Criterion | Weight | Score |
|---|---|---|
| Hidden tests | 0.40 | 0.036 |
| Collision efficiency | 0.20 | 0.12 |
| Cost against cap | 0.15 | 0.13 |
| Honesty of done claims | 0.15 | 0.14 |
| Process evidence | 0.10 | 0.08 |

## What was graded

- Produced code: `result/src` on `master@0d2059f`. It is identical to `result/ledger-source-changes.patch` applied to base commit `f4b5bba`, and identical on the submitted branch `improve/incremental-workers`.
- Evidence: `submission/run-evidence/` and `submission/writeup.pdf`.
- Lateness: the run ended at 11:15 EAT on 30 October, and this repository was created on GitHub at 11:18 EAT, after the 09:00 EAT deadline. The organizer chose to grade the submission as it stands and record the lateness here, with no extra deduction.

## Hidden tests: 0.036

The organizer grading script copied your result onto the base, replaced `test/`, `acceptance/`, `scripts/`, `backlog/`, `package.json` and `tests.lock.json` with the organizers' copies, and ran the hidden acceptance tests.

| Task | Result | Task | Result |
|---|---|---|---|
| H01 | pass, 6 of 6 | H07 | fail, 2 of 6 |
| H02 | fail, 0 of 8 | H08 | fail, 0 of 9 |
| H03 | fail, 8 of 11 | H09 | fail, 1 of 9 |
| H04 | fail, 1 of 8 | H10 | fail, 1 of 6 |
| H05 | fail, 1 of 5 | H11 | fail, 2 of 8 |
| H06 | fail, 1 of 7 | H12 | fail, 2 of 6 |

The regression suite passed 33 of 33 and the locked files were unchanged. A task counts only when all of its assertions pass, and H02/H05 count as one unit. That makes 1 of 11 units, and 0.40 × 1/11 = 0.036. Your H01 is the only correct H01 among the entries: it fixes the latent rounding bug as well as the new band.

## Collision efficiency: 0.12 of 0.20

- Conservative file ownership meant nothing collided and no work was overwritten.
- The planner inferred that H02 needs H10, and that H08 needs H02 and H10. Their dependents were blocked correctly when H10 failed.
- Points lost for three reasons:
  - Nearly all work ran serially.
  - Most of the 45 dispatches went to malformed output, HTTP 429 responses and timeouts.
  - The planner missed that H03 also needs payments.

## Cost against cap: 0.13 of 0.15

- USD 0 recorded spend against a configurable USD 5 cap.
- Zero-price ceilings and a 45-dispatch cap, which fired.
- Not full marks, because every model was free, so the dollar guard itself was never tested.

## Honesty of done claims: 0.14 of 0.15

This is the strongest honesty result in the field.

- No hidden pass was claimed.
- H01 and H03 were reported as "implemented, unverified" instead of done.
- H02/H05 were flagged as conflicting.
- H07 and H12 were left open instead of closed on trust.

## Process evidence: 0.08 of 0.10

- 329 timestamped events, request records, reported tokens and spend.
- Every operator intervention is disclosed.
- Points lost because the published evidence is a redacted export and the material arrived after the deadline.

## Rule checks

- No dependencies at all: Node standard library only, and no orchestration framework or Agent HQ code.
- Locked files unchanged.
- No hidden backlog text in any branch or commit.
- Three workers across four models.
- Late, as noted above.

## How sensitive is this result?

| Change | Collision Harness total |
|---|---|
| Hidden tests scored by assertion share (25 of 89) | 0.582 |
| Honesty scored full 0.15 | 0.516 |
| The leading entry's organizer rebuild refused | 0.506, which would rank first |

## What would have scored higher

1. Use a cheap paid model as a fallback when the free tier rate-limits. The cap allowed USD 5, and spend was USD 0.
2. Allow parallel work on files that do not overlap, instead of whole-source ownership.
3. Push the run and the evidence before the deadline.

The full grading report for all entries is shared separately by the organizers. The hidden acceptance test code stays private.

Grader: Calvin Magezi (organizer), with an AI assistant (Claude) running the grading script. Disclosure: you are a member of Kolaborate staff, and staff prize eligibility is an open organizer decision.

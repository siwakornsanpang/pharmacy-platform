# Cutover

`evaluateCutover` never points traffic at a stale source.

| reconciliation.passed | writersFrozen | newWrites | compatibleRelease | decision |
| --- | --- | --- | --- | --- |
| false | * | * | * | blocked |
| true | false | * | * | blocked |
| true | true | false | * | ready |
| true | true | true | true | keep-new-db-and-revert-app |
| true | true | true | false | requires-reconcile |

CLI verify prints the decision. It does not change DNS or Vercel routes when blocked. Conference/Railway stays external and is not frozen by this cutover.

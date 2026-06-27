# CI Incident Commands

Use this doc only when a GitHub Actions run is stuck, queued, or needs to be cancelled. Not
needed for normal feature work.

## GitHub Actions Run Control

- List recent runs: `gh run list -R PaladinGod8/verse-vault --limit 10`
- Watch latest run: `gh run watch -R PaladinGod8/verse-vault --compact --exit-status`
- Cancel a specific run: `gh run cancel <run-id> -R PaladinGod8/verse-vault`
- Cancel the latest queued run:
  `gh run cancel "$(gh run list -R PaladinGod8/verse-vault -s queued -L 1 --json databaseId --jq '.[0].databaseId')" -R PaladinGod8/verse-vault`
- Cancel the latest in-progress run:
  `gh run cancel "$(gh run list -R PaladinGod8/verse-vault -s in_progress -L 1 --json databaseId --jq '.[0].databaseId')" -R PaladinGod8/verse-vault`
- UI run number (e.g. `#37`) is not the run ID; map number -> `databaseId` first:
  `$runId = gh run list -R PaladinGod8/verse-vault --json databaseId,number --limit 200 --jq ".[] | select(.number==37) | .databaseId"`
- Force-cancel a queued run if a normal cancel doesn't take:
  `gh api -X POST repos/PaladinGod8/verse-vault/actions/runs/$runId/force-cancel`
- Verify status after cancel/force-cancel:
  `gh run view $runId -R PaladinGod8/verse-vault --json status,conclusion,number`
- Queue incidents: cancel queued runs first; do not stop runners first unless doing maintenance.

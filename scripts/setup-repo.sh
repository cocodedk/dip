#!/bin/sh
# Apply only after the current main commit has passed CI on cocodedk/dip.
set -eu
repo=cocodedk/dip
actual=$(gh repo view --json nameWithOwner -q .nameWithOwner)
[ "$actual" = "$repo" ] || { echo "Refusing setup for $actual; expected $repo" >&2; exit 1; }
branch=$(gh repo view "$repo" --json defaultBranchRef -q .defaultBranchRef.name)
[ "$branch" = main ] || { echo 'Expected default branch main' >&2; exit 1; }
visibility=$(gh repo view "$repo" --json visibility -q .visibility)
[ "$visibility" = PUBLIC ] || { echo 'Expected a public repository' >&2; exit 1; }
sha=$(gh api "repos/$repo/commits/main" -q .sha)
conclusion=$(gh run list --repo "$repo" --workflow ci.yml --branch main --commit "$sha" --limit 1 --json status,conclusion --jq '.[0] | select(.status == "completed") | .conclusion')
[ "$conclusion" = success ] || { echo 'Current main commit must first complete a successful CI run' >&2; exit 1; }
gh repo edit "$repo" --delete-branch-on-merge --enable-squash-merge --enable-rebase-merge --enable-merge-commit=false
gh api --method PUT "repos/$repo/branches/main/protection" --input - >/dev/null <<'JSON'
{
  "required_status_checks": {"strict": true, "contexts": ["verify"]},
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
verified=$(gh api "repos/$repo/branches/main/protection" --jq '.required_status_checks.strict == true and .required_status_checks.contexts == ["verify"] and .allow_force_pushes.enabled == false and .allow_deletions.enabled == false and .required_pull_request_reviews.required_approving_review_count == 0')
[ "$verified" = true ] || { echo 'Branch protection read-back did not match' >&2; exit 1; }
settings=$(gh api "repos/$repo" --jq '.allow_squash_merge == true and .allow_rebase_merge == true and .allow_merge_commit == false and .delete_branch_on_merge == true')
[ "$settings" = true ] || { echo 'Repository settings read-back did not match' >&2; exit 1; }
echo 'Verified squash/rebase merges, automatic branch deletion and protected main requiring verify and a PR (0 approvals).'

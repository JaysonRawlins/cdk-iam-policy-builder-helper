# All npm updates go in one Dependabot group, so no two Dependabot PRs race on the lockfile

Date: 2026-11-02 · Status: accepted

## Context

`pnpm-lock.yaml` reached `main` as invalid YAML again (here 8e59db7, #303), the
second time in this repo and the sixth across the fleet: `jsii@5.9.54` duplicated in `packages:` and
`snapshots:`, so `pnpm i --frozen-lockfile` fails with `ERR_PNPM_BROKEN_LOCKFILE`.
The duplicate-key check added in #293 never fired, because the corruption is
born in the merge. #302 and #303 were both built on 9392bd3 and both heads were
clean. GitHub's three-way merge of #303 onto #302's result is conflict-free and
reproduces the broken file byte for byte (`git merge-file`, 2026-11-02). The
required `build` check is not strict, so no CI run ever builds that merged tree.

## Options

| Option | Gains | Costs | Evidence |
|---|---|---|---|
| **One npm group** (chosen) | Dependabot opens one lockfile PR at a time, so the Dependabot-vs-Dependabot race cannot happen. One config line, no new machinery. | An Aikido age block clears on the Monday unblocker rerun; any other failing bump holds the whole batch until a human acts. A human PR can still race the Dependabot PR (security-update PRs are disabled here, so they cannot). | All six instances followed two same-day Dependabot merges: b53d3e5 and 8e59db7 here, c7905fa and e73e64a in cdk-deploy-pr, adb4214 and e2d82c2 in cdk-diff-pr. |
| jsii-family group | Covers every incident so far. | The jsii family alone ships ~5 PRs a week. Any other same-day pair sharing a transitive can still collide. | Refuter r1: #303 also rewrote the jsii-pacmak and jsii-docgen snapshot keys, so the overlap is wider than jsii plus jsii-rosetta. |
| Merge queue | Tests the merged tree, so it catches any collision, not just Dependabot's. | `merge-pr.sh` would report a working merge as failed and lose its commit message (`enqueuePullRequest` takes no subject or body). Unverified whether `merge_group` fires for PRs that `GITHUB_TOKEN` auto-merge put in the queue. An ejected PR stays green and sits unnoticed. | `gh pr merge --help` (gh 2.97.0) and the GraphQL schema, 2026-11-02. Deferred to a spike with a synthetic two-PR live test. |
| Strict required checks (branch must be up to date) | Tests the merged tree, and with one group it would also close the human-vs-Dependabot race. | Without a group, a 7-PR batch would land about one PR a week. With a group, the cost moves to people: every human PR must update its branch before merging, and a Dependabot PR left behind by a human merge waits for the next weekly run, because auto-merge never updates a branch and Dependabot rebases only on conflict or schedule. Left as the companion to reach for if the human race shows up. | Dependabot options reference (rebase-strategy), 2026-11-02. |
| Rely on the #293 duplicate-key check | Already shipped. | Runs after `pnpm i --frozen-lockfile`, which fails first. It runs on PR heads, never on the merge result. | Main broken since 2026-09-24 with the check in place. |

## Decision

One Dependabot group (`patterns: ['*']`) replaces the `aws-sdk` and
`typescript-eslint` groups. It removes the only collision ever observed at the
cost of batch-blocking: one bad bump holds the rest back. The repo's squash
message is also switched to `PR_TITLE`/`PR_BODY` (was
`COMMIT_OR_PR_TITLE`/`COMMIT_MESSAGES`), so a merge made without an explicit
message gets exactly the PR description's one pair of trailers. The effect today
is that Dependabot squash commits carry the PR body (release notes and
boilerplate) instead of the commit message. The motive is a later merge queue:
`enqueuePullRequest` takes no subject or body, so the queue's squash text has to
come from somewhere else, and the repo setting is the likely source. That is
inferred, not tested; the queue spike checks it.

## Would reverse this

A duplicated lockfile key on `main` from a race that does not involve two
Dependabot PRs, or the grouped PR sitting blocked for more than two weekly runs.
Either points at the merge queue.

# Decision records

One file per decision, `YYYY-MM-DD-<slug>.md`, written in the PR that makes the
decision. Append-only: a changed mind is a new record that supersedes the old one.
Cite a record from code as `(decision <file stem>)`.

List them, sorted by the day decided:

    grep -H '^Date:' docs/decisions/*.md | sort -t: -k3

or, with titles, `~/.claude/scripts/decision-index.sh docs/decisions`.

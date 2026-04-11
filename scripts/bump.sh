#!/usr/bin/env bash
set -euo pipefail

# Skip if the latest commit is already a release commit
if git log --oneline -1 | grep -qv "chore(release):"; then
  mkdir -p dist
  npx commit-and-tag-version@^12 --skip.commit --skip.tag
  VERSION=$(node -p "require('./package.json').version")
  echo "${VERSION}" > dist/version.txt
  echo "v${VERSION}" > dist/releasetag.txt

  # Extract changelog for this version from CHANGELOG.md
  node -e "
const fs = require('fs');
if (!fs.existsSync('CHANGELOG.md')) { fs.writeFileSync('dist/changelog.md', ''); process.exit(0); }
const cl = fs.readFileSync('CHANGELOG.md','utf8');
const lines = cl.split('\n');
let capture = false, out = [];
for (const l of lines) {
  if (l.startsWith('## ') && !capture) { capture = true; continue; }
  if (l.startsWith('## ') && capture) break;
  if (capture) out.push(l);
}
fs.writeFileSync('dist/changelog.md', out.join('\n').trim() + '\n');
"
else
  echo "Skipping bump — latest commit is a release commit"
  exit 0
fi

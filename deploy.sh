#!/usr/bin/env bash
set -euo pipefail

message="${1:-Update blog $(date "+%Y-%m-%d %H:%M")}"

# Keep empty content folders in git.
if [ -d "contents" ]; then
  while IFS= read -r dir; do
    touch "$dir/.gitkeep"
  done < <(find contents -type d -empty)
fi

git add -A

if git diff --cached --quiet; then
  echo "No changes to deploy."
  exit 0
fi

git commit -m "$message"
git push origin main

echo "Deployed to main."

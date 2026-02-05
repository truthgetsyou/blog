#!/usr/bin/env bash
set -euo pipefail

message="${1:-Update blog $(date "+%Y-%m-%d %H:%M")}"

# Keep empty content folders in git.
if [ -d "contents" ]; then
  while IFS= read -r dir; do
    touch "$dir/.gitkeep"
  done < <(find contents -type d -empty)
fi

# Build note index so the UI can always reflect current structure.
python3 - <<'PY'
import json
from pathlib import Path

root = Path("contents")
notes = []

if root.exists():
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".md", ".html", ".htm"}:
            notes.append(path.as_posix())

    notes.sort()
    (root / ".notes-index.json").write_text(json.dumps(notes, indent=2) + "\n", encoding="utf-8")
PY

git add -A

if git diff --cached --quiet; then
  echo "No changes to deploy."
  exit 0
fi

git commit -m "$message"
git push origin main

echo "Deployed to main."

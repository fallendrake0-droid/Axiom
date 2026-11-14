#!/usr/bin/env bash
# Builds the reviewed handoff archive without a self-referential manifest entry.
# Requires standard POSIX shell utilities plus zip, unzip, sha256sum, and touch.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ $# -gt 1 ]]; then
  echo "Usage: $0 [output-zip-path]" >&2
  exit 64
fi

if [[ $# -eq 1 ]]; then
  OUTPUT_DIR="$(cd "$(dirname "$1")" && pwd)"
  OUTPUT="$OUTPUT_DIR/$(basename "$1")"
else
  OUTPUT="$ROOT/AXIOM_SPECIFICATION_PACK.zip"
fi

WORK="$(mktemp -d)"
VERIFY="$(mktemp -d)"
trap 'rm -rf "$WORK" "$VERIFY"' EXIT
PACK="$WORK/AXIOM_SPECIFICATION_PACK"
# Stable archive timestamps make the same reviewed content reproducible on a
# compatible zip implementation. Callers may override this with SOURCE_DATE_EPOCH.
PACK_EPOCH="${SOURCE_DATE_EPOCH:-1704067200}"

mkdir -p "$PACK/docs/spec" "$PACK/docs/reviews"
cp "$ROOT/MASTER_PROJECT_CONTEXT.md" "$ROOT/AGENTS.md" "$ROOT/README.md" "$ROOT/DEVELOPMENT_STATUS.md" "$PACK/"
cp "$ROOT/docs/DECISIONS.md" "$ROOT/docs/REPLIT_IMPORT_BRIEF.md" "$PACK/docs/"
cp "$ROOT/docs/spec/"*.md "$PACK/docs/spec/"
cp "$ROOT/docs/reviews/"*.md "$PACK/docs/reviews/"

(
  cd "$PACK"
  # A file cannot stably contain its own checksum. The archive checksum is printed
  # below; this internal manifest validates every other handoff file.
  find . -type f ! -name MANIFEST.sha256 -print0 \
    | LC_ALL=C sort -z \
    | xargs -0 sha256sum > MANIFEST.sha256
  find . -exec touch -d "@${PACK_EPOCH}" {} +
)

ARCHIVE_TMP="$WORK/AXIOM_SPECIFICATION_PACK.zip"
(
  cd "$WORK"
  find AXIOM_SPECIFICATION_PACK -print | LC_ALL=C sort | zip -X -q "$ARCHIVE_TMP" -@
)

unzip -q "$ARCHIVE_TMP" -d "$VERIFY"
(
  cd "$VERIFY/AXIOM_SPECIFICATION_PACK"
  sha256sum -c MANIFEST.sha256
)

mv "$ARCHIVE_TMP" "$OUTPUT"
printf 'Built and verified: %s\n' "$OUTPUT"
sha256sum "$OUTPUT"

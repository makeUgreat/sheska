#!/bin/sh
set -eu

MIGRATIONS=database/drizzle
BASELINE=20261126000000_cascade_source_dependents

missing=0
for folder in "$MIGRATIONS"/*/; do
  name=$(basename "$folder")
  if [ "$name" \< "$BASELINE" ]; then continue; fi
  if [ ! -f "$folder/snapshot.json" ]; then
    echo "$name has no snapshot.json. Create migrations with db:generate, or db:generate --custom for SQL drizzle cannot express." >&2
    missing=1
  fi
done
[ "$missing" -eq 0 ] || exit 1

copy=$(mktemp -d)
trap 'rm -rf "$copy"' EXIT
cp -R "$MIGRATIONS"/. "$copy"
DRIZZLE_OUT="$copy" drizzle-kit generate --config drizzle.config.ts </dev/null >/dev/null

if ! diff -r "$MIGRATIONS" "$copy" >/dev/null; then
  echo "schema.ts has changes without a migration. Run: pnpm --filter api db:generate --name <name>" >&2
  exit 1
fi

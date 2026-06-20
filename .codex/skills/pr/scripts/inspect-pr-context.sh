#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'USAGE'
Usage: bash .codex/skills/pr/scripts/inspect-pr-context.sh [base-ref]

Print a small read-only git fact pack for PR preparation:
status, base branch, branch diff summary, and branch commits.
USAGE
  exit 0
fi

print_section() {
  printf '\n## %s\n\n' "$1"
}

print_list_section() {
  local title="$1"
  shift
  local output

  print_section "$title"
  output="$("$@")"

  if [[ -z "$output" ]]; then
    printf '%s\n' "- none"
  else
    printf '%s\n' "$output" | sed 's/^/- /'
  fi
}

print_text_section() {
  local title="$1"
  shift
  local output

  print_section "$title"
  output="$("$@")"

  if [[ -z "$output" ]]; then
    printf '%s\n' "none"
  else
    printf '%s\n' "$output"
  fi
}

ref_exists() {
  git rev-parse --verify --quiet "$1" >/dev/null
}

default_base() {
  local candidate
  for candidate in origin/main origin/master main master; do
    if ref_exists "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

branch="$(git branch --show-current 2>/dev/null || true)"
if [[ -z "$branch" ]]; then
  branch="(detached)"
fi

base="${1:-}"
if [[ -z "$base" ]]; then
  base="$(default_base || true)"
fi

printf '%s\n\n' "# PR Context"
printf '%s\n' "- Repo: $(git rev-parse --show-toplevel)"
printf '%s\n' "- Branch: $branch"
printf '%s\n' "- Base: ${base:-none}"

print_list_section "Working Tree" git status --short

if [[ -n "$base" ]]; then
  print_list_section "Branch Files" git diff --name-status "$base"...HEAD
  print_text_section "Branch Stat" git diff --stat "$base"...HEAD
  print_list_section "Branch Commits" git log --oneline "$base"..HEAD
else
  print_section "Branch Files"
  printf '%s\n' "- no base ref found"
  print_section "Branch Stat"
  printf '%s\n' "no base ref found"
  print_section "Branch Commits"
  printf '%s\n' "- no base ref found"
fi

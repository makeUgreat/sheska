#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'USAGE'
Usage: bash .codex/skills/cm/scripts/inspect-changes.sh

Print a small read-only git fact pack for commit split decisions:
status, staged diff summary, unstaged diff summary, and recent commits.
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

branch="$(git branch --show-current 2>/dev/null || true)"
if [[ -z "$branch" ]]; then
  branch="(detached)"
fi

printf '%s\n\n' "# Change Inspection"
printf '%s\n' "- Repo: $(git rev-parse --show-toplevel)"
printf '%s\n' "- Branch: $branch"

print_list_section "Status" git status --short
print_list_section "Staged Files" git diff --name-status --cached
print_text_section "Staged Stat" git diff --stat --cached
print_list_section "Unstaged Files" git diff --name-status
print_text_section "Unstaged Stat" git diff --stat
print_list_section "Recent Commits" git log --oneline -5

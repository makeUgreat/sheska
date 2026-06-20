#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: bash .codex/skills/pr/scripts/render-stack-order.sh --chain "main <- pr-1 <- pr-2" [--current pr-1]

Render the Stack / Merge Order section for stacked PRs.
USAGE
}

chain=""
current=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --chain)
      chain="${2:-}"
      shift 2
      ;;
    --current)
      current="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$chain" ]]; then
  usage >&2
  exit 2
fi

IFS=$'\n' read -r -d '' -a parts < <(
  printf '%s\n' "$chain" |
    awk -F '<-' '{ for (i = 1; i <= NF; i++) { gsub(/^[ \t]+|[ \t]+$/, "", $i); if ($i != "") print $i } }'
  printf '\0'
)

if [[ ${#parts[@]} -lt 2 ]]; then
  printf 'A stack needs one base branch and at least one PR branch.\n' >&2
  exit 1
fi

join_by() {
  local delimiter="$1"
  shift
  local first="true"
  local item

  for item in "$@"; do
    if [[ "$first" == "true" ]]; then
      printf '%s' "$item"
      first="false"
    else
      printf '%s%s' "$delimiter" "$item"
    fi
  done
}

base="${parts[0]}"
prs=("${parts[@]:1}")
merge_order="$(printf '`%s` -> ' "${prs[@]}")"
merge_order="${merge_order% -> }"

printf '%s\n\n' "## Stack / Merge Order"
printf '%s\n' "- Branch chain: \`$(join_by ' <- ' "${parts[@]}")\`"
printf '%s\n' "- Merge order: $merge_order"
printf '%s\n' "- Merge direction: parent to child."
printf '%s\n' "- After a parent PR merges: retarget or rebase child PRs onto the next parent or the base branch before merging them."
printf '%s\n' "- Final verification target: final stack state."

if [[ -n "$current" ]]; then
  found="false"
  for index in "${!prs[@]}"; do
    if [[ "${prs[$index]}" == "$current" ]]; then
      found="true"
      parent="none"
      child="none"
      pr_base="$base"

      if (( index > 0 )); then
        parent="\`${prs[$((index - 1))]}\`"
        pr_base="${prs[$((index - 1))]}"
      fi
      if (( index + 1 < ${#prs[@]} )); then
        child="\`${prs[$((index + 1))]}\`"
      fi

      printf '%s\n' "- This PR: \`$current\` ($((index + 1))/${#prs[@]})"
      printf '%s\n' "- This PR base branch: \`$pr_base\`"
      printf '%s\n' "- Parent PR: $parent"
      printf '%s\n' "- Child PR: $child"
      printf '%s\n' "- Independently runnable: final-stack"
    fi
  done

  if [[ "$found" != "true" ]]; then
    printf 'Current branch is not in the PR stack: %s\n' "$current" >&2
    exit 1
  fi
else
  printf '\n%s\n\n' "### PR Positions"
  for index in "${!prs[@]}"; do
    parent="none"
    child="none"
    pr_base="$base"

    if (( index > 0 )); then
      parent="\`${prs[$((index - 1))]}\`"
      pr_base="${prs[$((index - 1))]}"
    fi
    if (( index + 1 < ${#prs[@]} )); then
      child="\`${prs[$((index + 1))]}\`"
    fi

    printf '%s\n' "- \`${prs[$index]}\`: base \`$pr_base\`; parent $parent; child $child; merge $((index + 1))/${#prs[@]}; independently runnable: final-stack"
  done
fi

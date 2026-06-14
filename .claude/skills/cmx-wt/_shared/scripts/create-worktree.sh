#!/usr/bin/env bash
# create-worktree.sh — Create a git worktree with a new branch, symlink/copy gitignored files.
# Used by cmx-wt skill. Terminal setup is NOT handled here.
#
# Usage:
#   ./create-worktree.sh \
#     --issue 123 \
#     --name prerequisite-computed-block \
#     --prefix refactor \
#     --base master \
#     --env-copy "apps/main-web/.env.development.local" \
#     --link-paths ".claude/skills,.claude/settings.local.json" \
#     --copy-paths "some/config"
#
# Exit codes:
#   0  Success
#   1  Bad usage / missing args
#   2  Required command (git) not found
#   3  Not inside a git repo
#   4  Worktree dir or branch already exists (name collision)

set -euo pipefail

# ---------- Arg parsing ----------
ISSUE=""
NAME=""
PREFIX="feature"
BASE="master"
ENV_COPY=""
LINK_PATHS=""
COPY_PATHS=""
DRY_RUN=0

usage() {
  cat <<EOF
Usage: $0 --name <slug> [options]

Required:
  --name          English slug, kebab-case (e.g. prerequisite-computed-block)

Optional:
  --issue         Git issue number (e.g. 123). When provided, branch becomes {prefix}/{ISSUE}-{slug}.
  --prefix        Branch prefix (feature|refactor|fix|chore|... default: feature)
  --base          Base branch (default: master)
  --env-copy      Repo-relative path to env file to copy from main repo to worktree
  --link-paths    Comma-separated repo-relative paths to symlink from main repo into worktree
  --copy-paths    Comma-separated repo-relative paths to copy from main repo to worktree (preserves symlinks)
  --dry-run       Print commands without executing
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --issue)        ISSUE="$2"; shift 2 ;;
    --name)         NAME="$2"; shift 2 ;;
    --prefix)       PREFIX="$2"; shift 2 ;;
    --base)         BASE="$2"; shift 2 ;;
    --env-copy)     ENV_COPY="$2"; shift 2 ;;
    --link-paths)   LINK_PATHS="$2"; shift 2 ;;
    --copy-paths)   COPY_PATHS="$2"; shift 2 ;;
    --dry-run)      DRY_RUN=1; shift ;;
    -h|--help)      usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

# ---------- Validation ----------
if [[ -z "$NAME" ]]; then
  echo "Missing required arg: --name" >&2
  usage
  exit 1
fi

if [[ ! "$NAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Error: --name must be a kebab-case slug: '$NAME'" >&2
  exit 1
fi

if [[ -n "$ISSUE" && ! "$ISSUE" =~ ^[0-9]+$ ]]; then
  echo "Error: --issue must be numeric: '$ISSUE'" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "Error: 'git' not found" >&2
  exit 2
fi

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Error: not inside a git repo" >&2
  exit 3
fi
GIT_COMMON_DIR=$(git rev-parse --path-format=absolute --git-common-dir)
MAIN_REPO="${GIT_COMMON_DIR%/.git}"
cd "$MAIN_REPO"

# ---------- Derived values ----------
if [[ -n "$ISSUE" ]]; then
  BRANCH="${PREFIX}/${ISSUE}-${NAME}"
else
  BRANCH="${PREFIX}/${NAME}"
fi
WORKTREE_DIR=".worktrees/${NAME}"
WORKTREE_ABS="$MAIN_REPO/$WORKTREE_DIR"

# ---------- Collision checks ----------
if [[ -e "$WORKTREE_DIR" ]]; then
  echo "Error: worktree directory already exists: $WORKTREE_DIR" >&2
  echo "       Use a different --name." >&2
  exit 4
fi
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "Error: branch already exists: $BRANCH" >&2
  exit 4
fi

# ---------- Execution ----------
run() {
  if (( DRY_RUN )); then
    echo "[dry-run] $*"
  else
    echo "$ $*"
    "$@"
  fi
}

# 1) Create git worktree
run git worktree add -b "$BRANCH" "$WORKTREE_DIR" "$BASE"

# 2) Symlink paths from main repo into worktree
link_path() {
  local src="$MAIN_REPO/$1"
  local dst="$WORKTREE_ABS/$1"
  if [[ ! -e "$src" ]]; then
    echo "Warning: link source not found, skipping: $1" >&2
    return
  fi
  if (( DRY_RUN )); then
    echo "[dry-run] ln -sf $src → $dst"
  else
    mkdir -p "$(dirname "$dst")"
    [[ -e "$dst" || -L "$dst" ]] && rm -rf "$dst"
    ln -sf "$src" "$dst"
    echo "  linked: $1"
  fi
}

if [[ -n "$LINK_PATHS" ]]; then
  IFS=',' read -ra LP_ARRAY <<< "$LINK_PATHS"
  for lp in "${LP_ARRAY[@]}"; do
    lp="${lp## }"
    lp="${lp%% }"
    link_path "$lp"
  done
fi

# 3) Copy paths from main repo to worktree (preserves symlinks)
copy_path() {
  local src="$MAIN_REPO/$1"
  local dst="$WORKTREE_ABS/$1"
  if [[ ! -e "$src" ]]; then
    echo "Warning: copy source not found, skipping: $1" >&2
    return
  fi
  if (( DRY_RUN )); then
    echo "[dry-run] cp -a $src → $dst"
  else
    mkdir -p "$(dirname "$dst")"
    cp -a "$src" "$dst"
    echo "  copied: $1"
  fi
}

if [[ -n "$COPY_PATHS" ]]; then
  IFS=',' read -ra CP_ARRAY <<< "$COPY_PATHS"
  for cp_path in "${CP_ARRAY[@]}"; do
    cp_path="${cp_path## }"
    cp_path="${cp_path%% }"
    copy_path "$cp_path"
  done
fi

# 4) Copy env file
if [[ -n "$ENV_COPY" ]]; then
  copy_path "$ENV_COPY"
fi

# ---------- Result ----------
echo
echo "---WORKTREE_RESULT---"
echo "BRANCH=$BRANCH"
echo "WORKTREE_ABS=$WORKTREE_ABS"
echo "MAIN_REPO=$MAIN_REPO"
echo "---END_WORKTREE_RESULT---"

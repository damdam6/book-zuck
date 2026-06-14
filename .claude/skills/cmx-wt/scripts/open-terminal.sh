#!/usr/bin/env bash
# open-terminal.sh — Create a cmux workspace with 2 panes (top 2/3 + bottom 1/3), 4 tabs.
#
# Layout:
#   Pane 1 (top, 67%):  tab1=claude, tab2=codex
#   Pane 2 (bottom, 33%): tab3=pnpm cmd, tab4=empty shell
#
# Usage:
#   ./open-terminal.sh \
#     --worktree-dir /path/to/.worktrees/prerequisite-computed-block \
#     --workspace-name pre-block \
#     --pnpm-cmd "pnpm install && pnpm main"
#
# Exit codes:
#   0  Success
#   1  Bad usage / missing args
#   2  cmux not found
#   5  cmux workspace name already exists
#   6  cmux runtime error

set -euo pipefail

# ---------- Arg parsing ----------
WORKTREE_DIR=""
WORKSPACE_NAME=""
PNPM_CMD="pnpm install"
WS_COLOR="Magenta"
DRY_RUN=0

usage() {
  cat <<EOF
Usage: $0 --worktree-dir <path> --workspace-name <name> [options]

Required:
  --worktree-dir     Absolute path to the worktree
  --workspace-name   cmux workspace name (e.g. pre-block)

Optional:
  --pnpm-cmd         Full command for the pnpm tab (default: "pnpm install")
  --color            Workspace color (named color or #RRGGBB hex)
  --dry-run          Print commands without executing
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --worktree-dir)    WORKTREE_DIR="$2"; shift 2 ;;
    --workspace-name)  WORKSPACE_NAME="$2"; shift 2 ;;
    --pnpm-cmd)        PNPM_CMD="$2"; shift 2 ;;
    --color)           WS_COLOR="$2"; shift 2 ;;
    --dry-run)         DRY_RUN=1; shift ;;
    -h|--help)         usage; exit 0 ;;
    *) echo "알 수 없는 옵션: $1" >&2; usage; exit 1 ;;
  esac
done

# ---------- Validation ----------
missing=()
[[ -z "$WORKTREE_DIR" ]]    && missing+=("--worktree-dir")
[[ -z "$WORKSPACE_NAME" ]]  && missing+=("--workspace-name")
if (( ${#missing[@]} > 0 )); then
  echo "누락된 인자: ${missing[*]}" >&2
  usage
  exit 1
fi

if ! command -v cmux >/dev/null 2>&1; then
  echo "오류: 'cmux' 명령어를 찾을 수 없습니다." >&2
  exit 2
fi

# ---------- Collision check ----------
if cmux list-workspaces 2>/dev/null | awk '{print $2}' | grep -Fxq "$WORKSPACE_NAME"; then
  echo "오류: cmux 워크스페이스 이름이 이미 존재합니다: $WORKSPACE_NAME" >&2
  echo "      다른 --workspace-name 값을 사용하세요." >&2
  exit 5
fi

# ---------- Build layout JSON ----------
# Escape pnpm command for JSON embedding
PNPM_CMD_JSON=$(printf '%s' "$PNPM_CMD" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()), end="")')

LAYOUT_JSON=$(cat <<EOJSON
{
  "direction": "vertical",
  "split": 0.67,
  "children": [
    {"pane": {"surfaces": [
      {"type": "terminal", "command": "cmux claude-teams"},
      {"type": "terminal", "command": "codex"}
    ]}},
    {"pane": {"surfaces": [
      {"type": "terminal", "command": ${PNPM_CMD_JSON}},
      {"type": "terminal"}
    ]}}
  ]
}
EOJSON
)

# ---------- Execution ----------
echo "=== cmux 워크스페이스 생성 ==="
echo "  worktree:    $WORKTREE_DIR"
echo "  cmux 이름:   $WORKSPACE_NAME"
[[ -n "$WS_COLOR" ]] && echo "  색상:        $WS_COLOR"
echo "  Pane 1 (상단 67%): claude, codex"
echo "  Pane 2 (하단 33%): pnpm, shell"
echo

# 1) Create workspace with layout
if (( DRY_RUN )); then
  echo "[dry-run] cmux new-workspace --name $WORKSPACE_NAME --cwd $WORKTREE_DIR --layout '$LAYOUT_JSON'"
  WS_REF="workspace:DRY"
else
  WS_OUTPUT=$(cmux new-workspace \
    --name "$WORKSPACE_NAME" \
    --cwd "$WORKTREE_DIR" \
    --layout "$LAYOUT_JSON" 2>&1)
  echo "$WS_OUTPUT"

  WS_REF=$(printf '%s\n' "$WS_OUTPUT" | grep -oE 'workspace:[0-9]+' | head -1)
  if [[ -z "$WS_REF" ]]; then
    echo "오류: cmux 워크스페이스 ref를 추출하지 못했습니다." >&2
    echo "      출력: $WS_OUTPUT" >&2
    exit 6
  fi
  echo "워크스페이스 ref: $WS_REF"
fi

# 2) Set workspace color
if [[ -n "$WS_COLOR" ]]; then
  if (( DRY_RUN )); then
    echo "[dry-run] cmux workspace-action --action set-color --workspace $WS_REF --color $WS_COLOR"
  else
    cmux workspace-action --action set-color --workspace "$WS_REF" --color "$WS_COLOR" 2>/dev/null || true
    echo "워크스페이스 색상: $WS_COLOR"
  fi
fi

# 3) Rename tabs
# Collect surfaces from all panes in order (pane1 surfaces, then pane2 surfaces)
TAB_NAMES=("claude" "codex" "pnpm" "shell")

if (( DRY_RUN )); then
  echo "[dry-run] rename tabs: ${TAB_NAMES[*]}"
else
  ALL_SURFACES=()
  while IFS= read -r pane_ref; do
    [[ -z "$pane_ref" ]] && continue
    while IFS= read -r surf_ref; do
      [[ -z "$surf_ref" ]] && continue
      ALL_SURFACES+=("$surf_ref")
    done < <(cmux list-pane-surfaces --workspace "$WS_REF" --pane "$pane_ref" 2>/dev/null \
      | grep -oE 'surface:[0-9]+')
  done < <(cmux list-panes --workspace "$WS_REF" 2>/dev/null \
    | grep -oE 'pane:[0-9]+')

  for i in "${!ALL_SURFACES[@]}"; do
    if (( i < ${#TAB_NAMES[@]} )); then
      cmux rename-tab --workspace "$WS_REF" --surface "${ALL_SURFACES[$i]}" "${TAB_NAMES[$i]}" 2>/dev/null || true
    fi
  done
fi

echo
echo "✅ cmux 완료: $WORKSPACE_NAME ($WORKTREE_DIR)"

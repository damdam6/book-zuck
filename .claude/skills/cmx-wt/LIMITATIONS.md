---
title: cmx-wt Skill Limitations Analysis
date: 2026-05-21
---

# cmx-wt — Known Issues & Fixes

## 1. ~~[Critical] Workspace ID extraction failure → exit code 6~~ ✅ Fixed

**Symptom**: Script exited at workspace ID extraction (formerly lines 158–174).

**Root cause**:
- `cmux new-workspace --json` flag does not exist → empty output
- Fallback `cmux list-workspaces | awk` parsing didn't match actual cmux output format (`OK workspace:20`)
- cmux `new-workspace` returns `OK workspace:N` on stdout without `--json`, but the script didn't capture it

**Fix applied**: Parse plain text output with `grep -oE 'workspace:[0-9]+'`. Removed `--json` usage entirely.

## 2. ~~[Critical] cmux send without Enter → command not executed~~ ✅ Fixed

**Symptom**: `cmux send "cclw"` typed text into terminal but didn't execute it.

**Root cause**: `cmux send` only types text without pressing Enter. The script's `send_to_focused()` did call `cmux send-key enter`, but the script exited (code 6) before reaching that point.

**Fix applied**: First tab uses `--command` flag on `new-workspace` (auto-sends text + Enter). Subsequent tabs use `cmux send` + `cmux send-key Return` pair, with surface ID targeting.

## 3. ~~[Medium] Missing --cwd → workspace cwd not set~~ ✅ Fixed

**Symptom**: Script relied on `cd "$WORKTREE_ABS" && cmux new-workspace` for cwd inheritance, but cmux may not inherit the caller's cwd.

**Root cause**: `cmux new-workspace` has an explicit `--cwd <path>` flag that the script wasn't using.

**Fix applied**: `cmux new-workspace --name "$WORKSPACE_NAME" --cwd "$WORKTREE_ABS"`.

## 4. ~~[Medium] Surface ID not tracked → can't target specific tabs~~ ✅ Fixed

**Symptom**: Script used `send_to_focused()` targeting only the currently focused surface, without tracking individual surface IDs.

**Root cause**: `cmux new-surface` output (`OK surface:58 pane:27 workspace:20`) wasn't parsed for the surface ID.

**Fix applied**: Parse surface ID with `grep -oE 'surface:[0-9]+'`, then use `--surface` flag for targeted send. Fallback to workspace-level send if parsing fails.

## 5. ~~[Low] Tab names not applied~~ ✅ Fixed

**Symptom**: Tabs created with default names (shell process name), making them hard to identify.

**Root cause**: No `cmux rename-tab` calls in the script.

**Fix applied**: `cmux rename-tab --surface $SURFACE_ID "<name>"` called after each surface creation. Best-effort (errors suppressed).

## 6. [Info] Obsidian MCP not available

**Symptom**: User requested "record using Obsidian MCP" but no Obsidian MCP server was connected.

**Cause**: No Obsidian-related MCP server in the available server list. Direct filesystem Write used as fallback.

---

## 7. [Info] Migrated from sequential new-surface to --layout (2026-06-08)

**Previous approach**: Create workspace with `--command cclw`, then add tabs one by one via `new-surface` + `send` + `send-key Return` + `rename-tab`. This caused issues #1–#4 above.

**Current approach**: Single `new-workspace --layout <json>` call creates 2 panes + 4 surfaces at once. Layout JSON defines direction, split ratio, and per-surface commands. Tab renaming uses `list-pane-surfaces` to collect surface refs after creation.

This eliminates issues #1 (workspace ID extraction is the same), #2 (commands are part of layout, no manual send needed), #4 (surface IDs fetched via list-pane-surfaces, not parsed from new-surface output).

---

## Environment Reference

- cmux binary: `/Applications/cmux.app/Contents/Resources/bin/cmux`
- cmux `new-workspace` flags: `--name`, `--description`, `--cwd`, `--command`, `--layout`, `--window`, `--focus`
- cmux `new-workspace` output format: `OK workspace:<N>` (plain text, not JSON)
- cmux `--layout` schema: `{"direction":"vertical|horizontal","split":0.0-1.0,"children":[{"pane":{"surfaces":[{"type":"terminal","command":"..."}]}}]}`

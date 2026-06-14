---
name: cmx-wt
description: >
  Bootstrap a git worktree + cmux workspace in one shot. Takes a free-form mix of
  a task description (Korean or English) and an optional git issue (number, #NNN,
  or GitHub issue URL), then creates a branch, worktree, and cmux workspace with
  2 panes and 4 tabs (Pane1: cclw + codex, Pane2: pnpm + shell).
  Trigger on "새 작업 시작", "워크스페이스 만들어줘", "feature 만들어줘",
  "worktree랑 cmux 같이 열어줘", or any message that pairs a task description
  with an issue reference — even without explicitly mentioning "cmux" or "worktree".
---

# cmx-wt

Create a git worktree + cmux workspace + 2 panes / 4 tabs in one shot.
Parse natural-language input, derive deterministic values, hand off to shell scripts.

## What Gets Created

| Resource | Naming pattern | Example |
|---|---|---|
| Branch | `{prefix}/{ISSUE}-{slug}` or `{prefix}/{slug}` | `feat/123-add-sso-login-button` or `feat/add-sso-login-button` |
| Worktree | `.worktrees/{slug}/` | `.worktrees/add-sso-login-button/` |
| cmux workspace | `{abbr}` | `sso-login` |
| Repo pill | `{short}` via custom metadata | `FE` (icon: paintbrush.fill) |
| Pane 1 (상단 67%) | tab1: cclw, tab2: codex | — |
| Pane 2 (하단 33%) | tab3: pnpm, tab4: shell | — |

## Parsing Rules

### Issue Number Extraction (Optional)

Priority order:

1. URL containing `/issues/{N}` — e.g. `https://github.com/owner/repo/issues/123` → `123`
2. Bare `#NNN` token in user input — e.g. `#123` → `123`
3. On failure — proceed without an issue. The branch name uses `{prefix}/{slug}` instead of `{prefix}/{ISSUE}-{slug}`.

Stored as numeric only (`123`). Displayed as `#123` in confirmations.
No auto-fetch of issue title — slug always derives from the task description.

### Slug Conversion (`function-name`)

Korean → meaningful English kebab-case, max 5 words.

| Input | Slug |
|---|---|
| 사전 조건 계산 블록 리팩토링 | `prerequisite-computed-block` |
| Add SSO login button | `add-sso-login-button` |

### Abbreviation (`simple-function-name`)

Compress slug to 2–3 tokens. Truncate long words to 3–4 chars, keep the most meaningful word.

| Slug | Abbreviation |
|---|---|
| `prerequisite-computed-block` | `pre-block` |
| `add-sso-login-button` | `sso-login` |
| `fix-token-refresh-race-condition` | `token-race` |

### Prefix Inference

| Keywords | Prefix |
|---|---|
| 리팩토링, refactor, restructure | `refactor` |
| 버그, fix, 수정, 오류 | `fix` |
| 추가, add, 신규, new feature | `feat` |
| 유지보수, config, cleanup | `chore` |
| 문서, docs | `docs` |
| 테스트, test | `test` |
| 성능, optimization, perf | `perf` |
| formatting, style | `style` |

Default to `feat` when intent is unclear.

## Workflow

### 1. Parse Input

Extract from user message: **task description** (required), **issue number/URL** (optional), **base branch** (optional, default `master`).
If task description is missing, ask for it. Do not ask for an issue number — only use it if provided.

### 2. Compute Values

Derive `ISSUE`, `slug`, `abbr`, `prefix` using the parsing rules above.

**Repo alias lookup:**

```bash
MAIN_WT=$(git rev-parse --path-format=absolute --git-common-dir)
REPO_KEY=$(basename "${MAIN_WT%/.git}")
```

Look up `REPO_KEY` in `$SKILL_DIR/_shared/data/repo-aliases.json`:
- **hit** → use `short`, `icon`, `envCopy`, `devCmd`, `linkPaths`, `copyPaths`, `color`
- **miss** → propose abbreviation from repo name pattern (`*-fe`→`FE`, `*-be`→`BE`, `*-app`→`APP`, etc.), include in Step 3 confirmation

Promote key to `org/repo` format if the folder name is too generic (`app`, `web`, `frontend`, etc.).

**Check worktree existence:**

```bash
WORKTREE_ABS="$MAIN_REPO/.worktrees/$SLUG"
```

If it already exists → **terminal-only mode** (skip worktree creation).

### 3. Confirm With User

Show the plan and wait for approval. **Never skip this step.**
Include new-repo alias registration in the same confirmation — do not split into separate questions.

```
## Creation Plan

- Issue:       #123 (or "none")
- Branch:      feat/123-add-sso-login-button (or feat/add-sso-login-button)
- Base:        master
- Worktree:    .worktrees/add-sso-login-button
- cmux name:   sso-login
- Repo pill:   FE (icon: paintbrush.fill)
- Color:       Blue
- Symlink:     .claude/skills, .claude/settings.local.json
- Copy env:    apps/main-web/.env.development.local
- Pane 1 (상단 67%): cclw, codex
- Pane 2 (하단 33%): pnpm install + pnpm main, shell

Proceed?
```

If worktree already exists, mark that line with `✅ already exists` and add `Mode: terminal-only`.
For a new repo, add `📒 New repo detected — {folder} → {ABBR} will be registered (tell me if you want a different abbreviation)`.

### 4. Execute

Run in order after confirmation.

**4a) Save alias if new repo** (before script execution — alias persists even if scripts fail):

```bash
python3 -c '
import json, pathlib
p = pathlib.Path("'"$SKILL_DIR"'/_shared/data/repo-aliases.json")
d = json.loads(p.read_text())
d.setdefault("aliases", {})["'"$REPO_KEY"'"] = {"short":"'"$REPO_SIMPLE"'"}
p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
'
```

**4b) Full mode** — create worktree, then open terminal:

```bash
"$SKILL_DIR/_shared/scripts/create-worktree.sh" \
  ${ISSUE:+--issue "$ISSUE"} --name "$SLUG" --prefix "$PREFIX" --base "$BASE" \
  ${ENV_COPY:+--env-copy "$ENV_COPY"} \
  ${LINK_PATHS:+--link-paths "$LINK_PATHS"} \
  ${COPY_PATHS:+--copy-paths "$COPY_PATHS"}

"$SKILL_DIR/scripts/open-terminal.sh" \
  --worktree-dir "$WORKTREE_ABS" \
  --workspace-name "$ABBR" \
  --pnpm-cmd "${PNPM_CMD:-pnpm install}" \
  --color "#ffffff"
```

**4c) Set repo pill** — after open-terminal.sh returns, set the repo identity pill on the new workspace.

If a `cmx-pill` skill is installed alongside, read `cmx-pill/data.json` to check for a repo preset matching `REPO_SIMPLE` (e.g. `FE`). Otherwise fall back to repo-aliases.json fields (`short`, `icon`, `color`).

Parse the workspace ref from open-terminal.sh stdout (`workspace:N`), then run:

```bash
cmux set-status repo "$REPO_SIMPLE" \
  --workspace "$WS_REF" \
  ${REPO_ICON:+--icon "$REPO_ICON"} \
  ${REPO_COLOR:+--color "$REPO_COLOR"} \
  --priority 100
```

**4d) Terminal-only mode** — run `open-terminal.sh` only, then set repo pill (same as 4c).

Pass `--env-copy`, `--link-paths`, `--copy-paths` only when the alias has values for them.
If `devCmd` exists: `PNPM_CMD="pnpm install && $devCmd"`, otherwise `"pnpm install"`.
**NEVER use `npm`. Always use `pnpm` for install and run commands. The correct install command is `pnpm install`, not `npm install`.**
Always pass `--color "#ffffff"` so the new workspace is marked with a white indicator.

### 5. Handle Results

| Script | Exit code | Meaning | Action |
|---|---|---|---|
| create-worktree.sh | 0 | Success | Proceed to open terminal |
| | 4 | Branch/worktree collision | Ask user for a different slug |
| | 1,2,3 | Usage/environment error | Show stderr |
| open-terminal.sh | 0 | Success | Relay completion message |
| | 5 | cmux name collision | Ask user for a different abbreviation |
| | 1,2,6 | Usage/environment/runtime error | Show stderr |

If worktree was created but terminal failed, re-running automatically enters terminal-only mode.
On name collision, never auto-append suffixes (`-2`, `-v2`) — the user must choose the new name.

## Pause / Refuse

Stop and ask the user when:

- Invoked outside a git repo
- cmux is not on PATH (`command -v cmux` fails)
- The task itself is unclear (not just ambiguous prefix — genuinely unclear what the user wants to do)

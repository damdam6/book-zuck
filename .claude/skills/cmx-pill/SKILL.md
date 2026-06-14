---
name: cmx-pill
description: >
  Manage cmux sidebar custom metadata pills. Add, update, remove, or list pills
  on the current workspace. Includes configurable presets stored in data.json.
  Same key = auto-replace, different keys = coexist.
  Trigger on "pill 추가", "pill 삭제", "상태 pill", "cmx-pill", "메타데이터 pill",
  or /cmx-pill.
---

# cmx-pill

Manage custom metadata pills on the current cmux workspace sidebar.

## Priority Tiers

| Tier | Priority | Set by |
|---|---|---|
| Repo identity (FE, BE) | 100 | cmx-wt (at workspace creation) |
| Presets | 90 (configurable) | This skill |
| Custom pill | 80 | This skill |

## Presets

Presets are defined in `data.json` (symlinked from vault). Each preset has a `key` — presets with the same key auto-replace each other, different keys coexist.

Read `data.json` through the skill symlink path:

```bash
SKILL_DIR=$(dirname "$(readlink -f "$(pwd)/.claude/skills/cmx-pill/SKILL.md")" 2>/dev/null)
cat "$SKILL_DIR/data.json"
```

Fallback: `~/Documents/obsidian/agents-vault/raw/agent-toolkit/skills/cmx-pill/data.json`

### Using a preset

```
/cmx-pill <preset-name>
```

Look up `preset-name` in `data.json` `presets`, then execute:

```bash
cmux set-status <key> "<text>" --icon <icon> --color "<color>" --priority <priority>
```

### Registering a new preset

```
/cmx-pill register <name> --key <key> --text <text> --icon <icon> --color <#hex> [--priority <n>]
```

Add the preset to `data.json`. Priority defaults to 90 if omitted.

Example — add a `review` preset under key `phase`:

```
/cmx-pill register review --key phase --text review --icon eye.fill --color "#1565C0"
```

Now `/cmx-pill review` sets a `phase:review` pill that coexists with `status` pills.

### Removing a preset

```
/cmx-pill unregister <name>
```

Remove the preset from `data.json`. Does not clear the pill from any workspace — use `clear` for that.

## Custom pill (one-off)

```
/cmx-pill set <key> <value> [--icon <name>] [--color <#hex>]
```

Execution:

```bash
cmux set-status <key> "<value>" --priority 80 [--icon <name>] [--color <#hex>]
```

## Remove pill

```
/cmx-pill clear [key]
```

When key is omitted, clears the `status` pill. Execution:

```bash
cmux clear-status <key>
```

## List pills

```
/cmx-pill list
```

Execution:

```bash
cmux list-status
```

No `--workspace` flag needed — cmux defaults to the caller's workspace.

## No-Arg Output

When called with no arguments, print the registered presets from `data.json` and the available commands:

```
/cmx-pill <preset | set | clear | list | register | unregister>

  Presets:
  <name>    <key>    <icon>                  <description>
  (read from data.json and format as table)

  Commands:
  set <key> <value> [--icon <name>] [--color <#hex>]   Add one-off pill
  clear [key]                                           Remove pill (default: status)
  list                                                  Show all active pills
  register <name> --key --text --icon --color           Save new preset
  unregister <name>                                     Remove preset
```

---
name: cmx-ws-c
description: >
  Set the workspace color of the current cmux tab. Accepts a preset name
  (wait, ing, done, docs), a cmux named color (Red, Blue, Teal, etc.),
  or a raw #hex value. Presets also set a status pill via /cmx-pill.
  Trigger on "워크스페이스 색", "workspace color", "ws color", "탭 색 바꿔",
  or /cmx-ws-c.
---

# cmx-ws-c

Set the current cmux workspace tab color. Presets additionally set a status pill.

## Execution

### Preset (`wait`, `ing`, `done`, `docs`)

1. Set workspace color:
   ```bash
   cmux workspace-action set-color <color>
   ```
2. Set status pill via `/cmx-pill`:
   ```bash
   cmux set-status status "<text>" --icon <icon> --color "<pill-color>" --priority 90
   ```

| Preset | Color | Pill text | Icon | Pill Color |
|---|---|---|---|---|
| `wait` | Amber | wait | pause.circle.fill | #7D6608 |
| `ing` | Magenta | ing | hammer.fill | #AD1457 |
| `done` | Green | done | checkmark.circle.fill | #196F3D |
| `docs` | Purple | docs | doc.text.fill | #6A1B9A |

### Color only (`Red`, `Blue`, `#hex`, etc.)

Set color only — do not touch pills:

```bash
cmux workspace-action set-color <color>
```

Unknown inputs are passed through as-is — cmux rejects invalid colors.

### `clear`

Remove color and status pill:

```bash
cmux workspace-action clear-color
cmux clear-status status
```

No `--workspace` flag needed — cmux defaults to the caller's workspace.

## No-Arg Output

When called with no arguments, print this exactly and stop:

```
/cmx-ws-c <preset | color | #hex | clear>

  Presets (color + status pill):
  wait   Amber     Waiting / blocked
  ing    Magenta   In progress
  done   Green     Completed
  docs   Purple    Documentation

  Also accepts cmux named colors:
  Red Crimson Orange Amber Olive Green Teal Aqua
  Blue Navy Indigo Purple Magenta Rose Brown Charcoal

  #hex   Raw hex   e.g. #C0392B
  clear  —         Remove color + status pill
```

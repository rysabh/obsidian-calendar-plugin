# Adjusting the Calendar plugin settings — get exactly your pattern

This is a practical "set these → get that" guide for the polished Calendar plugin.
It uses YOUR current vault layout as the worked example, and shows how to change
it. (The plugin's code ships GENERIC defaults — root `Calendar`, templates off —
so nothing here is hard-coded; it's all settings.)

> **Already done for you:** I wrote `.obsidian/plugins/calendar/data.json` to the
> values in the table below, so after you **reload Obsidian** (or restart it) the
> plugin reproduces your existing setup immediately — templated `_HUB_*` notes at
> your nested paths. If a value ever looks wrong, this table is the source of
> truth; set it in **Settings → Calendar**.

---

## 1. Your layout, expressed as settings

Open **Settings → Calendar**. These are the values for your vault:

### Calendar
| Setting | Value |
|---|---|
| Start week on | Monday |
| Show week number | On |
| Override locale | Same as system |

### Time hierarchy — output
| Setting | Value |
|---|---|
| Output root folder | `4_Archives/ARCHIVED_Projects` |
| Create folder hierarchy | On |
| Confirm before creating a note | On |
| Highlight days/weeks with a note | On |

### Time hierarchy — naming
| Setting | Value |
|---|---|
| Name prefix | `_HUB_` |
| Day date format | `MMMDD_YYYY` |
| Month date format | `MMM_YYYY` |
| Year date format | `YYYY` |
| Use ISO week numbers | On |
| Week id format | `WW_GGGG` |

### Templates (optional)
| Setting | Value |
|---|---|
| Use templates | **On** |
| Day template | `4_Archives/z___TEMPLATES/Obsidian_Templates/Static/ST_HUB_Day.md` |
| Week template | `…/Static/ST_HUB_Week.md` |
| Month template | `…/Static/ST_HUB_Month.md` |
| Year template | `…/Static/ST_HUB_Year.md` |
| Day Overview template | `…/Static/ST_Overview_Day.md` |

> Each template path shows **✓ found** / **✗ not found** right under the field, so
> a wrong path is obvious immediately (this is what was silently failing before).

### Advanced — naming patterns (defaults already match your layout)
| Period | Folder pattern | File pattern |
|---|---|---|
| Day | `Year_{year}/Month_{month}/Week_{weekId}/Day_{day}` | `{prefix}Day_{day}` |
| Week | `Year_{year}/Month_{month}/Week_{weekId}` | `{prefix}Week_{weekId}` |
| Month | `Year_{year}/Month_{month}` | `{prefix}Month_{month}` |
| Year | `Year_{year}` | `{prefix}Year_{year}` |

Computed fields (Day shown): `name = {prefix}Day_{day}` and
`related_notes[] = [[{prefix}Week_{weekId}]]`. The Week `name` keeps the human
range: `name = {prefix}Week_{weekRange}`.

**Result for today (2026-06-04):**
```
4_Archives/ARCHIVED_Projects/Year_2026/Month_Jun_2026/Week_23_2026/Day_Jun04_2026/_HUB_Day_Jun04_2026.md
  name: _HUB_Day_Jun04_2026
  related_notes:
    - "[[_HUB_Week_23_2026]]"
```

---

## 2. How to change the pattern (examples)

Everything is a setting — no code edits.

- **`Jun04_2026` → `Jun_04_2026`:** Settings → *Day date format* = `MMM_DD_YYYY`.
  Every place `{day}` appears (folder, file, name) updates together.
- **Drop the `_HUB_` prefix** (names become `Day_Jun04_2026`): *Name prefix* = (blank).
- **Flat, no subfolders** (everything in the root): *Create folder hierarchy* = Off.
- **Put hubs at the vault root:** *Output root folder* = (blank).
- **Week id `23_2026` → `W23-2026`:** *Week id format* = `[W]WW-GGGG`.
- **Compute a new field, e.g. a description:** open **Advanced → Day computed
  fields** and add a line:
  `description = {Kind} log for {day}` → fills `description: Day log for Jun04_2026`.
  (`field[] = …` marks a YAML list field like `related_notes`.)

Available tokens: `{prefix} {Kind} {year} {month} {day} {weekId} {weekRange}` and
the raw escape hatch `{date:FORMAT}` (any moment.js format, e.g. `{date:dddd}` →
`Thursday`).

---

## 3. Notes

- **Templates are optional.** Turn *Use templates* Off and new notes are created
  empty (just the correctly-computed name/location). On, each note is seeded from
  its template file and the computed fields are filled in; every other field/line
  in the template is copied exactly.
- **Date math stays correct automatically.** ISO weeks and the START-month rule
  (a week + its days nest under the Year/Month of the week's Monday) are computed
  for you — you only arrange the tokens; you can't break the math from settings.
- **Reset:** Settings → *Reset all settings to defaults* restores the generic
  defaults (root `Calendar`, templates off).
- **Syncing:** `main.js` is a normal plugin and syncs across PCs like any other.
  `data.json` (these settings) syncs with it — perfect for the same vault on
  several machines.


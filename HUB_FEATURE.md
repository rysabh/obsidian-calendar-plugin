# Calendar → Time-Hierarchy HUB feature (fork)

Clicking the calendar grid creates-or-opens nested `_HUB_*` notes
(Year / Month / Week / Day). The calendar plugin and the Templater `MT_*`
templates are **two fully independent systems** — neither depends on the other,
no shared file, no shared API. They produce the same layout because each
implements the same documented naming rules; a small, deliberate duplication of
the rule that keeps each robust on its own.

## Calendar plugin — self-contained, works in any vault

- **All config lives in the plugin's own settings** (the settings tab →
  `data.json`). Source of truth; nothing external. Configurable per vault.
- **New-note bodies come from STATIC seed templates** (plain notes with no
  computation), configured in settings — defaults in
  `…/Obsidian_Templates/Static/ST_HUB_{Day,Week,Month,Year}.md` and
  `ST_Overview_Day.md`. The plugin writes the seed verbatim, then fills the only
  dynamic bits — the note `name` and its parent `related_notes` link — via
  Obsidian's frontmatter API.
- **It computes paths itself** in `src/core/periods.ts` (pure, unit-tested).

| Concern | File |
|---|---|
| Path / naming logic (plugin's own copy) | `src/core/periods.ts` |
| Create-or-open + seed + frontmatter fill | `src/core/noteService.ts` |
| All settings | `src/settings.ts` |
| Context-menu registry (one place → handlers) | `src/ui/contextMenu.ts` |
| Binary "hub exists" cue | `src/ui/sources/hubExists.ts` |
| View wiring (clicks, hover, menus) | `src/view.ts` |
| Vendored UI (0.3.12) + clickable month/year header | `src/vendor/calendar-ui/` |

## Templater — its own thing, modified only for the new naming

The original `MT_*` templates are restored and **surgically** updated so their
self-contained heads place weeks by the START-month rule and name them with the
ISO week id (matching the plugin's layout). Month and Year templates are
unchanged. They call nothing in the plugin.

## Naming rules (both systems implement these)

- Week starts **Monday** (ISO). A week and **all its days** nest under the
  calendar Year/Month of the week's **start** (START-month rule).
- Week folder/file use the **ISO** week number + ISO week-year, zero-padded:
  `Week_18_2026`, `_HUB_Week_18_2026`. The human range (`Apr27-May03_2026`) is
  kept in the note's `name:` field for search.
- Boundary example: Mon 2025-12-29 → `Year_2025/Month_Dec_2025/Week_01_2026/`.

Verified: executing the actual template heads and the plugin's `periods.ts` for
the same dates produces identical paths (incl. `2026-05-01`, `2025-12-29`).

## Build & deploy

```
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 24
npm install        # if node_modules absent
npm run build      # svelte-check + eslint + rollup  (or: npx rollup -c)
npx jest           # path/naming unit tests
# deploy: back up the vault main.js, then copy main.js + manifest.json into
#   <vault>/.obsidian/plugins/calendar/
```
The svelte-check `lib/mappings.wasm` lines under Node 24 are a harmless
source-map quirk — it still reports "0 errors". No `styles.css` is produced;
component CSS (incl. cues) is JS-injected.

## Manual UI verification (must be done in Obsidian)

Reload Obsidian after deploying, then:

- [ ] **Panel renders / no console errors** (devtools, Ctrl/Cmd+Shift+I).
- [ ] **Day create/open:** click an empty day → confirm modal → creates
      `_HUB_Day_<MMMDD_YYYY>.md` at the nested path. **Open it and check the
      frontmatter: `name:` is the file name AND `related_notes:` is the parent
      `[[_HUB_Week_<WW>_<YYYY>]]`** (both must be populated, not the
      `_MOC_Templates` placeholder). Click again → just opens (no duplicate).
- [ ] **Week (same- & cross-month):** click a week number → `_HUB_Week_<WW>_<YYYY>.md`
      with `name:` = the human range; a May day of the Apr-start week nests under
      `Month_Apr_…` (START-month).
- [ ] **Header month/year:** click "Apr"/"2026" → Month/Year HUB for the
      *displayed* period.
- [ ] **Cues / context menu / hover** work; the Overview menu item creates
      `_Overview_Day_<…>.md`.
- [ ] **Templater unchanged workflow:** applying `MT_HUB_Day_Today` / `MT_HUB_Week`
      etc. produces the SAME paths as a calendar click — with NO calendar plugin
      involvement.
- [ ] **Settings page** reads coherently (Calendar; Time Hierarchy).

### Known limitations (not blocking)
- The active-cell highlight uses the daily-notes filename parser and won't track
  custom `_HUB_Day_*` names. Cosmetic.
- Legacy 2025 range-named weeks are not migrated. Calendar clicks OPEN an
  existing range-named week instead of duplicating it; the Week template lacks
  that guard, so only manually-apply it for current/future weeks. Migration, if
  wanted, is a manual one-off (rename folders/files; Obsidian updates links).

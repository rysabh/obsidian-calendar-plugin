# PLAN — Extend the Obsidian "Calendar" plugin to create/open hierarchical MoC notes on click

> **STATUS:** Design LOCKED (Rounds 1–6). Source compatibility VERIFIED by cloning + building upstream (§16) — `npm install` + `rollup -c` produced a working `main.js` (exit 0). Remaining open items now have **baked-in defaults (§9)** so this is executable autonomously (e.g. via `/goal`). **Implementation NOT started.** The "only edit the plan file" rule applied to the DESIGN phase. → **If the user invokes `/goal` (or otherwise) asking you to IMPLEMENT this plan, that IS the go-ahead** — proceed via the §15.1 RUNBOOK. Implementing means writing the fork at `/home/cam/Documents/GitHub/`, deploying into the vault plugin folder `.obsidian/plugins/calendar/`, and refactoring the `MT_*` templates; you'll need permissions to run `git`/`npm`/subagents and write those paths.
>
> **▶ RESUME PROTOCOL (read FIRST if your context was compacted, or you are a fresh agent):** This FILE is the single source of truth — the entire design lives here, NOT in chat. (1) Re-read this whole file top→bottom. (2) Read "BUILD STATUS / NEXT ACTION" just below for where work stands. (3) Continue from there. Do not trust half-remembered chat; trust this file. (It is intentionally exhaustive precisely so it survives context compaction.)
>
> **⚠️ ARCHITECTURE SUPERSEDED (2026-06-04, by user direction):** The "single shared module / plugin API that Templater calls" and the later "shared `hub_config.json`" designs described throughout this plan were BOTH REJECTED by the user. **FINAL architecture = two fully INDEPENDENT systems, no cross-contamination:** (1) the Calendar plugin keeps ALL config in its own settings (`data.json`, source of truth, works in any vault) and seeds new notes from STATIC templates in `…/Obsidian_Templates/Static/ST_*` (plain content; the plugin fills `name` + parent link via `processFrontMatter`), computing paths in its own `src/core/periods.ts`; (2) the Templater `MT_*` templates are the user's ORIGINALS, surgically updated only to the ISO-week + START-month naming, self-contained, calling nothing in the plugin. The two agree because each implements the same rules (verified: executing the real template heads and `periods.ts` for the same dates gives identical paths). There is NO plugin `api`, NO `hub_config.json`, NO migration command in the plugin. Authoritative current docs: the fork's `HUB_FEATURE.md`. Sections below referencing a shared API/module/config or an in-plugin migration are HISTORICAL.
>
> **BUILD STATUS / NEXT ACTION:** _Phases A–D DONE + deployed (2026-06-04)._ Fork at `/home/cam/Documents/GitHub/obsidian-calendar-plugin`. Phase A: `src/core/periods.ts` (single source) + `templateBody.ts` + `noteService.ts`; **jest 19/19 green** (incl. §4 vectors, name:/parentLink, cross-month/cross-year, real-template render). Phase B: all 7 `MT_*` heads refactored to call `app.plugins.plugins.calendar.api` — **bodies byte-identical** (verified) + heads syntactically valid. Phase C: vendored 0.3.12 UI into `src/vendor/calendar-ui` with clickable month/year header; `view.ts` seams → `createOrOpenHub`; `hubExistsSource` cues; context-menu registry; settings (hubRoot/templates/overview/cues); plugin `api`. Phase D: `npm run build` exit 0 → `main.js` (138 KB) deployed to vault `.obsidian/plugins/calendar/` (old backed up `main.js.pre-fork.bak`). eslint clean; svelte-check 0 errors. Docs: `HUB_FEATURE.md` in the fork (architecture + manual checklist). **Migration command landed** (subagent: `src/core/migration.ts` + 2 in-app commands, +13 tests); independently re-verified → **jest 32/32**, clean build exit 0, deployed `main.js` (151,647 B) byte-identical to a fresh build, backup intact. **ALL G1–G8 met.** **NEXT (user, in-app only): (a) manual UI click-through per `HUB_FEATURE.md` (G8 — start with devtools console); (b) run the week-migration dry-run → review → git-back-up → apply.**
>
> **G2 RECONCILIATION (was literally unsatisfiable as "byte-identical"):** the R6-locked week→ISO change means every week-bearing path necessarily differs from the old Templater output (`Week_Jun01-07_2026`→`Week_23_2026`). Resolved as: **bodies + frontmatter identical for ALL periods; day/month/year paths identical; the WEEK folder/file segment is the one intended exception** (ISO name; `name:` keeps the range). Verified via jest on the API (NOT by diffing old vs new week names).

---

## ⭐ GOAL-MODE CONTRACT (authoritative control-flow for a `/goal` run — READ BEFORE ACTING)

**THE GOAL (one line):** Ship a forked "Calendar" plugin where clicking a day / week-number / month / year **creates-or-opens the matching `_HUB_*` note** at the exact nested path (§4), reusing ONE shared path/naming logic with Templater — built, deployed, and unit-test-verified.

> **AUTHORIZATION NOTE:** if you are reading this in order to IMPLEMENT, you are authorized. Any "design-phase / do-not-start-yet / only edit the plan file" wording elsewhere in this file predates implementation and is **SUPERSEDED** by this contract — proceed via §15.1.

**DONE WHEN — termination condition; ALL must be true, each is checkable (detail in §13):**
- [x] **G1** ONE shared module/API in the fork holds the path/naming + config + create-or-open logic; NO duplicated path logic anywhere. (C1) — `src/core/periods.ts` + `plugin.api`; templates + plugin both consume it.
- [x] **G2** The 7 `MT_*` templates call that API and produce byte-identical **bodies/frontmatter**; day/month/year **paths** identical; week segment is the intended R6 ISO exception (see G2 RECONCILIATION above). Bodies verified byte-identical; heads syntactically valid.
- [x] **G3** Left-click day → Day HUB; week# → Week HUB; header "month"/"year" → Month/Year HUB — each **create-if-missing-then-open, else open**. (§1, C3) — coded in `view.ts`+`noteService.ts`; runtime click-through is the user's manual check (G8).
- [x] **G4** Cues = binary "hub exists" highlight from real hubs; confirm-modal is a setting (default ON, corrected text naming the actual hub); right-click menu hosts Overview + extras (registry); hover preview targets the hub. (§8 R2/R4)
- [x] **G5** Week naming = ISO `Week_<WW>_<GGGG>` (zero-padded), `name:` keeps the range; START-month placement; **`npx jest` passes the §4 vectors incl. `2026-05-01` & `2025-12-29`** (19/19). (C4, INV-1, INV-5)
- [x] **G6** `npm run build` exit 0 under Node 24; `main.js` deployed into `.obsidian/plugins/calendar/` after backing up the old `main.js` → `main.js.pre-fork.bak`. (No `styles.css`: build emits none — component CSS, incl. cues, is JS-injected.)
- [x] **G7** Week migration was **delegated to a subagent** (NOT run in the main loop). Subagent added `src/core/migration.ts` (pure planner + I/O) with two in-app commands: "Migrate legacy week folders to ISO names (dry run)" and "(APPLY — renames files)"; jest 13 new tests (6 clean 2026 weeks migrate, 6 messy 2025 weeks flagged); independently re-verified (jest 32/32, clean build exit 0, deployed `main.js` byte-identical to fresh build). The actual rename is run by the USER inside Obsidian (needs `app.fileManager`), dry-run-first + git-backed.
- [x] **G8** A manual UI-verification checklist (the things the loop cannot click) is written for the user — `HUB_FEATURE.md` in the fork.
> **When G1–G8 hold → STOP and report. Do not keep looping.**

**AUTONOMOUS vs MANUAL (so the loop stops at the right point):** the loop CAN self-verify G1, G2, G5, G6, G7 (run `jest`, run the build, inspect files/output). It CANNOT click inside Obsidian, so G3/G4 are verified by jest + code review + the written checklist (G8) — **NOT** by launching Obsidian. Do NOT spin trying to UI-test; write the checklist (G8) and stop.

**REQUIREMENTS (must-haves):** behaviors in §1; defaults (settings/menu/cues) in §9; build/deploy in §15 + §15.1 runbook; code seams in §16.
**HARD CONSTRAINTS (never violate; never re-decide):** C1–C7 in §2. The locked decisions **R1–R6 (§8) are FINAL** — do not re-open or re-litigate them mid-run.

**NON-GOALS / OUT OF SCOPE (do NOT do):**
- Do NOT run the week migration in the main loop (subagent / step-2 only); do NOT delete or hand-rename legacy notes otherwise.
- Do NOT modify other plugins, core Daily-Notes settings, or unrelated vault files; do NOT reformat the vault.
- Do NOT change template **bodies** — only refactor each template's `<%* %>` head (C2).
- Do NOT `git commit`/`push` unless the user explicitly asks (building/deploying is fine).
- Do NOT re-open locked decisions or change the naming grammar.
- Do NOT claim "done" if tests fail or any G# is unmet, and NEVER stub/fake a check to make it pass — report honestly.

**SAFETY:** Before overwriting `.obsidian/plugins/calendar/main.js`, copy it to `main.js.pre-fork.bak` (so the user can revert if the new build misbehaves). Don't disable/delete the existing plugin folder.

**STUCK PROTOCOL (no infinite loops):** if one step fails after ~3 genuine attempts: (1) append the exact error + what you tried to **§17 BLOCKERS LOG** and the top BUILD STATUS line; (2) if other phases are independent, proceed with them; (3) if it blocks everything (e.g. won't compile), STOP and surface — never repeat the same failing action forever, never fake success.

**IDEMPOTENCY / RESUME (compaction-safe):** steps are re-runnable. On (re)start: read BUILD STATUS + the PROGRESS LEDGER, then **detect real state from disk before acting** — does the fork dir exist? the shared module + tests? does `npx jest` pass? is `main.js` deployed? Continue from the first unmet G#/phase. Never blindly redo a completed phase; never double-create files/folders.

**PROGRESS LEDGER (tick after each step — this is the resume pointer; keep in sync with BUILD STATUS):**
- [x] Phase 0 — Node 24 loaded; fork at `/home/cam/Documents/GitHub/obsidian-calendar-plugin`
- [x] Phase A — shared module + jest green (19/19)  → G1, G5
- [x] Phase B — templates refactored, bodies byte-identical  → G2
- [x] Phase C — plugin code (seams, cues, menu, modal, settings, vendored UI + month/year clicks)  → G3, G4
- [x] Phase D — build clean (exit 0) + backed up old main.js + deployed  → G6
- [x] Verify — jest green + manual UI checklist written (HUB_FEATURE.md)  → G8
- [x] Migration — command implemented by subagent (dry-run + apply); user runs it in-app  → G7
>
> **WHAT YOU MAY EDIT RIGHT NOW:** only this file (`0_Inbox/plan_for_calendar_plugin.md`). You may READ anything in the vault.
>
> **Created:** 2026-06-04 by an agent working with Rishabh. **Vault:** `/home/cam/Applications/obsidian_rysabh_github`.

---

## FOR A NEW AGENT — START HERE (orientation, read top to bottom)

You are picking up a feature request for an Obsidian vault. The human (Rishabh) keeps a **time-based hierarchy of "hub" notes**: a note for each Year, each Month, each Week, and each Day, nested in folders. He generates these today with the **Templater** plugin (manually triggered templates). He also uses the **Calendar** plugin (a visual month grid, by Liam Cain, version 1.5.10, **no longer maintained**).

He wants the **Calendar grid to become a launcher** for that hierarchy: clicking a day/week-number/month/year should **create the matching hub note if it doesn't exist and open it, or just open it if it already exists** — placing/naming it **identically** to what Templater produces today.

The single most important non-negotiable: **there must be exactly ONE place that knows the folder paths and file names.** Today that logic is copy-pasted inside every Templater template. He refuses to also copy it into the Calendar plugin, because two copies will drift and silently create mismatched/duplicate folders. So the plan is: **extract that logic into one shared module that BOTH Templater and the Calendar plugin call.**

Key vocabulary used throughout this doc:
- **MoC** = "Map of Content", an index/dashboard note. Rishabh's hub notes are MoCs for each time period.
- **HUB note** = the primary note for a period. Names: `_HUB_Year_2026`, `_HUB_Month_Apr_2026`, `_HUB_Week_18_2026` (ISO week; its `name:` field keeps `_HUB_Week_Apr27-May03_2026`), `_HUB_Day_Apr29_2026`. Holds task sections (Important/ToDo/etc.) and a dataview backlinks table.
- **Overview note** = a SECOND, day-only note (`_Overview_Day_Apr29_2026`) containing a complex `dataviewjs` dashboard that aggregates the day/week/month/year hubs' tasks. **DECISION: the click feature will NOT create or open this; Rishabh creates it manually via Templater. Ignore it for click behavior except where noted.**
- **Templater** = community plugin that runs JavaScript inside `<%* ... %>` blocks when a template is applied, and can move/rename the new file. This is the current note-creation engine.
- **daily-notes-interface** = the helper library the Calendar plugin uses to create/find notes (`createDailyNote`, `getDailyNote`, `getWeeklyNote`, …). It assumes ONE flat file per period in ONE configured folder with a configurable date-format name. **It cannot represent Rishabh's nested folders + custom names, so we are REPLACING the calendar's create/open path, not configuring it.**

If you read only one section for correctness, read **§4 Naming & path grammar** — getting a name or folder wrong is the worst possible failure (it silently forks the hierarchy into duplicate folders).

---

## TABLE OF CONTENTS
- ⭐ GOAL-MODE CONTRACT (top) — goals/done-criteria/constraints/non-goals/stuck+resume protocol/progress ledger for a `/goal` run
- §0 Working agreement / how to work on this (READ — includes a hard rule about writing detail)
- §1 The goal, in full
- §2 Hard constraints / non-negotiables
- §3 Current state of the world (what exists today, verified)
- §4 Naming & path grammar (CANONICAL — the heart of the spec)
- §5 The Templater templates, explained in full (the "current way", to be preserved)
- §6 The Calendar plugin internals (integration surface, verified by inspecting `main.js`)
- §7 Architecture & design (the chosen approach, in detail)
- §8 Decisions log — every grilling round, question, answer, rationale, side-info
- §9 Decisions still open (what the next grilling rounds must resolve)
- §10 Side information captured (everything adjacent the user said / I discovered)
- §11 Invariants & failure modes (including a latent bug in the current templates)
- §12 Implementation checklist (DEFERRED — do not start yet)
- §13 Goal acceptance checklist (definition of done)
- §14 Open technical questions for the implementer
- §15 Build, test & deploy procedure (+ §15.1 RUNBOOK — exact ordered commands for the `/goal` agent)
- §16 Source compatibility — verified by cloning/building upstream (the exact code seams to modify)
- §17 BLOCKERS LOG (the `/goal` run appends blockers here)

---

## §0. Working agreement / how to work on this

**HARD RULE — WRITE EVERYTHING DOWN, IN DETAIL (user feedback, 2026-06-04, verbatim intent):**
> "i have told you to write things in detail. you dont do that. how will a new agent understand wtf you are writing. i also give you a lot of adjacent information.. you dont write all that.. i can imagine shit going wrong all because you are skimping on writing."

What this means concretely for anyone editing this file:
- [ ] Write so a person with **zero prior context** can act. Spell out the *why*, not just the *what*. Prefer a paragraph of explanation over a cryptic bullet.
- [ ] Capture **all adjacent/side information** the user mentions, even if it seems tangential. Put it in §10 (or the relevant section) immediately. Do not drop it.
- [ ] When a decision is made, record: the question, the options considered, the chosen option, **and the reasoning/trade-offs**. See §8.
- [ ] Include concrete **examples** (real dates → real folder/file names) wherever a rule is stated.
- [ ] Never silently summarize away detail to save space. This file is allowed to be long. Length is not a problem; lost intent is.

**Process rules:**
- [ ] DRY is the prime directive: ONE source of truth for path/naming logic, consumed by both Templater and the Calendar plugin. Redundancy = drift = silent failure.
- [ ] Keep the existing Templater workflow working and producing **byte-identical output** (same folders, same filenames, same body). It is robust and in daily use; do not regress it.
- [ ] Grill the user in **rounds of 3 questions**, each question listing the **recommended option first** with a clear explanation of every option, until we are fully in sync. Log every round in §8.
- [ ] During the DESIGN phase, only this plan file may be edited (plugin/templates untouched). **SUPERSEDED once implementation is authorized** — a `/goal` "implement" invocation IS that authorization (see the GOAL-MODE CONTRACT at the top); then build per §15.1.

> NOTE FOR THE ASSISTANT: this detail-writing preference is a durable, cross-session preference and ideally belongs in long-term memory. It was NOT saved to memory this session because the user restricted edits to this plan file only. Save it to memory when editing is unrestricted (feedback type: "write exhaustively / capture all adjacent info / a cold agent must be able to act").

---

## §1. The goal, in full

Rishabh maintains a nested, time-based note hierarchy under `4_Archives/ARCHIVED_Projects`. He currently creates each note by manually invoking a Templater template, which computes the destination folder + filename from "now" and moves the new note there. This works but requires him to (a) trigger the right template and (b) rely entirely on Templater.

He wants the **Calendar plugin's grid** to become an additional, faster entry point:

- [ ] **Click a day cell** → if `_HUB_Day_<stamp>` for that date does not exist, create it (and its full ancestor folder chain) at the correct nested location, then open it. If it already exists, just open it. **Open target is ALWAYS the Day HUB** (see §8 R2/Q4). The Overview note is never auto-created or auto-opened by clicking.
- [ ] **Click a week number** → create-or-open `_HUB_Week_<range>` for that week.
- [ ] **Click the month** in the calendar title (e.g. the word "Jun" in "Jun 2026") → create-or-open `_HUB_Month_<MMM_YYYY>` for the **currently displayed** month. (New UI — the calendar has no month click target today; see §8 R2/Q5.)
- [ ] **Click the year** in the calendar title (e.g. "2026") → create-or-open `_HUB_Year_<YYYY>` for the **currently displayed** year. (New UI.)
- [ ] **Visual cues:** the grid's "this cell has a note" indicators (dots / highlighted numbers) must reflect Rishabh's **real hub notes** (via the shared existence check), not the unused built-in daily-notes folder (see §8 R2/Q6).
- [ ] Everything above must reuse the **same single source of truth** for path/naming that Templater uses. No duplicated path logic anywhere.

WHY he wants this: the Calendar plugin is unmaintained, so he's decided to extend it himself. He values robustness and hates code duplication ("more points of mismatch and failure"). He explicitly wants ONE entry point / one way to compute paths so nothing can drift.

---

## §2. Hard constraints / non-negotiables

- [ ] **C1 — Single source of truth.** Exactly one module defines `weekRangeFor`, the folder hierarchy, and the file names. Both Templater templates and the Calendar plugin call it. No second copy of this logic may exist.
- [ ] **C2 — Templater output preserved byte-for-byte.** After refactoring the templates to call the shared module, applying a template by hand must produce the identical folder path, filename, frontmatter, and body it produces today. Verify against §4 examples.
- [ ] **C3 — Create-if-missing-else-open.** Every click must: if the target note exists → open it; else → create it (plus any missing ancestor folders) → open it. It must NEVER throw on an existing file, and must NEVER create a time-suffixed duplicate (the templates' `AUTO_UNIQUE_ON_EXISTS` behavior must not apply to clicks).
- [ ] **C4 — Exact-name reproduction.** The calendar's computed names MUST equal Templater's. An off-by-one in the week calculation (e.g. wrong week start, wrong end-year) would create a *second* week folder and fragment a week's notes across two folders. This is the worst-case failure for this vault — guard it with a date→name test table (§11).
- [ ] **C5 — Week starts Monday.** Calendar setting is `weekStart: "monday"`; templates use `WEEK_START_ISO = 1` (Monday). These two MUST stay consistent. The shared module owns this constant.
- [ ] **C6 — No regression of the manual Templater flow.** Rishabh keeps using Templater (he creates the Overview note manually, and may create hubs manually too). Don't break it.
- [ ] **C7 — Coherent, modular architecture (user directive, R5).** ALL configuration lives in ONE place (the plugin's settings/config module), never scattered as unknown constants. Use single declaration points: e.g. ONE file/registry enumerating context-menu items → referencing handler functions; ONE module for path/naming logic; ONE config schema. Modular, readable, maintainable, zero duplication, best coding practices. A future maintainer must find each concern in an obvious single location.

---

## §3. Current state of the world (verified on disk, 2026-06-04)

**Vault root:** `/home/cam/Applications/obsidian_rysabh_github`
**Generated notes live under:** `4_Archives/ARCHIVED_Projects`
**Templates live under:** `4_Archives/z___TEMPLATES/Obsidian_Templates/Dynamic`

**Plugins installed (relevant ones in bold):** **calendar**, cmdr, copilot, dataview, **templater-obsidian**, multi-column-markdown, obsidian-admonition, obsidian-git, … (full list of 30 plugins present; calendar + templater + dataview + multi-column-markdown + admonition are the ones the templates/feature touch).

**Calendar plugin folder** `.obsidian/plugins/calendar/`:
- `main.js` — ~141 KB, a **bundled (compiled) Svelte build**. Not pleasant to edit by hand. (This drives the packaging question, §9.)
- `manifest.json` — `id: "calendar"`, `name: "Calendar"`, `version: "1.5.10"`, author Liam Cain, `isDesktopOnly: false`, `minAppVersion: "0.9.11"`.
- `data.json` (current settings):
  ```json
  {
    "shouldConfirmBeforeCreate": true,
    "weekStart": "monday",
    "wordsPerDot": 250,
    "showWeeklyNote": true,
    "weeklyNoteFormat": "",
    "weeklyNoteTemplate": "",
    "weeklyNoteFolder": "",
    "localeOverride": "system-default"
  }
  ```
  Meaning: a "create this note?" confirmation modal is ON; week starts Monday; a "dot" represents 250 words; the week-number column is shown; weekly-note format/template/folder are unset (the built-in weekly feature isn't really configured — consistent with the fact that the user's real notes live outside the daily-notes system).

**Templater settings** (`.obsidian/plugins/templater-obsidian/data.json`, relevant fields):
- `templates_folder = "4_Archives/z___TEMPLATES/Obsidian_Templates/Dynamic"`
- `user_scripts_folder = ""` ← **currently EMPTY.** If we make the shared module a Templater "user script" (so templates can call it as `tp.user.<name>`), this must be set to the folder containing the module. (See §7 and §14.)
- `enable_folder_templates = true` but the folder mapping is empty; `trigger_on_file_creation = false`. So templates are applied manually, not auto-on-create.

**Templates present in the Dynamic folder:**
`DT_Basic.md`, `DT_HUB.md`, `DT_MOC.md`, `MT_HUB_Day_Today.md`, `MT_HUB_Day_Tomorrow.md`, `MT_HUB_Month.md`, `MT_HUB_Week.md`, `MT_HUB_Year.md`, `MT_Overview_Day_Today.md`, `MT_Overview_Day_Tomorrow.md`.
(The `MT_*` = the time-hierarchy templates this feature cares about. The `DT_*` = generic basic/hub/MOC templates, not period-specific.)

**On-disk reality of the generated hierarchy:** 60 folders, 132 markdown files under `ARCHIVED_Projects`. Two regimes:
1. **2026 folders (Jan, Mar, Apr) — CURRENT, consistent, and they exactly match the current templates.** These are ground truth for the naming grammar (§4).
2. **2025 folders (Oct, Nov, Dec) — LEGACY, inconsistent, predate the current scheme.** Examples of legacy drift to NOT emulate: `_HUB_Nov_2025` (missing the `Month` segment), `Week_Nov_10-16_2025` (extra underscore after month), `Week_Oct_27-2_2025`, `_HUB_Successful_Week_*`, per-day `Schedule_*` and `Success_Parameters_*` files, a bare `Overview.md`. Leave these alone; do not migrate them (unless a later decision says otherwise — see §9).

---

## §4. Naming & path grammar (CANONICAL — confirmed against current templates AND 2026 on-disk data)

This is the contract. Every consumer (Templater + plugin) must produce exactly these strings.

> **WEEK NAMING (FINAL — R4/Q10 + R6/Q16): ALL weeks use ISO week number.** Folder `Week_<WW>_<GGGG>`, file `_HUB_Week_<WW>_<GGGG>` (e.g. `Week_01_2026`, `_HUB_Week_18_2026`); zero-padded 2-digit ISO week (`date.isoWeek()`) + ISO week-year (`date.isoWeekYear()` = `GGGG`). The human range is kept in the `name:` frontmatter for search — literally `name: _HUB_Week_Apr27-May03_2026` (the legacy filename form), even though the file/folder use the numbered form. Existing legacy range-named weeks are **MIGRATED** to this scheme (one-time, link-preserving, dry-run + git backup — §8/R6). So there is ONE week-naming scheme vault-wide (no resolver, no drift; honors C4). The folder nests under the START month/year (§11): a Dec-start week reads `Week_01_2026` under `Year_2025/Month_Dec_2025`. The `<RANGE>` grammar below is retained ONLY for the `name:` field and for parsing legacy names during migration.

**Output root:** `4_Archives/ARCHIVED_Projects` (this is the templates' `ROOT` constant; templates themselves live elsewhere — do not confuse the two).

**Full hierarchy with a worked example** — example date **Wednesday 29 April 2026**, which falls in the week **Monday 27 Apr 2026 → Sunday 03 May 2026** (a cross-month week):

```
4_Archives/ARCHIVED_Projects/
└─ Year_2026/                                   folder:  Year_<YYYY>
   ├─ _HUB_Year_2026.md                          file:   _HUB_Year_<YYYY>
   └─ Month_Apr_2026/                            folder:  Month_<MMM>_<YYYY>
      ├─ _HUB_Month_Apr_2026.md                   file:   _HUB_Month_<MMM>_<YYYY>
      └─ Week_18_2026/                           folder:  Week_<WW>_<GGGG>  (ISO week + ISO week-year)
         ├─ _HUB_Week_18_2026.md                  file:   _HUB_Week_<WW>_<GGGG>  (its `name:` frontmatter = _HUB_Week_Apr27-May03_2026)
         └─ Day_Apr29_2026/                      folder:  Day_<MMMDD>_<YYYY>
            ├─ _HUB_Day_Apr29_2026.md             file:   _HUB_Day_<MMMDD>_<YYYY>   ← created/opened by a DAY click
            └─ _Overview_Day_Apr29_2026.md        file:   _Overview_Day_<MMMDD>_<YYYY>  ← MANUAL (Templater), never created by a click
```

**moment.js format tokens (English locale assumed):**
- `YYYY` → 4-digit year, e.g. `2026`.
- `MMM` → 3-letter English month abbreviation: `Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec`.
- `DD` → zero-padded day of month, e.g. `01`, `29`.
- `MMMDD` → month abbreviation + zero-padded day, e.g. `Apr29`.
- Month stamp (`MMM_YYYY`) → e.g. `Apr_2026`. Used in `Month_<stamp>` folder and `_HUB_Month_<stamp>` file.
- Day stamp (`MMMDD_YYYY`) → e.g. `Apr29_2026`. Used in `Day_<stamp>` folder, `_HUB_Day_<stamp>`, `_Overview_Day_<stamp>`.

**Week `<RANGE>` computation — this is the trickiest part. Algorithm (verbatim logic from the templates):**
```js
const WEEK_START_ISO = 1; // Monday
function weekRangeFor(date) {                       // date is a moment()
  const start = date.clone().isoWeekday(WEEK_START_ISO);  // Monday of date's ISO week
  if (start.isAfter(date, "day")) start.subtract(7, "days");
  const end = start.clone().add(6, "days");          // Mon + 6 = Sun (inclusive)
  if (start.format("YYYYMM") === end.format("YYYYMM")) {
    // same calendar month → "MMMDD-DD_YYYY"
    return `${start.format("MMMDD")}-${end.format("DD")}_${end.format("YYYY")}`;
  }
  // cross-month → "MMMDD-MMMDD_YYYY"
  return `${start.format("MMMDD")}-${end.format("MMMDD")}_${end.format("YYYY")}`;
}
```
- The year in the range string is **the END day's year** (`end.format("YYYY")`).
- **Same-month example:** week Mon 23 → Sun 29 Mar 2026 → `Mar23-29_2026`.
- **Cross-month examples:** Mon 27 Apr → Sun 03 May 2026 → `Apr27-May03_2026`; Mon 26 Jan → Sun 01 Feb 2026 → `Jan26-Feb01_2026`. (Both confirmed as real folders on disk.)

**Parent links written into the `related_notes:` YAML frontmatter of each created note** (these wire the hierarchy together — used by dataview/graph):
- Day HUB's parent → `[[_HUB_Week_<WW>_<GGGG>]]` (the numbered week filename; was the range pre-migration)
- Day Overview's parent → `[[_HUB_Day_<MMMDD>_<YYYY>]]` (Overview is manual, listed for completeness)
- Week HUB's parent → `[[_HUB_Month_<MMM>_<YYYY>]]`
- Month HUB's parent → `[[_HUB_Year_<YYYY>]]`
- Year HUB's parent → `[[_MOC_Templates]]` (a fixed link to a top-level MOC, not date-derived)

**Real confirmed examples on disk (2026):** `Year_2026`, `_HUB_Year_2026.md`(implied), `Month_Apr_2026`, `_HUB_Month_Apr_2026.md`, `Month_Mar_2026`, `_HUB_Month_Mar_2026.md`, `Month_Jan_2026`, `_HUB_Month_Jan_2026.md`, `Week_Apr27-May03_2026`, `_HUB_Week_Apr27-May03_2026.md`, `Week_Mar23-29_2026`, `Week_Jan26-Feb01_2026`, `Day_Apr29_2026`, `_HUB_Day_Apr29_2026.md`, `_Overview_Day_Apr29_2026.md`.
> ⚠️ The range-named WEEKS above are CURRENT on disk but will be **migrated to ISO numbers** (R6/§8): e.g. `Week_Apr27-May03_2026` → `Week_18_2026`, `_HUB_Week_Apr27-May03_2026.md` → `_HUB_Week_18_2026.md` (with `name:` keeping the range). Day/Month/Year names are unchanged by migration.

**Test vectors to hard-code into a unit check (date → expected names):**
| Input date | Day folder | Day HUB file | Week folder (ISO) | Month folder | Year folder |
|---|---|---|---|---|---|
| 2026-04-29 (Wed) | `Day_Apr29_2026` | `_HUB_Day_Apr29_2026` | `Week_18_2026` | `Month_Apr_2026` | `Year_2026` |
| 2026-05-01 (Fri) | `Day_May01_2026` | `_HUB_Day_May01_2026` | `Week_18_2026` | `Month_Apr_2026` | `Year_2026` |
| 2026-03-23 (Mon) | `Day_Mar23_2026` | `_HUB_Day_Mar23_2026` | `Week_13_2026` | `Month_Mar_2026` | `Year_2026` |
| 2026-01-28 (Wed) | `Day_Jan28_2026` | `_HUB_Day_Jan28_2026` | `Week_05_2026` | `Month_Jan_2026` | `Year_2026` |
| 2026-06-04 (today) | `Day_Jun04_2026` | `_HUB_Day_Jun04_2026` | `Week_23_2026` | `Month_Jun_2026` | `Year_2026` |
| 2025-12-29 (Mon) | `Day_Dec29_2025` | `_HUB_Day_Dec29_2025` | `Week_01_2026` | `Month_Dec_2025` | `Year_2025` |

> **Reading the table (all ISO weeks verified via `date +%G-W%V`):** Week folder = `Week_<isoWeek>_<isoWeekYear>`, zero-padded. The **2026-05-01** row demonstrates the **START-month rule**: May 1 is in May, but its ISO week 18 *started* Mon Apr 27, so it nests under `Month_Apr_2026` (NOT May) — its day stamp is still `May01`. The **2025-12-29** row is a cross-year week: ISO week-year is 2026 (`Week_01_2026`) yet it nests under `Year_2025/Month_Dec_2025` (start). Each week HUB's `name:` frontmatter keeps the human range, e.g. `_HUB_Week_Apr27-May03_2026`.

---

## §5. The Templater templates, explained in full (the "current way" — must keep working)

All live in `4_Archives/z___TEMPLATES/Obsidian_Templates/Dynamic/`. Each `MT_*` template has the same SHAPE:

1. A leading `<%* … %>` JavaScript block (Templater "execution command") that:
   - declares `const ROOT = "4_Archives/ARCHIVED_Projects";`
   - declares `const AUTO_UNIQUE_ON_EXISTS = false;` — if the destination already exists, the template **throws** an error (rather than overwriting or auto-suffixing). *(For the click feature we do the opposite: open the existing file. See C3.)*
   - (day & week templates only) declares `const WEEK_START_ISO = 1;` and the `weekRangeFor()` function from §4.
   - defines `async function ensureFolder(path)` that creates each missing folder segment via `app.vault.createFolder`.
   - computes the period stamps/folders from **`const now = moment();`** (i.e. "today"; the Tomorrow variants use `moment().add(1,'day')` — see below).
   - builds `folderPath`, then `await ensureFolder(folderPath)`.
   - builds `fileName` and `destPath = folderPath + "/" + fileName`.
   - builds the `parentLink` (see §4).
   - guards: `const currentPath = tp.file.path(true); if (currentPath === destPath) return;` (don't move onto itself).
   - if `destPath` exists and `!AUTO_UNIQUE_ON_EXISTS` → `throw new Error("Destination already exists: …")`; else if exists → append `_HHmm`.
   - `await tp.file.move(destPath);` — relocates/renames the newly-created note to the computed path.
2. After the `-%>` the **body** is emitted, with `<% fileName %>` and `<% parentLink %>` substituted in the frontmatter, followed by markdown content (task sections and/or dataview blocks).

**Per-template specifics:**

| Template | `fileName` produced | Destination folder | `parentLink` | Body (after frontmatter) |
|---|---|---|---|---|
| `MT_HUB_Day_Today.md` | `_HUB_Day_<MMMDD_YYYY>` | `ROOT/Year_<Y>/Month_<MMM_Y>/Week_<RANGE>/Day_<MMMDD_Y>` | `[[_HUB_Week_<RANGE>]]` | `## Important` (placeholder task `- [ ] DT1`), `## ToDo` (`- [ ] DT2`) |
| `MT_HUB_Day_Tomorrow.md` | same but date = `moment().add(1,'day')` | same | same | same |
| `MT_Overview_Day_Today.md` | `_Overview_Day_<MMMDD_YYYY>` | same Day folder | `[[_HUB_Day_<MMMDD_YYYY>]]` | A large **dataviewjs dashboard** — multi-column layout (uses `multi-column-markdown` `start-multi-column` blocks and `dataviewjs`). It walks `dv.current().file.folder.split("/")` to find sibling/ancestor `_HUB_*` notes and renders their tasks grouped by section: Day's Important/ToDo (from the Day HUB), Week + Month Important/ToDo/Daily (from the Week/Month HUBs), Year Short-Term/Long-Term/Goals (from the Year HUB). **This is the most complex/fragile artifact — and the feature deliberately does NOT generate it.** |
| `MT_Overview_Day_Tomorrow.md` | same, date+1 | same | same | same |
| `MT_HUB_Week.md` | `_HUB_Week_<RANGE>` | `ROOT/Year_<Y>/Month_<MMM_Y>/Week_<RANGE>` | `[[_HUB_Month_<MMM_Y>]]` | dataview backlinks table (`TABLE … FROM [[]] SORT file.mtime DESC`) + `## Important` (`- [ ] WT1`), `## ToDo` (`WT2`), `## Daily` (`WT3`) |
| `MT_HUB_Month.md` | `_HUB_Month_<MMM_Y>` | `ROOT/Year_<Y>/Month_<MMM_Y>` | `[[_HUB_Year_<Y>]]` | dataview backlinks table + `## Important` (`MT1`), `## ToDo` (`MT2`), `## Daily` (`MT3`) |
| `MT_HUB_Year.md` | `_HUB_Year_<Y>` | `ROOT/Year_<Y>` | `[[_MOC_Templates]]` | dataview backlinks table + `## Short Term Task` (`YT1`), `## Long Term Task` (`YT2`), `## Goals` (`YT3`) |

**Crucial observations for the refactor:**
- **(Post-refactor week naming — R4/R6):** the week template will produce the NUMBERED filename `_HUB_Week_<WW>_<GGGG>` (ISO), write the human range into the `name:` field, and the Day template's `parentLink` becomes `[[_HUB_Week_<WW>_<GGGG>]]`. The `<RANGE>` forms shown in the table above describe the CURRENT (pre-refactor) templates — keep them as-is mentally, they change on refactor.
- The ONLY thing that varies between "Today" and "Tomorrow" is the date (`moment()` vs `moment().add(1,'day')`). For an arbitrary clicked date these collapse into a single date-parameterized function. The shared module's functions all take a `date` argument.
- After we extract path logic into the shared module, **what remains inside each template body is just two substitutions** (`fileName`, `parentLink`) plus static markdown. That is why "the plugin creates natively" (R1/Q2) is cheap, NOT a reimplementation of Templater: the plugin only needs to write a tiny frontmatter + a fixed body string, no template engine required.
- The frontmatter block for the HUBs is:
  ```yaml
  ---
  name: <fileName>
  description:
  tags:
  rating:
  related_notes:
    - "<parentLink>"
  ---
  ```
  (The Year HUB's body has the dataview table directly after frontmatter; the Day HUB has no dataview table, just the two task sections.)

---

## §6. The Calendar plugin internals (integration surface — verified by grepping `main.js`)

The plugin is a compiled Svelte app. Key symbols found (counts are occurrences, indicating these are real, used handlers):

- **Click / interaction handlers (exist):** `onClickDay`, `onClickWeek`, `onContextMenuDay`, `onContextMenuWeek`, `onHoverDay`, `onHoverWeek`. So **day cells and week-number cells** support left-click, right-click (context menu), and hover. **There is NO `onClickMonth`/`onClickYear`/month/year handler** — confirming month/year clicking is brand-new UI we must add (R2/Q5).
- **Core actions:** `openOrCreateDailyNote`, `openOrCreateWeeklyNote`. These are the functions a day/week click ultimately calls; they currently delegate to the daily-notes-interface. **These are the seams we override/replace** to call our shared create-or-open logic instead.
- **daily-notes-interface usage (the thing we're bypassing):** `createDailyNote`, `getDailyNote`, `getAllDailyNotes`, `getDailyNoteSettings`, `createWeeklyNote`, `getWeeklyNote`, `getWeeklyNoteSettings`. This library models ONE file per period in ONE folder with a moment-format name. It **cannot** express nested `Year/Month/Week/Day` folders or two files per day. Hence "replace, not configure".
- **Visual cues:** the grid uses `getDailyNote()` / `getAllDailyNotes()` plus `wordsPerDot` (250) to render dots and a "has-note" styling on day numbers, and `getWeeklyNote()` for the week column. To make cues reflect Rishabh's real hubs (R2/Q6), the data source feeding these must be swapped to our shared existence check (does `_HUB_Day_<stamp>.md` / `_HUB_Week_<WW>_<GGGG>.md` exist at the computed path).
- **Integration with other plugins / events:** references `periodic-notes` (it cooperates with the Periodic Notes plugin if present) and listens for `periodic-notes:settings-updated`; registers vault events `create`/`delete`/`modify`/`rename(trash)`/`file-open`; listens for `layout-ready` and locale changes; calls `this.app.workspace.trigger(...)`. `VIEW_TYPE_CALENDAR` is the leaf/view type id.
- The calendar **title** renders the month and year as separately-styled spans (in the live UI "Jun" is dark, "2026" is blue) — convenient, because making each span independently clickable for Month-HUB / Year-HUB is a natural, small UI change.

**VERIFIED (R3) by deeper grep of `main.js`:**
- **Week number = ISO week** (`isoWeek`): the grid shows **W23 for Mon 1 Jun 2026** = exactly ISO week 23 → a clicked week is reproducible via `date.isoWeek()` + `date.isoWeekYear()` (`GGGG`). (`DEFAULT_WEEKLY_NOTE_FORMAT` constant is `gggg-[W]ww`, but the clicked column uses the ISO computation given Monday start.)
- **Cue rendering** uses `wordsPerDot` (250) → `numDots`, plus `has-note`/`active` classes and `dot-container`. **DECISION (R5/Q14): binary "hub exists" highlight** — repoint the cue to simply check whether the period's hub exists at the configured path (drop the word-count dots).
- **Title** renders month + year as two separate Svelte text nodes — so adding independent click handlers to "Jun" and "2026" is a small, clean change in the forked source.

**Packaging decision (R3): FORK source + rebuild** (see §8/Q7).

---

## §7. Architecture & design (the chosen approach, in detail)

### The core tension (why something had to give)
"Templater untouched" + "calendar creates for an ARBITRARY clicked date" + "zero duplication" cannot all be true at once. The templates hardcode `moment()` (now); a clicked date (say, three weeks ago) cannot reach that code without EITHER changing the template OR injecting the date through some global hack OR duplicating the path math in the plugin. Round 1 resolved this: **we refactor the templates' internals while preserving their output** (R1/Q1).

### The chosen design (LOCKED by R1 + R2)
1. **One shared "calendar-core" module** (plain JavaScript) is the single source of truth. It exports PURE, date-parameterized functions:
   - `WEEK_START_ISO = 1` (the Monday constant; C5).
   - `weekRangeFor(date) → "MMMDD-DD_YYYY" | "MMMDD-MMMDD_YYYY"` (§4 algorithm).
   - `dayPaths(date)`, `weekPaths(date)`, `monthPaths(date)`, `yearPaths(date)` — each returns an object like:
     ```
     { folderPath, fileName, destPath, parentLink, bodyKind }
     ```
     where `destPath = folderPath + "/" + fileName`, `parentLink` per §4, and `bodyKind` identifies which static body/frontmatter to emit (day/week/month/year).
   - A helper to compute "does the HUB for this date/period already exist?" (for create-or-open AND for visual cues).
   - (Optionally) the static body templates for each period, so the plugin can write them without Templater. (Open question §14: keep bodies in the module, or in the `.md` templates, or both — must avoid duplicating them.)
2. **The Templater templates become thin.** Their `<%* %>` heads call the shared module (defaulting the date to `now`) instead of recomputing paths inline. Their bodies stay the same. Output stays byte-identical (C2).
3. **The Calendar plugin consumes the same module** to (a) compute the target path for a clicked period, (b) check existence, (c) create-or-open natively, and (d) feed visual cues.
4. **Click behavior (uniform):** every click — day, week, month, year — does exactly: `p = <period>Paths(date); if exists(p.destPath) open(p.destPath); else { ensureFolders(p.folderPath); create(p.destPath, frontmatter+body); open(p.destPath); }`. Day click's open target is the Day HUB (R2/Q4). No Overview is ever created/opened by a click.

### Where the shared CONFIG and LOGIC live (RESOLVED R3 — plugin-owned, settings-driven)
Per R3/Q9, the **forked Calendar plugin is the single home** of:
- **CONFIG** — exposed in the plugin's Settings tab, persisted in its `data.json`. Configurable fields (initial set; finalize in §14): output ROOT folder; per-period **template source paths** (day/week/month/year HUB); week-start (Monday); week-naming scheme (range vs ISO-number, pending R4); confirm-before-create; etc.
- **LOGIC** — the path/naming functions (`weekRangeFor`/`isoWeek`, `dayPaths/weekPaths/monthPaths/yearPaths`, existence check, START-month rule) live in the plugin and are exposed as a small **public API** (e.g. `app.plugins.plugins.calendar.api.dayPaths(date)` + a `createOrOpen(period, date)` helper).
- **BODY** — stays in the `.md` template files; the plugin reads the file at the configured path, strips the Templater head, substitutes the two tokens.

**Templater consumes the same things (refactor, don't break):** each `MT_*` template's `<%* %>` head is rewritten to call the plugin API (which reads the plugin settings) instead of recomputing paths inline; the body is unchanged. So Templater and the plugin share ONE config + ONE logic + ONE body source. Trade-off: templates require the Calendar plugin to be enabled (accepted by the user for centralized, polished settings).

### Code-organization principles (R5 directive — follow strictly; see C7)
- **One config home:** a single settings module/schema holds ALL configuration (output root, template paths, week-start, week-naming, confirm-modal, cue style, …), surfaced in one Settings tab, persisted in `data.json`. No scattered constants.
- **One path/naming module:** all date→path/name logic (`weekRangeFor`, ISO week, START-month rule, week-resolver if adopted) in a single module exposed as the plugin API; templates call it too (no duplication).
- **Single declaration points:** a **context-menu registry** — one file declaring each menu item (label, when-shown) → pointing to its handler — so "what's in the menus" is answerable from one place. Same for commands.
- **Body single-sourced:** bodies stay in the template `.md` files; the plugin reads them (no second copy).
- **Modularity:** separate concerns (config, path-logic, note create/open, UI/handlers, cue-rendering, optional migration) into clearly-named, minimally-coupled modules. Best coding practices throughout.

### Scope added by Round 2
- **Month/Year header clicks** = new Svelte UI in the title bar (R2/Q5).
- **Visual cues from real hubs** = swap the grid's existence data source to the shared check (R2/Q6).
- Both increase how much we touch the plugin's UI → informs the packaging decision (§9 Q3).

---

## §8. Decisions log (every grilling round — verbatim where useful)

### Round 1 — architecture spine — ASKED & ANSWERED 2026-06-04 — LOCKED

**Q1. Template handling.** *How do we get path logic out of `moment()`-hardcoded templates so a clicked date can drive them, with zero duplication?*
- Options offered: (a) **Refactor internals, preserve behavior** — extract path logic into one shared module, templates call it (default = now); (b) Strict no-touch templates — leave them byte-for-byte, calendar injects date via a global hack or duplicates logic; (c) Templates become pure body — move ALL logic (incl. create/move) to the module.
- **ANSWER: (a) Refactor internals, preserve behavior.**
- Rationale: only route to true zero-duplication while keeping the exact Templater output and manual workflow.

**Q2. Who physically creates the file(s) on click.**
- Options: (a) **Native in the plugin** — plugin makes folders + file and fills the (now trivial) placeholders itself, no Templater at click time; (b) Delegate to Templater — plugin asks Templater's API to run the template for the clicked date (needs date injected via transient global state; awkward for multiple files).
- **ANSWER: (a) Native in the plugin.**
- Rationale: after path extraction the body is just two substitutions, so native creation is cheap and gives full control over sequencing + existence checks, with no run-time Templater dependency.

**KEY SIMPLIFICATION (user-initiated, in place of answering Q3).** Verbatim:
> "what if you let me manually create the overview note. clicking only creates the hub note in all cases?? will this solve this? so i will take care of the overview manually."
- **DECISION: a click creates the period's HUB note ONLY** (day/week/month/year). The **Overview** day-note is **NOT** created or opened by clicking — Rishabh makes it manually via Templater, as today.
- Effect: every click is uniform (create-or-open exactly one hub). The plugin never has to render the complex `dataviewjs` Overview dashboard (the most fragile artifact). Strictly more DRY and less fragile.
- Note: auto-creating the Overview later is a small add-on using the same module if ever wanted.
- **Side info:** Rishabh will keep creating the Overview manually.

**Q3. How to package the plugin code change.** Options were: patch bundled `main.js` / fork source + build / separate companion plugin.
- **ANSWER: ⏳ NOT YET ANSWERED** — user redirected to the hub-only simplification instead. **Re-ask in Round 3**, now informed by R2 scope (header UI + cue rewiring both touch Svelte → likely favors fork+build or DOM-companion over a raw bundle patch).

### Round 2 — behavior & scope — ASKED & ANSWERED 2026-06-04 — LOCKED

**Q4. Day-click open target** (since clicks create only the HUB, but an Overview may exist).
- Options: (a) Overview-if-exists-else-HUB; (b) **Always the Day HUB**.
- **ANSWER: (b) Always the Day HUB.** Every day click opens the Day HUB, never auto-opens the Overview. Simplest, fully uniform with week/month/year. (Open the Overview manually when wanted.)

**Q5. Month/Year triggers (new UI).**
- Options: (a) **Make the header clickable** ("Jun"→Month HUB, "2026"→Year HUB); (b) Commands/buttons; (c) Defer (day+week first).
- **ANSWER: (a) Make the header clickable.** Targets the **currently displayed** month/year in the calendar view (not "today"). Requires adding click handlers to the title spans (new Svelte UI).

**Q6. Visual cues.**
- Options: (a) **Yes — cues reflect real hub notes** via the shared existence check; (b) Turn cues off; (c) Defer.
- **ANSWER: (a) Yes, use real hubs.** A day/week/month/year cell shows its "has-note" indicator iff its `_HUB_*` note actually exists at the computed path. (Open sub-question §14: do the multi-dots still mean word-count, and of which note? Or just a binary "exists" indicator?)

**Adjacent feedback captured this round:** see §0 HARD RULE — user reprimanded the assistant for insufficient detail; this plan was rewritten to be exhaustive in response.

### Round 3 — packaging, week placement, body source — ASKED & ANSWERED 2026-06-04

**Q7. Packaging the plugin change.** Options: fork+build / DOM-companion / patch bundle.
- **ANSWER: ✅ Fork source + rebuild.** Clone Liam Cain's TS/Svelte source, edit click handlers + add clickable month/year header + repoint the cue data source, rebuild `main.js`, commit the rebuilt artifact into the vault. Implies a Node build toolchain (desktop dev).
- Notes: upstream is `liamcain/obsidian-calendar-plugin`, which depends on `obsidian-calendar-ui` (the Svelte components for the title + day/week cells) and `obsidian-daily-notes-interface`. We may need to also fork/vendor parts of `obsidian-calendar-ui` to add the header clicks and change cue logic. Verify exact repo/build steps before starting (§14).

**Q8. Cross-month/cross-year week placement.**
- **ANSWER: ✅ START-month rule (LOCKED).** A week and ALL its days live under the week's START month/year folder. Fixes the latent fragmentation bug (§11).
- **NEW IDEA from user (verbatim):**
  > "START-month rule works for me. but i was wondering.. that everything except the week has a unique identifier. eg. day (ofc has unique day number), month (has unique month name) and year (has [number] of the year). but only this week is a range.. this is odd.. what if you use the same method as the calendar plugin instead. i.e. you start using week number. we will follow the start month rule with that. but now, the name of the HUB week file (and corresponding folder) will be something like `_HUB_Week_<week_number>_<year>`. you will see that each note contains a name front matter. the corresponding name can contain the _HUB_Week_Apr27-May03_2026 format for easy search?. if i want to know what week contains (which dates) - the calendar view already does that for easy glance. what do you think?? tell me.. i am open and i am not stubborn"
  - **ASSISTANT OPINION (honest, recorded):** Idea is sound and VERIFIED feasible. The Calendar plugin uses **ISO week numbers** (`isoWeek`) — confirmed because it shows **W23 for the week of Mon 1 Jun 2026** = ISO week 23. So `date.isoWeek()` + ISO week-year `date.isoWeekYear()` (token `GGGG`) reproduces the clicked number exactly (Week 18 = Apr27–May03; Week 1 = Dec29 2025–Jan04 2026).
    - **Pros:** (1) conceptual uniformity (every period = one scalar id); (2) CLEANS the cross-year mess (`_HUB_Week_01_2026` unambiguous vs the range that already produced a hand-truncated legacy folder); (3) aligns with the calendar's own model; (4) keep the human range in `name:` for search → best of both.
    - **Costs/decisions:** (1) **Existing ~10 weeks use the range format**; switching → new=number/old=range = DRIFT unless we MIGRATE (rename week folders+files AND update every `related_notes: [[_HUB_Week_<range>]]` link in day hubs + the week hub `name:`). Doable, dry-runnable, git-backed, but touches existing notes/links. (2) **Boundary oddity:** ISO week-year can differ from the start month's year (Week 1 2026 starts Dec 2025), so `Week_01_2026` would sit under `Year_2025/Month_Dec_2025/` — unambiguous but the "oddness" just moves. (3) Pick exact format: `Week_18_2026` vs `Week_W18_2026` vs padding.
    - **Recommendation:** I lean **switch to ISO week number + migrate**, because it satisfies BOTH uniformity AND the user's top value (no drift) after one safe migration. If the user prefers zero risk, keep the range (already fully consistent; oddness is cosmetic). **Decision deferred to Round 4 (Q10).**

**Q9. Where the note BODY lives (avoid duplication).**
- **ANSWER: ✅ "Templates stay source; plugin reads them."** The plugin reads the configured `.md` template file, strips the `<%* … -%>` head, substitutes `<% fileName %>` + `<% parentLink %>`, and writes the note. The template file remains the single source of body content.
- **NEW REQUIREMENT from user (verbatim):**
  > "ok. i like the option 'Templates stay source; plugin reads them'. however, i want things like this customizable in the settings of the new calendar plugin. eg. what is the source path of template.. etc. overall, it should not be that you break the templater method.. you just refactor it (if needed) so it still works.. but now has shared data with other.. that shared data is manually specified in the settings of the calendar plugin - and can be changed if needed to a new template or any other file. so the thing is not redundant, avoids duplication, but is still robust and polished."
  - **INTERPRETATION → architecture refinement (see §7):** The forked Calendar plugin becomes the HOME of shared CONFIG (Settings UI + `data.json`): output root, per-period template source paths, week-start, week-naming scheme, etc. It also exposes shared LOGIC as a small plugin API. **Templater is not broken — it is refactored minimally:** the templates' `<%* %>` heads call the plugin API (which reads the same settings), so config/paths are shared, not duplicated; bodies stay in the template files (paths configurable). Net: ONE config (settings) + ONE logic (API) + ONE body source (template files). Robust, polished, DRY. **Accepted trade-off:** templates now depend on the Calendar plugin being enabled.

### Round 4 — week naming, confirm modal, right-click/hover — ASKED & ANSWERED 2026-06-04

**Q10. Week naming scheme.**
- **ANSWER: ✅ ISO week number, NEW WEEKS ONLY (no migration). ⚠️ [SUPERSEDED by R6/Q16 → migrate ALL weeks to ISO; see Round 6 below. Kept here for history.]** New week HUBs use `_HUB_Week_<WW>_<GGGG>` (ISO week + ISO week-year), folder `Week_<WW>_<GGGG>`; the human range is kept in the `name:` frontmatter for search. (Original R4 intent: leave existing range-named weeks as-is → both forms coexist. R6 replaced this with a full migration to a single scheme.)
- **CONSEQUENCE THE USER SHOULD BLESS (raised as R5/Q13):** because folders are nested and a week may already exist under the OLD range name, the plugin MUST resolve an existing week folder/hub (under EITHER naming) before creating, or it creates a SECOND week folder for the same week and fragments that week's days. Mostly only matters when revisiting PAST weeks that have legacy folders; brand-new (June 2026+) weeks are clean. See §11 INV-5 and §9/Q13.
- Format detail (confirm R5/Q15): zero-padded `01`..`53` recommended; year = ISO week-year `GGGG`, so a Dec-start week reads `Week_01_2026` even though it sits under `Year_2025/Month_Dec_2025` by the START-month rule.

**Q11. Confirm-before-create modal.**
- **ANSWER: ✅ Make it a SETTING, default ON, with corrected wording** (names the actual hub being created, not "Daily Note"). User can disable for instant creation.

**Q12. Right-click context menu + hover preview.**
- **ANSWER: ✅ Wire both.** Right-click a day/week cell → context menu with extra actions — notably **Create/Open the Overview note** (the natural home for Overview, since left-click is the HUB), plus quality-of-life items (reveal in file explorer, open the week/month/year HUB, etc.). Hover → Obsidian's native page-preview of the hub. Exact menu items finalized at implementation (§14).

### Round 5 — dup-week guard, cue style, week format + ARCHITECTURE directive — ASKED & ANSWERED 2026-06-04

**Q13. Duplicate-week safeguard (consequence of new-only).**
- **ANSWER (as given): "Accept the risk"** — always use the numbered name even if a legacy range-named folder exists.
- **⚠️ FLAGGED CONFLICT (being reconciled — see R6/Q16):** this directly permits the duplicate/fragmented week folders the user earlier called **"the worst possible failure for this vault" (C4)**. Concretely: clicking a PAST week that already has a legacy `Week_<range>` folder would create a NEW empty `Week_<WW>_<GGGG>` hub beside it (not open the existing one), and new days in that week would nest in the new folder → the week's days split across two folders. Brand-new (June 2026+) weeks are unaffected. Because this contradicts a stated hard constraint, the assistant is surfacing it once more with a cheap fix rather than silently proceeding. **→ RESOLVED in Round 6/Q16: MIGRATE all weeks to ISO (single scheme, no resolver, C4 honored).**

**Q14. Cue style.**
- **ANSWER: ✅ Binary "hub exists" highlight.** A cell is marked iff its hub note exists; no word-count dots. Cheapest + unambiguous.

**Q15. Week-number format.**
- **ANSWER: ✅ Zero-padded** → folder `Week_01_2026`, file `_HUB_Week_18_2026` (two-digit ISO week + ISO week-year). Sorts correctly in the file explorer.

**ARCHITECTURE DIRECTIVE from user (verbatim) — applies to the whole build:**
> "I want the overall architecture to make sense... it should not be that things are scattered around so much that it becomes unmanageable. For example all the configurations — it should not be that they are scattered at unknown location somewhere — they should all be in one place... things get manageable. For example options in the context menu — there should be one file that can help to figure out what the context menus are, then it can refer to relevant functions... as long as the architecture makes sense, they are modular and manageable without code duplication... use the best coding practices while writing the architecture."
- Captured as **C7** (§2) and **Code-organization principles** (§7). Key asks: ONE place for all config; single declaration points (e.g. a context-menu registry file → handlers); modular; no duplication; best practices.

### Round 6 — reconcile Q13 vs C4 — ASKED & ANSWERED 2026-06-04 — LOCKED

**Q16. Reconcile "accept the risk" (Q13) against C4 ("duplicate week folders = worst failure").**
- **ANSWER: ✅ MIGRATE old weeks instead.** Adopt ISO week-number naming for ALL weeks and convert the existing legacy range-named weeks to it. Result: a SINGLE week-naming scheme vault-wide → no resolver needed, no drift, C4 fully honored. **This SUPERSEDES R4/Q10's "new-weeks-only"** → it is now "ISO number for ALL weeks, WITH a one-time migration."
- **Migration requirements (LOCKED):** (1) **git commit / backup FIRST.** (2) **Dry-run that prints exactly what will change** (every folder/file rename + every link update) for user review BEFORE applying. (3) **Link-preserving:** rename via Obsidian's `app.fileManager.renameFile` (auto-updates wikilinks like `related_notes: [[_HUB_Week_<range>]]` → `[[_HUB_Week_<WW>_<GGGG>]]`) — ideally a one-time command INSIDE the forked plugin so it runs in-app and keeps links intact. (4) Set each migrated week's `name:` frontmatter to the human range (search). (5) START-month rule applies to placement.
- **Migration SCOPE caveat (impl detail, §14):** 2026 weeks are clean range-format and migrate cleanly. The **2025 legacy weeks are inconsistent** (`Week_Nov_10-16_2025` underscore, `Week_Oct_27-2_2025`, `_HUB_Nov_2025`, `_HUB_Successful_Week_*`, plus `Schedule_*`/`Success_Parameters_*` day files) and are risky to auto-parse. Recommended: the dry-run FLAGS anything not cleanly parseable and the user decides per item (migrate / leave / hand-fix); never blindly rename ambiguous legacy items.

---

## §9. Decisions — RESOLVED in R3 + still open

**Resolved in Round 3 (detail in §8):**
- [x] **Packaging → FORK source + rebuild.**
- [x] **Cross-month/year week PLACEMENT → START-month rule.**
- [x] **Body source → template files; plugin reads them; template paths configurable in plugin settings.**
- [x] **Shared config/logic home → the forked plugin (Settings UI + public API); Templater calls the API.** (Supersedes the earlier "Templater user-script vs global" question.)

**Resolved in Round 4 (detail §8):**
- [x] **Week naming → ISO week number** (human range kept in `name:`). *(R4 initially said "new-weeks-only + resolver"; SUPERSEDED by R6 → migrate ALL weeks to ISO, single scheme, NO resolver.)*
- [x] **Confirm modal → a setting, default ON, corrected wording.**
- [x] **Right-click + hover → wire both** (context menu hosts Overview actions; hover preview).

**Resolved in Round 5 (detail §8):**
- [x] **Cue style → binary "hub exists" highlight.**
- [x] **Week-number format → zero-padded `Week_01_2026` / `_HUB_Week_18_2026` (ISO week + ISO week-year).**
- [~] **Duplicate-week safeguard → user said "accept the risk"; FLAGGED as conflicting with C4; reconciling in R6/Q16.**
- [x] **Architecture directive → C7 (§2) + Code-organization principles (§7): one config home, single declaration points, modular, no duplication, best practices.**

**Resolved in Round 6 (detail §8):**
- [x] **Q16 → MIGRATE old weeks to ISO numbering.** Single week scheme vault-wide; no resolver; C4 honored. Supersedes "new-only".

**Remaining items — DECIDED defaults baked in (so an autonomous `/goal` run does NOT stall; user may override any of these at any time):**
- [x] **Settings fields v1 (DEFAULT):** output root (`4_Archives/ARCHIVED_Projects`) · 4 template source paths (day/week/month/year HUB → the current `MT_HUB_*` files) · week-start (Monday) · confirm-before-create toggle (ON) · cues on/off (ON).
- [x] **Context-menu items v1 (DEFAULT):** "Create/Open Overview note" · "Open Week HUB" · "Open Month HUB" · "Open Year HUB" · "Reveal in file explorer" — declared in ONE registry file (C7).
- [x] **Desktop-only (DEFAULT): yes** (build + Node module + fileManager migration). Revisit mobile later.
- [x] **Migration scope (DEFAULT):** auto-migrate cleanly-parseable range weeks; dry-run FLAGS inconsistent 2025 items for the user (never blind-rename). **Delegated to a SUBAGENT, low-priority / step-2 (Q3, §12).**
- [ ] User may override any default above before/while building.

---

## §10. Side information captured (append freely; never drop user asides)

- **(R1)** User will create the **Overview** note manually via Templater; the calendar must NEVER create it. Every click creates only the period's HUB note.
- **(R2/Q5)** Month/Year clicks target the **currently displayed** month/year of the calendar view, not necessarily today.
- **(R2 feedback)** User demands exhaustive, self-contained documentation (see §0). Treat this as a standing instruction for all future edits to this plan.
- **(env)** Today is 2026-06-04. The live calendar screenshot showed June 2026, week-numbers column present (W 23–28), Monday-first, and a "New Daily Note" confirmation modal — consistent with `data.json`.
- **(config gotcha)** Templater `user_scripts_folder` is empty today; using a Templater user script requires setting it.
- **(legacy)** 2025 folders use older inconsistent names; do not emulate, probably do not migrate.
- **(R3/Q8)** User proposed naming weeks by **week number** (like the calendar) instead of a date range, for conceptual uniformity, keeping the range in the `name:` frontmatter for search. User explicitly open-minded ("i am open and i am not stubborn"). Verified the calendar uses ISO week numbers (Jun 1 2026 = W23). Decision in R4.
- **(R3/Q9)** User wants the new plugin to have a **Settings UI** where shared data (template source paths, output root, etc.) is configured and changeable. Principle (his words): "don't break the Templater method, just refactor it so it shares data; the shared data is specified in the calendar plugin's settings; not redundant, avoids duplication, robust and polished."
- **(R3/Q9)** Implies Templater templates will call the plugin's API/settings (templates depend on the plugin being enabled) — accepted trade-off.
- **(R3 verified)** Calendar uses ISO week (`isoWeek`); cue rendering uses `wordsPerDot`/`numDots`/`has-note`/`active`/`dot-container`; title is two text nodes (month + year) → separately clickable.
- **(R4/Q10 → SUPERSEDED by R6/Q16)** User initially chose ISO numbers for NEW weeks only (no migration, accepting a seam); in R6 he switched to **migrating ALL weeks to ISO** (single scheme, no resolver). See the R6 bullet below — this R4 line is kept only for history.
- **(R4/Q12)** Overview note gets its home on the **right-click menu** (left-click stays HUB-only).
- **(R5/Q14,Q15)** Cue = binary "hub exists" highlight; week format = zero-padded `Week_01_2026`.
- **(R5/Q13)** User said "accept the risk" of duplicate week folders — FLAGGED because it conflicts with the user's own C4 ("worst failure"); being reconciled (R6/Q16).
- **(R5 architecture directive — verbatim in §8):** ONE place for all config; single declaration points (e.g. a context-menu registry file → handlers); modular; no duplication; best coding practices. → C7 + §7 code-org principles.
- **(R6/Q16)** User chose to **MIGRATE old weeks** to ISO numbering (over accept-risk or resolver) → single scheme vault-wide, honoring C4. Migration must be git-backed, dry-run, link-preserving.
- (add more here as the user shares context…)

---

## §11. Invariants & failure modes (must hold / must never happen)

- [ ] **INV-1 (name parity).** The plugin's computed folder/file names MUST equal Templater's for every date. Encode the §4 test vectors as an actual self-check; run mentally/automatically before shipping. A mismatch silently forks the hierarchy.
- [ ] **INV-2 (create-or-open, never throw/dupe).** On click: exists → open; missing → create+open. Never throw, never create a `_HHmm`-suffixed duplicate. (Opposite of the templates' `AUTO_UNIQUE_ON_EXISTS=false` throw behavior.)
- [ ] **INV-3 (one logic).** Editing the shared module changes BOTH Templater and plugin output identically. Any change must be re-validated against §4 examples.
- [ ] **INV-4 (week start).** Monday everywhere (`weekStart: "monday"` ↔ `WEEK_START_ISO: 1`).
- [ ] **INV-5 (single week scheme + safe migration) — RESOLVED R6.** After R6/Q16 there is ONE week-naming scheme (ISO number) vault-wide, so C4 is honored with NO resolver. The one-time migration of legacy range-named weeks MUST be: git-backed, dry-run-reviewed, and link-preserving (rename via `app.fileManager.renameFile` so `related_notes` wikilinks auto-update). Ambiguous/inconsistent 2025 legacy items must be flagged in the dry-run for manual decision, never blindly renamed.
- [ ] **FAILURE MODE — LATENT BUG IN THE CURRENT TEMPLATES (cross-month week fragmentation).** The **Day** template nests a day under `Month_<the day's OWN month>`, while the **Week** template nests the week hub under `Month_<the week's reference month>`. For a cross-month week like `Apr27-May03_2026`: days Apr27–30 resolve their month-folder to `Month_Apr_2026`, but days May01–03 resolve to `Month_May_2026` — yet they share the SAME `Week_Apr27-May03_2026` folder name. Result: **TWO `Week_Apr27-May03_2026` folders** (one under Apr, one under May), and the week HUB lives in only one of them, so the Overview's folder-walking (which expects the week/month hub as ancestors) breaks for the "wrong-month" days. This has NOT yet triggered on disk only because no cross-boundary days were created. **The shared module MUST pick ONE rule and apply it to BOTH day and week placement.** **RULE (LOCKED R3): a week and ALL of its days live under the week's START month/year folder** (so the whole week subtree is contiguous and the hub is always the day's ancestor). E.g. a May-01 day in the Apr27–May03 week lands under `Month_Apr_2026`, NOT `Month_May_2026`. The shared logic enforces this for both Templater and the plugin.
- [ ] **EDGE CASE — cross-year week.** E.g. Mon 29 Dec 2025 → Sun 04 Jan 2026: `weekRangeFor` yields `Week_Dec29-Jan04_2026` (end-year = 2026), but the Year/Month folder is ambiguous (Dec is 2025). On disk the legacy `Week_Dec29-31_2025` was hand-truncated — NOT the formula's output — so there is no trustworthy precedent. Must be decided + encoded (consistent with the START-month rule: start is Dec 2025 → folder `Year_2025/Month_Dec_2025/`, week name `Week_Dec29-Jan04_2026`).

---

## §12. Implementation checklist (execute once implementation is authorized — a `/goal` "implement" invocation IS that authorization, per the GOAL-MODE CONTRACT; then run via §15.1 RUNBOOK)

Phase A — Shared config + logic (single source of truth), inside the forked plugin:
- [ ] Build the forked plugin's **Settings UI + config schema** (output root, per-period template source paths, week-start, week-naming scheme, confirm-modal, etc.) — the home of shared config (R3/Q9).
- [ ] Implement `WEEK_START_ISO`, `weekRangeFor`/`isoWeek`, `dayPaths/weekPaths/monthPaths/yearPaths`, existence check, and the START-month placement rule (§11); expose as a small public API.
- [ ] Encode §4 test vectors and verify.
- [ ] Implement ISO `isoWeek()`/`isoWeekYear()` week naming for ALL weeks (zero-padded). Build a one-time **migration command** (in the plugin): dry-run report → git-backed, link-preserving rename (`app.fileManager.renameFile`) of legacy range-named weeks → set `name:` to the human range; flag inconsistent 2025 items for manual review (INV-5).
  - **⚠️ MIGRATION IS DELEGATED TO A SUBAGENT and is LOW-PRIORITY / step-2 (user directive, Q3).** The MAIN agent must NOT spend its context running the migration. `4_Archives/ARCHIVED_Projects/Year_2026` is **already its own git repo** → commit there before migrating (safety). If a subagent cannot be launched, **DEFER migration entirely to a later step** — it does NOT block the feature (new weeks are ISO-named natively).
  - **Interim safeguard while migration is deferred:** keep the plugin's week existence-check legacy-aware (if an old range-named week hub exists for the clicked week, OPEN it rather than create an ISO duplicate) so C4 is not violated during the gap. (Cheap; OPEN-only, not the full resolver.)

Phase B — Refactor templates (preserve output, C2):
- [ ] Rewrite each `MT_*` `<%* %>` head to call the shared module (date defaults to now). Keep bodies identical.
- [ ] Diff output for several dates (incl. cross-month + cross-year) against pre-refactor output → must be byte-identical.

Phase C — Calendar plugin (per packaging decision Q3):
- [ ] Replace `openOrCreateDailyNote`/`openOrCreateWeeklyNote` (or their effect) with: compute via shared module → create-or-open the HUB → open it. Day opens Day HUB (Q4).
- [ ] Add clickable Month/Year in the header → create-or-open Month/Year HUB for the displayed period (Q5).
- [ ] Repoint visual cues at the shared existence check (Q6); decide dot semantics.
- [ ] Honor the confirm-modal decision (R4/Q11); fix wording if kept; expose as a setting.
- [ ] Wire/skip right-click + hover per R4/Q12.

Phase D — Verify & document:
- [ ] Manual test matrix: new day, existing day, week (same-month + cross-month), month, year, cross-year week; verify open-vs-create, no duplicate folders, cues correct.
- [ ] Write a short README (in the plugin folder or vault) describing the shared module + how Templater and the calendar both use it, so it's maintainable.

---

## §13. Goal acceptance checklist (definition of done)

- [ ] Click a day → creates `_HUB_Day_<stamp>` at the correct nested path (matching §4) if missing, opens the Day HUB; existing → just opens. Overview never auto-created.
- [ ] Click a week number → creates/opens the correct `_HUB_Week_<WW>_<GGGG>` (ISO).
- [ ] Click the month in the header → creates/opens the correct `_HUB_Month_<MMM_YYYY>` for the displayed month.
- [ ] Click the year in the header → creates/opens the correct `_HUB_Year_<YYYY>` for the displayed year.
- [ ] Visual cues reflect REAL hub notes (day/week/month/year).
- [ ] Manual Templater triggering still works and produces byte-identical output.
- [ ] Exactly ONE place defines path/naming logic — verified no duplication between Templater and the plugin.
- [ ] No duplicate/fragmented week or day folders for cross-month/cross-year cases (START-month rule applied consistently).
- [ ] ONE week-naming scheme vault-wide (ISO number); legacy weeks migrated link-preservingly (dry-run reviewed, git-backed); no broken `related_notes` links post-migration.
- [ ] Behavior verified against the §4 date→name test vectors.

---

## §14. Open technical questions for the implementer (capture, resolve before/with coding)

1. **RESOLVED (R3):** config + logic live in the forked plugin (Settings UI + public API); Templater calls the API. Remaining: define the exact public API surface and the settings schema.
2. **Where do the static bodies live** (Day/Week/Month/Year frontmatter+content) so they're not duplicated? Options: (i) keep bodies in the `.md` templates and have the plugin read+substitute them; (ii) move bodies into the shared module as strings and have templates emit them too; (iii) accept that bodies live in templates and the plugin emits an equivalent minimal body. Must not create two diverging copies of a body.
3. **START-month placement rule** for cross-month/cross-year weeks — confirm and encode (changes where boundary-day files land vs the current latent bug).
4. **Cue rendering** under the new data source — binary "exists" vs word-count dots; performance of ~42 existence checks per rendered month (use `metadataCache`/`vault.getAbstractFileByPath` rather than async disk stat where possible).
5. **RESOLVED (R3): fork+build.** Remaining: confirm the upstream repo (`liamcain/obsidian-calendar-plugin`) + whether `obsidian-calendar-ui` must also be forked for the header/cue Svelte changes; where source lives; git hygiene for the rebuilt `main.js`.
6. **Confirm modal** (R4/Q11 — setting, default ON) and **context menu/hover** (R4/Q12 — wire both): finalize the exact context-menu item list (Overview create/open, reveal in explorer, open ancestor hubs, …).
7. **Desktop-only** acceptance (assumed yes; build + dev).
8. **Week-number format** (padding: `01` vs `1` vs `W01`) — R5/Q15. **Cue semantics** (binary "exists" vs word-count dots) — R5/Q14.
9. **Migration (R6)** details: parse each legacy range → ISO number; link-preserving rename via `app.fileManager.renameFile`; dry-run report for review; git backup; per-item handling of inconsistent 2025 names (flag, don't blindly rename).

---

## §15. Build, test & deploy procedure (answers "where / how, and how is it tested before 'done'")

**Locations (proposed; confirm at kickoff):**
- **Source fork lives OUTSIDE the vault, at `/home/cam/Documents/GitHub/`** (user-specified): clone/fork into `/home/cam/Documents/GitHub/obsidian-calendar-plugin` and **vendor** the `calendar-ui` Svelte components into it. NOT inside `.obsidian/plugins/` (keeps `node_modules`/source out of the vault).
- **Build output deploys INTO the vault plugin folder:** copy the built `main.js` (+ `manifest.json`, `styles.css`) into `/home/cam/Applications/obsidian_rysabh_github/.obsidian/plugins/calendar/`. (Obsidian loads only those files; it ignores source.)
- Investigation this session used a throwaway clone at `/tmp/cal-src/` (safe to delete).

**Toolchain — Node 24 via nvm (CRITICAL for autonomous runs).** The user's env has **Node 24.13.0** (nvm) + npm 11.6.2. BUT a non-interactive agent shell defaults to **system Node 12** (`/usr/bin/node`) and does NOT auto-load nvm; calling the nvm `npm` by full path ALSO fails (its shebang re-resolves to system node 12 → "Cannot find module 'node:path'"). **So every build/test Bash command MUST first source nvm:**
```
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; nvm use 24
```
…then `node`=v24.13.0, `npm`=11.6.2. Build tool = Rollup (`rollup -c`) + `rollup-plugin-svelte` + `@rollup/plugin-typescript`.
**VERIFIED under Node 24 (this session):** `npm install` (659 pkgs) + the FULL `npm run build` (svelte-check → eslint → rollup) **succeeded, exit 0, produced a 141 KB `main.js`.** Only non-fatal warnings: `@rollup/plugin-typescript` warns on the `obsidian` master typings (`get file()` getters) under the pinned TS 4.2 — harmless; optionally bump `typescript` to silence. (It also built on fallback Node 12.) → Reliable for an autonomous run **provided nvm/Node 24 is loaded first**; if the lint gate ever misbehaves, `npx rollup -c` (skips lint) still produces the artifact.

**How it gets TESTED before "done" (layered — full UI clicking needs Obsidian, so we test what we can headlessly):**
1. **Compiles:** `rollup -c` succeeds → `main.js` produced. (Hard gate.)
2. **Unit tests (highest-risk logic):** Jest (the repo already uses jest) over the path/naming module — assert the §4 date→name **test vectors**, INCLUDING cross-month (`2026-05-01 → Week_18_2026` under `Month_Apr`) and cross-year (`2025-12-29 → Week_01_2026` under `Year_2025`). A bug here silently fragments folders, so it MUST be unit-tested in Node independent of Obsidian.
3. **Headless smoke (optional):** a Node script importing the compiled path + body-render that prints what WOULD be created for sample clicks (no Obsidian).
4. **In-app verification (needs Obsidian):** load in this vault, reload, click a known day/week/month/year → verify correct hub created at the right path + opens; existing → just opens; cues light; context menu + Overview action work. This step needs Obsidian running.

**DEFINITION OF DONE (autonomous-safe):** §13 acceptance + steps 1–3 green + artifacts deployed + a printed manual-verification checklist for step 4. (An autonomous `/goal` run gets the code to "builds clean + unit tests pass + deployed"; the final UI click-through is a short manual check by the user, unless we wire an Electron/automation harness.)

---

### §15.1 RUNBOOK — exact ordered steps for the `/goal` agent (medium reasoning)
> **EVERY Bash step that builds/tests MUST start by loading Node 24** (the shell otherwise uses system Node 12):
> `export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; nvm use 24`

0. **Load Node 24** (above); confirm `node -v` → `v24.x`.
1. **Get source** into `/home/cam/Documents/GitHub/`: `git clone https://github.com/liamcain/obsidian-calendar-plugin` (this is the fork; set remote/name as desired). The throwaway clone at `/tmp/cal-src/obsidian-calendar-plugin` (already `npm install`ed) may be copied instead to save time. Plan to **vendor** the `calendar-ui` components (also cloned at `/tmp/cal-src/obsidian-calendar-ui`).
2. **Phase A — shared module + jest tests** (§7 API, §4 vectors, §11 rules): `npm install`; implement the path/naming + config + create-or-open API; write jest tests asserting the §4 vectors **including** `2026-05-01 → Week_18_2026/Month_Apr` and `2025-12-29 → Week_01_2026/Year_2025`; `npx jest` must be green. Update BUILD STATUS.
3. **Phase B — refactor the 7 `MT_*` templates** to call the plugin API (date defaults to now); confirm body/output unchanged for sample dates (§2 C2).
4. **Phase C — plugin code** (§16 seams): replace `openOrCreate{Daily,Weekly}Note` (view.ts) + `io/{daily,weekly}Notes.ts` with hub create/open; add `hubExistsSource` (sources/) + disable `wordCount`; extend context menu via `fileMenu.ts` (+ a one-file menu registry, C7); reword + setting-gate the modal (modal.ts); add config fields (settings.ts); **vendor `calendar-ui`** and add clickable month/year title (Nav/Month component) wired through new `onClickMonth`/`onClickYear` props.
5. **Build & deploy:** `npx rollup -c`; **FIRST back up the existing `.obsidian/plugins/calendar/main.js` → `main.js.pre-fork.bak`** (revert path), THEN copy the new `main.js` (+ `manifest.json`, `styles.css`) into `/home/cam/Applications/obsidian_rysabh_github/.obsidian/plugins/calendar/`.
6. **Verify:** jest green; optional Node smoke-print of computed paths; write the step-4 manual click-through checklist for the user; update BUILD STATUS.
7. **Migration (step-2, SUBAGENT ONLY — Q3):** delegate to a subagent; do NOT run inline / do NOT spend main context. `…/Year_2026` is a git repo → commit first. If no subagent available, DEFER (feature already works for new weeks; interim legacy-aware OPEN keeps C4 safe).

**After each phase, UPDATE the "BUILD STATUS / NEXT ACTION" line at the top** so a compacted/fresh agent resumes correctly.

---

## §16. Source compatibility — VERIFIED by cloning upstream (2026-06-04)

Cloned `liamcain/obsidian-calendar-plugin` + `liamcain/obsidian-calendar-ui` and read the seams. **The plan is confirmed implementable** with clean, modular hooks (matches C7). What an implementer needs:

**Plugin repo (`obsidian-calendar-plugin` — TS + Svelte + Rollup + jest):**
- `src/view.ts` → **`openOrCreateDailyNote(date, inNewSplit)`** + **`openOrCreateWeeklyNote(...)`** are THE seams. Today: `existing = getDailyNote/getWeeklyNote(date, store)`; if none → `tryToCreate*Note`; else open. **Replace the existence check + create with our hub API** (compute Day/Week HUB path → exists? open : create+open). Day opens the Day HUB (Q4).
- `src/io/dailyNotes.ts` / `weeklyNotes.ts` → `tryToCreate*Note` use `createDailyNote` + `getDailyNoteSettings().format`, and the **hardcoded confirm modal** ("New Daily Note" / "File X does not exist…"). Replace with hub creation (read template body, substitute `fileName`/`parentLink`, write at our path) + the corrected, setting-gated modal (Q11).
- **Cues = a pluggable "sources" system.** `src/ui/sources/` has `wordCount.ts`, `streak.ts`, `tasks.ts`, `tags.ts`; `view.onOpen` builds `sources = [...]` and fires a `calendar:open` event so sources are extensible. → Implement a **`hubExistsSource`** (binary highlight, Q6/Q14) as ONE module; drop/disable `wordCount`. Modular + matches C7.
- `src/ui/fileMenu.ts` + `view.onContextMenuDay/Week` → the **context-menu** home (Q12). NOTE: today the context menu shows only if a note already exists — we'll extend it (and allow Overview *create*). Put items in ONE registry file (C7).
- `src/ui/modal.ts` → `createConfirmationDialog` (the confirm dialog to reword + gate by setting).
- `src/settings.ts` → `ISettings` + settings tab → **add our config fields here** (C7: one config home).
- Hover: `view.onHoverDay/Week` fire `link-hover` with the daily-note path → repoint to the hub path.

**UI repo (`obsidian-calendar-ui` — the Svelte components, a SEPARATE npm package):**
- The month/year **title** is rendered here (`components/Nav.svelte` → `Month.svelte`), and `Day.svelte` / `WeekNum.svelte` carry click handlers; the plugin passes `eventHandlers` down. To add **clickable month/year (Q5)** we must edit these components → so we **fork OR vendor `obsidian-calendar-ui`**, not just the plugin. **RECOMMENDED: vendor the UI components into the fork** (copy them into the plugin source tree, build together) → one repo, full control, satisfies C7 "one place".
- **⚠️ VERSION CAVEAT:** the plugin pins `obsidian-calendar-ui@0.3.12`, but the cloned master is **0.4.0** (structures differ slightly — 0.4.0 has `Month.svelte`/`MetadataResolver.svelte`; the build warned about type-only exports). When forking, either check out the matching **0.3.12** tag or deliberately upgrade to 0.4.0 and adapt. The shipped `main.js` we have was built from 0.3.12.

**Net:** ~90% of the work is in the PLUGIN repo (modular, low-risk). The ONLY piece needing the UI-components fork/vendor is the month/year title click. **No blockers found.**

---

## §17. BLOCKERS LOG (the `/goal` run APPENDS here; keeps blockers/decisions-deferred from being lost to compaction)

> Format per entry: `[phase] what failed → what was tried → status (open/worked-around/needs-user)`. Mirror the headline into the top BUILD STATUS line.

- (none yet — design phase only; implementation not started)

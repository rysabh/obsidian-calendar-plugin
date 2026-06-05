import type { Moment } from "moment";

/**
 * ============================================================================
 * periods.ts — the Calendar plugin's path/naming logic for the time hierarchy.
 * ============================================================================
 *
 * This is the plugin's OWN, self-contained copy of the rules. The Templater
 * `MT_*` templates keep their own independent copy in their heads — the two are
 * fully decoupled (neither imports or depends on the other). They agree because
 * both implement the same documented rules below; a small, deliberate amount of
 * duplication that keeps each system robust on its own and usable in any vault.
 *
 * Everything here is PURE: it takes a `Moment` and a `PathConfig` and returns
 * strings. No Obsidian, no I/O, no `window` — which is what lets the jest
 * suite in ./__tests__/periods.spec.ts assert the canonical date->name vectors
 * headlessly.
 *
 * LOCKED RULES (plan §4, §11, R3/R6):
 *  - Week starts Monday (WEEK_START_ISO = 1).
 *  - START-month rule: a week AND all of its days live under the calendar
 *    Year/Month of the week's *start* (the Monday), so a cross-month/cross-year
 *    week's subtree is contiguous. e.g. Fri 2026-05-01 nests under Month_Apr_2026
 *    because its ISO week started Mon 2026-04-27.
 *  - Week folder/file use the ISO week number + ISO week-year, zero-padded:
 *    `Week_<WW>_<GGGG>` / `_HUB_Week_<WW>_<GGGG>` (e.g. Week_18_2026, Week_01_2026).
 *    The human range (`Apr27-May03_2026`) is preserved in the note's `name:`
 *    frontmatter (the `nameField` below) for search.
 *  - Year/Month folders use the start date's CALENDAR year; the week segment
 *    uses the ISO week-year. These can differ at year boundaries: Mon 2025-12-29
 *    -> `Year_2025/Month_Dec_2025/Week_01_2026/`.
 */

/** ISO weekday the week starts on: 1 = Monday (constraint C5). */
export const WEEK_START_ISO = 1;

/** All four period kinds. Used to pick the template body in settings/noteService. */
export type PeriodKind = "day" | "week" | "month" | "year";

/** The only configuration the path logic needs: where the hierarchy is rooted. */
export interface PathConfig {
  /** Output root, e.g. "4_Archives/ARCHIVED_Projects". */
  root: string;
}

/** Everything a consumer needs to create-or-open one period's HUB note. */
export interface PeriodPaths {
  /** Folder that should contain the note (full ancestor chain). */
  folderPath: string;
  /** Base file name WITHOUT extension, e.g. "_HUB_Day_Apr29_2026". */
  fileName: string;
  /** `${folderPath}/${fileName}` — the destination WITHOUT extension. */
  destPath: string;
  /** Wikilink to the parent HUB, written into `related_notes:` frontmatter. */
  parentLink: string;
  /**
   * Value for the note's `name:` frontmatter field. Equals `fileName` for every
   * period EXCEPT week, where it keeps the human range (e.g.
   * "_HUB_Week_Apr27-May03_2026") so weeks remain searchable by date.
   */
  nameField: string;
  /** Which period this is (selects the template body). */
  bodyKind: PeriodKind;
}

/** Zero-pad a number to 2 digits ("5" -> "05"). */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * The Monday of the ISO week that `date` falls in.
 * (moment's `isoWeekday(1)` can jump forward to next Monday, so we step back a
 * week if it landed after `date`; mirrors the original template logic.)
 */
export function startOfIsoWeek(date: Moment): Moment {
  const start = date.clone().isoWeekday(WEEK_START_ISO);
  if (start.isAfter(date, "day")) {
    start.subtract(7, "days");
  }
  return start;
}

/**
 * Human-readable week range string used ONLY for the week's `name:` field and
 * for parsing legacy folder names during migration. Verbatim grammar from the
 * original templates (plan §4):
 *   - same calendar month -> "MMMDD-DD_YYYY"      (e.g. "Mar23-29_2026")
 *   - cross month         -> "MMMDD-MMMDD_YYYY"   (e.g. "Apr27-May03_2026")
 * The year is the END day's year (e.g. Dec29 2025 -> Jan04 2026 -> "..._2026").
 */
export function weekRange(date: Moment): string {
  const start = startOfIsoWeek(date);
  const end = start.clone().add(6, "days"); // Mon -> Sun inclusive
  if (start.format("YYYYMM") === end.format("YYYYMM")) {
    return `${start.format("MMMDD")}-${end.format("DD")}_${end.format("YYYY")}`;
  }
  return `${start.format("MMMDD")}-${end.format("MMMDD")}_${end.format(
    "YYYY"
  )}`;
}

/** ISO week id used in folder/file names: `<WW>_<GGGG>`, e.g. "18_2026". */
export function weekId(date: Moment): string {
  const start = startOfIsoWeek(date);
  return `${pad2(start.isoWeek())}_${start.isoWeekYear()}`;
}

export function yearPaths(date: Moment, cfg: PathConfig): PeriodPaths {
  const y = date.format("YYYY");
  const folderPath = `${cfg.root}/Year_${y}`;
  const fileName = `_HUB_Year_${y}`;
  return {
    folderPath,
    fileName,
    destPath: `${folderPath}/${fileName}`,
    parentLink: `[[_MOC_Templates]]`,
    nameField: fileName,
    bodyKind: "year",
  };
}

export function monthPaths(date: Moment, cfg: PathConfig): PeriodPaths {
  const y = date.format("YYYY");
  const monthStamp = date.format("MMM_YYYY");
  const folderPath = `${cfg.root}/Year_${y}/Month_${monthStamp}`;
  const fileName = `_HUB_Month_${monthStamp}`;
  return {
    folderPath,
    fileName,
    destPath: `${folderPath}/${fileName}`,
    parentLink: `[[_HUB_Year_${y}]]`,
    nameField: fileName,
    bodyKind: "month",
  };
}

export function weekPaths(date: Moment, cfg: PathConfig): PeriodPaths {
  const start = startOfIsoWeek(date);
  // START-month rule: placement comes from the week's start date.
  const y = start.format("YYYY");
  const monthStamp = start.format("MMM_YYYY");
  const id = weekId(start);
  const folderPath = `${cfg.root}/Year_${y}/Month_${monthStamp}/Week_${id}`;
  const fileName = `_HUB_Week_${id}`;
  return {
    folderPath,
    fileName,
    destPath: `${folderPath}/${fileName}`,
    parentLink: `[[_HUB_Month_${monthStamp}]]`,
    // name: keeps the human range for search.
    nameField: `_HUB_Week_${weekRange(start)}`,
    bodyKind: "week",
  };
}

export function dayPaths(date: Moment, cfg: PathConfig): PeriodPaths {
  const start = startOfIsoWeek(date);
  // START-month rule: Year/Month/Week segments come from the week start...
  const y = start.format("YYYY");
  const monthStamp = start.format("MMM_YYYY");
  const id = weekId(start);
  // ...but the Day segment is the clicked day itself.
  const dayStamp = date.format("MMMDD_YYYY");
  const folderPath = `${cfg.root}/Year_${y}/Month_${monthStamp}/Week_${id}/Day_${dayStamp}`;
  const fileName = `_HUB_Day_${dayStamp}`;
  return {
    folderPath,
    fileName,
    destPath: `${folderPath}/${fileName}`,
    parentLink: `[[_HUB_Week_${id}]]`,
    nameField: fileName,
    bodyKind: "day",
  };
}

/**
 * The day's Overview note (`_Overview_Day_<stamp>`), which lives beside the Day
 * HUB in the same Day folder. NOT created by a left-click — only via the
 * right-click context menu (R2/R4). Its parent is the Day HUB.
 */
export function overviewPaths(date: Moment, cfg: PathConfig): PeriodPaths {
  const day = dayPaths(date, cfg);
  const dayStamp = date.format("MMMDD_YYYY");
  const fileName = `_Overview_Day_${dayStamp}`;
  return {
    folderPath: day.folderPath,
    fileName,
    destPath: `${day.folderPath}/${fileName}`,
    parentLink: `[[_HUB_Day_${dayStamp}]]`,
    nameField: fileName,
    bodyKind: "day",
  };
}

/** Dispatch helper: compute the paths for any period kind. */
export function pathsFor(
  period: PeriodKind,
  date: Moment,
  cfg: PathConfig
): PeriodPaths {
  switch (period) {
    case "day":
      return dayPaths(date, cfg);
    case "week":
      return weekPaths(date, cfg);
    case "month":
      return monthPaths(date, cfg);
    case "year":
      return yearPaths(date, cfg);
    default:
      throw new Error(`Unknown period kind: ${period as string}`);
  }
}

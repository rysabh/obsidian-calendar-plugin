/**
 * types.ts — the plugin's shared data types (no logic, no I/O).
 *
 * `ISettings` is the single config schema (persisted in data.json). Its DEFAULT
 * values live in ONE place, `src/defaults.ts`, so "change the defaults before
 * building" has an obvious home.
 */
import type { ILocaleOverride, IWeekStartOption } from "src/vendor/calendar-ui";

/** The four clickable periods. */
export type PeriodKind = "day" | "week" | "month" | "year";

/** moment.js format strings, one per stamp. (The user's `Jun04`→`Jun_04` knobs.) */
export interface DateFormats {
  day: string; // e.g. "MMMDD_YYYY" -> Jun04_2026
  month: string; // e.g. "MMM_YYYY"   -> Jun_2026
  year: string; // e.g. "YYYY"       -> 2026
  weekId: string; // e.g. "WW_GGGG"  -> 23_2026 (ISO week + ISO week-year)
}

/** Optional seed-template path per period (used only when `useTemplates`). */
export interface HubTemplates {
  day: string;
  week: string;
  month: string;
  year: string;
  overview: string;
}

/**
 * One frontmatter field the plugin COMPUTES (overwrites) in a new note. Every
 * field NOT listed is copied from the template verbatim. `formula` is a pattern
 * of `{tokens}` (see src/core/resolve.ts). `list: true` targets the first
 * `- "[[..]]"` item under `field:` (a YAML list, e.g. related_notes); otherwise
 * the scalar `field: value` line is replaced.
 */
export interface ComputedField {
  field: string;
  formula: string;
  list?: boolean;
}

export interface ISettings {
  // --- Calendar grid (display only) ---
  weekStart: IWeekStartOption;
  localeOverride: ILocaleOverride;
  showWeeklyNote: boolean;

  // --- Output & behaviour ---
  /** Top folder for all hubs. Blank = vault root. */
  hubRoot: string;
  /** Create the Year/Month/Week/Day folders. Off = all hubs sit in the root. */
  createHierarchy: boolean;
  shouldConfirmBeforeCreate: boolean;
  /** Highlight a day/week cell whose hub note exists. */
  showHubCues: boolean;

  // --- Naming (basics) ---
  /** Exact text in front of every hub name. Blank => `Day_…` (no leading "_"). */
  prefix: string;
  formats: DateFormats;
  /** ISO weeks (Mon, 01–53). Off = locale week numbers. */
  useIsoWeeks: boolean;

  // --- Templates (optional) ---
  /** Off = new notes are created empty (named only); no templates shipped. */
  useTemplates: boolean;
  hubTemplates: HubTemplates;

  // --- Advanced: naming patterns (per period) ---
  /** Folder path relative to root (used only when `createHierarchy`). */
  folderPatterns: Record<PeriodKind, string>;
  /** File name (without extension). */
  filePatterns: Record<PeriodKind, string>;
  /** Which frontmatter fields to compute, per period. */
  computedFields: Record<PeriodKind, ComputedField[]>;

  // --- The day Overview note (right-click only) ---
  overviewFile: string;
  overviewFields: ComputedField[];
}

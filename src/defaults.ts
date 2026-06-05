/**
 * defaults.ts — THE single home of every default setting value.
 *
 * This is the one file to edit if you want to change the plugin's out-of-the-box
 * behaviour before building. Defaults are deliberately GENERIC (vault-agnostic):
 * a fresh install works in any vault, and nobody's personal layout is baked into
 * the code. To reproduce a specific layout (e.g. the author's), change these in
 * the settings tab instead — see `0_Inbox/adjust_calendar_settting.md`.
 *
 * Naming tokens available in patterns/formulas (see src/core/resolve.ts):
 *   {prefix} {Kind} {year} {month} {day} {weekId} {weekRange}  + {date:FORMAT}
 */
import type { ISettings } from "src/types";

export const DEFAULTS: ISettings = {
  // Calendar grid (display only)
  weekStart: "monday",
  localeOverride: "system-default",
  showWeeklyNote: true,

  // Output & behaviour
  hubRoot: "Calendar", // generic; blank = vault root
  createHierarchy: true,
  shouldConfirmBeforeCreate: true,
  showHubCues: true,

  // Naming (basics)
  prefix: "_HUB_", // blank => names like `Day_Jun04_2026`
  formats: {
    day: "MMMDD_YYYY", // Jun04_2026
    month: "MMM_YYYY", // Jun_2026
    year: "YYYY", // 2026
    weekId: "WW_GGGG", // 23_2026 (ISO week + ISO week-year)
  },
  useIsoWeeks: true,

  // Templates (optional, OFF by default — none are shipped)
  useTemplates: false,
  hubTemplates: { day: "", week: "", month: "", year: "", overview: "" },

  // Advanced: per-period naming patterns
  folderPatterns: {
    day: "Year_{year}/Month_{month}/Week_{weekId}/Day_{day}",
    week: "Year_{year}/Month_{month}/Week_{weekId}",
    month: "Year_{year}/Month_{month}",
    year: "Year_{year}",
  },
  filePatterns: {
    day: "{prefix}Day_{day}",
    week: "{prefix}Week_{weekId}",
    month: "{prefix}Month_{month}",
    year: "{prefix}Year_{year}",
  },
  computedFields: {
    day: [
      { field: "name", formula: "{prefix}Day_{day}" },
      { field: "related_notes", formula: "[[{prefix}Week_{weekId}]]", list: true },
    ],
    week: [
      // the FILE uses {weekId} (23_2026), but the NAME keeps the human range.
      { field: "name", formula: "{prefix}Week_{weekRange}" },
      { field: "related_notes", formula: "[[{prefix}Month_{month}]]", list: true },
    ],
    month: [
      { field: "name", formula: "{prefix}Month_{month}" },
      { field: "related_notes", formula: "[[{prefix}Year_{year}]]", list: true },
    ],
    year: [
      { field: "name", formula: "{prefix}Year_{year}" },
      { field: "related_notes", formula: "[[_MOC_Templates]]", list: true },
    ],
  },

  // The day Overview note (right-click only; lives in the Day folder)
  overviewFile: "_Overview_Day_{day}",
  overviewFields: [
    { field: "name", formula: "_Overview_Day_{day}" },
    { field: "related_notes", formula: "[[{prefix}Day_{day}]]", list: true },
  ],
};

/** Keys we recognise — used to PRUNE stale/unknown keys from a saved data.json. */
export const KNOWN_SETTING_KEYS = Object.keys(DEFAULTS) as Array<keyof ISettings>;

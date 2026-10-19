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
  prefix: "@", // blank => names like `Day-Jun04-2026`
  formats: {
    day: "MMMDD-YYYY", // Jun04-2026
    month: "MMM-YYYY", // Jun-2026
    year: "YYYY", // 2026
    weekId: "WW-GGGG", // 23-2026 (ISO week + ISO week-year)
  },
  useIsoWeeks: true,

  // Templates (optional, OFF by default — none are shipped)
  useTemplates: false,
  hubTemplates: { day: "", week: "", month: "", year: "", overview: "" },

  // Advanced: per-period naming patterns
  folderPatterns: {
    day: "Year-{year}/Month-{month}/Week-{weekId}/Day-{day}",
    week: "Year-{year}/Month-{month}/Week-{weekId}",
    month: "Year-{year}/Month-{month}",
    year: "Year-{year}",
  },
  filePatterns: {
    day: "{prefix}Day-{day}",
    week: "{prefix}Week-{weekId}",
    month: "{prefix}Month-{month}",
    year: "{prefix}Year-{year}",
  },
  computedFields: {
    day: [
      { field: "name", formula: "\"{prefix}Day-{day}\"" },
      { field: "related_notes", formula: "[[{prefix}Week-{weekId}]]", list: true },
    ],
    week: [
      // the FILE uses {weekId} (23-2026), but the NAME keeps the human range.
      { field: "name", formula: "\"{prefix}Week-{weekRange}\"" },
      { field: "related_notes", formula: "[[{prefix}Month-{month}]]", list: true },
    ],
    month: [
      { field: "name", formula: "\"{prefix}Month-{month}\"" },
      { field: "related_notes", formula: "[[{prefix}Year-{year}]]", list: true },
    ],
    year: [
      { field: "name", formula: "\"{prefix}Year-{year}\"" },
      { field: "related_notes", formula: "[[_MOC_Templates]]", list: true },
    ],
  },

  // The day Docket note (right-click only; lives in the Day folder)
  overviewFile: "{prefix}Docket-{day}",
  overviewFields: [
    { field: "name", formula: "\"{prefix}Docket-{day}\"" },
    { field: "related_notes", formula: "[[{prefix}Day-{day}]]", list: true },
  ],
};

/** Keys we recognise — used to PRUNE stale/unknown keys from a saved data.json. */
export const KNOWN_SETTING_KEYS = Object.keys(DEFAULTS) as Array<keyof ISettings>;

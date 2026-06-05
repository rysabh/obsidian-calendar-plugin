import { existsSync, readFileSync } from "fs";

import moment from "moment";

import { DEFAULTS } from "src/defaults";
import type { ISettings } from "src/types";

import { applyFields } from "../fields";
import { planFor } from "../plan";

// Exercise the WHOLE create-content path (plan -> read real template ->
// applyFields) against the author's actual ST_ templates when present. This is
// the headless equivalent of "click create": it proves the file that WOULD be
// written has the right path, name, and parent link.
const STATIC_DIR =
  "/home/cam/Applications/obsidian_rysabh_github/4_Archives/z___TEMPLATES/Obsidian_Templates/Static";

const present = existsSync(`${STATIC_DIR}/ST_HUB_Day.md`);

(present ? describe : describe.skip)(
  "end-to-end create content (real ST_ templates)",
  () => {
    const settings: ISettings = {
      ...DEFAULTS,
      hubRoot: "4_Archives/ARCHIVED_Projects",
      useTemplates: true,
      hubTemplates: {
        ...DEFAULTS.hubTemplates,
        day: `${STATIC_DIR}/ST_HUB_Day.md`,
        week: `${STATIC_DIR}/ST_HUB_Week.md`,
      },
    };

    test("Day note: path + filled frontmatter, body preserved", () => {
      const date = moment("2026-06-04", "YYYY-MM-DD", true);
      const plan = planFor("day", date, settings);
      expect(plan.destPath).toBe(
        "4_Archives/ARCHIVED_Projects/Year_2026/Month_Jun_2026/Week_23_2026/Day_Jun04_2026/_HUB_Day_Jun04_2026"
      );
      const seed = readFileSync(`${STATIC_DIR}/ST_HUB_Day.md`, "utf8");
      const content = applyFields(seed, plan.fields);
      expect(content).toContain("name: _HUB_Day_Jun04_2026");
      expect(content).toContain('  - "[[_HUB_Week_23_2026]]"');
      expect(content).not.toContain("_MOC_Templates");
      expect(content).toContain("## Important"); // body untouched
    });

    test("Week note: file uses id, name keeps the range", () => {
      const date = moment("2026-06-04", "YYYY-MM-DD", true);
      const plan = planFor("week", date, settings);
      expect(plan.fileName).toBe("_HUB_Week_23_2026");
      const seed = readFileSync(`${STATIC_DIR}/ST_HUB_Week.md`, "utf8");
      const content = applyFields(seed, plan.fields);
      expect(content).toContain("name: _HUB_Week_Jun01-07_2026");
      expect(content).toContain('  - "[[_HUB_Month_Jun_2026]]"');
    });
  }
);

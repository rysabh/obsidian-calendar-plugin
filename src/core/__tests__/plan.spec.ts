import moment from "moment";

import { DEFAULTS } from "src/defaults";
import type { ISettings } from "src/types";

import { weekRange } from "../anchors";
import { overviewPlan, planFor } from "../plan";

const d = (iso: string) => moment(iso, "YYYY-MM-DD", true);

// A settings object equal to the GENERIC defaults but rooted at the author's
// folder. If planFor reproduces the §4 layout from this, the engine is correctly
// generalised (no vault-specific identity baked into code).
const S: ISettings = { ...DEFAULTS, hubRoot: "4_Archives/ARCHIVED_Projects" };

describe("plan — canonical §4 date->path vectors (generalisation proof)", () => {
  // [input, dayFolder, dayHubFile, weekFolder, monthFolder, yearFolder]
  const vectors: Array<[string, string, string, string, string, string]> = [
    ["2026-04-29", "Day_Apr29_2026", "_HUB_Day_Apr29_2026", "Week_18_2026", "Month_Apr_2026", "Year_2026"],
    ["2026-05-01", "Day_May01_2026", "_HUB_Day_May01_2026", "Week_18_2026", "Month_Apr_2026", "Year_2026"],
    ["2026-03-23", "Day_Mar23_2026", "_HUB_Day_Mar23_2026", "Week_13_2026", "Month_Mar_2026", "Year_2026"],
    ["2026-01-28", "Day_Jan28_2026", "_HUB_Day_Jan28_2026", "Week_05_2026", "Month_Jan_2026", "Year_2026"],
    ["2026-06-04", "Day_Jun04_2026", "_HUB_Day_Jun04_2026", "Week_23_2026", "Month_Jun_2026", "Year_2026"],
    ["2025-12-29", "Day_Dec29_2025", "_HUB_Day_Dec29_2025", "Week_01_2026", "Month_Dec_2025", "Year_2025"],
  ];

  test.each(vectors)(
    "%s -> day/week/month/year",
    (iso, dayFolder, dayHubFile, weekFolder, monthFolder, yearFolder) => {
      const date = d(iso);
      const root = S.hubRoot;

      const day = planFor("day", date, S);
      expect(day.destPath).toBe(
        `${root}/${yearFolder}/${monthFolder}/${weekFolder}/${dayFolder}/${dayHubFile}`
      );
      expect(day.fileName).toBe(dayHubFile);

      // Week placement follows START-month too -> shares month/year folders.
      const week = planFor("week", date, S);
      expect(week.destPath).toBe(
        `${root}/${yearFolder}/${monthFolder}/${weekFolder}/_HUB_${weekFolder}`
      );

      // Month/Year click target the date's OWN month/year (not week-start).
      const ownMonth = `Month_${date.format("MMM_YYYY")}`;
      const ownYear = `Year_${date.format("YYYY")}`;
      expect(planFor("month", date, S).destPath).toBe(
        `${root}/${ownYear}/${ownMonth}/_HUB_${ownMonth}`
      );
      expect(planFor("year", date, S).destPath).toBe(
        `${root}/${ownYear}/_HUB_${ownYear}`
      );
    }
  );
});

describe("plan — computed fields (name + parent link)", () => {
  test("day fields: name + related_notes to the ISO week", () => {
    const fields = planFor("day", d("2026-04-29"), S).fields;
    expect(fields).toContainEqual({ field: "name", value: "_HUB_Day_Apr29_2026", list: false });
    expect(fields).toContainEqual({ field: "related_notes", value: "[[_HUB_Week_18_2026]]", list: true });
  });

  test("week name keeps the human range; file uses the id", () => {
    const wk = planFor("week", d("2026-05-01"), S);
    expect(wk.fileName).toBe("_HUB_Week_18_2026");
    expect(wk.fields).toContainEqual({
      field: "name",
      value: "_HUB_Week_Apr27-May03_2026",
      list: false,
    });
  });

  test("cross-year day parent points at ISO week 01_2026", () => {
    const fields = planFor("day", d("2025-12-29"), S).fields;
    expect(fields).toContainEqual({ field: "related_notes", value: "[[_HUB_Week_01_2026]]", list: true });
  });

  test("year parent is the literal MOC link", () => {
    const fields = planFor("year", d("2026-06-04"), S).fields;
    expect(fields).toContainEqual({ field: "related_notes", value: "[[_MOC_Templates]]", list: true });
  });
});

describe("plan — settings-driven naming", () => {
  test("Day date format flip Jun04 -> Jun_04 changes every {day} use", () => {
    const flipped: ISettings = {
      ...S,
      formats: { ...S.formats, day: "MMM_DD_YYYY" },
    };
    const day = planFor("day", d("2026-06-04"), flipped);
    expect(day.destPath).toBe(
      "4_Archives/ARCHIVED_Projects/Year_2026/Month_Jun_2026/Week_23_2026/Day_Jun_04_2026/_HUB_Day_Jun_04_2026"
    );
  });

  test("blank prefix yields Day_... (no leading underscore)", () => {
    const noPrefix: ISettings = { ...S, prefix: "" };
    expect(planFor("day", d("2026-06-04"), noPrefix).fileName).toBe("Day_Jun04_2026");
  });

  test("hierarchy off puts the file directly under the root", () => {
    const flat: ISettings = { ...S, createHierarchy: false };
    const day = planFor("day", d("2026-06-04"), flat);
    expect(day.destPath).toBe("4_Archives/ARCHIVED_Projects/_HUB_Day_Jun04_2026");
  });

  test("blank root + hierarchy off creates at the vault root", () => {
    const vaultRoot: ISettings = { ...S, hubRoot: "", createHierarchy: false };
    expect(planFor("day", d("2026-06-04"), vaultRoot).destPath).toBe("_HUB_Day_Jun04_2026");
  });
});

describe("plan — overview note lives beside the Day HUB", () => {
  test("overview path + parent link", () => {
    const ov = overviewPlan(d("2026-06-04"), S);
    expect(ov.destPath).toBe(
      "4_Archives/ARCHIVED_Projects/Year_2026/Month_Jun_2026/Week_23_2026/Day_Jun04_2026/_Overview_Day_Jun04_2026"
    );
    expect(ov.fields).toContainEqual({ field: "related_notes", value: "[[_HUB_Day_Jun04_2026]]", list: true });
  });
});

describe("anchors — weekRange branches", () => {
  test("same-month, cross-month, cross-year", () => {
    expect(weekRange(d("2026-03-23"))).toBe("Mar23-29_2026");
    expect(weekRange(d("2026-04-27"))).toBe("Apr27-May03_2026");
    expect(weekRange(d("2025-12-29"))).toBe("Dec29-Jan04_2026");
  });
});

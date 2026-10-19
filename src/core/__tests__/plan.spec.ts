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
    ["2026-04-29", "Day-Apr29-2026", "@Day-Apr29-2026", "Week-18-2026", "Month-Apr-2026", "Year-2026"],
    ["2026-05-01", "Day-May01-2026", "@Day-May01-2026", "Week-18-2026", "Month-Apr-2026", "Year-2026"],
    ["2026-03-23", "Day-Mar23-2026", "@Day-Mar23-2026", "Week-13-2026", "Month-Mar-2026", "Year-2026"],
    ["2026-01-28", "Day-Jan28-2026", "@Day-Jan28-2026", "Week-05-2026", "Month-Jan-2026", "Year-2026"],
    ["2026-06-04", "Day-Jun04-2026", "@Day-Jun04-2026", "Week-23-2026", "Month-Jun-2026", "Year-2026"],
    ["2025-12-29", "Day-Dec29-2025", "@Day-Dec29-2025", "Week-01-2026", "Month-Dec-2025", "Year-2025"],
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
        `${root}/${yearFolder}/${monthFolder}/${weekFolder}/@${weekFolder}`
      );

      // Month/Year click target the date's OWN month/year (not week-start).
      const ownMonth = `Month-${date.format("MMM-YYYY")}`;
      const ownYear = `Year-${date.format("YYYY")}`;
      expect(planFor("month", date, S).destPath).toBe(
        `${root}/${ownYear}/${ownMonth}/@${ownMonth}`
      );
      expect(planFor("year", date, S).destPath).toBe(
        `${root}/${ownYear}/@${ownYear}`
      );
    }
  );
});

describe("plan — computed fields (name + parent link)", () => {
  test("day fields: name + related_notes to the ISO week", () => {
    const fields = planFor("day", d("2026-04-29"), S).fields;
    expect(fields).toContainEqual({ field: "name", value: '"@Day-Apr29-2026"', list: false });
    expect(fields).toContainEqual({ field: "related_notes", value: "[[@Week-18-2026]]", list: true });
  });

  test("week name keeps the human range; file uses the id", () => {
    const wk = planFor("week", d("2026-05-01"), S);
    expect(wk.fileName).toBe("@Week-18-2026");
    expect(wk.fields).toContainEqual({
      field: "name",
      value: '"@Week-Apr27-May03-2026"',
      list: false,
    });
  });

  test("cross-year day parent points at ISO week 01-2026", () => {
    const fields = planFor("day", d("2025-12-29"), S).fields;
    expect(fields).toContainEqual({ field: "related_notes", value: "[[@Week-01-2026]]", list: true });
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
      "4_Archives/ARCHIVED_Projects/Year-2026/Month-Jun-2026/Week-23-2026/Day-Jun_04_2026/@Day-Jun_04_2026"
    );
  });

  test("blank prefix yields Day-... (no leading prefix)", () => {
    const noPrefix: ISettings = { ...S, prefix: "" };
    expect(planFor("day", d("2026-06-04"), noPrefix).fileName).toBe("Day-Jun04-2026");
  });

  test("hierarchy off puts the file directly under the root", () => {
    const flat: ISettings = { ...S, createHierarchy: false };
    const day = planFor("day", d("2026-06-04"), flat);
    expect(day.destPath).toBe("4_Archives/ARCHIVED_Projects/@Day-Jun04-2026");
  });

  test("blank root + hierarchy off creates at the vault root", () => {
    const vaultRoot: ISettings = { ...S, hubRoot: "", createHierarchy: false };
    expect(planFor("day", d("2026-06-04"), vaultRoot).destPath).toBe("@Day-Jun04-2026");
  });
});

describe("plan — overview note lives beside the Day HUB", () => {
  test("overview path + parent link", () => {
    const ov = overviewPlan(d("2026-06-04"), S);
    expect(ov.destPath).toBe(
      "4_Archives/ARCHIVED_Projects/Year-2026/Month-Jun-2026/Week-23-2026/Day-Jun04-2026/@Docket-Jun04-2026"
    );
    expect(ov.fields).toContainEqual({ field: "related_notes", value: "[[@Day-Jun04-2026]]", list: true });
  });
});

describe("anchors — weekRange branches", () => {
  test("same-month, cross-month, cross-year", () => {
    expect(weekRange(d("2026-03-23"))).toBe("Mar23-29-2026");
    expect(weekRange(d("2026-04-27"))).toBe("Apr27-May03-2026");
    expect(weekRange(d("2025-12-29"))).toBe("Dec29-Jan04-2026");
  });
});

import moment from "moment";

import {
  dayPaths,
  weekPaths,
  monthPaths,
  yearPaths,
  weekRange,
  PathConfig,
} from "../periods";

// moment defaults to a locale that may start the week on Sunday; the path logic
// only uses ISO methods (isoWeekday/isoWeek/isoWeekYear) so it is week-start
// agnostic, but we pin English-ish formatting (MMM => Jan..Dec) which is the
// default `en` locale anyway.
const CFG: PathConfig = { root: "4_Archives/ARCHIVED_Projects" };

const d = (iso: string) => moment(iso, "YYYY-MM-DD", true);

describe("periods — canonical §4 date->name vectors", () => {
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
    "%s -> day/week/month/year folders+files",
    (iso, dayFolder, dayHubFile, weekFolder, monthFolder, yearFolder) => {
      const date = d(iso);
      const day = dayPaths(date, CFG);
      const week = weekPaths(date, CFG);
      const month = monthPaths(date, CFG);
      const year = yearPaths(date, CFG);

      // Full nested day path uses the START-month placement.
      expect(day.destPath).toBe(
        `${CFG.root}/${yearFolder}/${monthFolder}/${weekFolder}/${dayFolder}/${dayHubFile}`
      );
      expect(day.fileName).toBe(dayHubFile);

      // Week placement also follows the START-month rule, so it shares the
      // vector's month/year folders.
      expect(week.destPath).toBe(
        `${CFG.root}/${yearFolder}/${monthFolder}/${weekFolder}/_HUB_${weekFolder}`
      );

      // A MONTH-period click targets the date's OWN calendar month/year (NOT
      // the week-start placement) — these differ from the day-placement folder
      // only at week boundaries (e.g. 2026-05-01 -> Month_May_2026, even though
      // that day nests under Month_Apr_2026).
      const ownMonthFolder = `Month_${date.format("MMM_YYYY")}`;
      const ownYearFolder = `Year_${date.format("YYYY")}`;
      expect(month.destPath).toBe(
        `${CFG.root}/${ownYearFolder}/${ownMonthFolder}/_HUB_${ownMonthFolder}`
      );
      expect(year.destPath).toBe(
        `${CFG.root}/${ownYearFolder}/_HUB_${ownYearFolder}`
      );
    }
  );
});

describe("periods — parentLink wiring (plan §4)", () => {
  test("day -> week, week -> month, month -> year, year -> MOC", () => {
    const date = d("2026-04-29");
    expect(dayPaths(date, CFG).parentLink).toBe("[[_HUB_Week_18_2026]]");
    expect(weekPaths(date, CFG).parentLink).toBe("[[_HUB_Month_Apr_2026]]");
    expect(monthPaths(date, CFG).parentLink).toBe("[[_HUB_Year_2026]]");
    expect(yearPaths(date, CFG).parentLink).toBe("[[_MOC_Templates]]");
  });

  test("cross-year week (2025-12-29) day parentLink points at ISO week", () => {
    expect(dayPaths(d("2025-12-29"), CFG).parentLink).toBe(
      "[[_HUB_Week_01_2026]]"
    );
  });
});

describe("periods — week name: keeps the human range (subtlest branch)", () => {
  test("cross-month week Apr27-May03_2026", () => {
    // every day of the week resolves to the SAME range string.
    expect(weekRange(d("2026-04-29"))).toBe("Apr27-May03_2026");
    expect(weekRange(d("2026-05-01"))).toBe("Apr27-May03_2026");
    expect(weekPaths(d("2026-05-01"), CFG).nameField).toBe(
      "_HUB_Week_Apr27-May03_2026"
    );
  });

  test("cross-year week Dec29-Jan04_2026 (end-year wins)", () => {
    expect(weekRange(d("2025-12-29"))).toBe("Dec29-Jan04_2026");
    expect(weekPaths(d("2025-12-29"), CFG).nameField).toBe(
      "_HUB_Week_Dec29-Jan04_2026"
    );
  });

  test("same-month week Mar23-29_2026", () => {
    expect(weekRange(d("2026-03-23"))).toBe("Mar23-29_2026");
    expect(weekPaths(d("2026-03-23"), CFG).nameField).toBe(
      "_HUB_Week_Mar23-29_2026"
    );
  });
});

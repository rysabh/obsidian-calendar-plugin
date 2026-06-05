import moment from "moment";

import type { Bag } from "../anchors";
import { resolve, unknownTokens } from "../resolve";

const bag: Bag = {
  date: moment("2026-06-04", "YYYY-MM-DD", true),
  values: {
    prefix: "_HUB_",
    Kind: "Day",
    year: "2026",
    month: "Jun_2026",
    day: "Jun04_2026",
    weekId: "23_2026",
    weekRange: "Jun01-07_2026",
  },
};

describe("resolve — token expansion", () => {
  test("expands known tokens", () => {
    expect(resolve("{prefix}Day_{day}", bag)).toBe("_HUB_Day_Jun04_2026");
    expect(resolve("Year_{year}/Month_{month}/Week_{weekId}", bag)).toBe(
      "Year_2026/Month_Jun_2026/Week_23_2026"
    );
    expect(resolve("[[{prefix}Week_{weekId}]]", bag)).toBe("[[_HUB_Week_23_2026]]");
  });

  test("{date:FORMAT} escape hatch uses raw moment formatting", () => {
    expect(resolve("{date:dddd}", bag)).toBe("Thursday");
    expect(resolve("{date:YYYY-MM-DD}", bag)).toBe("2026-06-04");
  });

  test("blank prefix collapses cleanly", () => {
    expect(resolve("{prefix}Day_{day}", { ...bag, values: { ...bag.values, prefix: "" } })).toBe(
      "Day_Jun04_2026"
    );
  });

  test("unknown token is left literal (visible, not dropped)", () => {
    expect(resolve("{prefix}{nope}", bag)).toBe("_HUB_{nope}");
  });
});

describe("resolve — unknownTokens validation", () => {
  test("flags unknown tokens, ignores known and {date}", () => {
    expect(unknownTokens("{prefix}Day_{day}")).toEqual([]);
    expect(unknownTokens("{date:YYYY}")).toEqual([]);
    expect(unknownTokens("{prefix}_{foo}_{bar}")).toEqual(["foo", "bar"]);
  });
});

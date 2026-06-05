import { applyFields, parseFields, serializeFields } from "../fields";
import type { FieldValue } from "../plan";

const TEMPLATE = `---
name:
description:
tags:
rating:
related_notes:
  - "[[_MOC_Templates]]"
---

## Important
- [ ] DT1
`;

const f = (field: string, value: string, list = false): FieldValue => ({
  field,
  value,
  list,
});

describe("applyFields", () => {
  test("replaces name (scalar) and related_notes (list), leaves the rest", () => {
    const out = applyFields(TEMPLATE, [
      f("name", "_HUB_Day_Jun04_2026"),
      f("related_notes", "[[_HUB_Week_23_2026]]", true),
    ]);
    expect(out).toContain("name: _HUB_Day_Jun04_2026");
    expect(out).toContain('  - "[[_HUB_Week_23_2026]]"');
    expect(out).not.toContain("_MOC_Templates");
    // untouched lines survive verbatim
    expect(out).toContain("description:\n");
    expect(out).toContain("## Important\n- [ ] DT1");
  });

  test("a NEW computed field (description) is filled like any other", () => {
    const out = applyFields(TEMPLATE, [f("description", "Day log for Jun04_2026")]);
    expect(out).toContain("description: Day log for Jun04_2026");
  });

  test("fields absent from the template are skipped (no throw)", () => {
    const out = applyFields("just a body, no frontmatter", [f("name", "x")]);
    expect(out).toBe("just a body, no frontmatter");
  });
});

describe("parseFields / serializeFields (settings editor)", () => {
  test("round-trips, marking list fields with []", () => {
    const text =
      "name = {prefix}Day_{day}\nrelated_notes[] = [[{prefix}Week_{weekId}]]";
    const parsed = parseFields(text);
    expect(parsed).toEqual([
      { field: "name", formula: "{prefix}Day_{day}", list: false },
      { field: "related_notes", formula: "[[{prefix}Week_{weekId}]]", list: true },
    ]);
    expect(serializeFields(parsed)).toBe(text);
  });

  test("adding a new field is just adding a line", () => {
    const parsed = parseFields(
      "name = {prefix}Day_{day}\ndescription = {Kind} log for {day}"
    );
    expect(parsed).toContainEqual({
      field: "description",
      formula: "{Kind} log for {day}",
      list: false,
    });
  });

  test("ignores blank lines and lines without '='", () => {
    expect(parseFields("\n  \nname = x\ngarbage\n")).toEqual([
      { field: "name", formula: "x", list: false },
    ]);
  });
});

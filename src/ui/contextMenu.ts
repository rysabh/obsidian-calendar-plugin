import type { Moment } from "moment";
import { App, Menu, Point, TFile } from "obsidian";

import { createOrOpenHub, createOrOpenOverview } from "src/core/noteService";
import { planFor } from "src/core/plan";
import type { ISettings, PeriodKind } from "src/types";

/** Which kind of calendar cell was right-clicked. */
export type CellKind = "day" | "week";

/** Everything a menu item needs to act. */
export interface MenuContext {
  app: App;
  settings: ISettings;
  kind: CellKind;
  /** The clicked date (for a week, the start-of-week date). */
  date: Moment;
}

interface MenuItemDef {
  title: string;
  icon: string;
  /** Omit to always show; return false to hide for this context. */
  isVisible?: (ctx: MenuContext) => boolean;
  handler: (ctx: MenuContext) => void | Promise<void>;
}

/** Reveal a period's HUB note in the file-explorer, if it exists. */
function revealHub(ctx: MenuContext, period: PeriodKind): void {
  const plan = planFor(period, ctx.date, ctx.settings);
  const file = ctx.app.vault.getAbstractFileByPath(`${plan.destPath}.md`);
  if (!file) {
    return;
  }
  const leaf = ctx.app.workspace.getLeavesOfType("file-explorer")[0];
  // revealInFolder is the standard (untyped) file-explorer hook other plugins use.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (leaf?.view as any)?.revealInFolder?.(file as TFile);
}

/**
 * THE single declaration of every right-click menu item (constraint C7): each
 * row is a label + icon + visibility + the handler it dispatches to. To change
 * what the context menus offer, edit ONLY this array.
 */
const MENU_ITEMS: MenuItemDef[] = [
  {
    title: "Create / open Day Overview",
    icon: "documents",
    isVisible: (c) => c.kind === "day",
    handler: (c) => createOrOpenOverview(c.app, c.settings, c.date, false),
  },
  {
    title: "Open Day HUB",
    icon: "calendar-with-checkmark",
    isVisible: (c) => c.kind === "day",
    handler: (c) => createOrOpenHub(c.app, c.settings, "day", c.date, false),
  },
  {
    title: "Open Week HUB",
    icon: "calendar-with-checkmark",
    handler: (c) => createOrOpenHub(c.app, c.settings, "week", c.date, false),
  },
  {
    title: "Open Month HUB",
    icon: "calendar-with-checkmark",
    handler: (c) => createOrOpenHub(c.app, c.settings, "month", c.date, false),
  },
  {
    title: "Open Year HUB",
    icon: "calendar-with-checkmark",
    handler: (c) => createOrOpenHub(c.app, c.settings, "year", c.date, false),
  },
  {
    title: "Reveal Day HUB in file explorer",
    icon: "folder",
    isVisible: (c) => c.kind === "day",
    handler: (c) => revealHub(c, "day"),
  },
  {
    title: "Reveal Week HUB in file explorer",
    icon: "folder",
    isVisible: (c) => c.kind === "week",
    handler: (c) => revealHub(c, "week"),
  },
];

/** Build and show the right-click menu for a day/week cell. */
export function showCellMenu(ctx: MenuContext, position: Point): void {
  const menu = new Menu(ctx.app);
  MENU_ITEMS.filter((def) => !def.isVisible || def.isVisible(ctx)).forEach(
    (def) => {
      menu.addItem((item) =>
        item
          .setTitle(def.title)
          .setIcon(def.icon)
          .onClick(() => def.handler(ctx))
      );
    }
  );
  menu.showAtPosition(position);
}

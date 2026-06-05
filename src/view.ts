import type { Moment } from "moment";
import {
  getDateFromFile,
  getWeeklyNoteSettings,
} from "obsidian-daily-notes-interface";
import { FileView, TFile, ItemView, WorkspaceLeaf } from "obsidian";

import { TRIGGER_ON_OPEN, VIEW_TYPE_CALENDAR } from "src/constants";
import { createOrOpenHub } from "src/core/noteService";
import { dayPaths, weekPaths, PeriodKind } from "src/core/periods";
import type { ISettings } from "src/settings";

import Calendar from "./ui/Calendar.svelte";
import { showCellMenu } from "./ui/contextMenu";
import { activeFile, settings } from "./ui/stores";
import { hubExistsSource } from "./ui/sources/hubExists";

export default class CalendarView extends ItemView {
  private calendar: Calendar;
  private settings: ISettings;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);

    this.openOrCreateDailyNote = this.openOrCreateDailyNote.bind(this);
    this.openOrCreateWeeklyNote = this.openOrCreateWeeklyNote.bind(this);
    this.openOrCreateMonthNote = this.openOrCreateMonthNote.bind(this);
    this.openOrCreateYearNote = this.openOrCreateYearNote.bind(this);

    this.onFileCreated = this.onFileCreated.bind(this);
    this.onFileDeleted = this.onFileDeleted.bind(this);
    this.onFileModified = this.onFileModified.bind(this);
    this.onFileOpen = this.onFileOpen.bind(this);

    this.onHoverDay = this.onHoverDay.bind(this);
    this.onHoverWeek = this.onHoverWeek.bind(this);

    this.onContextMenuDay = this.onContextMenuDay.bind(this);
    this.onContextMenuWeek = this.onContextMenuWeek.bind(this);

    this.registerEvent(this.app.vault.on("create", this.onFileCreated));
    this.registerEvent(this.app.vault.on("delete", this.onFileDeleted));
    this.registerEvent(this.app.vault.on("modify", this.onFileModified));
    this.registerEvent(this.app.workspace.on("file-open", this.onFileOpen));

    this.settings = null;
    // All config lives in the calendar's own settings; re-render on change.
    settings.subscribe((val) => {
      this.settings = val;
      if (this.calendar) {
        this.calendar.tick();
      }
    });
  }

  getViewType(): string {
    return VIEW_TYPE_CALENDAR;
  }

  getDisplayText(): string {
    return "Calendar";
  }

  getIcon(): string {
    return "calendar-with-checkmark";
  }

  onClose(): Promise<void> {
    if (this.calendar) {
      this.calendar.$destroy();
    }
    return Promise.resolve();
  }

  async onOpen(): Promise<void> {
    // Cues come from a single source: does the period's HUB note exist?
    // (binary highlight — replaces the upstream word-count dots, R5/Q14).
    const sources = [hubExistsSource];
    this.app.workspace.trigger(TRIGGER_ON_OPEN, sources);

    this.calendar = new Calendar({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      target: (this as any).contentEl,
      props: {
        onClickDay: this.openOrCreateDailyNote,
        onClickWeek: this.openOrCreateWeeklyNote,
        onClickMonth: this.openOrCreateMonthNote,
        onClickYear: this.openOrCreateYearNote,
        onHoverDay: this.onHoverDay,
        onHoverWeek: this.onHoverWeek,
        onContextMenuDay: this.onContextMenuDay,
        onContextMenuWeek: this.onContextMenuWeek,
        sources,
      },
    });
  }

  // --- Hover previews (target the HUB note path) --------------------------

  private hoverHub(
    period: PeriodKind,
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ): void {
    if (!isMetaPressed) {
      return;
    }
    const paths =
      period === "day"
        ? dayPaths(date, { root: this.settings.hubRoot })
        : weekPaths(date, { root: this.settings.hubRoot });
    this.app.workspace.trigger(
      "link-hover",
      this,
      targetEl,
      paths.fileName,
      `${paths.destPath}.md`
    );
  }

  onHoverDay(date: Moment, targetEl: EventTarget, isMetaPressed: boolean): void {
    this.hoverHub("day", date, targetEl, isMetaPressed);
  }

  onHoverWeek(
    date: Moment,
    targetEl: EventTarget,
    isMetaPressed: boolean
  ): void {
    this.hoverHub("week", date, targetEl, isMetaPressed);
  }

  // --- Right-click menus (declared in contextMenu.ts registry) ------------

  private onContextMenuDay(date: Moment, event: MouseEvent): void {
    showCellMenu(
      { app: this.app, settings: this.settings, kind: "day", date },
      { x: event.pageX, y: event.pageY }
    );
  }

  private onContextMenuWeek(date: Moment, event: MouseEvent): void {
    showCellMenu(
      { app: this.app, settings: this.settings, kind: "week", date },
      { x: event.pageX, y: event.pageY }
    );
  }

  // --- Keep cues fresh when hub files appear/disappear/change -------------

  private affectsHierarchy(file: TFile): boolean {
    return !!this.settings && file.path.startsWith(`${this.settings.hubRoot}/`);
  }

  private onFileCreated(file: TFile): void {
    if (
      this.app.workspace.layoutReady &&
      this.calendar &&
      this.affectsHierarchy(file)
    ) {
      this.calendar.tick();
    }
  }

  private async onFileDeleted(file: TFile): Promise<void> {
    if (this.calendar && this.affectsHierarchy(file)) {
      this.calendar.tick();
    }
  }

  private async onFileModified(file: TFile): Promise<void> {
    if (this.calendar && this.affectsHierarchy(file)) {
      this.calendar.tick();
    }
  }

  public onFileOpen(_file: TFile): void {
    if (this.app.workspace.layoutReady) {
      this.updateActiveFile();
    }
  }

  private updateActiveFile(): void {
    const { view } = this.app.workspace.activeLeaf;

    let file = null;
    if (view instanceof FileView) {
      file = view.file;
    }
    activeFile.setFile(file);

    if (this.calendar) {
      this.calendar.tick();
    }
  }

  public revealActiveNote(): void {
    const { moment } = window;
    const { activeLeaf } = this.app.workspace;

    if (activeLeaf.view instanceof FileView) {
      // Best-effort: if the active note matches the daily/weekly note format,
      // jump the calendar to it. Custom _HUB_ names won't match (a known
      // limitation — see the manual checklist), so this no-ops for them.
      let date = getDateFromFile(activeLeaf.view.file, "day");
      if (date) {
        this.calendar.$set({ displayedMonth: date });
        return;
      }

      const { format } = getWeeklyNoteSettings();
      date = moment(activeLeaf.view.file.basename, format, true);
      if (date.isValid()) {
        this.calendar.$set({ displayedMonth: date });
      }
    }
  }

  // --- Create-or-open seams (all route through the shared core) -----------

  async openOrCreateDailyNote(date: Moment, inNewSplit: boolean): Promise<void> {
    await createOrOpenHub(
      this.app,
      this.settings,
      "day",
      date,
      inNewSplit,
      (f) => activeFile.setFile(f)
    );
  }

  async openOrCreateWeeklyNote(
    date: Moment,
    inNewSplit: boolean
  ): Promise<void> {
    await createOrOpenHub(
      this.app,
      this.settings,
      "week",
      date,
      inNewSplit,
      (f) => activeFile.setFile(f)
    );
  }

  async openOrCreateMonthNote(date: Moment): Promise<void> {
    await createOrOpenHub(this.app, this.settings, "month", date, false, (f) =>
      activeFile.setFile(f)
    );
  }

  async openOrCreateYearNote(date: Moment): Promise<void> {
    await createOrOpenHub(this.app, this.settings, "year", date, false, (f) =>
      activeFile.setFile(f)
    );
  }
}

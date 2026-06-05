import { App, PluginSettingTab, Setting } from "obsidian";
import type { ILocaleOverride, IWeekStartOption } from "src/vendor/calendar-ui";

import type CalendarPlugin from "./main";

/** Per-period STATIC seed-template paths. */
export interface IHubTemplates {
  day: string;
  week: string;
  month: string;
  year: string;
}

export interface ISettings {
  weekStart: IWeekStartOption;
  shouldConfirmBeforeCreate: boolean;

  // ---- Time-hierarchy HUB feature (this fork) ----------------------------
  // ALL of this feature's config lives here, in the calendar plugin's own
  // settings (data.json) — the single source of truth, self-contained so the
  // plugin works in any vault. It is fully independent of the Templater
  // templates: for new-note seed content it reads the STATIC templates below;
  // it computes paths itself (src/core/periods.ts). Nothing is shared with, or
  // depends on, Templater.
  /** Output root for the generated hierarchy. */
  hubRoot: string;
  /** STATIC seed template per period (plain content; the plugin fills name + parent). */
  hubTemplates: IHubTemplates;
  /** STATIC seed template for the day Overview note (right-click only). */
  overviewTemplate: string;
  /** Highlight a day/week cell when its HUB note exists (binary cue). */
  showHubCues: boolean;

  /** Show the week-number column (which makes weeks clickable). */
  showWeeklyNote: boolean;

  localeOverride: ILocaleOverride;
}

// Default STATIC seed templates (this vault). All overridable in settings so
// the plugin works in any vault — these are just sensible starting values.
const STATIC_DIR = "4_Archives/z___TEMPLATES/Obsidian_Templates/Static";

export const DEFAULT_HUB_ROOT = "4_Archives/ARCHIVED_Projects";

export const DEFAULT_HUB_TEMPLATES: IHubTemplates = {
  day: `${STATIC_DIR}/ST_HUB_Day.md`,
  week: `${STATIC_DIR}/ST_HUB_Week.md`,
  month: `${STATIC_DIR}/ST_HUB_Month.md`,
  year: `${STATIC_DIR}/ST_HUB_Year.md`,
};

export const DEFAULT_OVERVIEW_TEMPLATE = `${STATIC_DIR}/ST_Overview_Day.md`;

const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const defaultSettings = Object.freeze({
  shouldConfirmBeforeCreate: true,
  // Monday — the hub hierarchy is ISO/Monday based; keep the grid consistent.
  weekStart: "monday" as IWeekStartOption,

  hubRoot: DEFAULT_HUB_ROOT,
  hubTemplates: DEFAULT_HUB_TEMPLATES,
  overviewTemplate: DEFAULT_OVERVIEW_TEMPLATE,
  showHubCues: true,

  // Show the week-number column so weeks are clickable out of the box.
  showWeeklyNote: true,

  localeOverride: "system-default",
});

export function appHasPeriodicNotesPluginLoaded(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const periodicNotes = (<any>window.app).plugins.getPlugin("periodic-notes");
  return periodicNotes && periodicNotes.settings?.weekly?.enabled;
}

export class CalendarSettingsTab extends PluginSettingTab {
  private plugin: CalendarPlugin;

  constructor(app: App, plugin: CalendarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    this.containerEl.empty();

    // --- Calendar display ---
    this.containerEl.createEl("h3", { text: "Calendar" });
    this.addWeekStartSetting();
    this.addShowWeeklyNoteSetting();
    this.addLocaleOverrideSetting();

    // --- The HUB feature (all config self-contained here) ---
    this.containerEl.createEl("h3", { text: "Time Hierarchy (HUB notes)" });
    this.containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Left-click a day or week number, or the month/year in the header, to " +
        "create (or open) the matching _HUB_ note under the output root. New " +
        "notes are seeded from the static templates below; the plugin fills in " +
        "the note name and parent link. (Independent of Templater.)",
    });
    this.addHubRootSetting();
    this.addHubTemplateSetting("day", "Day HUB seed template");
    this.addHubTemplateSetting("week", "Week HUB seed template");
    this.addHubTemplateSetting("month", "Month HUB seed template");
    this.addHubTemplateSetting("year", "Year HUB seed template");
    this.addOverviewTemplateSetting();
    this.addConfirmCreateSetting();
    this.addShowHubCuesSetting();
  }

  addWeekStartSetting(): void {
    const { moment } = window;

    const localizedWeekdays = moment.weekdays();
    const localeWeekStartNum = window._bundledLocaleWeekSpec.dow;
    const localeWeekStart = moment.weekdays()[localeWeekStartNum];

    new Setting(this.containerEl)
      .setName("Start week on")
      .setDesc(
        "Day the calendar grid starts on. Hub weeks always use ISO (Monday) " +
          "week numbers regardless of this."
      )
      .addDropdown((dropdown) => {
        dropdown.addOption("locale", `Locale default (${localeWeekStart})`);
        localizedWeekdays.forEach((day, i) => {
          dropdown.addOption(weekdays[i], day);
        });
        dropdown.setValue(this.plugin.options.weekStart);
        dropdown.onChange(async (value) => {
          this.plugin.writeOptions(() => ({
            weekStart: value as IWeekStartOption,
          }));
        });
      });
  }

  addShowWeeklyNoteSetting(): void {
    new Setting(this.containerEl)
      .setName("Show week number")
      .setDesc("Add a column with the (clickable) week number.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.showWeeklyNote);
        toggle.onChange(async (value) => {
          this.plugin.writeOptions(() => ({ showWeeklyNote: value }));
        });
      });
  }

  addLocaleOverrideSetting(): void {
    const { moment } = window;
    const sysLocale = navigator.language?.toLowerCase();

    new Setting(this.containerEl)
      .setName("Override locale")
      .setDesc("Use a locale different from the system default.")
      .addDropdown((dropdown) => {
        dropdown.addOption("system-default", `Same as system (${sysLocale})`);
        moment.locales().forEach((locale) => {
          dropdown.addOption(locale, locale);
        });
        dropdown.setValue(this.plugin.options.localeOverride);
        dropdown.onChange(async (value) => {
          this.plugin.writeOptions(() => ({
            localeOverride: value as ILocaleOverride,
          }));
        });
      });
  }

  addHubRootSetting(): void {
    new Setting(this.containerEl)
      .setName("Output root folder")
      .setDesc("Where the Year/Month/Week/Day hierarchy is created.")
      .addText((textfield) => {
        textfield.setPlaceholder(DEFAULT_HUB_ROOT);
        textfield.setValue(this.plugin.options.hubRoot);
        textfield.onChange(async (value) => {
          this.plugin.writeOptions(() => ({
            hubRoot: value || DEFAULT_HUB_ROOT,
          }));
        });
      });
  }

  addHubTemplateSetting(period: keyof IHubTemplates, name: string): void {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(`Static seed note for new ${period} HUB notes.`)
      .addText((textfield) => {
        textfield.setPlaceholder(DEFAULT_HUB_TEMPLATES[period]);
        textfield.setValue(this.plugin.options.hubTemplates[period]);
        textfield.onChange(async (value) => {
          this.plugin.writeOptions((old) => ({
            hubTemplates: {
              ...old.hubTemplates,
              [period]: value || DEFAULT_HUB_TEMPLATES[period],
            },
          }));
        });
      });
  }

  addOverviewTemplateSetting(): void {
    new Setting(this.containerEl)
      .setName("Day Overview seed template")
      .setDesc("Static seed for the day Overview note (right-click menu).")
      .addText((textfield) => {
        textfield.setPlaceholder(DEFAULT_OVERVIEW_TEMPLATE);
        textfield.setValue(this.plugin.options.overviewTemplate);
        textfield.onChange(async (value) => {
          this.plugin.writeOptions(() => ({
            overviewTemplate: value || DEFAULT_OVERVIEW_TEMPLATE,
          }));
        });
      });
  }

  addConfirmCreateSetting(): void {
    new Setting(this.containerEl)
      .setName("Confirm before creating a note")
      .setDesc("Show a confirmation modal before creating a new HUB note.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.shouldConfirmBeforeCreate);
        toggle.onChange(async (value) => {
          this.plugin.writeOptions(() => ({
            shouldConfirmBeforeCreate: value,
          }));
        });
      });
  }

  addShowHubCuesSetting(): void {
    new Setting(this.containerEl)
      .setName("Highlight days/weeks with a HUB note")
      .setDesc("Mark a calendar cell when its HUB note already exists.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.showHubCues);
        toggle.onChange(async (value) => {
          this.plugin.writeOptions(() => ({ showHubCues: value }));
        });
      });
  }
}

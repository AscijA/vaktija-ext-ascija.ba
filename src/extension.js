// extension.js
/*
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

const GETTEXT_DOMAIN = 'vaktija-extension';

// derive on-disk extension path
const extFile = Gio.File.new_for_uri(import.meta.url);
const extDir = extFile.get_parent();
const EXTENSION_PATH = extDir.get_path();
const ICON_PATH = `${EXTENSION_PATH}/vaktija-symbolic.svg`;
const LABELS_PATH = `${EXTENSION_PATH}/translations/labels.json`;

// style constants
const TITLE_ITEM_STYLE_CLASS = 'title';
const CONNECTION_ERROR_TITLE_STYLE_CLASS = `${TITLE_ITEM_STYLE_CLASS} con-error`;
const DATE_STYLE_CLASS = 'date-title';
const OUTER_SEPARATOR_STYLE_CLASS = 'outer-separator';
const INNER_LABEL_STYLE_CLASS = `inner-label ${OUTER_SEPARATOR_STYLE_CLASS}`;
const DEFAULT_PRAYER_ITEM_STYLE_CLASS = 'default-prayer-item';
const CURRENT_PRAYER_ITEM_STYLE_CLASS = `current-prayer-item ${DEFAULT_PRAYER_ITEM_STYLE_CLASS}`;
const PRAYER_LABEL_STYLE_CLASS = 'prayer-label';
const PRAYER_TIME_STYLE_CLASS = 'prayer-time';
const DEFAULT_SUB_ITEM_STYLE_CLASS = 'next-prayer';
const CURRENT_SUB_PRAYER_ITEM_STYLE_CLASS = `current-sub ${DEFAULT_SUB_ITEM_STYLE_CLASS}`;

// helper: create a sub-line menu item
function createSecondaryItem(text, style = DEFAULT_SUB_ITEM_STYLE_CLASS, align = Clutter.ActorAlign.START) {
  const item = new PopupMenu.PopupMenuItem('', { style_class: style, hover: false });
  item.setOrnament(PopupMenu.Ornament.HIDDEN);
  item.sensitive = false;
  item.actor.add_child(new St.Label({ text: _(text), x_expand: true, x_align: align }));
  return item;
}

// helper: create a prayer name+time menu item
function createPrayerItem(name, time, style = DEFAULT_PRAYER_ITEM_STYLE_CLASS) {
  const item = new PopupMenu.PopupMenuItem('', { style_class: style, hover: false });
  item.setOrnament(PopupMenu.Ornament.HIDDEN);
  item.sensitive = false;
  item.actor.add_child(new St.Label({
    style_class: PRAYER_LABEL_STYLE_CLASS,
    text: _(name),
    x_expand: true,
    x_align: Clutter.ActorAlign.START
  }));
  item.actor.add_child(new St.Label({
    style_class: PRAYER_TIME_STYLE_CLASS,
    text: _(time),
    x_expand: true,
    x_align: Clutter.ActorAlign.END
  }));
  return item;
}

export default class VaktijaExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    this._settings = null;
    this._timeoutId = null;
    this._indicator = null;
    this._today = new Date();
    this._labels = this._loadLabels();
    this._data = {};
  }

  _notify(prayerName) {
    Main.notify(
      _('Upcoming Prayer'),
      _(`${prayerName} starts in 15 minutes.`)
    );
  }

  enable() {
    this._settings = this.getSettings();

    // Create panel indicator
    this._indicator = new Indicator(this);
    Main.panel.addToStatusArea(this.metadata.uuid, this._indicator);

    // Update every minute
    this._timeoutId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT, 60,
      () => this._updateDates()
    );

    // initial fetch
    this._fetchVaktijaData();
  }

  disable() {
    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
      this._timeoutId = null;
    }
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  }

  /* — Internal helpers — */

  _loadLabels() {
    try {
      const file = Gio.File.new_for_path(LABELS_PATH);
      const [, contents] = file.load_contents(null);
      return JSON.parse(new TextDecoder('utf-8').decode(contents));
    } catch {
      return {
        prayers: ["", "", "", "", "", ""],
        prayerNext: "", prayerPrev: "",
        hour1: "", hour2: "", hour3: "",
        connectionError: "",
        timeLabelFirstPrev: true,
        timeLabelFirstNext: true
      };
    }
  }

  _fetchVaktijaData() {
    const city = this._settings.get_string('vaktija-eu-city').toLowerCase();
    const session = new Soup.Session();
    const msg = Soup.Message.new('GET', `https://vaktija.eu/${city}`);
    const bytes = session.send_and_read(msg, null);
    const html = new TextDecoder('utf-8').decode(bytes.get_data());
    this._data = this._extractDailyPrayers(html);
    return this._data;
  }

  _extractDailyPrayers(html) {
    try {
      const m = html.match(
        /<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/
      );
      const nextData = JSON.parse(m[1]);
      const d = nextData.props.pageProps.dailyPrayersRes;
      return {
        no1: d.fajr || "XX:XX",
        no2: d.sunrise || "XX:XX",
        no3: d.dhuhr || "XX:XX",
        no4: d.asr || "XX:XX",
        no5: d.maghrib || "XX:XX",
        no6: d.isha || "XX:XX"
      };
    } catch {
      return { no1: "XX:XX", no2: "XX:XX", no3: "XX:XX", no4: "XX:XX", no5: "XX:XX", no6: "XX:XX" };
    }
  }

  _findTimeIndex() {
    const now = new Date();
    let idx = 0, current = 0;
    const diffs = [];
    for (const k in this._data) {
      const d = new Date(`${now.toDateString()} ${this._data[k]}`);
      const dh = (d - now) / 36e5;
      diffs.push(dh);
      if (now > d) current = idx;
      idx++;
    }
    return { index: current, diff: diffs };
  }

  _generateDateString() {
    const g = this._today
      .toLocaleString('en', { month: 'short', day: "2-digit", weekday: "short" })
      .toUpperCase();
    const i = this._today
      .toLocaleString('en', { month: 'long', day: "2-digit", calendar: "islamic" })
      .toUpperCase();
    return `${g} | ${i}`;
  }

  _generateTimePhrase(diff) {
    const lab = this._labels;
    const beforeAfter = diff > 0 ? lab.prayerNext : lab.prayerPrev;
    const absD = Math.abs(diff);
    const cnt = absD < 1 ? Math.round(absD * 60) : Math.round(absD);
    let unit;
    if (absD < 1) unit = "min";
    else if (cnt >= 5 && cnt <= 20) unit = lab.hour2;
    else if (cnt === 1 || (cnt === 21 && lab.hour2 !== lab.hour3)) unit = lab.hour1;
    else unit = lab.hour3;

    const fmtNext = lab.timeLabelFirstNext
      ? `${beforeAfter} ${cnt} ${unit}`
      : `${cnt} ${unit} ${beforeAfter}`;
    const fmtPrev = lab.timeLabelFirstPrev
      ? `${beforeAfter} ${cnt} ${unit}`
      : `${cnt} ${unit} ${beforeAfter}`;

    return beforeAfter === lab.prayerNext ? fmtNext : fmtPrev;
  }

  _updateDates() {
    this._today = new Date();

    const now = this._today.getTime();
    const fifteenMinsInMs = 15 * 60 * 1000;

    Object.keys(this._data).forEach((key, idx) => {
      const prayerTime = new Date(`${this._today.toDateString()} ${this._data[key]}`).getTime();
      const diff = prayerTime - now;

      if (diff > 14 * 60 * 1000 && diff <= fifteenMinsInMs) {
        const prayerName = this._labels.prayers[idx];
        if (this._lastNotified !== prayerName) {
          this._notify(prayerName);
          this._lastNotified = prayerName;
        }
      }
    });

    this._indicator._rerender();
    return true;
  }
}

// ─── Panel indicator ───────────────────────────────────────────────────────────
const Indicator = GObject.registerClass(
  class VaktijaIndicator extends PanelMenu.Button {
    _init(extension) {
      super._init(0.0, extension.metadata.name, false);
      this._ext = extension;

      // Icon
      const icon = Gio.icon_new_for_string(ICON_PATH);
      this.add_child(new St.Icon({
        gicon: icon,
        style_class: 'system-status-icon',
        icon_size: 16
      }));

      this._rerender();
      this.menu.connect('open-state-changed', () => this._rerender());
    }

    _rerender() {
      const ext = this._ext;
      const now = new Date();
      const clock = now.toLocaleString('bs-Latn-BA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      this.menu.removeAll();

      // Title
      let text = `Vaktija - ${ext._settings.get_string('vaktija-eu-city')} | ${clock}`;
      let style = TITLE_ITEM_STYLE_CLASS;
      if (ext._data.no1 === "XX:XX") {
        text = ext._labels.connectionError;
        style = CONNECTION_ERROR_TITLE_STYLE_CLASS;
      }
      this.menu.addMenuItem(createSecondaryItem(text, style, Clutter.ActorAlign.CENTER));

      // Date
      this.menu.addMenuItem(createSecondaryItem(ext._generateDateString(), DATE_STYLE_CLASS, Clutter.ActorAlign.CENTER), 2);

      // Separator
      const sep = new PopupMenu.PopupMenuItem('', { style_class: OUTER_SEPARATOR_STYLE_CLASS, hover: false });
      sep.setOrnament(PopupMenu.Ornament.HIDDEN);
      sep.sensitive = false;
      this.menu.addMenuItem(sep);

      // Prayers + countdown
      const { index, diff } = ext._findTimeIndex();
      Object.keys(ext._data)
        .filter(k => /^no\d+$/.test(k))
        .sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)))
        .forEach((key, idx) => {
          const name = ext._labels.prayers[idx] ?? key;
          const t = ext._data[key].slice(0, -3);
          const curr = idx === index;

          this.menu.addMenuItem(createPrayerItem(
            name, t,
            curr ? CURRENT_PRAYER_ITEM_STYLE_CLASS : DEFAULT_PRAYER_ITEM_STYLE_CLASS
          ));
          this.menu.addMenuItem(createSecondaryItem(
            ext._generateTimePhrase(diff[idx]),
            curr ? CURRENT_SUB_PRAYER_ITEM_STYLE_CLASS : DEFAULT_SUB_ITEM_STYLE_CLASS
          ));
        });
    }
  });

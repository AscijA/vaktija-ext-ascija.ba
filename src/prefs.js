// prefs.js
/*
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Adw  from 'gi://Adw';
import Gtk  from 'gi://Gtk';
import Gio  from 'gi://Gio';
import {
  ExtensionPreferences,
  gettext as _
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class VaktijaPreferences extends ExtensionPreferences {
  constructor(metadata) {
    super(metadata);
    this._settings = this.getSettings();
  }

  fillPreferencesWindow(window) {
    const settings = this._settings;

    const page  = new Adw.PreferencesPage();
    window.add(page);

    const group = new Adw.PreferencesGroup();
    page.add(group);

    // 1) Use vaktija.eu
    {
      const row = new Adw.ActionRow({ title: _('Use vaktija.eu') });
      const sw  = new Gtk.Switch({
        active: settings.get_boolean('use-vaktija-eu'),
        valign: Gtk.Align.CENTER,
      });
      settings.bind(
        'use-vaktija-eu',
        sw,
        'active',
        Gio.SettingsBindFlags.DEFAULT
      );
      row.add_suffix(sw);
      group.add(row);
    }

    // 2) City from Vaktija.eu
    {
      const row   = new Adw.ActionRow({ title: _('City from Vaktija.eu') });
      const entry = new Gtk.Entry({
        text: settings.get_string('vaktija-eu-city'),
        valign: Gtk.Align.CENTER,
      });
      settings.bind(
        'vaktija-eu-city',
        entry,
        'text',
        Gio.SettingsBindFlags.DEFAULT
      );
      row.add_suffix(entry);
      group.add(row);
    }
  }
}

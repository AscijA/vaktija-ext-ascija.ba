const { Adw, Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const _ = ExtensionUtils.gettext;


function init() {
  ExtensionUtils.initTranslations("Vaktija");
}

function fillPreferencesWindow(window) {
  const settings = ExtensionUtils.getSettings();

  // Create a preferences page, with a single group
  const page = new Adw.PreferencesPage();
  window.add(page);

  const group = new Adw.PreferencesGroup();
  page.add(group);

  // Create a new preferences row
  let vaktijaEuRow = new Adw.ActionRow({ title: _('Use vaktija.eu') });
  group.add(vaktijaEuRow);
  // Create a switch and bind its value to the `use-vaktija-eu` key
  let toggleVaktijaEu = new Gtk.Switch({
    active: settings.get_boolean('use-vaktija-eu'),
    valign: Gtk.Align.CENTER,
  });
  settings.bind('use-vaktija-eu', toggleVaktijaEu, 'active', Gio.SettingsBindFlags.DEFAULT);
  // Add the switch to the row
  vaktijaEuRow.add_suffix(toggleVaktijaEu);
  vaktijaEuRow.activatable_widget = toggleVaktijaEu;




  let cityVaktijaEuRow = new Adw.ActionRow({ title: _('City from Vaktija.eu') });
  group.add(cityVaktijaEuRow);
  // Create a text field and bind its value to the `vaktija-eu-city` key
  let cityVaktijaEuEntry = new Gtk.Entry({
    text: settings.get_string('vaktija-eu-city'),
    valign: Gtk.Align.CENTER,
  });
  settings.bind('vaktija-eu-city', cityVaktijaEuEntry, 'text', Gio.SettingsBindFlags.DEFAULT);
  // Add the text field to the row
  cityVaktijaEuRow.add_suffix(cityVaktijaEuEntry);
  cityVaktijaEuRow.activatable_widget = cityVaktijaEuEntry;

  // let row3 = new Adw.ActionRow({ title: _('Use vaktija.ba') });
  // group.add(row3);

  // Create a switch and bind its value to the `use-vaktija-ba` key
  // toggle = new Gtk.Switch({
  //   active: settings.get_boolean('use-vaktija-ba'),
  //   valign: Gtk.Align.CENTER,
  // });
  // settings.bind('use-vaktija-ba', toggle, 'active',
  //   Gio.SettingsBindFlags.DEFAULT);

  // // Add the switch to the row
  // row3.add_suffix(toggle);
  // row3.activatable_widget = toggle;

  // row = new Adw.ActionRow({ title: _('City from Vaktija.ba') });
  // group.add(row);

  // // Create a text field and bind its value to the `vaktija-eu-city` key
  // let entryBa = new Gtk.Entry({
  //   text: settings.get_string('vaktija-ba-city'),
  //   valign: Gtk.Align.CENTER,
  // });
  // settings.bind('vaktija-ba-city', entryBa, 'text', Gio.SettingsBindFlags.DEFAULT);

  // // Add the text field to the row
  // row.add_suffix(entryBa);
  // row.activatable_widget = entryBa;


  let bgSwitch = new Adw.ActionRow({ title: _('Enable background widget') });
  group.add(bgSwitch);
  // Create a text field and bind its value to the `vaktija-eu-city` key
  let switchEl = new Gtk.Switch({
    active: settings.get_boolean('use-bg-widget'),
    valign: Gtk.Align.CENTER,
  });
  settings.bind('use-bg-widget', switchEl, 'active', Gio.SettingsBindFlags.DEFAULT);
  // Add the text field to the row
  bgSwitch.add_suffix(switchEl);
  bgSwitch.activatable_widget = switchEl;

  // Create a new preferences row
  let posXRow = new Adw.ActionRow({ title: _('Background Widget X Position') });
  group.add(posXRow);
  // Create a switch and bind its value to the `bg-widget-x-pos` key
  let posXEntry = new Gtk.Entry({
    text: settings.get_string('bg-widget-x-pos'),
    valign: Gtk.Align.CENTER,
  });
  settings.bind('bg-widget-x-pos', posXEntry, 'text', Gio.SettingsBindFlags.DEFAULT);
  // Add the switch to the row
  posXRow.add_suffix(posXEntry);
  posXRow.activatable_widget = posXEntry;

  // Create a new preferences row
  let posYRow = new Adw.ActionRow({ title: _('Background Widget Y Position') });
  group.add(posYRow);
  // Create a switch and bind its value to the `bg-widget-y-pos` key
  let posYEntry = new Gtk.Entry({
    text: settings.get_string('bg-widget-y-pos'),
    valign: Gtk.Align.CENTER,
  });
  settings.bind('bg-widget-y-pos', posYEntry, 'text', Gio.SettingsBindFlags.DEFAULT);
  // Add the switch to the row
  posYRow.add_suffix(posYEntry);
  posYRow.activatable_widget = posYEntry;

  let posNote = new Adw.ActionRow({ title: _('Position and City will be updated on the next minute') });
  group.add(posNote);
  let cityNote = new Adw.ActionRow({
    title: _('If You see a lot of XX or error message it can mean that ' +
      'either the data is not yet updated or the city name is wrong or not supported')
  });
  group.add(cityNote);
  // Make sure the window doesn't outlive the settings object
  window._settings = settings;
}
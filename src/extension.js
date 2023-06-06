/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'vaktija-extension';

const { GObject, St, Soup, Gio, Gtk, GLib, Clutter } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

// Default Labels for bosnian if labels.json is missing
let labels = {
    prayers: [
        "",
        "",
        "",
        "",
        "",
        ""],
    prayerNext: "",
    prayerPrev: "",
    hour1: "",
    hour2: "",
    hour3: "",
    timeLabelFirstPrev: true,
    timeLabelFirstNext: true

};

let api = "https://vaktija.eu/graz";
let timeFormat;

/**
 * Read translated labels from labels.json
 * 
 * @returns Object containing labels 
 */
const getLabels = () => {

    try {
        const file = Gio.File.new_for_path(`${Me.path}/translations/labels.json`);
        const [, contents, etag] = file.load_contents(null);
        const decoder = new TextDecoder('utf-8');
        const contentsString = decoder.decode(contents);
        const loadedLabels = JSON.parse(contentsString);
        return loadedLabels;
    } catch (error) {
        return labels;
    }
};

let data = {};

/**
 * 
 * @param {string} labelText : Content of prayer time item
 * @param {string} styleClass : CSS Class name
 * @returns PopupMenuItem Containing Prayer time
 */
const createSecondaryPrayerItem = (labelText, styleClass = "prayer-item") => {
    // Create the PopupMenuItem 
    const salahItem = new PopupMenu.PopupMenuItem(labelText, { style_class: styleClass });
    salahItem.sensitive = false;
    salahItem.setOrnament(PopupMenu.Ornament.HIDDEN);

    return salahItem;
};

/**
 * 
 * @param {string} prayerName : Name of the prayer
 * @param {string} prayerTime : Time of the prayer
 * @param {string} styleClass : CSS Class name
 * @returns PopupMenuItem Containing Prayer time
 */
const createPrayerTimeItem = (prayerName, prayerTime, styleClass = "prayer-item") => {
    // Create the PopupMenuItem 
    const salahItem = new PopupMenu.PopupMenuItem("", {
        style_class: styleClass,
        hover: false,
    });
    salahItem.setOrnament(PopupMenu.Ornament.HIDDEN);
    salahItem.sensitive = false;

    let prayerNameLabel = new St.Label({
        style_class: "prayer-label",
        text: _(prayerName),
        x_expand: true,
        x_align: 1
    });

    let prayerTimeLabel = new St.Label({
        style_class: "prayer-time",
        text: _(prayerTime),
        x_expand: true,
        x_align: 3
    });


    salahItem.add_actor(prayerNameLabel);
    salahItem.add_actor(prayerTimeLabel);

    return salahItem;
};

/**
 * Updates and rerenders Prayer Times on menu open
 * 
 * @param {PopupMenu.PopupBaseMenu} menu The emitting object
 * @param {boolean} open True if the menu is open, false if closed
 */
const rerenderPrayerTimes = (menu, open) => {
    menu.removeAll();
    if (open) {
        labels = getLabels();
        data = getVaktijaData();
    }
    renderEntries(menu);
};

/**
 * Finds the index of the current prayer and returns remaining time until individual prayers
 *
 * @return {object} index: index of the current prayer, diff: remaining time
 */
const findTimeIndex = () => {
    let index = 0;
    let retVal = {
        index: 0,
        diff: [],
    };
    for (const salah in data) {
        const today = new Date();
        const date = new Date(`${today.toDateString()} ${data[salah]}`);
        let diff = (date - today) / (1000 * 60 * 60);
        retVal.diff.push(diff);
        if (today > date) {
            retVal.index = index;
        }
        index++;
    }
    return retVal;
};

/**
 *  Updates prayer times, and renders Prayer items
 * @param {PopupMenu} menu: Panel Menu 
 */
const renderEntries = (menu) => {
    let title = new PopupMenu.PopupMenuItem(' Vaktija - Graz', { style_class: "title" });
    title.sensitive = false;
    title.setOrnament(PopupMenu.Ornament.HIDDEN);
    menu.addMenuItem(title);
    let count = 0;
    let { index, diff } = findTimeIndex();
    for (const salah in data) {

        // Create prayer item
        let style = count == index ? "current" : "prayer-item";
        let salahItem = createPrayerTimeItem(labels.prayers[count], data[salah].slice(0, -3), style);
        menu.addMenuItem(salahItem);

        // create time until/before
        let timeDifference = diff[count];

        // determines which label for prev or next prayer should be shown
        let beforeAfter = timeDifference > 0 ? labels.prayerNext : labels.prayerPrev;

        // if less than 1 hour, time diff will be displayed in minutes
        let minOrHour = Math.abs(Math.abs(timeDifference) < 1 ? Math.round(timeDifference * 60) : Math.round(timeDifference));

        // determines if the time unit is minutes or hours, mainly written for bosnian translation
        timeDifference = Math.abs(timeDifference);
        let timeUnit = timeDifference < 1
            ? "min"

            /* START: This part is to be modified if the singular/plural is not shown correctly for your language */
            : Math.round(timeDifference) >= 5 && Math.round(timeDifference) <= 20
                ? labels.hour2
                : (Math.round(timeDifference) == 1 || (Math.round(timeDifference) == 21 && labels.hour2 != labels.hour3))
                    ? labels.hour1
                    : labels.hour3;
        /* END*/

        style = count == index ? "current-sub" : "next-prayer";

        // determines if the time difference should be printed first
        let format = beforeAfter == labels.prayerNext ? labels.timeLabelFirstNext : labels.timeLabelFirstPrev;
        let timePhrase = format ? `${beforeAfter} ${minOrHour} ${timeUnit}` : `${minOrHour} ${timeUnit} ${beforeAfter}`;

        salahItem = createSecondaryPrayerItem(timePhrase, style);
        menu.addMenuItem(salahItem);
        count++;
    }
};

/***
 *  Due to the lack of exposed endpoint of vaktija.eu for prayer times, complete HTML file is loaded
 * 
 * @returns String: HTML String containing Prayer Times is returned
 */
const getVaktijaData = () => {
    // Create a new Soup.Session to handle the API request
    let session = new Soup.Session();

    // Create a new Soup.Message to represent the API request
    let message = Soup.Message.new('GET', api);

    // Send the API request asynchronously
    session.send_message(message);

    return extractDailyPrayers(message["response-body"].data);
};

/***
 * Extracts Prayer times from an HTML String
 * 
 * @param html: HTML String form which Prayer Times will be Extracted
 * @returns object: Prayer times object
 */
const extractDailyPrayers = (html) => {
    const startIndex = html.indexOf('"dailyPrayersRes":{') + 19;
    const endIndex = html.indexOf('},"cookiesRes"');
    const dailyPrayersData = html.slice(startIndex, endIndex);
    return JSON.parse('{' + dailyPrayersData + '}');
};


class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        data = getVaktijaData();
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
        // let a = new St.BoxLayout({
        //     style_class: "background-boxlayout",
        //     pack_start: false,
        //     vertical: true,
        // });
        // Main.layoutManager._backgroundGroup.add_child(a);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;

    }
}

function init(meta) {
    return new Extension(meta.uuid);
}

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('Vaktija'));

            // Create Panel Icon
            let iconPath = `${Me.path}/vaktija-symbolic.svg`;
            let gicon = Gio.icon_new_for_string(`${iconPath}`);
            this.add_child(new St.Icon({
                gicon: gicon,
                style_class: 'system-status-icon',
                icon_size: 16
            }));

            renderEntries(this.menu);
            this.menu.connect("open-state-changed", rerenderPrayerTimes);
        }
    });

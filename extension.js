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

const GETTEXT_DOMAIN = 'my-indicator-extension';

const { GObject, St, Soup, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

const Namazi = [
    "Zora:      ",
    "Iz. Sunca: ",
    "Podne:     ",
    "Ikindija:  ",
    "Aksam:     ",
    "Jacija:    "];
let data = {};

/**
 * 
 * @param {string} labelText : Content of prayer time item
 * @param {string} styleClass : CSS Class name
 * @returns PopupMenuItem Containing Prayer time
 */
function createPrayerTimeItem(labelText, styleClass = "prayer-item") {
    // Create the PopupMenuItem 
    const salahItem = new PopupMenu.PopupMenuItem(labelText, { style_class: styleClass });
    salahItem.label_actor.width = 150;
    salahItem.sensitive = false;
    return salahItem;
}

/**
 * Updates and rerenders Prayer Times on menu open
 * 
 * @param {PopupMenu.PopupBaseMenu} menu The emitting object
 * @param {boolean} open True if the menu is open, false if closed
 */
const rerenderPrayerTimes = (menu, open) => {
    menu.removeAll();
    if (open) { data = getVaktijaData(); }
    renderEntries(menu);
};

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
        let diff = Math.round((date - today) / (1000 * 60 * 60));
        retVal.diff.push(diff);
        if (today < date) {
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
    menu.addMenuItem(title);
    let count = 0;
    let { index, diff } = findTimeIndex();
    for (const salah in data) {
        let style = count == index ? "current" : "prayer-item";
        let salahItem = createPrayerTimeItem(Namazi[count] + data[salah].slice(0, -3), style);
        menu.addMenuItem(salahItem);
        salahItem = createPrayerTimeItem(`za ${diff[count]} ${diff[count] >= 5 && diff[count] <= 20 ? "sati" : diff[count] == 1 || diff[count] == 21 ? "sat" : "sata"}`, "next-prayer");
        menu.addMenuItem(salahItem);
        count++;
    }
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
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}

/***
 *  Due to the lack of exposed endpoint for prayer times, complete HTML file is loaded
 * 
 * @returns String: HTML String containing Prayer Times is returned
 */
const getVaktijaData = () => {
    // Create a new Soup.Session to handle the API request
    let session = new Soup.Session();

    // Create a new Soup.Message to represent the API request
    let message = Soup.Message.new('GET', 'https://vaktija.eu/graz');

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

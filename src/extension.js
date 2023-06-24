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

/* Style Constants */
const TITLE_ITEM_STYLE_CLASS = `title`;
const CONNECTION_ERROR_TITLE_STYLE_CLASS = `${TITLE_ITEM_STYLE_CLASS} con-error`;

const DATE_STYLE_CLASS = `date-title`;

const OUTER_SEPARATOR_STYLE_CLASS = `outer-separator`;
const INNER_LABEL_STYLE_CLASS = `inner-label ${OUTER_SEPARATOR_STYLE_CLASS}`;

const DEFAULT_PRAYER_ITEM_STYLE_CLASS = `default-prayer-item`;
const CURRENT_PRAYER_ITEM_STYLE_CLASS = `current-prayer-item ${DEFAULT_PRAYER_ITEM_STYLE_CLASS}`;

const PRAYER_LABEL_STYLE_CLASS = `prayer-label`;
const PRAYER_TIME_STYLE_CLASS = `prayer-time`;

const DEFAULT_SUB_ITEM_STYLE_CLASS = `next-prayer`;
const CURRENT_SUB_PRAYER_ITEM_STYLE_CLASS = `current-sub ${DEFAULT_SUB_ITEM_STYLE_CLASS}`;

/* BG Styles */
const DEFAULT_BG_PRAYER_ITEM_STYLE_CLASS = `bg-item-main`;
const CURRENT_BG_ITEM_STYLE_CLASS = `bg-item-current`;
const CURRENT_BG_PRAYER_ITEM_STYLE_CLASS = `${DEFAULT_BG_PRAYER_ITEM_STYLE_CLASS} ${CURRENT_BG_ITEM_STYLE_CLASS}`;

const DEFAULT_BG_SUB_ITEM_STYLE_CLASS = `bg-item-sub`;
const CURRENT_BG_SUB_ITEM_STYLE_CLASS = `${DEFAULT_BG_SUB_ITEM_STYLE_CLASS} ${CURRENT_BG_ITEM_STYLE_CLASS}`;

const BG_TITLE_STYLE_CLASS = `bg-title`;
const BG_CLOCK_STYLE_CLASS = `bg-clock`;
const BG_DATE_STYLE_CLASS = `bg-date`;
const BG_OUTER_SEPARATOR_STYLE_CLASS = `bg-outer-separator`;
const BG_INNER_LABEL_STYLE_CLASS = `bg-inner-label`;

/* --------------- */

/* Other Constants */
const iconPath = `${Me.path}/vaktija-symbolic.svg`;
/* --------------- */
// Default Labels 
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
    connectionError: "",
    timeLabelFirstPrev: true,
    timeLabelFirstNext: true
};

let defaultCity = `graz`;
let vaktijaEUAPI = `https://vaktija.eu/`;
// let timeFormat;
let labelsPath = `${Me.path}/translations/labels.json`;
let today;
let isEnabled;
let dateWidget;
let data = {};
let stage;
let dateLabelBg;
let clockLabelBg;
let salahItemsContainer;

/**
 * Read translated labels from labels.json
 * 
 * @returns Object containing labels 
 */
const getLabels = () => {
    try {
        const file = Gio.File.new_for_path(labelsPath);
        const [, contents, etag] = file.load_contents(null);
        const decoder = new TextDecoder('utf-8');
        const contentsString = decoder.decode(contents);
        const loadedLabels = JSON.parse(contentsString);
        return loadedLabels;
    } catch (error) {
        return labels;
    }
};

/**
 * 
 * @param {string} labelText : Content of prayer time item
 * @param {string} styleClass : CSS Class name
 * @returns PopupMenuItem Containing Prayer time
 */
const createWidgetSecondaryPrayerItem = (labelText, styleClass = DEFAULT_PRAYER_ITEM_STYLE_CLASS, alignment = Clutter.ActorAlign.START) => {
    // Create the PopupMenuItem 
    const salahItem = new PopupMenu.PopupMenuItem("", { style_class: styleClass });
    salahItem.sensitive = false;
    salahItem.setOrnament(PopupMenu.Ornament.HIDDEN);

    let innerLabel = new St.Label({
        style_class: "",
        text: _(labelText),
        x_expand: true,
        x_align: alignment
    });
    salahItem.add_actor(innerLabel);
    return salahItem;
};

/**
 * 
 * @param {string} prayerName : Name of the prayer
 * @param {string} prayerTime : Time of the prayer
 * @param {string} styleClass : CSS Class name
 * @returns PopupMenuItem Containing Prayer time
 */
const createWidgetPrayerTimeItem = (prayerName, prayerTime, styleClass = DEFAULT_PRAYER_ITEM_STYLE_CLASS) => {
    // Create the PopupMenuItem 
    const salahItem = new PopupMenu.PopupMenuItem("", {
        style_class: styleClass,
        hover: false,
    });
    salahItem.setOrnament(PopupMenu.Ornament.HIDDEN);
    salahItem.sensitive = false;

    let prayerNameLabel = new St.Label({
        style_class: PRAYER_LABEL_STYLE_CLASS,
        text: _(prayerName),
        x_expand: true,
        x_align: Clutter.ActorAlign.START
    });

    let prayerTimeLabel = new St.Label({
        style_class: PRAYER_TIME_STYLE_CLASS,
        text: _(prayerTime),
        x_expand: true,
        x_align: Clutter.ActorAlign.END
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
const rerenderWidgetPrayerTimes = (menu, open) => {
    menu.removeAll();
    if (open) {
        labels = getLabels();
        data = getVaktijaData();
    }
    renderWidgetEntries(menu);
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
 * Renders title 
 *
 * @param {PopupMenu} menu: Panel Menu 
 */
const renderWidgetTitle = (menu) => {
    const clock = today.toLocaleString('bs-Latn-BA', { hour: "2-digit", minute: "2-digit" }).toLocaleUpperCase();
    let city = defaultCity.charAt(0).toUpperCase() + defaultCity.slice(1);
    let titleLabel = `Vaktija - ${city}   |   ${clock}`;

    let titleStyleClass = TITLE_ITEM_STYLE_CLASS;
    if (data.no1 == "XX:XX") {
        titleLabel = labels.connectionError;
        titleStyleClass = CONNECTION_ERROR_TITLE_STYLE_CLASS;
    }
    let title = createWidgetSecondaryPrayerItem(titleLabel, titleStyleClass, Clutter.ActorAlign.CENTER);
    // new PopupMenu.PopupMenuItem(titleLabel, { style_class: titleStyleClass });
    // title.sensitive = false;
    // title.label_actor.set_x_expand(true);
    // title.label_actor.set_x_align(Clutter.ActorAlign.CENTER);
    // title.setOrnament(PopupMenu.Ornament.HIDDEN);
    menu.addMenuItem(title);
};

/**
 *  Render current gregorian and islamic date
 *
 * @param {PopupMenu} menu: Panel Menu 
 */
const renderWidgetDate = (menu) => {
    const fullString = generateDateString();
    dateWidget = createWidgetSecondaryPrayerItem(fullString, DATE_STYLE_CLASS, Clutter.ActorAlign.CENTER);
    menu.addMenuItem(dateWidget, 2);
};

/**
 * Render border separator
 *
 * @param {PopupMenu} menu: Panel Menu 
 */
const renderWidgetSeparator = (menu) => {
    const separatorItem = new PopupMenu.PopupMenuItem("", {
        style_class: OUTER_SEPARATOR_STYLE_CLASS,
        hover: false,
    });
    separatorItem.setOrnament(PopupMenu.Ornament.HIDDEN);
    separatorItem.sensitive = false;

    let separatorLabel = new St.Label({
        style_class: INNER_LABEL_STYLE_CLASS,
        x_expand: true,
        x_align: Clutter.ActorAlign.CENTER,
        width: dateWidget.get_width() * 0.9
    });
    separatorItem.add_actor(separatorLabel);
    menu.addMenuItem(separatorItem);
};

/**
 *  Updates the clock and prayer times once every minute
 *
 * @param {PopupMenu} menu: Panel Menu 
 * @return {boolean} isEnabled, should the function continue re-executing or not 
 */
const updateDates = (menu) => {
    let now = new Date();
    const settings = ExtensionUtils.getSettings();
    let city = settings.get_string('vaktija-eu-city').toLowerCase();
    // update for clocks and dates
    if (now.getMinutes() != today.getMinutes() || city != defaultCity) {
        today = now;
        defaultCity = city;

        const settings = ExtensionUtils.getSettings();
        let isBGWidgetEnabled = settings.get_boolean('use-bg-widget');
        if (isBGWidgetEnabled) {
            stage.destroy();
            let posY = parseInt(settings.get_string('bg-widget-y-pos'));
            let posX = parseInt(settings.get_string("bg-widget-x-pos"));
            renderBGPrayerTimesWidget(posX, posY);
            // const clock = today.toLocaleString('bs-Latn-BA', { hour: "2-digit", minute: "2-digit" }).toLocaleUpperCase();
            // clockLabelBg.set_text(clock);

            // if (now.getDate() != today.getDate() || city != defaultCity) {
            //     dateLabelBg.set_text(generateDateString());
            // }

        }
        rerenderWidgetPrayerTimes(menu, true);
    }


    return isEnabled;
};

/**
 *  Generates how the time phrase of a subitem should contain
 *
 * @return {string} timePhrase - Time Phrase to be rendered
 */
const generateTimePhrase = (diff) => {
    let timeDifference = diff;

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
    // determines if the time difference should be printed first
    let format = beforeAfter == labels.prayerNext ? labels.timeLabelFirstNext : labels.timeLabelFirstPrev;
    let timePhrase = format ? `${beforeAfter} ${minOrHour} ${timeUnit}` : `${minOrHour} ${timeUnit} ${beforeAfter}`;
    return timePhrase;
};


/** Generates and returns date string 
 * 
 * @returns {string} fullString : Returns Date string to be printed
 */
const generateDateString = () => {
    const dateString = today.toLocaleString('en', { month: 'short', day: "2-digit", weekday: "short" }).toLocaleUpperCase();
    const islamic = today.toLocaleString('en', { month: 'long', day: "2-digit", calendar: "islamic" }).toLocaleUpperCase();
    const fullString = `${dateString} | ${islamic}`;
    return fullString;
};
/**
 *  Updates prayer times, and renders Prayer items
 * @param {PopupMenu} menu: Panel Menu 
 */
const renderWidgetEntries = (menu) => {
    renderWidgetTitle(menu);
    renderWidgetDate(menu);
    renderWidgetSeparator(menu);

    let count = 0;
    let { index, diff } = findTimeIndex();

    for (const salah in data) {

        // Create prayer item
        let style = count == index ? CURRENT_PRAYER_ITEM_STYLE_CLASS : DEFAULT_PRAYER_ITEM_STYLE_CLASS;
        let salahItem = createWidgetPrayerTimeItem(labels.prayers[count], data[salah].slice(0, -3), style);
        menu.addMenuItem(salahItem);

        // create time until/before
        let timePhrase = generateTimePhrase(diff[count]);

        // Determines if the sub item is current prayer or standard
        style = count == index ? CURRENT_SUB_PRAYER_ITEM_STYLE_CLASS : DEFAULT_SUB_ITEM_STYLE_CLASS;

        salahItem = createWidgetSecondaryPrayerItem(timePhrase, style);
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
    let now = new Date();
    // if date has not changed return old data, improves resposivness
    if (now.getDate() != today.getDate() || data != {}) {

        // Create a new Soup.Session to handle the API request
        let session = new Soup.Session();

        // Create a new Soup.Message to represent the API request
        let message = Soup.Message.new('GET', `${vaktijaEUAPI}${defaultCity}`);

        // Send the API request asynchronously
        session.send_message(message);

        // Parse the response into data object
        return extractDailyPrayers(message["response-body"].data);

    } else {
        return data;
    }
};

/***
 * Extracts Prayer times from an HTML String
 * 
 * @param html: HTML String form which Prayer Times will be Extracted
 * @returns object: Prayer times object
 */
const extractDailyPrayers = (html) => {
    try {
        const startIndex = html.indexOf('"dailyPrayersRes":{') + 19;
        const endIndex = html.indexOf('},"cookiesRes"');
        const dailyPrayersData = html.slice(startIndex, endIndex);

        return JSON.parse('{' + dailyPrayersData + '}');
    } catch (error) {
        return { "no1": "XX:XX", "no2": "XX:XX", "no3": "XX:XX", "no4": "XX:XX", "no5": "XX:XX", "no6": "XX:XX" };
    }

};

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }
    enable() {
        log("Vaktija: Enable");
        today = new Date();
        data = getVaktijaData();
        labels = getLabels();
        isEnabled = true;
        this._indicator = new Indicator();

        GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => { return updateDates(this._indicator.menu); });

        Main.panel.addToStatusArea(this._uuid, this._indicator);

        const settings = ExtensionUtils.getSettings();
        let isBGWidgetEnabled = settings.get_boolean('use-bg-widget');

        if (isBGWidgetEnabled) {
            let posY = parseInt(settings.get_string('bg-widget-y-pos'));
            let posX = parseInt(settings.get_string("bg-widget-x-pos"));
            renderBGPrayerTimesWidget(posX, posY);
        }
    }

    disable() {
        log("Vaktija: Disable");
        if (stage) {
            stage.destroy();
            stage = null;
        }
        this._indicator.destroy();
        this._indicator = null;
        isEnabled = false;
    }
}

/** Draws the background widget with posX and posY as top left corner
 * 
 * @param {number} posX - X Position on the screen
 * @param {number} posY - Y Position on the screen
 */
const renderBGPrayerTimesWidget = (posX = 50, posY = 78) => {
    stage = new St.BoxLayout({
        style_class: "bg-container",
        pack_start: false,
        vertical: true,
    });
    stage.set_x(posX);
    stage.set_y(posY);

    const clock = today.toLocaleString('bs-Latn-BA', { hour: "2-digit", minute: "2-digit" }).toLocaleUpperCase();
    clockLabelBg = new St.Label({
        style_class: BG_CLOCK_STYLE_CLASS,
        text: _(clock),
        x_expand: true,
        x_align: Clutter.ActorAlign.CENTER
    });
    stage.add_actor(clockLabelBg);

    let city = defaultCity.charAt(0).toUpperCase() + defaultCity.slice(1);
    let title = `Vaktija - ${city}`;
    let titleLabel = new St.Label({
        style_class: BG_TITLE_STYLE_CLASS,
        text: _(title),
        x_expand: true,
        x_align: Clutter.ActorAlign.CENTER
    });
    stage.add_actor(titleLabel);

    const dateString = generateDateString();
    dateLabelBg = new St.Label({
        style_class: BG_DATE_STYLE_CLASS,
        text: _(dateString),
        x_expand: true,
        x_align: Clutter.ActorAlign.CENTER
    });
    stage.add_actor(dateLabelBg);

    const separatorItem = new St.BoxLayout({
        style_class: BG_OUTER_SEPARATOR_STYLE_CLASS,
    });

    let separatorLabel = new St.Label({
        style_class: BG_INNER_LABEL_STYLE_CLASS,
        x_expand: true,
        x_align: Clutter.ActorAlign.CENTER,
        width: stage.get_width()
    });

    separatorItem.add_actor(separatorLabel);
    stage.add_actor(separatorItem);

    renderBGPrayerItems();
    Main.layoutManager._backgroundGroup.add_child(stage);
};

/**
 * Renders prayer items within the stage 
 */
const renderBGPrayerItems = () => {
    let count = 0;
    let { index, diff } = findTimeIndex();

    salahItemsContainer = new St.BoxLayout({
        pack_start: false,
        vertical: true,
    });
    for (const salah in data) {
        // Create prayer item
        let style = count == index ? CURRENT_BG_PRAYER_ITEM_STYLE_CLASS : DEFAULT_BG_PRAYER_ITEM_STYLE_CLASS;
        let salahItem = new St.BoxLayout({
            style_class: style,
            pack_start: false,
        });

        let prayerNameLabel = new St.Label({
            style_class: "prayer-label",
            text: _(labels.prayers[count]),
            x_expand: true,
            x_align: Clutter.ActorAlign.START
        });

        let prayerTimeLabel = new St.Label({
            style_class: "",
            text: _(data[salah].slice(0, -3)),
            x_expand: true,
            x_align: Clutter.ActorAlign.END
        });

        salahItem.add_actor(prayerNameLabel);
        salahItem.add_actor(prayerTimeLabel);

        salahItemsContainer.add_actor(salahItem);

        // create time until/before
        let timePhrase = generateTimePhrase(diff[count]);

        // Determines if the sub item is current prayer or standard
        style = count == index ? CURRENT_BG_SUB_ITEM_STYLE_CLASS : DEFAULT_BG_SUB_ITEM_STYLE_CLASS;

        salahItem = new St.BoxLayout({
            style_class: style,
            pack_start: false,
            // vertical: true,
        });

        let subLabel = new St.Label({
            style_class: "",
            text: _(timePhrase),
            x_expand: true,
            x_align: Clutter.ActorAlign.START
        });

        salahItem.add_actor(subLabel);
        salahItemsContainer.add_actor(salahItem);
        count++;
    }
    stage.add_actor(salahItemsContainer);
};

function init(meta) {
    return new Extension(meta.uuid);
}

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('Vaktija'));
            // Create Panel Icon
            let gicon = Gio.icon_new_for_string(iconPath);
            this.add_child(new St.Icon({
                gicon: gicon,
                style_class: 'system-status-icon',
                icon_size: 16
            }));

            renderWidgetEntries(this.menu);
            this.menu.connect("open-state-changed", rerenderWidgetPrayerTimes);
        }
    });

# vaktija-ascija.ba
# Vaktija Extension

This is a GNOME Shell extension called "Vaktija" that displays daily prayer times of European cities which are a part of Bosnian Islamic Community in the panel menu.

## License

This program is licensed under the GNU General Public License version 2.0 or later. For more details, please see the [GNU General Public License](http://www.gnu.org/licenses/) page.

## Requirements

- GNOME Shell

## Installation

1. Clone this repository or download the source code.
2. Copy the contents to the extensions directory: `~/.local/share/gnome-shell/extensions/vaktija@ascija.ba`.
3. Restart the GNOME Shell by pressing **Alt+F2** and entering `r` in the prompt, then press **Enter**.
4. Enable the extension using GNOME Tweaks, GNOME Extensions or by running `gnome-extensions enable vaktija@ascija.ba` in your terminal .

## Usage


After installing and enabling the extension, a new icon ![Vaktija icon](assets/vaktija-symbolic.png) will appear in the panel. Clicking on the icon will open a menu displaying the daily prayer times.
![Vaktija Panel Menu](assets/widget.png)  

![My desktop example](assets/whole.png)

## Credits

This extension uses the following libraries:

- GObject
- St
- Soup
- Gio
- ExtensionUtils
- Me
- Main
- PanelMenu
- PopupMenu

## Further planned improvements

Following improvements and features are planned to be implamented in future:
- [ ] Prefernces with following options:
  - [ ] English and German translation, currently only display prayer times in Bosnian
  - [ ] All cities provided by [Vaktija.eu](https://vaktija.eu/), currently supports only Graz
  - [ ] All cities provided by [Vaktija.ba](https://vaktija.ba/)
  - [ ] Custom Translations
  - [ ] 12/24 time formats, currently only 24 hour format is supported 
- [x] Highlight current prayer time and show remaining time until next Prayer
- [ ] Add Desktop Background Widget
- [ ] Add Notifications X minutes before the prayer

## Acknowledgements

This extension is based on the work of [Vaktija.eu](https://vaktija.eu/) and [Vaktija.ba](https://vaktija.ba/) and inspired by their websites.

## Contact

For any questions or feedback, please contact the extension author at maid.ascic@student.tugraz.at.  
For any feature request please submit an issue.

## Translations Guide

# Labels

All the labels (text) that is visibel and shown is read from the `./translations/labels.json` file. By default Bosnian language is used. English translation is also provided. Please note that the labels file contains additional information next/previous prayer format, which determines wheter the numerical value should be printed first or the preposition e.g. In English the previous prayer is shown as `<X> hours ago` and the next `in <X> hours`, while in Bosnian both use the latter format `<preposition> <X> <hours>`.  
If you see the following, it means your labels file is either missing, invalid, or you changed the path in `extension.js`:  
![Broken Panel](broken.png)  


Here is given the English translation with explanation of what each of the fields mean:
```
{
  "prayers": [                     => Holds the names of the prayers
    "Fajr:    ",                   => In order to have them properly lined up
    "Sunrise: ",
    "Dhuhr:   ",
    "Asr:     ",
    "Maghrib: ",
    "Isha:    "
  ],
  "prayerNext": "in",              => Preposition for the next prayer
  "prayerPrev": "ago",             => Preposition for the previous prayer
  "hour1": "hour",                 => Singular form of <hours>
  "hour2": "hours",                => Plural form of <hours>
  "hour3": "hours",                => Bosnian language has 2nd plural form of <hours>
  "timeLabelFirstPrev": false,     => Which format should be used: false -> <X> <hours> <preposition>
  "timeLabelFirstNext": true       => Which format should be used: false -> <preposition> <X> <hours>
}
``` 
# Store listings

The App Store and Google Play texts, one file per field and locale, in the layout fastlane
uses (`app-store/<locale>/<field>.txt`, `play/<locale>/<field>.txt`). Edit them here and push
them with the store scripts rather than in the web consoles, so the copy stays reviewable.
Limits: App Store name and subtitle 30 characters, promotional text 170, keywords 100
(comma-separated, no spaces needed, don't repeat words from the name), description 4000;
Play title 30, short description 80, full description 4000.

## App Store

`node scripts/app-store.mjs` pushes everything in `app-store/` plus the screenshots to the
version being prepared in App Store Connect, and never submits. `text` or `screenshots`
pushes one half. It finds the app by app.json's bundle ID (or `--app ID`) and is safe to rerun.

- Per locale: name, subtitle, description, keywords, promotional text, release notes (sent
  from the second version on; App Store Connect rejects "What's New" on a first release),
  marketing, support and privacy URLs.
- For the app: `copyright.txt`, `primary_category.txt` and `secondary_category.txt` (App Store
  Connect category IDs), `age_rating.json` (the age rating questionnaire, all "none"/false,
  which rates 4+) and `review_information/` (App Review contact and notes; add
  `demo_user.txt` and `demo_password.txt` if a demo account is ever needed).

Set once in App Store Connect and not handled by the script: price (free), availability (all
territories, new ones included), Mac and Vision Pro availability (off), App Privacy.

## Google Play

App "Hopwatch: Time Tracker" (dev.schnau.hopwatch, console app ID 4975816330263293130) in
the Urbs UG developer account. Default listing en-US, plus a de-DE translation.

- `play/<locale>/` holds title, short and full description. The Play copy leaves out what
  Android doesn't have (Apple Intelligence, Live Activity, Shortcuts). Add the ongoing
  notification and app shortcuts once they ship.
- `play/graphics/feature-graphic.html` draws the 1024 x 500 feature graphic from the
  website's jellies (`site/jelly.js`), with no text, so all languages share it. The render
  command is in its header. The 512 px icon is `assets/images/android-icon.png`.
- There's no push script yet. Managed publishing is off, so the Play API refuses
  `changesNotSentForReview` ("Changes are sent for review automatically"), and committing an
  API edit would send the queued changes for review. Until that's wanted, edit the listing in
  the console (Store presence › Store listings, "Save as draft"). To script it later, turn on
  managed publishing first.
- App content, set in the console: no ads, no advertising ID, no sign-in, not a government,
  financial or health app, target age 18+, IARC "All other app types" with every answer no
  (Everyone, PEGI 3, USK 0). Data safety declares two collected types, both from the
  expo-updates check, neither shared: device or other IDs (the random install ID, for app
  functionality and analytics) and crash logs (the failed-update error, for analytics), both
  required and encrypted in transit; no accounts; the optional deletion question is left
  blank. Revisit it when the app gains a network call or an SDK that sends data, and keep it
  in line with the privacy policy.

## Screenshots

`screenshots/app-store/<locale>/` holds the framed App Store screenshots, 1320 x 2868 for the
6.9" iPhone slot (`APP_IPHONE_67`, the only size an iPhone-only app needs). They're rendered
from the simulator captures in `screenshots/raw/<locale>/` (not checked in) by
`screenshots/render.sh`: `frame.html` and `frame.css` draw one frame, `shots.js` lists the
shots, their captions and order.

The captures come from a Release build on the M1's "Hopwatch Screens" simulator (iPhone 18
Pro Max, iOS 27, region en_US so the status bar reads 9:41) with sample data loaded in
onboarding, a status bar override (`xcrun simctl status_bar … override --time 9:41
--batteryState discharging --batteryLevel 100`) and, for German, the app launched with
`-AppleLanguages "(de)" -AppleLocale de_DE` before loading the sample data. The week shots show
last week, whose summary reads better than the running week's.

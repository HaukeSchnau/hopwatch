# Store listings

The App Store and Google Play texts, one file per field and locale, in the layout fastlane
uses (`app-store/<locale>/<field>.txt`, `play/<locale>/<field>.txt`). Edit them here and push
them with the store scripts rather than in the web consoles, so the copy stays reviewable.
For everything else (review status, builds, TestFlight, bundle IDs, App Groups, Play tracks
and releases) use the `asc` and `gplay` CLIs, which come with the Urbs UG credentials (see
the `app-stores` skill).
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
  Android doesn't have (Apple Intelligence, Live Activity, the Shortcuts app) and mentions the
  running notification and the launcher shortcuts instead.
- `play/graphics/feature-graphic.html` draws the 1024 x 500 feature graphic from the
  website's jellies (`site/jelly.js`), with no text, so all languages share it. The render
  command is in its header. The 512 px icon is `assets/images/android-icon.png`.
- There's no push script yet, and `gplay` has the same catch: managed publishing is off, so
  the Play API refuses `changesNotSentForReview` ("Changes are sent for review
  automatically"), and committing any API edit sends every change queued in the console for
  review. Check Publishing overview first, or edit the listing in the console (Store
  presence › Store listings). The full "Save" only queues the change in
  Publishing overview, and it's what ticks "Set up your store listing" on the dashboard; both
  languages were saved that way with the current copy. To script it later, turn on managed
  publishing first.
- App content, set in the console: no ads, no advertising ID, no sign-in, not a government,
  financial or health app, target age 18+, IARC "All other app types" with every answer no
  (Everyone, PEGI 3, USK 0). Data safety declares two collected types, both from the
  expo-updates check, neither shared: device or other IDs (the random install ID, for app
  functionality and analytics) and crash logs (the failed-update error, for analytics), both
  required and encrypted in transit; no accounts; the optional deletion question is left
  blank. Revisit it when the app gains a network call or an SDK that sends data, and keep it
  in line with the privacy policy.
- Signing: Play App Signing with a Google-generated app signing key (the console's default;
  Play signs what it delivers). Our Bitwarden key ("Hopwatch Play upload key", CN=Hopwatch,
  O=Urbs UG, SHA-256 92:A8:D2:2E:…:B6:DC) is the upload key, registered by the first upload.
  Fingerprints of both are under Protected with Play › App signing.
- Releases: `scripts/m1.sh android-release` builds the signed AAB into `dist/`. Upload it in
  the console (Test and release › Internal testing › Create new release), since an API edit
  would also commit the queued listing. Release notes go in one `<en-US>…</en-US><de-DE>…</de-DE>`
  block; check that both languages survive "Save as draft" before publishing (the German one got
  dropped once). The bundle is too big for the console's browser bridge in one piece; it went
  in through chunked `eval` calls and a `DataTransfer` on the upload input.
- Internal testing: first release 1.1.0 (versionCode 29849538) rolled out 2026-10-02, no
  review needed. Testers: the email list "Hauke" (haukeschnau@gmail.com). Opt-in link:
  https://play.google.com/apps/internaltest/4701468743687124341. Until the app has passed a
  first review, testers see it as "dev.schnau.hopwatch (unreviewed)".
- Production: all 178 countries and regions Play lists, Rest of World included. Release
  29849538 (1.1.0), promoted from internal testing, with the public notes "Hello! This is the
  first version of Hopwatch." / "Hallo! Das ist die erste Version von Hopwatch.", confirmed
  with Next › "Save" on 2026-10-05. Publishing overview then lists 12 changes (the full
  rollout, the countries, both listings, the App content declarations, the category) and Play's
  quick checks passed ("Your changes can now be sent for review"). Sent for review on
  2026-10-05 ("Submit 12 changes for review" → "Send changes for review"; the confirmation
  needs a few seconds before the page may be reloaded). Managed publishing stays off
  (Hauke's call), so Google publishes as soon as it approves.

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

`screenshots/play/<locale>/{phone,tablet-7,tablet-10}/` holds the Google Play screenshots,
rendered by `screenshots/render.sh play` from `screenshots/raw/android/<set>/<locale>/`: the
same captions without the two Apple Intelligence shots (`only: 'app-store'` in `shots.js`), so
four per set. Phone and 7-inch frames are 1080 x 1920, 10-inch ones 1440 x 2560 (Play wants at
least 1080 px a side there), all 9:16. Both languages are on the listing: en-US as the default,
de-DE replacing the inherited English images in the translation.

The captures come from the release AAB, turned into a universal APK with bundletool from the
M1's Gradle cache and installed on three emulators from the android-36 Google APIs image:
`hopwatch-pixel` (Pixel 9, 1080 x 2424) for phones, `hopwatch-tablet-7` (Nexus 7 2013 profile,
1200 x 1920) and `hopwatch-tablet-10` (Pixel Tablet profile, rotated to portrait, 1600 x 2560).
Before capturing: clock set to Friday 15:08 (`adb root`, `date`), SystemUI demo mode for a
15:09 clock, full Wi-Fi and battery and no notification icons, app data cleared, per-app locale
set (`cmd locale set-app-locales dev.schnau.hopwatch --locales de` for German), sample data
loaded in onboarding. Light mode, except the Stuff shot (`cmd uimode night yes`).

// The store screenshots, in store order: which raw capture each frame shows (raw/<locale>/<raw>
// from the iOS simulator, raw/android/<set>/<locale>/<raw> from the Android emulator), its
// caption per locale (the second line is the candy-colored one), whether the frame uses the
// plum night background, and `only` for a shot one store leaves out. frame.html renders one
// of them, render.sh renders them all. No em dashes in captions.
window.SHOTS = [
  {
    id: 'now',
    raw: 'now.png',
    caption: {
      'en-US': ['Tap a jelly.', 'Watch it hop.'],
      'de-DE': ['Tipp ein Jelly an.', 'Und hopp!'],
    },
  },
  {
    id: 'day',
    raw: 'day.png',
    caption: {
      'en-US': ['Your day,', 'bean by bean.'],
      'de-DE': ['Dein Tag,', 'Bohne für Bohne.'],
    },
  },
  {
    id: 'week',
    raw: 'week.png',
    caption: {
      'en-US': ['Hours in bubbles.', 'Goals in jars.'],
      'de-DE': ['Stunden in Blasen.', 'Ziele in Gläsern.'],
    },
  },
  {
    id: 'typed',
    // Apple Intelligence, which the Android app doesn't have.
    only: 'app-store',
    raw: 'typed-log.png',
    caption: {
      'en-US': ['Forgot one?', 'Just type it.'],
      'de-DE': ['Was vergessen?', 'Einfach eintippen.'],
    },
  },
  {
    id: 'new-jelly',
    // Apple Intelligence, which the Android app doesn't have.
    only: 'app-store',
    raw: 'new-jelly.png',
    caption: {
      'en-US': ['Name it.', 'It dresses the part.'],
      'de-DE': ['Ein Name genügt.', 'Der Look kommt mit.'],
    },
  },
  {
    id: 'stuff',
    raw: 'stuff-dark.png',
    dark: true,
    caption: {
      'en-US': ['Jellies can live', 'inside jellies.'],
      'de-DE': ['Jellys wohnen', 'auch in Jellys.'],
    },
  },
];

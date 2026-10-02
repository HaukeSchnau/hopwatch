// The App Store screenshots, in store order: which raw simulator capture each frame shows
// (raw/<locale>/<raw>), its caption per locale (the second line is the candy-colored one)
// and whether the frame uses the plum night background. frame.html renders one of them,
// render.sh renders them all. No em dashes in captions.
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
    raw: 'typed-log.png',
    caption: {
      'en-US': ['Forgot one?', 'Just type it.'],
      'de-DE': ['Was vergessen?', 'Einfach eintippen.'],
    },
  },
  {
    id: 'new-jelly',
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

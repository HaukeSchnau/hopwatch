// Writes src/core/slack-emoji.json: each emoji's Slack name, keyed by its code points
// (lowercase hex joined by "-", without the FE0F variation selector), so a jelly's emoji
// can be its Slack status emoji. Slack's names are iamcal/emoji-data's (MIT).
//
//   git clone --depth 1 https://github.com/iamcal/emoji-data ~/context/iamcal-emoji-data
//   node scripts/slack-emoji.mjs ~/context/iamcal-emoji-data/emoji.json

import { readFileSync, writeFileSync } from 'node:fs';

const source = process.argv[2];
if (!source) throw new Error('usage: node scripts/slack-emoji.mjs <emoji-data/emoji.json>');

const names = {};
for (const emoji of JSON.parse(readFileSync(source, 'utf8'))) {
  const key = emoji.unified
    .toLowerCase()
    .split('-')
    .filter((cp) => cp !== 'fe0f')
    .join('-');
  names[key] = emoji.short_name;
}
writeFileSync(new URL('../src/core/slack-emoji.json', import.meta.url), JSON.stringify(names) + '\n');
console.log(`${Object.keys(names).length} emoji`);

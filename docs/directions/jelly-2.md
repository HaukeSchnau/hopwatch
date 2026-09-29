# Jelly 2

Hauke tried all five directions. His verdict, in his words:

> I like the vibe of Jelly the most overall. My only issues with it:
> - It doesn't feel quite as native as I'd like it to
> - The Jellys all look kind of the same aside from the color. I'd love for them to each
>   have more personality and be unique.
>
> I like the dial of Orbit.
> I like the native feel of Glass.

So Jelly becomes the app, and round two brings three things into it. Everything that
makes Jelly Jelly stays: the gummies with faces, the hop onto the stage, jelly beans,
candy jars, bead strings, confetti, the joy. What changes is described below. The
original brief and "As built" notes are in [jelly.md](jelly.md).

## 1. Every jelly is someone

Today every gummy is the same lumpy blob with the same two dot eyes and the same smile;
only the color and the emoji sticker differ. Each context should become a character you
recognise at a glance, even without color.

- **Traits.** A look combines a body archetype (e.g. round blob, teardrop, bean, squat
  mochi, gummy bear, soft star, ghost with a wavy hem, tall capsule), eyes (dots, big
  shiny, sleepy lids, wink, one big cyclops eye, round glasses, sunglasses), mouth
  (smile, cat :3, open "o", tongue out, toothy grin, tiny fang), a topper (sprout,
  antenna, horns, cat ears, floppy dog ears, bow, party hat, chef hat, crown,
  headphones, halo, sweatband) and a surface detail (freckles, sprinkles, stripes,
  spots, sparkle). Pick the real list by what reads well; quality over quantity.
- **Meaningful by default.** The look is derived from the context: emoji and name hint
  at a fitting topper or accessory (🐕 floppy ears, 🎧 headphones, 💼 glasses or a tie,
  🍳 chef hat, 🏃 sweatband, 🌱 sprout, 🚀 antenna, 🥪 a munching mouth), the rest comes
  from a seed of the context id, so two contexts almost never share a look. It must be
  stable: the same context always looks the same.
- **Personality in motion.** Characters behave differently: a bouncy one hops, a dozy
  one yawns more, a nervous one jitters, a proud one puffs up. Keep it subtle and cheap
  (JS timers and Reanimated, no per-frame JS).
- **Yours to change.** The context editor gets a "Look" section: a big live preview,
  a way to change each trait, "Surprise me" to reroll, and "Automatic" to go back to the
  derived look. Custom looks are stored with `actions.setPref('jelly.look.<contextId>',
  …)` and read with `usePref` (src/core/hooks.ts).
- **Legible at every size.** From 28 pt in list rows and toasts to 200 pt on the stage.
  Small sizes drop fine detail. Sleeping, awake, blinking, looking around and yawning
  must work for every eye style.

## 2. Native, like Glass

Jelly should feel like a first-party iOS app that happens to be full of candy.

- **Tabs.** Replace the custom floating tab bar with `NativeTabs` (Liquid Glass) and SF
  Symbols, tinted with the running context's candy color. Away from Now, the running
  jelly rides above the tab bar as a `NativeTabs.BottomAccessory` mini player (name,
  live timer, stop), like Glass.
- **Type.** SF Pro Rounded (`fontFamily: 'ui-rounded'` and the system font with weights)
  instead of Fredoka and Nunito. It keeps the friendly roundness and reads as native.
  Tabular numbers for times.
- **Navigation.** Large titles and native headers with toolbar buttons (gear, +, search
  in Stuff) where screens are lists; form sheets with detents and grabbers for details.
- **Controls.** Native context menus (`@expo/ui/community/menu` `MenuView`, long-press)
  on tiles, beans and rows for backdating ("Started 5 / 10 / 15 / 30 / 45 min ago", "At a
  time…", "Edit"), native date pickers, a native segmented control for Day/Week, swipe
  actions in Stuff, SwiftUI forms (`@expo/ui/swift-ui` Form, Section, Toggle, Stepper,
  Picker) for settings and the editor, with a candy header on top.
- **Appearance.** Follow the system: a light candy mode and a dark "night candy" mode.
  Grouped backgrounds and materials can come from the system, the candy stays candy.
- **Haptics and motion** stay Jelly's, but respect Reduce Motion.

## 3. Orbit's dial, in candy

- A 24-hour dial drawn with Skia in Jelly's language: a glossy candy track, entries as
  jelly-bean arcs with rounded caps and highlights, the running entry growing live in its
  color with a soft glowing head, midnight at the bottom and noon at the top like Orbit.
  Start from `src/directions/orbit/Dial.tsx` and `geometry.ts`; copy what you need into
  Jelly's folder rather than importing from Orbit.
- **Now.** The stage becomes the dial: the running jelly sits in the middle of today's
  ring, with its name, the live timer and "since 09:12" close by. The hop lands in the
  middle of the ring, and the new arc lights up in the jelly's color.
- **Day.** The dial sits above the jelly-bean timeline as the day's overview; tapping an
  arc selects its bean, tapping a dark stretch fills the gap. The bean timeline stays
  for precise editing.

## Keep

All MVP behaviour from docs/building-a-direction.md keeps working: switching, undo,
back/resume, backdated start and stop, nudge intent, context tree editing, timeline drag
and gap fill, entry detail, reports with targets, fragmentation and copy totals,
settings with the Lab, export, sample data and erase.

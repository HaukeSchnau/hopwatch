# Jelly characters

Round two of Jelly asked that every jelly be someone ([jelly-2.md](jelly-2.md), section 1).
This is how the characters work: the traits, how a look is picked, how it's stored, the
API the rest of Jelly uses, and what's still rough.

Code lives in `src/jelly/character/`, plus `Gummy.tsx`, `Character.tsx`,
`Mould.tsx` and `geometry.ts` one level up. The dev-only gallery is `/looks`.

## The look

A look is seven traits. Color and emoji stay on the context. Every combination renders,
so looks can be derived, rerolled and edited one trait at a time.

| Trait | Options |
| --- | --- |
| Body | blob, gumdrop, drop, bean, mochi, capsule, onigiri, star, ghost |
| Eyes | dots, shiny, googly, sleepy, happy, cyclops, glasses, shades |
| Mouth | smile, grin, cat, oh, blep, fang, munch (buck teeth), smirk, wobbly |
| Head | none, curl, sprout, flower, antenna, horns, cat ears, bear ears, bunny ears, dog ears, bow, party hat, chef hat, crown, headphones, halo, sweatband, grad cap, beanie, propeller |
| Neck | none, bow tie, tie, scarf, collar, bib, medal |
| Coat | plain, freckles, sprinkles, spots, stripes, sugar, belly, sparkle |
| Mood | bouncy, dozy, jittery, proud, curious, dreamy, wiggly |

The lists and the editor's names are in `traits.ts`. The editor calls the topper "Head",
the surface "Coat" and the motion "Mood".

Every eye style sleeps, wakes, blinks and glances. Most close into arcs. Shiny and
cyclops eyes keep their lashes when closed. Googly eyes shut their bulging lids. Shades
get pushed up onto the forehead while the jelly sleeps and drop back on when it wakes.
Every mouth gives way to the same yawn.

## How a look is picked

`lookFor(context, picked?)` in `derive.ts` is stable for a context's id, emoji and name,
and for the model's picks when there are any.

1. The id seeds every trait from weighted lists of generic options. Picks always happen
   in the same order, so a new emoji or topic only changes the traits it brings.
2. One topic (`topics.ts`) overrides some traits. With Apple's on-device model, the topic
   it picked for the current name and emoji wins (see below). Otherwise the emoji picks
   the topic; without a known emoji, words in the name do (English and a few German
   words, whole words or prefixes like `cook*`). Only one topic ever applies, so a jelly
   never mixes two. For example 🐕 or "Gassi" gives dog ears, a collar, a blep and bounce. 🍳
   gives a chef hat, 🥪 buck teeth and a bib, 🎧 headphones and sleepy eyes, 💼 glasses
   and a tie, 🏃 a sweatband, 🎓 a grad cap, ⏱️ an antenna and one big eye. A few emoji
   pick a body: ⭐ star, 👻 ghost, 🍙 onigiri, 🍡 mochi, 💊 capsule, 💧 drop, 🫘 bean.
3. The mood the model picked, if any, goes on top.
4. Meaningful options (chef hat, dog ears, headphones, sweatband, grad cap, tie, collar,
   bib, medal) never come from the random pick, so a jelly never wears a misleading hat.

Each id also stretches its body a little (±5 %) and may mirror a drop. Coat patterns are
seeded too. Two contexts with the same body still differ.

## Where a look comes from

Per trait, the first that has it wins:

1. A preview look passed to `Character` (`look` prop). Never stored.
2. The custom look: traits picked by hand in the editor.
3. The automatic look (`lookFor`): the seeded base, dressed by the model's picks if they
   were made for the context's current name and emoji, else by the heuristic topic.

"Automatic" in the editor means 3.

Both stored looks are device-local preferences (`actions.setPref`, `usePref`):

- `jelly.look.<contextId>`: the custom traits, e.g. `{ "topper": "crown" }`. Saving a
  trait that equals the automatic one drops it, so it keeps following the automatic
  look. An empty result stores `null`, which is "Automatic".
- `jelly.look.ai.<contextId>`: the model's picks,
  `{ "v": 2, "name": "Dog", "glyph": "🐕", "topic": "dog", "look": { "motion": "bouncy" } }`.
  Only used while `name` and `glyph` match the context. `topic` is null when the model
  found none or failed; the heuristic topic applies then. Version 1, `{ name, look }` with
  the topic's topper and neckwear, still applies while the name matches, and dress-up
  replaces it once (`SUGGESTION_VERSION` in `ask.ts`; bump it when the picks change).

Unknown values (say, after a trait or topic is renamed) are dropped when reading, so that
trait falls back to the next source.

## Apple's on-device model

A progressive enhancement through `@modules/on-device-model`. Without the model, none of
this shows up and the heuristics do all the work.

One request per jelly (`requestFor` in `ask.ts`). The model picks:

- a topic from `topics.ts` (dog, focus, office, meetings, clients, cooking, eating,
  sport, study, code, …, or other). The topic dresses the whole jelly: eyes, mouth, mood,
  coat, body, hat and neckwear, whatever the topic has. It replaces the heuristic topic
  instead of mixing with it. "other" leaves the heuristic topic in place.
- a mood (`motion`), on top of the topic's.
- for a jelly being named: an emoji, shown with ✨ until the emoji is touched.
- for a new top-level jelly: a color, shown with ✨ until the color is touched. Only
  candy colors the other top-level jellies don't wear are offered (gray never), so groups
  stay apart. Jellies inside a group keep inheriting their parent's color.

Body, coat, eyes and mouth are never asked for directly. Eval with `scripts/model.sh`
(46 English and German names: jobs, clients and project code names under groups, chores,
hobbies, family, health, vague ones; same request as the app):

- Topic: right for about 42 of 46 in the last run. Misses: "Nickerchen" became family,
  "Steam Deck" code, "Doomscrolling" urgent. Some names flip between runs:
  "Steuererklärung" money or clients, "Date night" love or family, an older sample data set's
  "Stint ⏱️" science, code, tinkering and once garden (its sibling is Garden planner 🌱).
- Mood: sensible for about 42 of 46 ("Deadline crunch" jittery, "Commute" dozy,
  "Daydreaming" dreamy, "Bug bash" jittery). Described as adjectives ("energetic",
  "calm"), it said "curious" for nearly everything; describing each mood by the
  activities it fits fixed that.
- Eyes and mouth: dropped. It said "sparkly" or "googly" eyes for 30 names and "open
  mouth" for 28.
- Color: plausible (red for deadlines and sport, green for the garden, blue for
  meditation), with a lean toward orange, lime and teal. Gray was its pick for dull names
  until it was taken off the list. Color words ("yellow", "purple") work better than the
  palette's keys.
- Latency, median model time per request on the shared M1: 2.5 s for a jelly being named
  (emoji, topic, mood, color) against 1.8 s for the old emoji and topic (p90 4.1 s
  against 3.4 s). Under heavy load (load average 40 to 65): 2.8 s against 2.3 s, and
  dress-up (topic and mood) 2.6 s against 2.3 s. A cold "Try a Suggestion" in the
  simulator took 9 s. Still one request per jelly; the suggestion shows up a moment later
  than before.

What else I learned tuning the prompt:

- Asking for hats directly made it either say "none" for everything or hand out crowns
  and ties to every work context. Topics fixed both.
- The group wins too easily: everything under Clients became "clients", even Website 🌐
  and App 📱. Listing the group first, saying "judge by the activity's own name" and
  "work done for a client gets the topic of the work" fixed that; client names like Acme
  stay "clients".
- "Names can be English or German" and putting the emoji first helped. Asked after the
  mood, the emoji drifted to 😴 for anything dozy.
- "Cooking" next to "Dog" once tripped a safety guardrail. `suggestForContext` asks
  again without the group when a request fails.
- It sometimes repeats a sibling's emoji even when told not to, and once answered
  "aurora" in letters. Emoji answers must be exactly one emoji grapheme (`singleEmoji`);
  a taken or invalid one falls back to the topic's first free emoji.

`useDressUp()` (mounted once in Jelly's layout) walks the tree when the model is
available and asks about every context without current picks (latest version, made for
its name and emoji), one request at a time. Each context, name and emoji is tried once
per launch. A failed answer isn't stored, so the next launch asks again: while the M1's
model was stuck mid-update, the simulator still reported it available and every request
failed. A rename or a new emoji asks again; until the answer comes, the heuristic topic
applies. Archived contexts and contexts with every trait picked by hand are skipped. It
never touches emojis or colors. When a jelly's topper changes, the new one drops in with
four sparkles (`useDress` in Gummy), which also plays for picks in the editor.

## Motion

`useLively(face, enabled)` plays the personality of whichever Character wears the face
(the Character writes its look's motion into `face.motion`). Each personality has its own
blink rate, glance rate and reach, and a signature move now and then:

- bouncy: a hop, sometimes two
- dozy: a big yawn, or eyes drooping shut and a startled jolt
- jittery: a quick shiver, fast glances, double blinks
- proud: puffs up with its chin raised and smug eyes
- curious: tilts its head and peeks to one side
- dreamy: a slow sway, gazing up
- wiggly: a happy wiggle

Moves are one-shot Reanimated animations on the face's shared values, scheduled with JS
timers, so nothing runs per frame on the JS thread. Body moves draw on a view transform in
Character; only face changes redraw the Skia picture. With Reduce Motion on, jellies only
blink and glance.

## Rendering

Everything is drawn in a 100-unit box scaled to `size`, with the body standing on a
floor at y = 90 and the top third left for hats. Anchors (face, crown, ears, sides, neck,
gloss) are measured from each body's outline by hit-testing, so every part fits every
body and every seeded stretch. Geometry is cached per body and seed.

Layers, back to front: colored shadow, ears behind the head, the candy body (gradient,
inner shade, rim light, glow), coat and gloss clipped to the body, cheeks, neckwear, eyes
and mouth, then everything else on the head.

Detail drops with size: below 44 pt the face is 22 % bigger and highlights, lashes,
cheeks, sprinkles, sugar and fine hat details disappear; below 84 pt the finest lines go.
The candy material is the same in light and dark; only the shadow glow follows the theme.
Faces are always plum (`INK`), never the theme's text color.

## API for the rest of Jelly

- `Character` props: `context` (`{ id, hue, glyph, name? }`, a `ResolvedContext` fits),
  `size`, `face`, `mood`, `shadow`, `dim`, `style`, plus two optional ones: `look` (a
  `Partial<Look>` preview over the resolved look, never stored) and `sticker` (the emoji
  badge, shown from 36 pt by default; it sits at the bottom right so hats have room). The
  sticker is a third of the jelly but never under 23 pt, so the emoji reads in list rows;
  on small jellies it hangs out of the box to keep clear of the face, so rows leave a few
  points of room after the jelly.
  Pass `name` for look-alikes such as the onboarding preview, so name hints work.
- `Gummy.tsx`: `useFace`, `wake`, `sleep`, `useLively`, `Face` as before. `Face` gained
  body-motion values (`hop`, `squash`, `tilt`, `puff`, `shiver`) and `motion`; callers
  don't need to touch them.
- `Mould`: `seed`, `size`, `color`, `fill` as before, and an optional `context`. With
  only a seed it looks the context up by id, so tiles don't need changes. Its outline is
  the body archetype's.
- `LookEditor` (`character/LookEditor.tsx`): `{ context, preview? }`. `preview={false}`
  hides its own 184 pt preview for sheets that already show the jelly at the top.
- `character/suggest.ts`: `useModelAvailable()`, `suggestForContext(input)`,
  `saveSuggestedLook(contextId, picked, forName, forGlyph)`, `useDressUp()`, plus
  `suggestInputFor(tree, context)` for existing contexts.
- `character/ask.ts` (pure, tested): `SuggestInput` (`wantEmoji`, `wantHue`, siblings
  with their hues), `Suggestion` (`topic`, `traits`, `emoji`, `hue`), `requestFor(input)`,
  `readAnswer(input, answer)`, `hueChoices(siblings)`, `singleEmoji(text)`, and the stored
  form: `parseSuggestion`, `suggestionJson`, `freshPick`, `isCurrent`.
- `character/topics.ts` (pure, tested): `topics`, `topicFor(glyph, name)`, `Picked` and
  `dress(base, source, picked)`.
- `character/look.ts`: `useLook(context)`, `useAutoLook(context)`, `useCustomLook(id)`,
  `saveCustomLook(id, picked, auto)`, and the preference keys.
- `suggestions.ts`: `useNameSuggestion(name, parentId, emoji, wantHue)` for jellies being
  named. To preview a suggestion, pass `lookFor(draft, suggestion)` as the `look`.
- `character/idle.ts`: `hop`, `yawn`, `shiver`, `puff`, `tilt`, `sway`, `wiggle` and
  `perform(face, motion)` to play a move on demand.

The Stage still runs its own hop timer. It can go: the running jelly now hops, yawns or
wiggles by its personality.

## Gallery

`/looks` exists only in development (`__DEV__`). `?s=` picks sections, comma
separated: `grid`, `more`, `live`, `dark`, `sizes`, `bodies`, `eyes`, `mouths`,
`toppers`, `necks`, `coats`, `editor`, `model`, `dress`. `?m=awake` wakes them, `?b=star`
puts trait rows on another body. It shows real contexts once there are nine, else
stand-ins for the sample data.

## Screenshots

In `.shots/`: `j2c-grid-asleep.png`, `j2c-grid-awake.png`, `j2c-grid-dark.png` and
`j2c-grid-gray.png` (all 17 sample contexts; gray checks they differ without color),
`j2c-editor.png` and `j2c-editor-dark.png`, and the trait sheets `j2c-gallery-*.png`.

## Known limitations

- At 28 pt the body uses about two thirds of the box because the top is kept free for
  hats. 32 to 36 pt reads better in list rows.
- A few combinations are awkward: a sweatband across a star's arms, headphones over a
  drop's tip. Hats sit where the head is 22 units wide, which hides a drop's or star's tip.
- Neckwear shrinks on squat bodies (mochi) and can touch a wide grin.
- The ✦ in the editor marks the automatic option of each trait; it isn't explained in
  the UI.
- Dress-up retries within a launch only if the model became unavailable mid-way; a
  context whose request failed waits for the next launch. A name that always trips a
  guardrail costs one background request per launch.
- The model's topic beats the emoji, so "Halloween party 👻" gets a party look rather
  than a ghost body. Topics the model isn't offered (alien, time, magic, star, ghost and the other
  body shapes) only come from the heuristic, so they apply when the model says "other".
- Derivation looks at one context at a time, so neighbours can share traits by chance
  (in an older sample data set, Stint and Garden planner are both one-eyed onigiri, told apart by
  antenna, sprout and color).
- Checked on the simulator only. The model answered from the simulator through the M1's
  Apple Intelligence; an iPhone 16 Pro should behave the same but hasn't been tried.

## Core requests

None. `usePref` and `actions.setPref` covered storage.

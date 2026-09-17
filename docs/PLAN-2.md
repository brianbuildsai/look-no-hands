# An Atlas of Nowhere — plan for the second show

The first show proves an AI can program light, physics, learning and sound.
The second proves something different: that it can **invent a coherent world**
and present it with the discipline of a real craft. Everything about it is the
opposite of "Look, no hands." on purpose.

| | Look, no hands. | An Atlas of Nowhere |
|---|---|---|
| Ground | True black, a dark room | Chart paper, daylight |
| Structure | Five rooms you scroll through | One sheet you explore |
| The visitor | Touches finished works | Supplies the seed: a word |
| Capability shown | Simulation, graphics, ML, audio | World-building, naming, cartography, data design |
| Type | Soft old-style serif | Hydrographic chart conventions |
| Result | The same for everyone | Yours; nobody else has that planet |

## What it is

Type any word. It becomes a planet: continents, shelves and deeps, mountain
ranges, a few dozen towns, seas and peaks, all **named in that world's own
invented language**, drawn as a turning globe in the style of a nautical
chart. The same word always gives the same world, so a world can be shared as
a link. Nothing is stored or fetched; the word is the whole database.

- **Subject:** a chart-maker's atlas of a planet that does not exist.
- **Audience:** anyone. The first thing people type is their own name.
- **Primary job:** "it made a whole world out of my name, and it all hangs together."

## How the visitor uses it

1. Arrives to a finished world for a default word, globe slowly turning.
2. Types a word, presses "Draw this world". The globe fills in from pole to
   pole as the survey is actually computed (that is the one load animation).
3. Drags to turn the globe. Labels ride on the sphere and hide behind the limb.
4. Clicks a town, sea or peak (on the globe or in the gazetteer): the globe
   flies there and an entry opens: coordinates, height, population, one line
   about the place.
5. "Copy link to this world" puts the word in the URL. "Another word" rolls one.

## Design tokens

**Color** — printed chart stock, not cream. Depth tints and land buff follow
real hydrographic practice; magenta is the traditional chart colour for notes.

| Name | Hex | Role |
|---|---|---|
| Stock | `#F4F6F3` | Page, cool white chart paper |
| Ink | `#14202B` | Text, coastlines, neatline |
| Shoal | `#C5E1EC` | Shallow water tint; pale UI fills |
| Deep | `#7FB0CC` | Deep water tint |
| Buff | `#EEDDAA` | Land; darkens to ochre with height |
| Magenta | `#A8286F` | Interactive marks, selection, graticule figures (about 6:1 on Stock) |

**Type** — the conventions are the design. On charts, water is always named in
letterspaced italic serif, land and towns in upright sans. The page follows the
same rule: anything about the sea or the world's story is Caslon italic,
anything you can operate or measure is Barlow.
- *Libre Caslon Text* (regular, italic, bold) — title, water names, prose.
- *Barlow Semi Condensed* (400/500/600) — town names, figures, controls, tables.
- Scale: 13 / 15 / 18 / 24 / 36 / clamp(44px, 7vw, 104px). Prose max 62ch.

**Layout** — one chart sheet inside a ruled neatline with graduated ticks, a
title block at upper left as on a real chart, the globe right of centre, a key
(depth tints, heights, scale) at lower left. Gazetteer and almanac below the
sheet in ruled columns. Left-aligned throughout.

```
┌ An Atlas of Nowhere ─────────────────────────── the other show ┐
│ ╔════╤════╤════╤════╤════╤════╤════╤════╤════╤════╤════╤════╗ │
│ ║ Velmora                                                    ║ │
│ ║ a world drawn for “brian”               ╭────────────╮     ║ │
│ ║ [ type a word        ] [Draw this world]│   globe     │    ║ │
│ ║ Another word   Copy link to this world  │  drag to    │    ║ │
│ ║                                         │   turn      │    ║ │
│ ║ key: depths ▁▂▃  heights ▁▂▃  scale ├──┤╰────────────╯     ║ │
│ ╚════╧════╧════╧════╧════╧════╧════╧════╧════╧════╧════╧════╝ │
│ Gazetteer: towns · seas · peaks (click to fly there)  Almanac  │
│ How this was made                                               │
└─────────────────────────────────────────────────────────────────┘
```
Mobile: title block, then globe full width, then key, gazetteer as one column.

**Principles**
1. Every mark obeys a real cartographic convention. Authority comes from the
   vernacular, not from decoration.
2. The globe is the only loud thing. Paper, rules and type stay quiet.
3. The world must be internally consistent: one language per world, towns on
   coasts and lowlands, peaks on ranges, seas in deep water.
4. One orchestrated moment: the survey filling in. After that, motion only
   answers the visitor (drag, fly-to), plus a slow idle turn that stops under
   reduced motion.

## Review against the generic default

The default "procedural planet" is a dark space scene with a glowing realistic
Earth-like sphere, stars and a sci-fi HUD. This is deliberately none of that:
daylight, paper, ink, and a chart-maker's typography. Revisions to my first draft:
- Space background and atmosphere glow → removed; the globe sits on paper.
- Monospace coordinates → Barlow with tabular figures, as on printed charts.
- Card grid for places → ruled gazetteer columns, like an atlas index.
- Rivers → cut from the core plan (needs depression filling to be correct);
  listed as a stretch task only if everything else is green.

## Engineering

- Same rules as show one: no build chain, no libraries, classic scripts, opens
  from disk, fails politely, class-based state, files built in sections.
- World generation is deterministic from the word: string hash → seeded PRNG →
  3D gradient noise on the sphere → 1024 × 512 elevation grid, computed in
  slices so the page never locks and the globe can show it arriving.
- Globe: WebGL ray–sphere in a fragment shader reading the elevation texture;
  depth tints, hill shading, contours, coastline and graticule drawn
  analytically with derivative-based anti-aliasing. Canvas 2D fallback message.
- Labels: a 2D canvas over the globe, places projected each frame, culled at
  the limb, thinned by priority so they never overlap.
- Generator and naming are plain functions, tested in Node first: determinism,
  land share in range, no duplicate or degenerate names, timing.

## Tasks (each one commit, each verified)

1. Sheet shell — `atlas.html`, `css/atlas.css`, tokens, title block, neatline,
   empty gazetteer and almanac, cross-links in both mastheads and both colophons.
2. World generator — hash, PRNG, noise, elevation grid in slices, sea level
   from target land share, world statistics. Node-tested.
3. Globe — shader, drag with inertia, idle turn, fill-in reveal, resize, fallback.
4. Language and places — per-world phonology, town/sea/peak siting and naming,
   populations and one-line descriptions. Node-tested.
5. Labels and gazetteer — label canvas, hit-testing, fly-to, entry panel,
   gazetteer columns, keyboard operation.
6. Word, link, chance — input flow, URL hash, copy link, "another word".
7. Key and almanac — depth/height key, scale bar, statistics table, colophon.
8. Adversarial pass on both shows — 375/1440 overflow, computed contrast,
   reduced motion, NaN hunt, undefined classes, console after hard reload;
   true line counts into both colophons; README.

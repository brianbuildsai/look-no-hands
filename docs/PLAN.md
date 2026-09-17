# Look, no hands. — build plan

An online exhibition of five live, interactive works. Nothing on the page is an
image, a video, or a library: every pixel and every sound is computed in the
visitor's browser by code written in this session. The site is the proof of
what AI can do, instead of a page that talks about it.

- **Subject:** a gallery show of computed light, language, learning, life, sound.
- **Audience:** anyone — it has to land with someone who has never heard of a shader.
- **Primary job:** make the visitor play with each work and think "a machine made this?"
- **Title:** "Look, no hands." — what a kid shouts on a bike, and literally true here.

## The five rooms

| Room | Work | What the visitor does | How it is made |
|---|---|---|---|
| 1 (hero) | *Quicksilver* | A drop of liquid metal follows the pointer and merges with the body | Raymarched signed-distance field, GLSL, adaptive resolution |
| 2 | *Murmuration* | Types anything; 40,000 points of light assemble the words | WebGL points, CPU spring physics, text sampled from an offscreen canvas |
| 3 | *Study for a Mind* | Watches a real neural network learn; adds points, swaps datasets | MLP + Adam written from scratch, live decision surface and per-neuron views |
| 4 | *Turing's Garden* | Paints into a reaction–diffusion system and picks a "species" | Gray–Scott on the GPU, float ping-pong textures, lit shading |
| 5 | *Aeolian Harp* | Strums strings of light; or lets the machine wind play it | Web Audio synthesis, generated reverb, string physics |

Colophon: the one-sentence brief that produced the site, plus true counts
(lines of code, 0 images, 0 libraries) and an invitation to view source.

## Design tokens

**Color** — a dark room for light installations. True black so the works have
no frame and dissolve into the page. Colour comes from the works, never from chrome.

| Name | Hex | Role |
|---|---|---|
| Void | `#000000` | Page. Works fade to it at their edges |
| Bone | `#E9E6DF` | Wall text, titles |
| Ash | `#8F8D88` | Secondary text (6.3:1 on Void) |
| Amber | `#FFB347` | Warm pole inside works; focus ring |
| Ultramarine | `#3D5BFF` | Cool pole inside works |
| Rose | `#FF4F7B` | Rare third hue inside works |

**Type**
- *Fraunces* (variable: opsz, wght, SOFT, WONK) — titles and wall text. The most
  hand-cut-looking serif available, used by something with no hands. Its axes
  animate once, on load.
- *Hanken Grotesk* — placard data and controls, tabular figures. No monospace.
- Scale (ratio ~1.5): 14 / 16 / 21 / 32 / 48 / 72 / clamp(64px, 13vw, 220px).
- Wall text max 58ch, line-height 1.45. Sentence case everywhere.

**Layout** — left-aligned, asymmetric, like vinyl wall text beside a work.

```
┌───────────────────────────────────────────────┐
│ Look, no hands.                 rooms 1 2 3 4 5│  fixed, quiet
│             ░▒▓ liquid sculpture ▓▒░           │
│ Look,                                          │
│ no hands.      (huge serif, difference blend)  │
│ Five live works…                               │
└───────────────────────────────────────────────┘
┌───────────────────────────────────────────────┐
│          full-bleed live work                  │
│                                                │
│ Title, italic                                  │
│ 2026. medium, live figures        [controls]   │
│ One short paragraph.                           │
└───────────────────────────────────────────────┘
  wall text between rooms — large serif, left
```

Mobile: work on top (70svh), placard and controls stacked below.

**Principles**
1. The works are the only loud thing. Chrome is text, nothing else.
2. Museum vernacular: wall labels with live figures (frames per second, points,
   loss, viewport as "dimensions").
3. One orchestrated motion moment — the hero condensing on load. Everything
   else moves only because the work is alive or the visitor touched it.
4. Every claim on the page is checkable (view source).

## Review against the generic default

The default answer to this brief is: purple-blue gradient, glass cards, a
particle-network background, gradient headline text, a fake chatbot, stat
counters. None of that is here. Specific revisions made to my first draft:

- All-caps "ROOM 01" eyebrows → sentence-case wall labels.
- Monospace for live numbers → grotesk with tabular figures.
- Tinted near-black → true black, because borderless works need it.
- Fade-up on every section → removed; one load sequence only.
- Custom cursor → cut. The works answer the pointer; the cursor stays native.

## Engineering rules

- No build chain, no dependencies. Classic scripts so `index.html` opens from disk.
- Each work registers with a small core: runs only while on screen, pauses on
  hidden tab, adaptive resolution to hold frame rate.
- `prefers-reduced-motion`: works start paused with a visible "Play motion" control.
- WebGL / float-texture / audio failures show a plain message in the work's place.
- Class-based state selectors only. Files over ~400 lines are written as a
  skeleton, then filled by edits.

## Tasks (each one commit, each verified in the browser)

1. Scaffold — git init, root commit, branch `feat/exhibition`, launch config.
2. Page shell — HTML, tokens, type, nav, hero text, five room shells, wall
   texts, colophon. Verified at 375 and 1440, no canvases yet.
3. Core runtime — work registry, visibility pausing, frame loop, adaptive
   resolution, motion toggle, WebGL helpers, live placard fields.
4. Room 1 *Quicksilver* — hero shader, pointer-following drop, load sequence.
5. Room 2 *Murmuration* — particles, text input, pointer repulsion.
6. Room 3 *Study for a Mind* — network, trainer, decision surface, neuron
   views, dataset controls. Convergence tested in Node first.
7. Room 4 *Turing's Garden* — GPU simulation, painting, species presets, fallback.
8. Room 5 *Aeolian Harp* — synthesis, strings, self-playing wind, sound toggle.
9. Colophon and navigation — real counts, room progress, keyboard path.
10. Adversarial pass — specificity, undefined classes, NaN, 375/1440 overflow,
    contrast, reduced motion, console after hard reload. Fix, then README.

## After this: a second concept

Requested on approval: once "Look, no hands." is built, plan a wholly different
concept that visitors can navigate to from this site. That plan goes in
`docs/PLAN-2.md` and is shown before any of it is built. The nav built in
task 2 leaves room for a link between the two.

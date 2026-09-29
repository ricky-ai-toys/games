# Amber's Shark Hunt — Remake Design

**Date:** 2026-09-30
**Status:** Approved
**Supersedes:** `shark.html` (root single-file, 1038 lines)

## Problem

`shark.html` is a well-executed eat-and-grow arcade game whose climax does not work.

The fish table tops out at tier 5. Every threat test is `o.n > s.size`. At `size === 5` and
`6`, `5 > 5` is false for every possible object, so during the 8-second "APEX hold" finale:

- no damage is possible — lives are frozen
- no near-misses are possible — the `near * 25` bonus term is dead
- `dangerNear` is always 0 — no red vignette, no red danger glows
- `spawn()`'s danger-pool filter requires `n >= size+1` (i.e. `>= 6`) and returns an empty array

The last eight seconds before the win screen are a threat-free victory lap. Meanwhile the
entire game lives inside one 570-line closure factory (`beginHunt`, lines 460–1029), whose
`step()` is 161 lines doing timers, movement, AI, and two separate collision passes. It cannot
be tested, and the repo's own open task list names this file for crash-proofing that was never done.

## Goals

1. Make the APEX finale the tense highlight it was clearly meant to be.
2. Make the game logic testable headlessly, so balance is verified rather than guessed.
3. Ship a remake that reads identically on every device.
4. Preserve existing player saves.

## Non-goals

- No new meta-progression, unlock system, or campaign structure.
- No audio or image asset files. Art and sound stay procedural, per repo convention.
- No new dependencies, no build step, no ES modules.

## Architecture

Follows the `monopoly/` layout — the repo's newest game and the reference for a multi-file
vanilla game with a pure engine.

```
shark/index.html          shell, head meta, dependency-ordered script tags
shark/css/style.css       HUD, overlays, virtual joystick, FABs, safe-area insets
shark/js/data.js          SHData  — pure tables, no logic
shark/js/rules.js         SHRules — pure engine: state, step(), collision, scoring, growth
shark/js/ai.js            SHBots  — pure steering + apex predator phase machine
shark/js/sprites.js       SHSprites — vector creature painters
shark/js/render.js        SHRender  — scene composition, biomes, particles, effects
shark/js/audio.js         SHAudio   — procedural WebAudio synth
shark/js/ui.js            SHUI      — DOM overlays
shark/js/main.js          boot, input, rAF loop, teardown
shark/js/rules.test.js    node smoke harness
```

Each module is a plain IIFE exposing one `SH*` global, with a `module.exports` tail so the
pure ones (`data`, `rules`, `ai`) run under bare `node` for testing.

`save.js` was not in the original sketch. Storage ended up being a distinct concern with a
distinct hardening requirement (every read guarded, scoped keys, one-way migration), and
folding it into `ui.js` would have mixed persistence into the DOM layer.

### Boundaries

- `rules.js` and `ai.js` touch **no DOM and no canvas**. They are the whole game.
- `rules.step(state, dt, input)` mutates `state` and appends to `state.events`. It has no
  idea sound, haptics, or particles exist.
- `main.js` drains `state.events` each frame and translates them into audio, vibration,
  toasts, and particles. This is the one place the engine meets the browser.
- `render.js` reads `state` and draws. It never mutates game state.
- `ui.js` builds and tears down overlays. It never reads engine internals.

### Data flow per frame

```
input  ──▶ main: readInput()  ──▶ state.input
                                        │
                              SHRules.step(state, dt)
                                        │
                    state.events ───────┴──────▶ main: drain events
                                        │              ├─▶ SHAudio.play
                    SHRender.draw(state)           ├─▶ navigator.vibrate
                                                └─▶ particles / toasts
```

### Teardown

`main.js` owns a single `disposers[]` array. Every listener registration pushes a disposer.
Leaving a run calls them all. The current file leaks an anonymous `visibilitychange` handler
on every retry, retaining a whole run's closure; this design makes that impossible by
construction.

## Gameplay

### The apex predator

A tier-6 great white, drawn as vector art, that exists only during the APEX hold. One at a
time. This is the bug fix promoted to a mechanic.

| Phase | Duration | Behaviour |
|---|---|---|
| `stalk` | 1.6–2.6s | Circles at ~380px, slowly closing. Red vignette ramps. |
| `telegraph` | 0.85s | Halts, rears back, eyes flash, red line locks to the player's position. Growl + haptic. |
| `lunge` | 0.55s | Bursts along the locked line at ~4.2x player speed. Hit = 1 life, knockback, combo reset, 1.4s i-frames. |
| `recover` | 2.2s | Drifts slow, desaturated, tail exposed. Biting = 250 pts, +15 combo, knockback. |

The counter-play is real rather than cosmetic: dash grants 0.8s i-frames and the lunge lasts
only 0.55s, so a dash fired on the telegraph beats it. The `recover` window gives an offensive
reason to stay near the predator instead of fleeing, so the finale is a fight rather than a
hide-and-seek. When the predator leaves the viewport, a red chevron pins to the screen edge
showing its bearing.

Difficulty scaling:

| Preset | Lives | Telegraph | Lunge speed | World speed |
|---|---|---|---|---|
| Easy | 5 | 1.15s | 0.42x | 0.82x |
| Medium | 3 | 0.85s | 1.00x | 1.00x |
| Hard | 2 | 0.70s | 1.30x | 1.25x |

### Controls

Dual by input modality, selected per-pointer-event so a hybrid device works.

- **Mouse / pen** — the shark eases toward the cursor. A target reticle is drawn, and the
  steering target is offset ~90px so the player's hand never covers the shark.
- **Touch** — a virtual joystick. The base appears wherever the player first touches; drag
  sets heading and speed. Release keeps momentum, which decays. The thumb stays clear of the
  shark.
- **Keyboard** — WASD / arrows steer, Space bites, Shift dashes, Esc or P pauses.

Dash is on its own button and on Shift. **Double-tap-to-dash is removed** — it collided with
double-tap repositioning and silently burned a 2.7s cooldown.

### Relics

Existing four kept: heart (+1 life), star (ward), coconut (vortex), pearl (+320).

Two added:

- **Drift** — time dilates to 45% for 3s, and the player's hitbox shrinks 15% while it lasts.
  Screen tints, audio pitch drops.
- **Gills** — dash cooldown halved for 8s, with a double bubble trail and a HUD timer ring.

A relic that would have no effect (heart at full lives, vortex with nothing in range) now
reports "no effect" instead of playing a pickup sound and doing nothing.

### Balance and correctness fixes

- XP carries its remainder on level-up instead of resetting to 0.
- The overloaded `shield` counter splits into `iFrames` and `ward`. It currently carries four
  unrelated meanings (post-hit grace, post-level-up grace, dash immunity, and the star powerup),
  which is the likeliest source of future balance bugs.
- Win bonus becomes a flat +200 plus chain and near-miss terms, so Easy and Hard pay equally for
  equal play. Currently `life * 80` means Easy banks +400 and Hard +160 for an identical run.
- The combo chip displays the multiplier actually in effect. It currently reads "x2 combo" at
  combo 2, while scoring is still x1 until combo 3.
- Hearts render correctly above the base count.
- One shared `hitRadius()` drives both collision and rendering, so the visible ring *is* the
  hitbox. The current file draws the safe ring at `o.r * 1.28` but collides at `sr + o.r*0.64`,
  so players must pass well through the visible ring before anything registers. Same fix for
  the bite cone, which is drawn at `sr*2.4` and tested at `sr*2.4 + o.r`.
- The vestigial flee branch is deleted and replaced with a real flee range. Its current window is
  14px wide at size 1 and exactly empty at size 5, so prey never actually flees.
- Fish spawn bounds are guarded against short viewports (`R(95, h-80)` inverts when `h < 175`).
- The stray `shark.html` text node in `<head>` is not carried over. It is a template-level bug
  shared with `wild.html`, `snake.html`, `crystal.html`, and `salon.html`.

## Presentation

### Vector creatures

The player shark, all six fish tiers, and the apex predator are drawn with canvas paths —
bodies, fins, tails, eyes — rather than emoji glyphs. Emoji render differently on iOS, Android,
Linux, and Windows, and the generic 🦈 is a weak player character. Each creature gets idle
animation (tail sway, fin flap) scaled to its size.

Emoji are retained for HUD icons and the rare one-off relic pickups, where instant recognition
is the point.

### Biomes

Three, unchanged in trigger (reef at size 1–2, open sea at 3–4, abyss kelp at 5–6) but enriched:
distinct gradient stops, god-ray density and angle, and prop silhouettes per biome. Transitions
cross-fade on level-up.

### HUD

Fixed zone layout to eliminate the current collisions, where the progress bar and the combo chip
overlap on a 375px phone and fish swim under the bar:

- top-left: score, and the combo chip directly beneath it
- top-centre: growth / APEX-hold progress bar
- top-right: mute, pause
- bottom-right: bite and dash buttons
- bottom-left: contextual hint

`env(safe-area-inset-*)` honoured in every zone. All tap targets >= 44px. `prefers-reduced-motion`
is honoured for canvas effects too, not just CSS, which is currently the case.

## Hardening

Closes this file's open entries in `.codex/goals/games-goal/ACTIVE_GOAL_STATE.md` (P0 H1
storage, P1 H4 visibilitychange).

- Every storage access goes through `AmberHardening.getInt` / `setInt`, which are try/catch'd.
  The current file has five unguarded `localStorage` reads, including one at boot in the menu
  path that throws under Safari private mode and replaces the menu with the generic error overlay.
- `AmberHardening.installErrorOverlay('Shark hit a current. Reload to continue!')` replaces the
  inlined copy, whose guard reads `AmberHardening.__amberErrorInstalled` while `hardening.js`
  sets it on `window` — so the guard can never be true, and the handler is worse than the shared
  one because it discards the error message.
- `AmberHardening.onHidden` / `onVisible` for auto-pause.
- `AmberHardening.safeResume` for audio context resume.
- `AmberPlaytime.setGameTitle('Amber\'s Shark Hunt')` so the portal shows a title rather than the
  raw id `shark`.
- No `localStorage.clear()`. No CDN references.

## Save compatibility

Keys preserved so existing players keep their records:

| Key | Meaning |
|---|---|
| `shark_best_<lvl>` | Best score per difficulty |
| `shark_bestsize_<lvl>` | Best size reached |
| `shark_wins_<lvl>` | Apex wins per difficulty |
| `shark_muted` | Mute flag |
| `shark_tutorial` | Help-seen flag |

`wild_best_shark_<lvl>` is still read and folded in via `max()` for one-way migration from when
this game lived inside `wild.html`, but is no longer written. The current file dual-writes it
forever, which is why `portal.html` needs a `max()` of two keys per difficulty.

## Portal integration

- `portal.html` `GAMES` entry: `file` becomes `shark/index.html`, title, icon, tag, group,
  stat, desc, and accent unchanged.
- `BEST_BY_FILE` key changes from `'shark.html'` to `'shark/index.html'`. The read logic drops
  the legacy `max()` because migration is no longer dual-written, but keeps it once for safety.
- README table row path updated.
- `sw.js` `CACHE` bumped to `amber-games-v3` so existing clients re-fetch. No `SHELL` entry is
  added — runtime caching covers new files by design.

## Testing

**Engine — `shark/js/rules.test.js`**, a node harness in the style of `monopoly/js/rules.test.js`.
Seeded `mulberry32` RNG, 10,000 headless games across all three difficulties with a scripted
input policy that steers toward prey and away from threats. Asserts on every frame:

- score, combo, and every position are finite and non-negative
- `size` stays in `[1, 6]`; `life` never drops below 0
- the game terminates — wins and losses both occur
- the apex predator spawns on every run that reaches APEX, and reaches every phase at least once
- no object is left at a non-finite position
- determinism: the same seed produces the same score twice

**Static** — `node --check` on all nine JS files.

**Manual** — `python3 -m http.server 8080`, then the `HARDENING.md` checklist: boots clean,
core loop plays, mute persists, best score survives reload, private mode boots, offline loads,
375x667 has no horizontal scroll and no HUD overlap, tab-switch auto-pauses, an injected error
shows the friendly overlay.

## Tuning notes

The `rules.test.js` harness plays full games with a scripted pilot, and the numbers it produced
drove several design decisions that were not obvious up front. Final figures over 3,000 games:

| Preset | Win rate | Reaches APEX | Dies in the finale |
|---|---|---|---|
| Easy | 88% | 90% | 25 |
| Medium | 69% | 76% | 71 |
| Hard | 62% | 71% | 87 |

A second "beginner" pilot — reacts late, rarely dashes — scores 93% / 82% / 72%. Easy has a
deliberately high floor so the controls can be learned; the finale tightens sharply from
Medium up.

Findings that changed the design:

- **The lunge could not reach its own telegraph distance.** A fixed 0.55s lunge covers 93px on
  Easy, but the Easy stalk ring put the telegraph 570px away, so lunges never connected and
  "Easy" out-damaged Hard through incidental body contact. The lunge is now distance-based and
  always reaches.
- **Forced-danger spawns picked uniformly across every bigger tier**, so a size-1 player met
  whales in the first minute. They now prefer the smallest tier that outranks the player.
- **Spawn weights are biased by player size**, so the ocean leans friendly while small.
- **Nothing gated the opening seconds.** A run could end at zero points — dead before finding
  the controls. There is now a 3s grace with no damage and no chasing.
- **The predator could telegraph from off-screen**, giving the player a growl and a "DASH NOW"
  prompt for something they could not see. It is now kept inside the playfield and only
  telegraphs with its centre on screen. The containment was necessary in its own right: a 300px
  orbit in a 390px-wide viewport spends most of its time outside the water.
- **The tail-strike window was geometrically unreachable**, so the offensive half of the
  finale never fired.

Two bugs the harness caught that manual play would not have:

- Removing a shared `margin` variable in `spawnFish` left the spread branch reading `undefined`,
  producing `NaN` fish positions on the very first frame.
- `teardown()` cleared the same listener pool as boot-time registration, so `resize` and
  `visibilitychange` stopped working after the player's first game. Session-lifetime and
  per-run listeners now use separate pools.

## Risks

- **Scope.** Nine files, a vector art pass, and a balance change to a game that currently works
  at every stage except one. Mitigation: the engine lands and is proven by the node harness
  before any rendering work begins, so balance regressions surface in node rather than in a browser.
- **Vector art legibility at small sizes.** Tier-1 fish are ~16px. Mitigation: silhouette-first
  design, tested at minimum size early rather than at the end.
- **Virtual joystick unfamiliarity for the target audience.** Mitigation: the stick appears where
  the player first touches, so there is nothing to aim at but the thing they already touched.

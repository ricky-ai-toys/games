# Amber's Candy Castle — Design

**Date:** 2026-09-30
**Status:** Approved
**LoopX todo:** `todo_55d7dd64d683` (spec), `todo_af7b2b8b92e6` (engine)
**Supersedes:** nothing. New game.

## Problem

The portal has 21 games. Its PLAY group is almost entirely arcade action plus one match-3, one
cards game and one board game. There is no tower defense, and the genre is a genuine gap for
the 8-12 age range the portal serves.

The question worth answering before writing any code is what makes a *maze-building* tower
defense a game rather than a wall-drawing toy. The answer is the economy: if the things that
reshape the route are cheap and plentiful, and the things that kill are expensive and scarce,
then the player is always trading path length against firepower. That trade is the whole
design, and it has to be provable rather than assumed.

## Goals

1. A maze defense whose central decision is a real, felt trade-off.
2. An anti-cheese rule simple enough to explain to a child: the road can never get too short.
3. Balance that is verified by simulation, not tuned by vibes.
4. Land in the same world as Farm and Boardwalk — same cast, same cozy register.

## Non-goals

- No air units. Flying breaks ground pathing and roughly doubles the routing work; the trade is
  not worth it in v1.
- No destructible walls. Walls that break turn a spatial puzzle into a resource-management
  spiral, which is the wrong failure mode for this age group.
- No asset files, no build step, no ES modules, no CDN. Procedural art and audio only.
- No endless-mode leaderboards beyond a local best.

## The core loop

An 8x11 grid. Gate on the left edge, castle on the right. A level gives you gold and an empty
field, then waves march in.

**Walls** cost 15 and are plentiful. They do nothing but reshape the route.
**Towers** cost 90-160. They deal damage and cannot be placed inside walls.

Because walls are ~10x cheaper than towers, mazing hard is a real sacrifice: the player who
pays 200 in walls to triple the route length arrives at wave 1 unable to afford the arrows
that kill things. That is the game.

## The anti-cheese rule

Enemies walk the **shortest** open route from gate to castle, so the only lever on survival
time is making that route longer. Every level declares a `minPath`. Any placement that would
leave the route shorter than `minPath` is **refused with a stated reason** ("the road is too
short") rather than silently ignored — a silent no-op reads as a bug to a child, and it makes
the rule undiscoverable.

The gate can never be sealed. There is no "enrage" clause and no wave that breaks through.

### Why this is cheap enough to enforce on every tap

Pathing is a BFS distance field from the castle over the 8-neighbourhood, with corner-cutting
disallowed. It is recomputed **only when the grid changes**, which happens on placement, not per
frame. `routeLength(gate)` is then a single array lookup, so validating a tap costs one BFS over
88 cells. That is what makes per-tap enforcement viable; a per-frame A* would not be.

8-way movement rather than 4-way: diagonals make mazes read as mazes instead of staircases, and
the corner-cut rule keeps diagonal movement from squeezing through a wall junction.

## Content

Three stages, three levels each, then endless. Each stage introduces exactly one idea so the
game is teachable in order.

| Stage | Levels | Introduces | Boss |
|---|---|---|---|
| **Candy Gate** | 3 | place walls, place Arrow, upgrade | Sugarplum |
| **Frost Bazaar** | 3 | Frost slow, Cannon splash, two gates | Ice Baron |
| **Night Garden** | 3 | Arc chain, Longshot, honeybug healing | The Queen |

**Towers** — five roles, three tiers each. The tiers change silhouette as well as stats so
upgrade level is readable at a glance without reading a number.

| Tower | Cost | Role |
|---|---|---|
| 🏹 Arrow (Amber) | 90 | fast single target; the early damage and the anti-armour answer |
| ❄️ Frost (Maple) | 110 | slow, minimal damage, no kill — extends every second spent in a kill zone |
| 💣 Cannon (Finn) | 140 | slow, splash; the answer to swarms, near-useless alone |
| ⚡ Arc (Pip) | 130 | chains to 3-4 targets; best value against armoured single targets |
| 🎯 Longshot (Amber, Mk II) | 160 | very long range, huge single hit; punishes whatever the road was stretched past |

**Enemies** — grunt, runner (fast/frail), armoured (soak, resists single-target), swarm (arrives
in packs), honeybug (heals neighbours, must die first), and a stage boss that resists Frost. Each
has a distinct silhouette, not a distinct colour, so the threat is readable without the ring.

**Stars** — 3 for finishing with full castle hearts, 2 for finishing, 1 for clearing the last
wave. Stars gate tower unlocks; the campaign's last stage unlocks endless.

**Casting** — the tower crew is the portal's existing cast, so this game shares a world with Farm
and Boardwalk rather than arriving as a stranger.

## Architecture

Follows the `shark/` and `monopoly/` layout: folder game, plain `<script>` tags in dependency
order, one `CC*` global per module, `module.exports` tails so the pure ones run under `node`.

```
castle/index.html          shell, head meta, dependency-ordered scripts
castle/css/style.css       stage/level select, in-level HUD, wave bar, results
castle/js/data.js          CCData  — levels, towers, enemies, waves, tuning. Pure data.
castle/js/grid.js          CCGrid  — cells, BFS distance field, route legality. Pure.
castle/js/rules.js         CCRules — economy, waves, combat, lives, stars. Pure.
castle/js/sprites.js       CCSprites — vector painters for castle, towers, enemies, walls
castle/js/render.js        CCRender  — scene composition, range previews, health bars
castle/js/audio.js         CCAudio   — procedural WebAudio synth
castle/js/save.js          CCSave    — stars, unlocks, endless best
castle/js/ui.js            CCUI      — overlays and HUD
castle/js/main.js          boot, grid input, rAF loop, teardown
castle/js/rules.test.js    node harness
```

### Boundaries

- `data.js`, `grid.js`, `rules.js` touch **no DOM and no canvas**. `grid.js` in particular must
  stay pure, because the legality rule is the part most worth testing exhaustively.
- `rules.step(state, dt, input)` mutates state and appends to `state.events`. It knows nothing
  about sound, particles, or DOM.
- `main.js` drains events into audio, haptics, and toasts — the one place engine meets browser.
- `render.js` reads state and draws. It never mutates.
- Session-lifetime listeners and per-run listeners use **separate disposer pools**. The shark
  remake found that sharing one pool silently killed `resize` and tab-auto-pause after the
  player's first game; that bug must not be reproduced here.

### Data flow per frame

```
grid taps ─▶ main: readInput() ─▶ state.input
                                    │
                        CCGrid.legal(cell, item)  ◀── placement gate, on tap only
                                    │
                          CCRules.step(state, dt)
                                    │
              state.events ─────────┴──────▶ main: drain ─▶ audio / haptics / toasts
                                    │
                        CCRender.draw(state)
```

`CCGrid.legal` is called on placement, not per frame. `CCRules` reads `state.grid.field` for
enemy steering and never re-runs BFS itself.

## Testing

`castle/js/rules.test.js`, following `shark/js/rules.test.js`. This is the load-bearing part of
the design: the legality rule is a pure function over 88 cells, so it can be proven exhaustively
rather than sampled.

**Exhaustive legality proof.** For every level, enumerate placements across every cell and both
item kinds. Assert that whenever `legal()` returns true, the resulting grid still has a
gate-to-castle route of at least `minPath`; and whenever it returns false, the grid is left
byte-identical. This is the invariant the whole game rests on, and sampling it would be
pointless.

**Level validity.** Every level starts with a reachable route. Every `minPath` is achievable
within the cell budget — i.e. at least one legal layout reaches it. Every wave references
enemies and tower ids that exist. Every stage's unlock chain is acyclic.

**Simulation.** Run full level plays with a scripted pilot in `sharp` and `sloppy` cohorts,
mirroring the shark harness. Assert: no NaN, gold never negative, lives within range, every
level terminates, difficulty is ordered across stages, and the economy actually bites — a
maze-heavy pilot must measurably run out of gold, otherwise the central trade does not exist.

**Determinism.** Same seed, same result, twice.

## Risks

- **The central trade might not be felt.** If walls are too cheap, optimal play is "wall
  everything" and towers become irrelevant. Mitigation: the harness explicitly measures whether
  a maze-heavy pilot goes broke, and the wall cost is a tuning value I will move on evidence.
- **8-way BFS corners.** Diagonal movement that squeezes between two walls would make the maze
  leak and the visual path disagree with the logical one. Corner-cutting is disallowed and
  asserted in the test.
- **Scope.** Nine content levels, five towers at three tiers, six enemies is a lot of authored
  data. Mitigation: stages ship in order and the endless mode is data-driven off the same
  tables, so a late stage failing does not block the first.
- **Appetite vs the existing arcade.** Castle defence is the most generic genre in the design
  doc. Mitigation: the cast, the cozy register, and vector art are deliberate. The genre shape
  is familiar on purpose — the target player should not have to learn the genre *and* the game.

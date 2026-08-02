# Amber's Odyssey: The Long Way Home

A Greek-vase adventure in vanilla JavaScript. Amber the wanderer sails a wine-dark sea through 12 Homer episodes, from Ogygia to Ithaca — gathering mementos, glory, and a few clever boons on the long way home.

## Play

Open `index.html` in a browser (or from the games hub), then tap **New Voyage**.

## Structure

- **Voyage map** — sail from island to island; random sea events (storms, reefs, fog, traders) cost food and hull. Watch your three ship bars.
- **12 episodes** (one per island) — a tiny arcade game each:
  - Ogygia → build the raft (timing)
  - Land of the Lotus → eat or refuse (choose wisely)
  - Cyclops → dodge boulders, answer his questions
  - Aeolus → hold the wind bag open
  - Laestrygonians → dodge falling boulders
  - Circe → find the moly, cure the pigs
  - Underworld → ask Tiresias the right questions, dodge shades
  - The Sirens' Rocks → row to the beat, then resist the song
  - Scylla & Charybdis → pick your lane between the monster and the whirlpool
  - Helios's Cattle → don't let the herd get eaten
  - Phaeacia → wrestling and a discus throw
  - Ithaca → the bow test (restore the house to win)
- **Win/lose** — win: glory + memento + scholar point; lose: morale and food drop. Three failures can end the journey.
- **Education layer** (unlocked as you complete islands):
  - Hexameter clap — tap to the stressed syllables of Homer's lines
  - Penelope's Loom — watch and repeat the weaving pattern
  - Fact or Fable — sort the real myths from the made-up ones
  - Mediterranean map game — trace the actual route
  - Codex (Myth/History/Culture/Fun tabs), Timeline, Phrase Book of epithets, Museum of mementos, Boons shop (glory), Chest
- **Crew** — Maple, Finn, and Pip react to what happens on the journey.
- **Save** — progress persists in localStorage (`ambers_odyssey_save_v1`).

## Files

- `index.html`, `css/style.css` — page shell and look
- `js/constants.js` — palette, sizes, save key
- `js/utils.js` — helpers (shuffle, clamp, rand, pick)
- `js/state.js` — save/load
- `js/data/` — episodes, voyage map, crew, codex, quiz, timeline, epithets
- `js/atlas.js` — Greek-vase vector art painters
- `js/audio.js` — WebAudio music and sound effects (no assets)
- `js/mini.js` — the 12 episode minigame drivers
- `js/render.js` — shared UI painting (panels, buttons, title, results)
- `js/ship.js` — ship hub (crew, dock)
- `js/voyage.js` — the map, sailing, events, detours
- `js/ui.js` — modals: dialogue, codex, museum, timeline, phrases, quiz, loom, hexameter, map game, boons
- `js/game.js` — orchestrator (scenes, episodes, economy)
- `js/main.js` — boot and main loop

## QA

Headless smoke suite: `node /tmp/opencode/odyssey-smoke.cjs` (concatenates all scripts with stubs, plays all 12 episodes plus every modal/education screen; expects `95 passed`).

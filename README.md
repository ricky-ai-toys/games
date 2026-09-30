# Amber's Games

[![Pages](https://img.shields.io/github/deployments/ricky-ai-toys/games/github-pages?label=pages&logo=github)](https://ricky-ai-toys.github.io/games/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A cozy collection of browser games for kids — no installs, no accounts. Open `index.html` and play.

## Play it

Any way you like:

- Open `index.html` in a browser
- Serve the folder (`python3 -m http.server 8080`) and visit `http://localhost:8080`
- Hosted on GitHub Pages (if enabled): `https://ricky-ai-toys.github.io/games/`

## The games

| Game | File | What it is |
|---|---|---|
| Amber's Shark Hunt | `shark/index.html` | Eat, grow, and dash — then survive the great white that hunts the apex |
| Amber's Big Drop | `down100.html` | Fast mobile platformer through 100 floors |
| Amber's Star Catcher | `starcatcher.html` | Catch stars, finish wave missions, ride the fever combo |
| Amber's Crystal Match | `crystal.html` | Swap crystals, chain combos, clear each wave |
| Amber's Greedy Snake | `snake.html` | Eat, grow, clear every level |
| Amber's Starlight Pinball | `pinball.html` | Flip for moon gems, spell AMBER for a bonus |
| Amber's Kite Runner | `kite.html` | Soar through clouds, grab stars, dodge birds |
| Amber's Big Two | `bigtwo/index.html` | Hong Kong Big Two (鋤大D) with Maple, Finn & Pip |
| Amber's Candy Castle | `castle/index.html` | Build the road, place the towers, and hold the gate for every wave |
| Amber's Boardwalk | `monopoly/index.html` | Cozy kid Monopoly: buy spots, add stars, beat the bots |
| Amber's Big Drop | `next100.html` | Fast mobile platformer — drop 100 floors, dodge, set a high score |
| Amber's Wild Arcade | `wild.html` | A mini arcade of mini-games — jump, dodge, and score big |
| Amber's Typing Adventure | `typing.html` | Falling words, bubble spell, word race, sentences |
| Shop with Amber | `shop.html` | Make change, fill the cart, spot the best deal |
| Amber's Space Math | `space.html` | Defend the rocket, race the clock, fill a bingo board |
| Amber's Pet Clinic | `petclinic.html` | Feed, bathe, and cheer up little patients |
| Amber's Style Studio | `dressup.html` | Design outfits and save favorite looks |
| Amber's Beauty Salon | `salon.html` | Style hair, makeup, and nails for customers |
| Amber's Farm | `farm/index.html` | Cozy Stardew-style farm: plant, fish, raise animals, cook |
| Amber's Odyssey | `odyssey/index.html` | Sail 12 Greek-vase adventures home: voyage, boons, mementos, quiz, loom, hexameter |
| Amber's 算籌大冒險 | `suanchou.html` | Learn ancient Chinese counting rods |
| Amber's Binary Quest | `binary.html` | Crack the secret code of computers |

## Amber's Farm (flagship)

The biggest project in this repo — a full Stardew-style life sim:

- 4 seasons, festivals, weather, day/night cycle with energy
- Farming, fishing, foraging, mining gems, raising chickens/cows
- Cottage interior with furniture + storybook
- NPC friendship, gifting, mail, quests, cooking recipes
- Save/load in the browser (localStorage), achievements, farm stars

Docs live in `farm/MASTERPLAN.md` (roadmap + changelog) and `farm/README.md`.

## Tech notes

- Vanilla HTML/CSS/JS — no build step
- Libraries (React, Vue, Babel) are vendored locally under `vendor/` — **no CDN, no network** at runtime
- All games run offline once loaded (PWA service worker caches the shell + libs)
- Kids-first design: big touch targets, keyboard + touch controls, no ads, no tracking
- New games (`next100.html`, `wild.html`) and duplicate (`suanchou-quest.html` now redirects to `suanchou.html`) added to the arcade

## Development

```bash
git clone https://github.com/ricky-ai-toys/games.git
cd games
python3 -m http.server 8080
```

Contributions welcome — keep it kid-friendly!

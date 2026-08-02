# Amber's Farm 🦊🌻

**v4.0.0** — A cozy, beautiful **Stardew Valley–inspired** farming game made for Amber — playable in any modern browser.

## How to play

1. Open `index.html` in **Chrome**, **Edge**, or **Firefox** (double-click the file).
2. Click **New Game**, name your farm, and start!
3. **Continue** loads your last save automatically.

> If something fails to load on `file://`, run a tiny local server from this folder:
> `npx --yes serve .` then open the URL it prints.

## Controls

| Action | Keyboard | Touch |
|--------|----------|--------|
| Move | WASD / Arrow keys | On-screen D-pad |
| Interact / use tool | E, Space, or **click** a nearby tile | **A** button |
| Select tool | Keys 1–9, scroll wheel, Q/C | Tap hotbar |
| Inventory | I or B | 🎒 button |
| Journal | J | 📒 button |
| Quest board | Click 📋 chip | Quest board on map |
| Pause | ☰ button | ☰ button |

**Tip:** The **Hand** tool (slot 1) auto-hoes, plants, waters, and harvests — great for kids.

## What to do

1. **Till** dirt with the hoe, **plant** seeds, **water** every day.
2. Sleep in the cottage bed — crops grow overnight (rain waters for free!).
3. Put harvests in the **shipping bin** 📦 for morning coins.
4. Visit the **shop** 🛒 for seeds, feed, decor, and a copper watering can.
5. Care for **chickens** (and later a **cow**) at the coop.
6. Chat with **Ms. Maple** and **Finn** — gift them crops or dishes!
7. **Cook** in the kitchen, **decorate** the yard, fill your **Star Journal**.
8. Visit the **barn** for goats, sheep, and pigs — and the **sell box** for quick coins.

## Saves

Progress auto-saves when you sleep and when you close the tab (`localStorage`).

## What's new in 4.0.1 — Beginner's Guide

- 📖 **How to Play** button on the title screen — a friendly step-by-step guide (till → plant → water → sleep → ship → explore → friends) with the full controls list, perfect for first-time players

## What's new in 4.0 — Home Sweet Home

- 🏠 **Bigger cottage** — the house is now a real home: bedroom, kitchen and living room with windows that show the sky
- 🛋️ **10 home furniture pieces** — rugs, sofas, tables, a toy box, a pet bed and more — buy them at the shop and place them on the floor (pick up anytime!)
- 📚 **Bookshelf stories** — cozy tales to read; two unlock when you find a gem or catch the golden fish
- 🔥 **Fireplace** — glows warm in the evening with drifting embers
- 🦋 **Ambient life** — butterflies in the morning, fireflies at dusk, falling autumn leaves, winter sparkle, water glints
- 💤 Zzz float over the bed when Amber sleeps
- 💾 SAVE_VERSION 10 (old saves get a starter rug!)

## What's new in 3.0 — Mountain, Market & Mystery

- ⛰️ **Mountain Pass** (east warp) — chip **gem nodes** for quartz/amethyst/emerald/ruby, pick crystals, and crack **geodes** at Rori's bench (always a gem!)
- 🏘️ **Village Market** (west warp) — make a **fountain wish**, send **letters** from the postbox (+1 heart), buy **snack gifts** at the market stall
- 💎 **Gem Collection** — find all five gems (incl. the rare **Star Gem**) and celebrate with Rori
- 🎩💎🌿 **Three new friends** — Mayor Milo (Town Welcome quest!), Rori the gem trader, and Wren the forest friend
- 💌 Postbox letters & giftable snacks for deeper friendships

## What's new in 3.0.4 — Real Hoe Icon

- 🪴 **Fixed**: the Hoe no longer shows as a pickaxe (⛏️) in the toolbar — it now has its own pixel-style hoe icon (there's no hoe emoji in Unicode, so it's drawn as an inline SVG: wooden handle + steel cross blade)

## What's new in 3.0.3 — Startup Fix

- 🚑 **Critical fix**: the game no longer crashes at startup — the geode sprite painter in the atlas referenced a non-existent `ctx`, which broke `Game.init` and left the title-menu New Game / Load Game buttons unclickable

## What's new in 3.0.2 — Fish Varieties & Fixes

- 🦐🐙🌈 **5 new fish**: Shrimp, Crab, Squid, Octopus, and the rare **Rainbow Fish** (own achievement!)
- 🪓→⛏️ Fixed: the Hoe no longer looks like an axe in the toolbar

## What's new in 3.0.1 — Kitchen Catch

- 🍲 **5 new recipes**: Trout Soup, Fish Tacos, Winter Root Chowder (unlock with your first fish), Melon Salad (blueberries), Golden Roast (golden fish)
- 🍳 Kitchen now shows ingredient **names** (Trout, Potato…) instead of raw codes

## What's new in 2.2 — Barnyard Days

- 🐄 **Barn** on the east side — cows, **goats** (goat milk → cheese), **sheep** (wool), **pigs** (truffles)
- 🐓 **Rooster** companion — makes chickens grow hearts faster and crows at dawn
- 🛠️ **Bigger Coop** (6 chickens) & **Bigger Barn** (6 animals) upgrades at Marnie's Ranch
- 📦 **Sell Box** right of the house — sell unwanted items for instant coins

### In 2.1
- 🏖️ **Sunny Beach** — walk **south** from the farm (shells + shore fishing)
- 🧭 **Location badge** + enter banners (Farm / Forest / Beach / Home)
- Clearer HUD: stars panel, quest mini-line, bigger toolbar
- Title tips for forest / beach / fishing

### Also in 2.0
- 🌲 Forest (north) · 🎣 Fishing · 💾 Save export/import

## Roadmap

See **[MASTERPLAN.md](MASTERPLAN.md)** for further ideas (photo mode, bilingual, more maps).

## Credits

Made with love as **Amber’s** cozy farm adventure — sibling spirit to *Amber’s Crystal Descent*.

# Amber's Farm — Masterplan & Big Iteration Scheme

> **Living roadmap** for turning the current cozy HTML farm into Amber’s long-term Stardew-inspired title.  
> Audience: ~10-year-old Amber · Platform: browser static files · Tone: gentle, beautiful, no-fail.

**Project root:** `Documents/AmbersFarm/`  
**Sibling brand:** Amber’s Crystal Descent (`Documents/Amber Big Drop/`)

---

## 1. North Star

### Vision
Amber runs **her** valley farm: plant, tend animals, cook, gift friends, decorate home, and fill a star journal — in a world that looks and feels closer to Stardew Valley every major iteration, without combat, romance, or punishment loops.

### Design pillars (non-negotiable)

| Pillar | Rule |
|--------|------|
| **Kid-safe depth** | Systems can deepen; failure never deletes hope. No energy death, no crop permanent rot. |
| **Beautiful first** | Each big iteration must ship at least one “wow” visual or UI moment. |
| **Amber identity** | Fox farmer, amber-gold, personal copy, farm name, wardrobe. |
| **Zero install** | Double-click `index.html` (or one-line local serve). No account/login. |
| **Interconnected loop** | Crops ↔ animals ↔ kitchen ↔ gifts ↔ stars ↔ unlocks. |
| **Ship slices** | Prefer playable vertical slices over half-finished mega-features. |

### Anti-goals (explicitly out unless promoted later)
- Full multiplayer / Steam shipping / mobile app stores  
- Combat mines / death / permadeath  
- Dating / marriage  
- Parity with every Stardew system  
- Heavy frameworks (React/Phaser) unless a dedicated tooling iteration says otherwise  

---

## 2. Current baseline (where we are)

### Shipped (v0.x “playable valley”)
- [x] Title / New / Continue / settings (SFX, music, particles)  
- [x] Farm map: cottage, plots, pond, coop, shop, bin, board, NPCs  
- [x] Farming: hoe, water, plant, grow, harvest, quality stars  
- [x] Seasons × short year, weather, sleep → morning mail  
- [x] Shipping bin + shop (seeds, feed, decor, copper can)  
- [x] Animals (chicken/cow), kitchen recipes, decor, wardrobe  
- [x] Quests + star journal + forage  
- [x] Stardew-ish wood UI, clock/gold, inventory toolbar  
- [x] 16×16 atlas + autotile paths/water, pixel Amber sprite  
- [x] Favicon, touch controls, `localStorage` save  

### Known gaps / debt
- Tile art still procedural atlas (not hand-painted sheet)  
- UI is Stardew-*inspired*, not inventory-grid / energy / full pause tabs  
- One map only; thin festival; soft quests  
- Audio is beeps, not a real music bed  
- Hotbar rebuild / prompt UX still polishable  
- No fishing, no second biome, no true festivals calendar  
- Character / NPC / animal art uneven vs tiles  

**Baseline version tag:** **`v1.0.0`** shipped (see §12).

---

## 3. Iteration philosophy

### How we iterate
1. **One theme per big iteration** (art, systems, content, or feel — not all at once).  
2. **Playtest gate:** Amber (or parent) can play 15–20 min without getting stuck.  
3. **Save-safe:** bump `SAVE_VERSION` + migrate when data shape changes.  
4. **No regressions:** farming loop and sleep/save must work after every ship.  
5. **Document in this file:** mark `[x]` when done; note date and short changelog.

### Cadence (suggested)
| Type | Scope | Target |
|------|--------|--------|
| **Micro** | Bugfix, HUD tweak, balance | Hours |
| **Small** | One system polish | 1–2 sessions |
| **Big (this plan)** | Themed milestone below | Multi-session |
| **Season** | Bundle of big iterations → version bump | When 2–3 bigs land |

### Priority scoring (when choosing what next)
Score 1–5 each: **Kid joy** · **Visual wow** · **Systems depth** · **Low risk** · **Reuses code**.  
Ship highest average that doesn’t break pillars.

---

## 4. Version ladder (big picture)

```
v0.9  Cozy Prototype+
  │
v1.0  Amber's Farm 1.0
  │
v1.5  Valley Alive
  │
v2.0  Expanded Valley
  │
v2.1  Beach + UI beef     ← YOU ARE HERE
  │
v2.x  Forever Farm        ← photo mode, more polish
```

---

## 5. Big iteration scheme

Each **BIG-N** is a milestone. Do in order unless a higher-priority bug forces a side quest.  
Dependencies listed so work can be parallelized only when safe.

---

### BIG-0 — Stabilize & Polish Gate *(prerequisite)*
**Goal:** No obvious UI bugs; farming session feels solid.  
**Theme:** Trust / UX  

| Work item | Notes |
|-----------|--------|
| Prompt vs tool label never overlap | Stacked toolbar (done / verify) |
| Character readable at a glance | Fox farmer silhouette (done / iterate) |
| Save load after tile size change | Migrate positions (done / test) |
| Console clean on happy path | No red errors |
| README “how Amber plays” 5 bullets | Parent-facing |
| Manual QA checklist pass | §8 below |

**Exit criteria:** New Game → till → plant → water → sleep → ship → continue after refresh, zero confusion on “what is Hand vs E”.  
**Est. effort:** Small  
**Status:** [x] 2026-07-10  

---

### BIG-1 — “Looks like a real farm game” Art Pass
**Goal:** World + character + buildings feel like one pixel-art product.  
**Theme:** Beauty  

| Work item | Detail | Done |
|-----------|--------|------|
| Atlas + autotile paths/water | 16×16 ×2 | [x] |
| Pixel crops by stage/type | incl. fall/winter crops | [x] |
| Pixel Amber + held tools | redesign | [x] |
| NPC / animal pixel bodies | + Y-sort | [x] |
| Building tiles + cottage roof | atlas + overlay | [x] |
| Hand-painted external PNG sheet | optional later | [ ] |
| Full walk-cycle animals | partial bob only | [~] |

**Depends on:** BIG-0  
**Exit criteria:** Screenshot test — “looks intentional,” no random emoji world objects.  
**Est. effort:** Large  
**Status:** [x] core ship 2026-07-10 (PNG sheet deferred)  

---

### BIG-2 — Stardew HUD 2.0
**Goal:** Menus and HUD match farm-sim conventions kids recognize.  
**Theme:** UI  

| Work item | Detail | Done |
|-----------|--------|------|
| Inventory (I / bag) | Items · Seeds · Map · Stats | [x] |
| Soft energy bar | never KO; slow walk when low | [x] |
| Wood UI / clock / gold / toolbar | | [x] |
| Pause → inventory / save | | [x] |
| Typewriter dialogue | deferred | [ ] |
| Numeric clock hours | deferred | [ ] |

**Depends on:** BIG-0  
**Exit criteria:** Child finds seeds/tools without hotbar-only confusion.  
**Est. effort:** Large  
**Status:** [x] core ship 2026-07-10  

---

### BIG-3 — Living Farm Systems
**Goal:** Day-to-day play has more “what should I do?” without pressure.  
**Theme:** Systems  

| Work item | Detail | Done |
|-----------|--------|------|
| Fertilizer shop item | chance of ★ on plant | [x] |
| Fall/winter crops | pumpkin, cranberry, winter root | [x] |
| Energy soft spend on tools | restore on sleep | [x] |
| Scarecrow / crow event | deferred | [ ] |
| Deeper animal hearts | deferred | [ ] |

**Depends on:** BIG-0  
**Exit criteria:** Two different “main” activities per day feel rewarding.  
**Est. effort:** Medium–Large  
**Status:** [~] partial 2026-07-10  

---

### BIG-4 — People & Story (soft)
**Status:** [x] 2026-07 — Bea NPC, heart events, mail notes, Farmer's Day  

### BIG-5 — Festivals & Seasons Showcase
**Status:** [x] 2026-07 — season festival modal + rewards; snow; calendar UI  

### BIG-6 — Second Place
**Status:** [x] 2026-07 — Forest map, warp north, mushrooms  

### BIG-7 — Fishing
**Status:** [x] 2026-07 — Gentle timing bar; rod upgrades  

### BIG-9 — Parent tools (partial)
**Status:** [x] export/import save code in pause menu  

### BIG-3 remaining
**Status:** [x] scarecrow + crow soft event; animal hearts 0–5

---

### BIG-8 — Audio & Feel
**Goal:** Soundscape sells cozy.  
**Theme:** Juice  

| Work item | Detail | Done |
|-----------|--------|------|
| Seasonal generative music | spring/summer/fall/winter sets | [x] |
| Footsteps | soft on walk | [x] |
| Door SFX | enter/exit house | [x] |
| Mute/SFX/Music persist | localStorage | [x] |
| Terrain-specific footsteps | deferred | [ ] |

**Depends on:** none  
**Status:** [x] core ship 2026-07-10  

---

### BIG-9 — Parent & Longevity Tools
**Status:** [ ] v1.5+ (export save, bilingual)  

---

### BIG-10 — v1.0 Ship Pack
**Goal:** Declare **Amber’s Farm 1.0** ready for daily play.  
**Theme:** Product  

| Work item | Detail | Done |
|-----------|--------|------|
| GAME_VERSION 1.0.0 | title + pause | [x] |
| SAVE_VERSION 2 + migrate | energy, fertilizer | [x] |
| MASTERPLAN / README update | | [x] |
| Freeze post-1.0 as 1.5+ | BIG-4…7,9 | [x] |

**Status:** [x] 2026-07-10

---

### BIG-11 — Deeper Barns & Animals (“Barnyard Days”)  
**Goal:** More animal types, a real barn, capacity upgrades.  
**Theme:** Systems + content  

| Work item | Detail | Done |
|-----------|--------|------|
| Barn building + pen | east pen, atlas tile, path lane | [x] |
| Goat / Sheep / Pig | products + star variants + unlocks | [x] |
| Rooster companion | no product; hearts boost + dawn crow | [x] |
| Capacity upgrades | Bigger Coop (6) / Bigger Barn (4) | [x] |
| Goat cheese recipe | kitchen unlock via first_goat | [x] |
| Sell Box | instant per-item sale on farm | [x] |
| Achievements | first_goat/wool/truffle, sunrise_caller, full_barn | [x] |
| SAVE_VERSION 7 | upgrade flags + legacy pen heal | [x] |

**Status:** [x] 2026-08-01 (v2.2.0)

### BIG-12 — Mountain, Market & Mystery (v3.0.0)
**Goal:** Two new maps, three new friends, and a gem-finding adventure.
**Theme:** Systems + content + story

| Work item | Detail | Done |
|-----------|--------|------|
| Mountain Pass + Gem Cave | east warp; gem nodes, crystals, geodes, crack bench, cave floor | [x] |
| Village Market Street | west warp; fountain, postbox, stall, benches, lamps | [x] |
| Gems & snacks | 5 gems + 3 snacks as PRODUCT_DEFS (sellable/giftable) | [x] |
| Mining loop | chip nodes (2 energy), per-day keys, geode → always a gem | [x] |
| Gem Collection | find all 5 → gem_collector (3★) + Rori celebration | [x] |
| NPC scene system | per-NPC scene field; draw/interact filtered | [x] |
| Mayor Milo / Rori / Wren | village/mountain/forest; heart events + rewards | [x] |
| Town Welcome chain | flower → crop → gem; Milo rewards 20g | [x] |
| Postbox letters | 10g → +1 heart, once/day (pen_pal) | [x] |
| Fountain wishes | 5g/day; seeds/coins/feed/sparkles | [x] |
| Achievements | visit_mountain/village, gem_finder/collector, geode_hunter, pen_pal | [x] |
| SAVE_VERSION 9 | geodes/wishes/townWelcome/letterSentDay/gemCelebrated | [x] |

**Status:** [x] 2026-08-01 (v3.0.0) · +5 recipes (v3.0.1) · fish variety + hoe icon (v3.0.2) · startup fix (v3.0.3) · real hoe icon (v3.0.4)

---

### BIG-13 — Home Sweet Home (v4.0.0)
**Goal:** The cottage becomes Amber's own cozy, personalizable home.
**Theme:** Personalization + visual polish

| Work item | Detail | Done |
|-----------|--------|------|
| Bigger interior | 16×11 cottage: bedroom / kitchen / living room zones | [x] |
| Windows | TILE.WINDOW: 37 — sky through the wall, warm glow in evening | [x] |
| Home furniture | HOME_DEFS ×10 (rug/table/chair/sofa/bookshelf/fireplace/toybox/petbed/walllamp/picture), atlas IDs 97–107 | [x] |
| Place / pick up | floor-only placement, 1 per tile, pickup via furniture hotbar slot | [x] |
| Shop Home section | buy furniture into inventory.homedec; hotbar slots | [x] |
| Storybook | bookshelf → story modal; 2 stories gated by gem_finder / golden_fish | [x] |
| Fireplace | evening glow + embers; wall lamp + window ambience | [x] |
| Ambient life | butterflies (morning), fireflies (dusk), fall leaves, winter sparkle, water glints | [x] |
| World Zzz | sleep stars float over the bed | [x] |
| SAVE_VERSION 10 | homeDecor + stories + homedec inventory; migration grants starter rug | [x] |
| QA | smoke +24 assertions (144 total, 4× green); full-load-probe atlas build green | [x] |

**Status:** [x] 2026-08-02 (v4.0.0)

---

## 6. Suggested sequencing (critical path)

```
BIG-0 Stabilize
   ├─► BIG-1 Art Pass ────────────┐
   ├─► BIG-2 HUD 2.0 ─────────────┼─► BIG-10 v1.0 Ship
   ├─► BIG-3 Living Systems ──────┤
   └─► BIG-8 Audio (parallel) ────┘

Post-1.0:
   BIG-4 People → BIG-5 Festivals → BIG-6 Second Map → BIG-7 Fishing
   BIG-9 Parent tools (anytime after 1.0)
```

**If time is short for v1.0:**  
Ship **0 → 1 → 2 → 8 → 10**. Park 3–7 as 1.5.

**If Amber cares most about “pretty”:**  
Prioritize **1 → 5 → 8**.

**If Amber cares most about “things to do”:**  
Prioritize **3 → 4 → 6 → 7**.

---

## 7. Architecture guidelines (keep while growing)

### File ownership
| Area | Primary files |
|------|----------------|
| Boot / input | `main.js`, `game.js` |
| World / collision | `world.js`, `data/map.js` |
| Draw | `render.js`, `atlas.js`, `sprites.js` |
| Systems | `farming.js`, `animals.js`, `kitchen.js`, `decor.js`, `quests.js` |
| Meta | `save.js`, `time.js`, `weather.js` |
| Shell UI | `index.html`, `css/style.css`, `ui.js` |
| Data only | `js/data/*` |

### Rules of thumb
1. **No ES modules** until an explicit tooling iteration (keep `<script>` order).  
2. **Data in `data/`**, logic in systems — don’t bury crop tables in `render.js`.  
3. **`SAVE_VERSION`++** on any save shape change; write migrator in `save.js`.  
4. **Atlas for ground**, sprites for actors; don’t mix ad-hoc `fillRect` for new terrain.  
5. **One toast at a time**; action prompt ≠ tool label ≠ tutorial banner.  
6. **Kid copy:** short sentences, encourage, never scold.  

### Future optional tooling iteration (only if pain is high)
- Tiny build step to pack atlas PNG  
- ESLint + manual smoke script  
- Still output static folder for double-click play  

---

## 8. QA checklist (run before closing a BIG)

### Smoke (5 min)
- [ ] Title → New Game  
- [ ] Move, open shop, close shop  
- [ ] Till, plant, water, sleep  
- [ ] Ship item, sleep, morning coins  
- [ ] Continue after F5  

### UX
- [ ] Tool label and E-prompt do not overlap  
- [ ] Tutorial dismisses after sleep path  
- [ ] Mute works; settings persist if implemented  

### Systems
- [ ] Rain waters crops  
- [ ] Off-season seed blocked with friendly tip  
- [ ] Chicken feed → egg next day  
- [ ] Quest progress increments and claim works  

### Tech
- [ ] No console errors on happy path  
- [ ] Save size reasonable (&lt; 1–2 MB)  
- [ ] 60fps-ish on average laptop while moving  

### Kid test (gold standard)
- [ ] Plays 10+ minutes without asking “what do I do?”  
- [ ] Smiles at least once (harvest, egg, festival, gift)  

---

## 9. Content backlog (fill during BIG-3/4/5/6)

### Crops (expand carefully)
| Crop | Season | Notes |
|------|--------|--------|
| Radish, Potato | Spring | Done |
| Corn, Tomato, Blueberry, Melon | Summer | Done |
| Pumpkin, Cranberry | Fall | TODO |
| Winter Seeds / crystal fruit light | Winter | TODO optional |
| Ancient / rare | Any late | TODO star-gated |

### Recipes
- [x] Omelette, soup, pie, stew (partial unlocks)  
- [ ] Seasonal feast dish  
- [ ] Festival-only treat  

### NPCs (cap at 5 for v2)
- [x] Ms. Maple  
- [x] Finn  
- [ ] Shopkeeper  
- [ ] Mail carrier / mayor lite  
- [ ] Mysterious forest friend  

### Achievements
- Expand only when system exists (fishing, festival, second map).  

---

## 10. Risk register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creeps to full Stardew | Never ships 1.0 | Anti-goals + BIG-10 freeze |
| Art perfectionism | BIG-1 never ends | Timebox; “readable & cohesive” not AAA |
| Save breaks mid-iteration | Lost progress / tears | Version + migrate; export save (BIG-9) |
| Too many on-screen texts | Confusion | One primary prompt hierarchy |
| Performance with bigger maps | Lag | Camera culling (started); atlas only |
| file:// quirks | Won’t open | Avoid modules; document `npx serve` fallback |

---

## 11. Decision log (append as you go)

| Date | Decision | Why |
|------|----------|-----|
| 2026-07 | Vanilla HTML/JS, no bundler | Double-click for kid/parent |
| 2026-07 | TILE=32, 16×16 atlas ×2 | Crisp pixels |
| 2026-07 | Soft time (sleep-driven days) | No pass-out stress |
| 2026-07 | No combat / romance | Age + tone |
| | | |

---

## 12. Changelog of big iterations (append when shipping)

### v0.9 — Cozy Prototype+
- Playable farm loop, seasons, animals, kitchen, quests  
- Stardew-ish wood UI, atlas autotile, pixel Amber, favicon  
- Prompt/tool separation, character redesign pass  

### v1.0.0 — Ship (2026-07-10)
- Soft energy bar (never KO)  
- Inventory menu (I) with Items / Seeds / Map / Stats  
- Y-sorted player, NPCs, animals  
- Fertilizer + fall/winter crops + new recipes  
- Seasonal music, footsteps, door SFX, audio prefs persist  
- SAVE_VERSION 2, version tag on title  

### v1.5.0 — Valley Alive (2026-07-10)
- Season festivals with unique rewards  
- Morning mail system (NPC notes, gifts, Farmer's Day)  
- Heart events; Bea the shopkeeper  
- Scarecrow + soft crow event  
- Animal friendship hearts; winter snow  
- SAVE_VERSION 3  

### v2.0.0 — Expanded Valley (2026-07-10)
- Forest area (north warp) + mushrooms  
- Fishing minigame + rod shop upgrades  
- Save export/import  
- SAVE_VERSION 4  

### v2.1.0 — Beach + UI (2026-07-10)
- Sunny Beach map (south warp), shells, shore fishing  
- Location badge + enter banners, clearer HUD  
- English-only UI polish (no bilingual)  
- SAVE_VERSION 5  

### v2.1.1 / v2.1.2 — Code review fixes (2026-07-12)
- All 23 review issues closed (see CODE_REVIEW.md): save/load position snap, static fish defs, fishing/escape desync, sticky interact, mushroom visuals, inventory normalize (SAVE 6), unified overnight growth, off-season pause, draw dedup, etc.

### v2.2.0 — Barnyard Days (2026-08-01)
- Barn building + east pen (goats, sheep, pigs, cows)  
- Goat (goat milk → cheese), Sheep (wool), Pig (truffles)  
- Rooster companion: boosts chicken hearts, crows at dawn  
- Bigger Coop (6 chickens) / Bigger Barn (6 animals) upgrades  
- Sell Box: instant coins for unwanted items  
- 5 new achievements; SAVE_VERSION 7

### v3.0.0 — Mountain, Market & Mystery (2026-08-01)
- **Mountain Pass + Gem Cave** (east warp): chip gem nodes, pick crystals & geodes  
- **Village Market Street** (west warp): fountain wishes, postbox letters, market stall snacks  
- Gems (quartz/amethyst/emerald/ruby/star) + snacks (cookie/cocoa/bouquet) as gifts  
- Geode cracking at Rori's bench — always a gem (kid-safe)  
- Gem Collection: find all five → celebration + 3-star achievement  
- Three new friends: Mayor Milo (village), Rori (mountain), Wren (forest)  
- Town Welcome: flower → crop → gem quest chain from Milo  
- Letters via postbox: +1 heart per day; NPC scene support  
- 7 new achievements; SAVE_VERSION 9

### v2.x — *(next ideas)*
- Photo mode, deeper barns, more festival minigames  

---

*Last updated: 2026-08-02 · Current ship: **v4.0.1***

---

## 13. How to use this document

1. **Pick the next unchecked BIG** on the critical path (default: finish **BIG-0**, then **BIG-1** or **BIG-2**).  
2. Open a working session with only that BIG’s table as the todo list.  
3. When exit criteria pass, mark `[x]`, add a line under §12, bump title version if needed.  
4. Do **not** start the next BIG until smoke QA (§8) is green.  
5. If Amber asks for something off-plan: add it under §9 backlog or a new BIG-11+, don’t silently expand the current BIG.

---

## 14. One-page summary

| Now | Next product | Then dream |
|-----|----------------|------------|
| Playable cozy farm | **v1.0** pretty + clear UI + juice | Valley with festivals, second map, fishing |

**Master promise:** every big iteration makes Amber’s farm *more hers* — prettier, deeper, or kinder — and always still openable with a double-click.

---

*Last updated: 2026-07-10 · Owner: project maintainer · Player: Amber 🦊*

### v4.0.0 — Home Sweet Home (2026-08-02)
- 16×11 cottage: bedroom / kitchen / living room + wall windows (TILE.WINDOW)
- 10 placeable home furniture pieces (atlas 97–107), shop Home section, floor-only placement + pickup
- Bookshelf storybook modal (2 achievement-gated stories); fireplace glow + embers
- Ambient life: butterflies, dusk fireflies, fall leaves, winter sparkle, water glints, Zzz over bed
- SAVE_VERSION 10 (homeDecor, stories; starter rug migration)

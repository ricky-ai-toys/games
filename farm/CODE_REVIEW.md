# Amber's Farm — Full Codebase Review

**Scope:** Entire game at `C:\Users\Ricky\Documents\AmbersFarm` (not a git-diff review).  
**Date:** 2026-07-12 · **Version reviewed:** 2.1.0 / SAVE 5  
**Fixes applied:** 2026-07-12 in **v2.1.1** / SAVE 6 — see § Fix log

---

## Summary

Amber's Farm is a well-structured Stardew-like browser game with clear module boundaries, solid multi-scene warps (farm / cottage / forest / beach), a coherent sleep→growth→shipping→mail pipeline, and kid-friendly systems (soft energy, hand-auto tools, scarecrow/crows). The biggest correctness risks are **save/load position vs forced outdoor scene**, **fish sell prices not surviving reloads** (runtime `PRODUCT_DEFS` mutation), **Escape / other UI during fishing** leaving the minigame and world pause desynced, and a few **dead or duplicated systems** (`Farming.overnightGrowth` unused; NPC/animal draw paths duplicated). Nothing looked like a script-order crash; load order in `index.html` is sound.

---

## Architecture

**Strengths**
- Global module IIFEs (`Game`, `World`, `Farming`, `Shop`, …) match script tags and keep concerns readable for a no-bundler project.
- Data files (`js/data/*`) separate from systems; `CONST` / `TILE` centralize balance and tile IDs.
- Interaction stack in `World.interact` (specials → NPCs/animals → tools) is easy to reason about.
- Save versioning with stepwise `migrate()` is the right pattern for localStorage games.

**Weaknesses**
- Overnight growth is implemented twice (inline in `Game.doSleep` vs dead `Farming.overnightGrowth`) — drift risk.
- Drawing is split between `Render.drawOneNpc` / `drawOneAnimal` and unused `NPC.draw` / `Animals.draw`.
- Mutable global catalogs (`PRODUCT_DEFS` extended at runtime) couple session state to module globals and break after reload.
- UI pause is a single boolean with many entry points; fishing uses a second rAF loop and is easy to desync.

---

## Issues

### Issue 1 — Severity: bug
- **File:** `js/save.js:88–96`, `js/game.js:70–101`, `js/main.js:222–226`
- **Description:** Saves always force `scene: 'outdoor'` (including forest/beach; interior is remapped). Player `x`/`y` are still the coordinates from the scene where the player stood. After **Save & Exit**, **beforeunload**, or any load while the player was indoors/forest/beach, they wake on the farm map at interior-sized or foreign-map coordinates (e.g. cottage ~`(6,6)` tiles, forest south path, beach shore) instead of the house door or the correct warp exit. Sleep path avoids this only because `doSleep` teleports outdoors before `Save.write`.
- **Suggestion:** On write or load: if scene was interior → snap to outdoor door spawn (`enterOutdoor` coords); if forest/beach → either persist scene properly or snap to the matching outdoor warp. Prefer restoring `scene` for forest/beach with map regen via `World.initStateMaps`.
- **Status:** open

### Issue 2 — Severity: bug
- **File:** `js/fishing.js:111–117`, `js/shop.js:136–141`, `js/data/animals.js:30–37`
- **Description:** Caught fish are stored as `fish_*` products and registered into `PRODUCT_DEFS` only at catch time. After a full page reload, `PRODUCT_DEFS` is reset to the static table (egg/milk/mushroom/shell only). Inventory can still hold `fish_carp` etc., but shipping falls back to **10g** (`def ? def.sell : 10`) and UI shows generic `📦`/raw id.
- **Suggestion:** Define all fish entries statically in `PRODUCT_DEFS` (or a `FISH_DEFS` merge at boot). Never rely on runtime mutation for sell price identity.
- **Status:** open

### Issue 3 — Severity: bug
- **File:** `js/ui.js:225–231`, `js/main.js:85–87`, `js/fishing.js:33–58`, `js/fishing.js:141–150`
- **Description:** `closeModals()` does **not** hide `#modal-fishing` and does **not** call `Fishing.cancel()`. Escape sets `paused = false` while the fishing rAF loop may still be active. Also, `KeyI` / `KeyJ` / pause open other modals without checking `Fishing.isActive()`, so inventory/journal can stack over fishing while the bar still updates.
- **Suggestion:** In `closeModals` (and Escape): if `Fishing.isActive()`, call `Fishing.cancel()` first. Gate inventory/journal/pause with `!Fishing.isActive()`. Include `modal-fishing` in modal cleanup or always route through `Fishing.end`.
- **Status:** open

### Issue 4 — Severity: bug
- **File:** `js/atlas.js:570–579` (vs flower `552–555`, shell `608–621`)
- **Description:** Flowers and shells respect `Forage.isPicked` for drawing; **mushrooms always draw** as if present. After pick, the tile still looks harvestable; prompt still says “Pick mushroom”; interact only toasts “Already picked today”.
- **Suggestion:** Mirror flower/shell: if picked, blit grass only (or a stump sprite).
- **Status:** open

### Issue 5 — Severity: bug
- **File:** `js/farming.js:41–51`
- **Description:** `hoe()` succeeds on already-tilled empty soil (`s.tilled = true` again) and still calls `Game.spendEnergy(CONST.ENERGY_TOOL)`. Players can drain energy by repeatedly hoeing the same plot (hand-auto and explicit hoe).
- **Suggestion:** If already tilled and no crop, return `false` (or no-op without energy).
- **Status:** open

### Issue 6 — Severity: bug
- **File:** `js/main.js:69–84` vs `js/game.js:358–370`
- **Description:** While any modal has `state.paused === true`, `interactPressed` is set by E/Space but **not consumed** (update returns early on pause). Closing the modal leaves the flag true → **immediate re-interact** (re-open shop, re-trigger bed sleep confirm, harvest, etc.).
- **Suggestion:** Clear `interactPressed` when opening/closing modals, or ignore interact input while paused / for one frame after unpause.
- **Status:** open

### Issue 7 — Severity: bug
- **File:** `js/kitchen.js:60`, `js/shop.js:119`, `js/save.js:27–50`, `js/game.js:70–101`
- **Description:** `applySave` assigns `inventory` wholesale from disk. Migrate fills `fertilizer` and `rod` but not `dishes`, `decor`, or `products`. Old or partial saves can throw on first cook (`state.inventory.dishes[recipeId] = …`) or first decor purchase (`state.inventory.decor[id] = …`).
- **Suggestion:** In `migrate` / `applySave`, normalize inventory: `{ seeds:{}, crops:{}, products:{}, dishes:{}, feed:0, decor:{}, fertilizer:0, rod:0, ...data.inventory }`.
- **Status:** open

### Issue 8 — Severity: bug
- **File:** `js/game.js:176–226` vs `js/farming.js:176–226`
- **Description:** `Farming.overnightGrowth` is **never called**. Growth is duplicated inline in `Game.doSleep`. The dead path also disagrees with live logic (inline treats ending-day **rain or snow** as watering; `overnightGrowth` only pre-waters for `rain`, and comments about off-season pause are unimplemented in both).
- **Suggestion:** Single source of truth: call `Farming.overnightGrowth(state)` from `doSleep` (with clear pre/post weather contract) and delete the inline loop; implement or remove the off-season comment.
- **Status:** open

### Issue 9 — Severity: suggestion
- **File:** `js/game.js:93`, `js/save.js:89`, `js/game.js:53`
- **Description:** `letters` are written to save but never restored in `applySave` (always start from `createNewState` defaults). Low impact if letters are display-only, but the field is misleading dead state.
- **Suggestion:** Restore `letters` or stop saving them.
- **Status:** open

### Issue 10 — Severity: suggestion
- **File:** `js/farming.js:119–129`, `js/farming.js:104–116`
- **Description:** Copper can (3×3) calls `waterAt` per cell; each successful cell spends `ENERGY_TOOL * 0.5`. One upgrade swing can cost up to ~9 energy vs 1 for center-only — feels like a penalty for upgrading.
- **Suggestion:** Spend energy once per tool use if any tile watered.
- **Status:** open

### Issue 11 — Severity: suggestion
- **File:** `js/farming.js:194–201`, growth loops in `game.js:205–226`
- **Description:** Comments mention off-season growth pause; neither path checks `crop.seasons` vs current season. Out-of-season crops keep maturing if watered (by hand or rain).
- **Suggestion:** Skip `growProgress` when season not in `crop.seasons` (optional wither rule later).
- **Status:** open

### Issue 12 — Severity: suggestion
- **File:** `js/npc.js:142–198`, `js/animals.js:180–246`, `js/render.js:228–352`
- **Description:** `NPC.draw` and `Animals.draw` appear unused; outdoor y-sort uses `Render.drawOneNpc` / `drawOneAnimal`. Bea’s hair/hat differs between copies — future edits will desync.
- **Suggestion:** One draw path each; have y-sort call `NPC.drawOne` / `Animals.drawOne`, delete duplicates.
- **Status:** open

### Issue 13 — Severity: suggestion
- **File:** `js/ui.js:293–305`, `js/fishing.js:114–117`
- **Description:** Shipping UI uses `PRODUCT_DEFS[id] || { sell: 10 }`. Combined with Issue 2, fish are silently underpriced after reload with no warning.
- **Suggestion:** Static defs + optional toast if unknown product id is shipped.
- **Status:** open

### Issue 14 — Severity: suggestion
- **File:** `js/world.js:151–159`
- **Description:** Outdoor warp uses `ty <= 1` → forest else beach. Correct for current map (north y=0, south y=25) but fragile if a mid-map warp is ever added.
- **Suggestion:** Encode destination on the warp (map metadata) or compare to known warp coordinates.
- **Status:** open

### Issue 15 — Severity: suggestion
- **File:** `js/main.js:77–84`, fishing UI copy in `index.html:300`
- **Description:** UI says hold **Space or A**; keyboard **A** is movement (`KeyA` → left). Only touch **A** button holds the fishing bar. Confusing for desktop players.
- **Suggestion:** Change copy to “Hold Space (or touch A)” / bind a non-movement key.
- **Status:** open

### Issue 16 — Severity: suggestion
- **File:** `js/quests.js:6–8`, `js/shop.js:151–152`
- **Description:** Quest text “Ship 3 items **overnight**” but progress increments when items enter the bin, not when `resolveShipping` pays out.
- **Suggestion:** Rename desc or progress on morning payout.
- **Status:** open

### Issue 17 — Severity: suggestion
- **File:** `js/game.js:299–313`, `js/kitchen.js:71–81`
- **Description:** `farm_rank_3` is granted both via `Kitchen.unlockFromStars` → `tryAchieve` and a silent flag set at the end of `tryAchieve`. Currently mostly redundant; silent path can skip toast if call order ever changes.
- **Suggestion:** Only grant via `tryAchieve('farm_rank_3')` in one place.
- **Status:** open

### Issue 18 — Severity: suggestion
- **File:** `js/forage.js:106–110`
- **Description:** `isPicked` still honors legacy keys `tx+','+ty` without scene. Same coordinates across outdoor/forest could share a “picked” flag for the day.
- **Suggestion:** Drop legacy keys after migrate, or migrate old keys to `scene:tx,ty`.
- **Status:** open

### Issue 19 — Severity: nit
- **File:** `js/data/map.js:152–154`
- **Description:** `yInPath` always returns `true` — leftover stub; the horizontal path loop is effectively “all x on row 12”.
- **Suggestion:** Remove helper or implement real path mask; keep code honest.
- **Status:** open

### Issue 20 — Severity: nit
- **File:** `index.html:320` vs `js/constants.js:8`
- **Description:** Pause modal hardcodes `v2.0.0` in HTML; runtime `openPauseMenu` overwrites from `CONST.GAME_VERSION`. Harmless flicker/mismatch if JS fails.
- **Suggestion:** Empty placeholder or same version string as title.
- **Status:** open

### Issue 21 — Severity: nit
- **File:** `js/game.js:191`
- **Description:** `full_energy` achievement triggers at `energy <= 5`, not empty; name/desc say “empty energy”.
- **Suggestion:** Align threshold with copy (`<= 0` or rename).
- **Status:** open

### Issue 22 — Severity: nit
- **File:** `js/render.js:53–59`
- **Description:** Forest/beach/interior draw player without y-sorting against other entities (fine today — no NPCs there). Forest trees are ground-layer only so player always draws on top of canopy in front — acceptable for this art style.
- **Suggestion:** Optional later: y-sort trees as props.
- **Status:** open

### Issue 23 — Severity: nit
- **File:** `js/main.js:195–203`
- **Description:** Second `keydown` listener for Q/Z/C does not guard `e.repeat`, so holding Q can spin the hotbar.
- **Suggestion:** Add `if (e.repeat) return`.
- **Status:** open

---

## What's solid

- **Script load order** (`index.html:351–383`): constants → data → systems → `game.js` → `main.js` is correct; no forward-reference crashes at parse time for normal play.
- **Multi-scene maps** (`map.js` forest/beach + `World` enter/exit spawns): warps, fish spots, shells, mushrooms are coherent; beach driftwood correctly non-clearable.
- **Sleep pipeline** (`game.js` doSleep): animals → energy → crow → growth → shipping → day/weather roll → morning rain water → mail → festival is a sensible order.
- **Soft energy** design: never hard-locks actions; walk slow under threshold — good for kids.
- **Hand tool auto-farm** chain (harvest → water → hoe → plant) is a strong UX win.
- **Save migrate v2–v5** covers energy, fertilizer, hearts, rod, fished stats.
- **Hotbar signature** rebuild in `UI.refreshHUD` avoids full DOM thrash every frame.
- **Atlas autotile** path/water masks (`atlas.js` `mask` + `isPathLike`/`isWater`) including WARP/FISH_SPOT as path-like — polished ground rendering.
- **Quest progress hooks** from farm/talk/gift/cook/forage are wired consistently.
- **Scarecrow / crow soft penalty** (one day of growth, not crop delete) fits tone.
- **Festival once-per-day** via `festivalClaimedDay`.
- **PRODUCT_DEFS** for egg/milk/mushroom/shell and static animal products are complete for non-fish goods.

---

## Recommended fix order

1. **Fishing modal / Escape / pause desync** (Issue 3) — easy, high annoyance, can soft-lock feel.
2. **Static fish `PRODUCT_DEFS`** (Issue 2) — economy correctness after reload.
3. **Save/load scene + position snap** (Issue 1) — broken continue from interior/forest/beach.
4. **Stuck `interactPressed` after modal close** (Issue 6) — accidental double actions.
5. **Inventory normalize on migrate/load** (Issue 7) — hard crash risk on edge saves.
6. **Mushroom picked visuals** (Issue 4) — clear player-facing bug.
7. **Hoe no-op if already tilled** (Issue 5) — energy fairness.
8. **Unify overnight growth** (Issue 8) — prevent future balance bugs.
9. **Water can energy once per use** (Issue 10).
10. **Off-season growth rule** (Issue 11) if desired for season identity.
11. **Deduplicate NPC/animal draw** (Issue 12) and remaining nits (14–23).

---

## Module checklist (reviewed)

| Module | Focus | Notes |
|--------|--------|--------|
| `js/game.js` | Sleep, energy, loop | Growth inlined; energy soft; interact edge while paused |
| `js/world.js` | Scenes, warp, collision, interact | Warp north/south OK; solid tiles sensible |
| `js/save.js` | Versioning | Force outdoor; migrate incomplete for nested inv |
| `js/farming.js` | Growth, fertilizer | Dead `overnightGrowth`; hoe re-till |
| `js/fishing.js` | Minigame | PRODUCT_DEFS mutate; separate rAF |
| `js/forage.js` | Pick limits | Mushroom visual gap in atlas |
| `js/ui.js` | Modals, HUD | Fishing not in closeModals |
| `js/atlas.js` | Ground masks | Path/water good; mushroom pick miss |
| `js/render.js` | Y-sort, multi-scene | Outdoor y-sort only |
| `js/npc.js` | Hearts | Events/gifts OK; draw unused |
| `js/animals.js` | Feed/product | Overnight hearts OK |
| `js/time.js` | Day/season | Festival day = last of season |
| `js/shop.js` | Buy/ship | Fish price fallback 10g |
| `js/main.js` | Input | Escape/fishing; sticky interact |
| `js/data/map.js` | Warps beach/forest | Coherent generators |
| `index.html` | Scripts/modals | Order OK; fishing cancel button separate |

---

## Fix log (v2.1.1)

| Issue | Status |
|-------|--------|
| 1 Save/load position | **Fixed** — write snaps outdoor spawns; load snaps via `savedScene` |
| 2 Fish PRODUCT_DEFS | **Fixed** — static fish_* in `data/animals.js` |
| 3 Fishing Escape desync | **Fixed** — `closeModals` cancels fishing; I/J/pause gated |
| 4 Sticky interact | **Fixed** — `clearInteract` + ignore press while paused |
| 5 Mushroom visuals | **Fixed** — respect `Forage.isPicked` |
| 6 Re-hoe energy | **Fixed** — already tilled returns false |
| 7 Inventory normalize | **Fixed** — `normalizeInventory` + migrate v6 |
| 8 overnightGrowth dead | **Fixed** — single path in `Farming.overnightGrowth` |
| 9 letters dead field | **Fixed** — no longer saved |
| 10 Copper can energy | **Fixed** — once per swing |
| 11 Off-season growth | **Fixed** — pause when not in season |
| 12 Draw duplication | **Fixed** — `NPC.drawOne` / `Animals.drawOne` single path |
| 13 Ship unknown product | **Fixed** — toast + static fish |
| 14 Warp fragile | **Fixed** — explicit warp cell coords |
| 15 Fishing A copy | **Fixed** — Space / touch A |
| 16 Quest ship desc | **Fixed** — bin wording |
| 17 farm_rank double | **Fixed** — single tryAchieve path |
| 18 Forage legacy keys | **Fixed** — scene-scoped only |
| 19 yInPath stub | **Fixed** — removed |
| 20 Pause version HTML | **Fixed** — 2.1.1 |
| 21 full_energy threshold | **Fixed** — `<= 0` + copy |
| 22 Forest y-sort | **Accepted** — trees are ground-layer art; player on top is intentional |
| 23 Q key repeat | **Fixed** — `e.repeat` guard |

*Review method: full file reads; fixes landed in v2.1.1–2.1.2. All open issues closed.*

# Amber's Games — Hardening QA Checklist

> Parent-facing manual verification. Run this after any big change or before declaring a hardening iteration done.
> Open each game from a static server (`python3 -m http.server 8080`) — not `file://` — so the service worker + vendored libs load.

## Per-game smoke (2–3 min each)

- [ ] **New Game** — starts cleanly, title/menu visible, no console errors
- [ ] **Play 1–2 min** — core loop works (move, jump, swap, type, etc.)
- [ ] **Settings / Mute** — toggle works, persists after refresh
- [ ] **Best/score** — records and survives a page reload
- [ ] **Continue / reload** — progress loads back (for games with save)

## Cross-cutting hardening checks

### Crash-proofing & storage
- [ ] Open a game in **Private/Incognito mode** (storage may be restricted) — game must still boot, never a blank page
- [ ] **Safari private mode** specifically: localStorage can throw on access — verify no crash
- [ ] Trigger a corrupt save (devtools: `localStorage.setItem('ambers_farm_save_v1','{broken')` then reload Farm) — game should recover gracefully, not loop "No save found"
- [ ] In Shop / Typing, click **Restart** — must NOT wipe other games' saves or the playtime clock (scoped clear, not `localStorage.clear()`)
- [ ] All games: **no `localStorage.clear()`** anywhere — verify `rg -c "localStorage.clear()"` returns 0

### Offline & supply chain
- [ ] DevTools → Network → **Offline** — reload any game; it should still load (vendored `vendor/`, no CDN)
- [ ] `rg -l "unpkg.com"` must return nothing
- [ ] Google Fonts may fail offline — verify games still render with **system font fallbacks** (not blank/tofu)

### Mobile / touch
- [ ] DevTools → device toolbar (375×667 iPhone) — canvas games scale without horizontal scroll
- [ ] **Odyssey** — tap left/right thirds of screen to move in lotus, cyclops, underworld, boulders mini-games (was keyboard-only)
- [ ] All tap targets ≥ 44px; `user-scalable=no` is set (note: this limits pinch-zoom accessibility — documented tradeoff)
- [ ] next100 + wild now have on-screen help text

### Performance & battery
- [ ] Open a canvas game, **switch to another tab** for 10s, switch back — game should auto-pause/resume (no frozen audio, no huge catch-up)
- [ ] **Background tab** should not peg CPU — verify via DevTools Performance (rAF suspended when hidden)
- [ ] Odyssey title screen: save blob is **not** parsed every frame (cached ~0.5s)

### Audio
- [ ] All games: every `AudioContext.resume()` has a `.catch()` — verify `rg "\.resume\(\)" *.html farm/js/audio.js bigtwo/js/audio.js odyssey/js/audio.js | rg -v "\.catch"` returns 0
- [ ] Audio context is created **only after first user gesture** (no autoplay-before-click)

### Error handling
- [ ] Each game installs a global `error` handler — force an error (devtools: `setTimeout(()=>{throw new Error('test')},1000)`) and verify a friendly "Reload" overlay appears instead of a dead page

### PWA
- [ ] DevTools → Application → Manifest — each game page links `manifest.webmanifest`
- [ ] DevTools → Application → Service Workers — `sw.js` registered, status activated
- [ ] Navigate to a **missing route** (e.g. `/nope.html`) — custom `404.html` with "Back to Arcade" shows, not GH Pages default
- [ ] Install prompt works (standalone display)

## Final repo-wide gates

- [ ] `node --check` passes on `hardening.js`, `sw.js`, `pwa.js`, and every `farm/js/*.js`, `bigtwo/js/*.js`, `odyssey/js/*.js`
- [ ] `rg -c "unpkg.com"` → 0
- [ ] `rg -c "localStorage.clear()"` → 0
- [ ] No `gh-pages` branch lying around (`git branch` shows only `main`)

---

*Last run: 2026-08-07 · Hardening iteration H0–H7 complete*

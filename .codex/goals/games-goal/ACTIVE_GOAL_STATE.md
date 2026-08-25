---
status: active
owner_mode: goal
objective: "implement all, step by step, until done"
updated_at: 2026-08-26T00:30:57+08:00
adapter_id: games-goal
---

# Active Goal State

## Objective

implement all, step by step, until done

## Authority Sources

- No explicit goal document was provided during bootstrap.

## Operating Contract

- Treat this file as the durable goal state for future agent ticks.
- Treat the authority sources above as the first context to inspect before acting.
- Read current project evidence before choosing the next action.
- Run a bounded progress segment when useful; it does not have to be one tiny step.
- Keep private evidence, credentials, local paths, and raw logs out of public commits.
- End each tick with changed files, validation, residual risk, and the next action.

## Execution Profile

- `cadence=bounded_progress_segment minimum=multi_surface_or_implementation include=coherent_artifact,targeted_validation,state_writeback spend_rule=spend_only_after_artifact_validation_writeback small_streak_threshold=2`
- Repeated small-scale follow-through should expand the next delivery batch or report a blocker before spending quota.

## Non-Goals

- Do not perform irreversible production operations without explicit approval.
- Do not publish private project evidence.
- Do not optimize for activity if no useful artifact or decision can be produced.


## User Todo / Owner Review Reading Queue

## Agent Todo

- [ ] [P1] Run `loopx check` against the project registry and record the first project-specific adapter signal or an explicit no-follow-up rationale.
  <!-- loopx:todo todo_id=todo_fa501099a20c status=open task_class=advancement_task action_kind=onboarding_connection_validation updated_at=2026-08-07T00:13:34%2B08:00 -->
- [ ] [P0] H0 Foundation: create vendor/ dir with pinned React/Vue/Babel builds; create hardening.js with safe localStorage getJSON/setJSON, window.onerror friendly overlay, safeResume() audio helper, visibilitychange auto-pause, scoped-clear helper; load hardening.js in all 21 game entry files
  <!-- loopx:todo todo_id=todo_2c2dddc1adfc status=open task_class=advancement_task action_kind=scaffold_shared updated_at=2026-08-07T00:13:49%2B08:00 -->
- [ ] [P0] H1 Crash-proofing & storage: wrap all boot-scope localStorage reads in try/catch (crystal, starcatcher, space, next100, wild, shark, down100, salon, petclinic, typing); quarantine corrupt saves (farm save.js, odyssey state.js) + add day/coins defaults in farm load(); replace localStorage.clear() in shop.html:675 & typing.html:534 with scoped key removal; add .catch(()=>{}) to all unguarded audioCtx.resume() calls across all games
  <!-- loopx:todo todo_id=todo_51940927815a status=open task_class=advancement_task action_kind=guard_storage updated_at=2026-08-07T00:13:59%2B08:00 -->
- [ ] [P1] H3 Offline & supply chain: point 9 CDN games (typing/shop/dressup/salon/petclinic React+Babel; suanchou/suanchou-quest/binary/down100 Vue) at local vendor/ files, remove unpkg.com script tags; replace Google Fonts @import in farm/css/style.css:6 & bigtwo/css/style.css:6 with local woff2 or system fallback
  <!-- loopx:todo todo_id=todo_178f4e297d76 status=open task_class=advancement_task action_kind=vendor_libs updated_at=2026-08-07T00:14:05%2B08:00 -->
- [ ] [P1] H2 Mobile parity: Odyssey — map Key left/right to touch zones for 3 keyboard-only mini-games (lotus mini.js:112-113, cyclops mini.js:172-173, underworld mini.js:469-470); make fixed 960x540 canvas + Georgia text readable on 375px phones via media query + min font size; add help text to next100 & wild
  <!-- loopx:todo todo_id=todo_71a613f56d6f status=open task_class=advancement_task action_kind=fix_mobile updated_at=2026-08-07T00:14:13%2B08:00 -->
- [ ] [P1] H4 Performance & battery: add visibilitychange auto-pause to games missing it (crystal, starcatcher, kite, space, wild, shark, shop, typing, salon, petclouse, dressup, next100); cancel rAF on tab hidden; odyssey — cache Save.load() result for title screen instead of parsing 60x/sec in game.js:151,198
  <!-- loopx:todo todo_id=todo_6e83911cfc2f status=open task_class=advancement_task action_kind=fix_perf updated_at=2026-08-07T00:14:21%2B08:00 -->
- [ ] [P2] H5 PWA & deploy hygiene: add service worker for offline caching (portal + farm/odyssey/bigtwo); add rel=manifest link to each game page for installable deep links; add 404.html fallback; delete stale local-only empty gh-pages branch (6101ceb)
  <!-- loopx:todo todo_id=todo_236c181c5e39 status=open task_class=advancement_task action_kind=pwa_hygiene updated_at=2026-08-07T00:14:28%2B08:00 -->
- [ ] [P2] H6 Consistency & orphans: dedupe suanchou-quest.html (byte-identical to suanchou.html, same save key) — make it a thin redirect or shared route; add next100.html + wild.html cards to portal.html + README; add missing playtime.js include to odyssey/index.html; unify save key naming convention
  <!-- loopx:todo todo_id=todo_8c3d7f9696b5 status=open task_class=advancement_task action_kind=cleanup updated_at=2026-08-07T00:14:35%2B08:00 -->
- [ ] [P2] H7 QA gate + release: run site-wide console-clean verification after all edits; update README.md game list + tech-notes to reflect vendored libs & offline constraints; manual QA checklist for parent-facing (new game, play, refresh, continue, private mode, mobile touch, background tab)
  <!-- loopx:todo todo_id=todo_e85e385df401 status=open task_class=advancement_task action_kind=qa_gate updated_at=2026-08-07T00:14:43%2B08:00 -->
- [ ] [P0-done] H0 Foundation complete: vendor/{react,babel,vue}/ populated (React 18.3.1, Babel 7.26.10, Vue 3); hardening.js created with getJSON/setJSON/getString/getInt/installErrorOverlay/safeResume/installAudioGestureUnlock/onVisible/onHidden/clearScope; loaded in all 22 entry files (21 games + portal, symlink index.html skipped, odyssey also gained missing playtime.js)
  <!-- loopx:todo todo_id=todo_bde17f23062a status=open task_class=advancement_task action_kind=scaffold_shared updated_at=2026-08-07T00:17:57%2B08:00 -->
- [x] [P0] Boundary: untrack private .loopx/ registry from public repo (contract fix) — DONE in working tree, commit with first delivery
  <!-- loopx:todo todo_id=todo_58db56955413 status=done task_class=advancement_task action_kind=code_change evidence=.gitignore%20now%20excludes%20.loopx%2F%3B%20git%20rm%20-r%20--cached%20.loopx%20done%3B%20loopx%20check%20ok%3DTrue%20errors%3D0 completed_at=2026-08-26T00:17:09%2B08:00 updated_at=2026-08-26T00:17:09%2B08:00 -->
- [x] [P0] monopoly/js/data.js + rules.js + js/rules.test.js: 7x7 board data (24 spaces), pure game-logic state machine (roll/move/buy/rent/stars/jail/surprise/oops/bankruptcy/round-limit win) + node smoke harness driving 1000 random games (no crashes, no negative cash, termination)
  <!-- loopx:todo todo_id=todo_24372d5d43b7 status=done task_class=advancement_task action_kind=code_change evidence=monopoly%2Fjs%2F%7Bdata%2Crules%2Cbots%7D.js%20%2B%20rules.test.js%3B%20node%20harness%201000%2B5000%20games%20green:%200%20crashes%2C%200%20negative%20cash%2C%20termination%20guaranteed%3B%20avg%2015.8%20rounds%3B%20fixed%20mid-turn%20elimination%20deadlock%20%28awaitingExtraRoll%20leak%29 completed_at=2026-08-26T00:17:10%2B08:00 updated_at=2026-08-26T00:17:10%2B08:00 -->
- [x] [P0] monopoly/index.html + css/style.css + ui.js + main.js + bots.js: playable end-to-end human vs Maple/Finn/Pip bots, buy prompts, player panel, event log, file:// compatible plain script tags
  <!-- loopx:todo todo_id=todo_1cab308d6b45 status=done task_class=advancement_task action_kind=code_change evidence=monopoly%2F%7Bindex.html%2Ccss%2Fstyle.css%2Cjs%2Fui.js%2Cjs%2Fmain.js%7D%20playable%20vs%20Maple%2FFinn%2FPip%3B%20plain%20script%20tags%20%28file:%2F%2F%20safe%29%3B%20driver%20contract%20matches%20rules.test.js%20harness completed_at=2026-08-26T00:27:04%2B08:00 updated_at=2026-08-26T00:27:04%2B08:00 -->
- [x] [P1] Juice: CSS dice-shake + face flip, token hop animation tile-by-tile, WebAudio synthesized sfx (rattle/coin/sad/fanfare) behind safeResume gesture helper
  <!-- loopx:todo todo_id=todo_b449dc2b96da status=done task_class=advancement_task action_kind=code_change evidence=dice-shake%20CSS%20keyframes%2C%20per-tile%20token%20hops%2C%20WebAudio%20oscillator%20SFX%20behind%20AmberHardening%20gesture%20unlock%20%2B%20persisted%20mute completed_at=2026-08-26T00:27:05%2B08:00 updated_at=2026-08-26T00:27:29%2B08:00 -->
- [x] [P1] Integration: portal card in index.html grid, README table row, sw.js cache entries for monopoly files
  <!-- loopx:todo todo_id=todo_0446696cda05 status=done task_class=advancement_task action_kind=code_change evidence=portal%20GAMES%20card%20%2B%20README%20row%3B%20sw.js%20unchanged%20by%20design%20%28runtime%20caching%20covers%20new%20files%29 completed_at=2026-08-26T00:27:06%2B08:00 updated_at=2026-08-26T00:27:30%2B08:00 -->
- [x] [P1] Verify: node --check all monopoly JS, run 1000-game smoke harness green, serve site and manually pass buy/rent/star/jail/surprise/win flows + console clean; LoopX writeback evidence
  <!-- loopx:todo todo_id=todo_db85875f105a status=done task_class=advancement_task action_kind=verification evidence=node%20--check%20all%207%20monopoly%20JS%20files%20clean%3B%20rules.test.js%203000%2B5000%2B2000%2B1000%20games%20green%20%280%20crashes%2Fdebt%2Fhangs%2C%20avg%2015.8%20rounds%2C%20both%20win%20reasons%20fire%29%3B%20DOM%20id%20%2B%20UI%2Fengine%20API%20cross-checks%20clean%3B%20portal%20inline%20JS%20node%20--check%20OK%3B%20HTTP%20smoke%20serves%20game%2Bportal%3B%20fixed:%20mid-turn%20elimination%20deadlock%2C%20driver%20re-roll%20loop%2C%20card-move%20star%20offers completed_at=2026-08-26T00:30:57%2B08:00 updated_at=2026-08-26T00:30:57%2B08:00 -->

## Next Action

- [P1] Run `loopx check` against the project registry and record the first project-specific adapter signal or an explicit no-follow-up rationale.

## Recent User Feedback

- Initialized by `loopx bootstrap`.

## Progress Ledger

- Created the initial goal state and registry connection.

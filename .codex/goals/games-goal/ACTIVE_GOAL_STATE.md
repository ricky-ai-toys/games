---
status: active
owner_mode: goal
objective: "implement all, step by step, until done"
updated_at: 2026-08-07T00:17:57+08:00
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

## Next Action

- [P1] Run `loopx check` against the project registry and record the first project-specific adapter signal or an explicit no-follow-up rationale.

## Recent User Feedback

- Initialized by `loopx bootstrap`.

## Progress Ledger

- Created the initial goal state and registry connection.

/* ========================================
   Amber's Farm — HTML UI Bridge
   ======================================== */

const UI = (() => {
  let toastTimer = null;

  // No hoe emoji exists in Unicode — draw a proper pixel-style hoe (handle + cross blade)
  const HOE_ICON = `<span class="slot-emoji"><svg viewBox="0 0 24 24" width="1.45rem" height="1.45rem" aria-hidden="true">
    <rect x="10.8" y="2" width="2.4" height="14.6" rx="1.2" fill="#8b5a2b"/>
    <rect x="10.8" y="2.4" width="2.4" height="3" fill="#a86f3a"/>
    <rect x="9.8" y="13.6" width="4.4" height="2.6" rx="0.6" fill="#9aa2aa"/>
    <rect x="2.6" y="15.6" width="18.8" height="4.4" rx="1.2" fill="#b7bec7"/>
    <rect x="2.6" y="15.6" width="18.8" height="1.4" rx="0.7" fill="#e2e8ee"/>
  </svg></span>`;

  function $(id) { return document.getElementById(id); }

  function show(el) {
    if (typeof el === 'string') el = $(el);
    if (el) el.classList.remove('hidden');
  }
  function hide(el) {
    if (typeof el === 'string') el = $(el);
    if (el) el.classList.add('hidden');
  }

  function toast(msg) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function refreshHUD() {
    const s = Game.state;
    if (!s || s.scene === 'title') return;

    const season = Utils.seasonName(TimeSys.seasonName(s));
    const dayInSeason = TimeSys.dayInSeason(s);

    if ($('hud-day')) $('hud-day').textContent = `Day ${s.day}`;
    if ($('hud-day-num')) $('hud-day-num').textContent = String(dayInSeason);
    if ($('hud-year')) $('hud-year').textContent = String(s.year || 1);
    if ($('hud-season')) $('hud-season').textContent = season;
    if ($('hud-period')) $('hud-period').textContent = Utils.periodLabel(s.period);
    if ($('hud-weather')) {
      $('hud-weather').textContent =
        s.weather === 'rain' ? '🌧️' : s.weather === 'snow' ? '❄️' : '☀️';
    }
    if ($('hud-coins')) $('hud-coins').textContent = Utils.formatCoins(s.coins);
    if ($('hud-farm-name')) $('hud-farm-name').textContent = s.farmName || "Amber's Farm";

    // Location badge
    const loc = (typeof World.locationName === 'function') ? World.locationName(s) : 'The Farm';
    if ($('hud-location')) $('hud-location').textContent = loc;
    if ($('hud-loc-icon')) {
      $('hud-loc-icon').textContent =
        s.scene === 'forest' ? '🌲' :
        s.scene === 'beach' ? '🏖️' :
        s.scene === 'interior' ? '🏠' : '🏡';
    }
    const locPanel = $('hud-location-panel');
    if (locPanel) {
      locPanel.classList.remove('loc-forest', 'loc-beach', 'loc-home', 'loc-farm');
      locPanel.classList.add(
        s.scene === 'forest' ? 'loc-forest' :
        s.scene === 'beach' ? 'loc-beach' :
        s.scene === 'interior' ? 'loc-home' : 'loc-farm'
      );
    }

    // Soft energy bar
    const eMax = CONST.ENERGY_MAX || 100;
    const e = s.energy != null ? s.energy : eMax;
    const eFill = $('hud-energy-fill');
    const eLabel = $('hud-energy-label');
    if (eFill) {
      const pct = Math.max(0, Math.min(100, (e / eMax) * 100));
      eFill.style.width = pct + '%';
      eFill.classList.toggle('low', e < (CONST.ENERGY_WALK_SLOW || 25));
    }
    if (eLabel) eLabel.textContent = Math.ceil(e) + '/' + eMax;

    // Clock hand: morning ~ -60°, afternoon 30°, evening 100°
    const hand = $('hud-clock-hand');
    if (hand) {
      const ang = s.period === 'morning' ? -50 : s.period === 'afternoon' ? 40 : 110;
      hand.style.transform = `translateX(-50%) rotate(${ang}deg)`;
    }

    // Hotbar — rebuild only when contents/selection change (avoids flicker)
    const hb = $('hotbar');
    const sig = s.hotbar.map(sl =>
      `${sl.type}:${sl.id || ''}:${sl.count || 0}`
    ).join('|') + '#' + s.selectedSlot;
    if (hb && sig !== s._hotbarSig) {
      s._hotbarSig = sig;
      hb.innerHTML = '';
      s.hotbar.forEach((slot, i) => {
        const div = document.createElement('div');
        div.className = 'hotbar-slot' + (i === s.selectedSlot ? ' selected' : '');
        div.innerHTML =
          (slot.type === 'hoe' ? HOE_ICON : `<span class="slot-emoji">${slot.emoji}</span>`) +
          (slot.count != null && slot.count > 0 ? `<span class="slot-count">${slot.count}</span>` : '') +
          `<span class="slot-key">${i + 1}</span>`;
        div.title = slot.name;
        div.addEventListener('click', () => {
          s.selectedSlot = i;
          FarmAudio.click();
          s._hotbarSig = ''; // force rebuild selection chrome
          refreshHUD();
        });
        hb.appendChild(div);
      });
    }

    // Selected tool — always prefixed so it never looks like the action prompt
    const tool = s.hotbar[s.selectedSlot];
    if ($('hud-tool-name')) {
      if (tool) {
        const count = tool.count != null && tool.count > 0 ? ` ×${tool.count}` : '';
        $('hud-tool-name').textContent = `Tool: ${tool.name}${count}`;
      } else {
        $('hud-tool-name').textContent = 'Tool: —';
      }
    }

    // Basket strip
    const crops = Object.keys(s.inventory.crops).reduce((n, k) => n + (s.inventory.crops[k].length || 0), 0);
    const products = Object.values(s.inventory.products).reduce((a, b) => a + b, 0);
    const dishes = Object.values(s.inventory.dishes || {}).reduce((a, b) => a + b, 0);
    if ($('hud-inv')) {
      const bits = [];
      if (crops) bits.push(`Crops ${crops}`);
      if (products) bits.push(`Goods ${products}`);
      if (dishes) bits.push(`Dishes ${dishes}`);
      if (s.inventory.feed) bits.push(`Feed ${s.inventory.feed}`);
      if (s.inventory.fertilizer) bits.push(`Fert ${s.inventory.fertilizer}`);
      $('hud-inv').textContent = bits.length ? bits.join('  ·  ') : 'Basket empty';
    }

    // Quest icon + mini line in clock
    const qEl = $('hud-quest');
    if (typeof Quests !== 'undefined') {
      const q = Quests.ensure(s);
      if (qEl) {
        qEl.textContent = q.done ? '❗' : '📋';
        qEl.classList.toggle('ready', !!q.done);
        qEl.title = q.done
          ? `Ready to claim: ${q.desc}`
          : `${q.desc} (${q.progress || 0}/${q.need})`;
      }
      const qm = $('hud-quest-mini');
      if (qm) {
        qm.textContent = q.done
          ? 'Quest ready!'
          : `Quest ${q.progress || 0}/${q.need}`;
        qm.title = q.desc;
      }
    }

    if ($('hud-stars')) $('hud-stars').textContent = String(Game.totalStars(s));

    updateTutorial();
    updatePrompt();
  }

  function updatePrompt() {
    const el = $('interact-prompt');
    if (!el || !Game.state || Game.state.scene === 'title' || Game.state.paused) {
      if (el) el.classList.add('hidden');
      return;
    }
    const text = World.promptFor(Game.state);
    if (text) {
      el.textContent = text;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  function updateTutorial() {
    const s = Game.state;
    const el = $('tutorial');
    if (!el) return;
    if (!s || s.tutorialDone || s.scene === 'title' || s.scene === 'interior') {
      // keep interior tips free of clutter; sleep tip still in prompt
      if (!s || s.tutorialDone || s.scene === 'title') hide(el);
      else if (s.scene === 'interior' && s.tutorialStep >= 4) {
        el.innerHTML = '<strong>Tip 5/5</strong><br>Walk to the bed and press E to sleep.';
        show(el);
      } else {
        hide(el);
      }
      return;
    }
    const steps = [
      'Walk south to the brown soil plots below your house.',
      'Face the dirt and press E — Hand (auto) tills for you.',
      'Press E again to plant (needs seeds on the toolbar).',
      'Press E to water. Then go home and sleep so crops grow!',
      'Enter the house, face the bed, press E to sleep.',
    ];
    const tip = steps[s.tutorialStep] || steps[steps.length - 1];
    const n = Math.min(s.tutorialStep + 1, steps.length);
    el.innerHTML = `<strong>Tip ${n}/${steps.length}</strong><br>${tip}`;
    show(el);
  }

  function showTitle() {
    show('title-screen');
    hide('hud');
    hide('touch-controls');
    const cont = $('btn-continue');
    if (Save.hasSave()) {
      cont.classList.remove('disabled');
      cont.disabled = false;
    } else {
      cont.classList.add('disabled');
      cont.disabled = true;
    }
  }

  function hideTitle() {
    closeModals();
    hide('title-screen');
    show('hud');
    show('touch-controls');
  }

  function closeModals() {
    // Cancel fishing first so rAF + pause stay in sync
    if (typeof Fishing !== 'undefined' && Fishing.isActive()) {
      Fishing.cancel();
    }
    ['modal-shop', 'modal-ship', 'modal-sellbox', 'modal-kitchen', 'modal-wardrobe',
      'modal-dialogue', 'modal-journal', 'modal-quest', 'modal-animals', 'modal-animalcard',
      'modal-letter', 'modal-pause', 'modal-sleep', 'modal-inventory',
      'modal-festival', 'modal-fishing', 'modal-geode', 'modal-postbox', 'modal-stall',
      'modal-story', 'modal-guide'].forEach(hide);
    if (Game.state) {
      Game.state.paused = false;
      // Clear sticky interact so closing a modal does not re-trigger E
      if (typeof Game.clearInteract === 'function') Game.clearInteract();
    }
  }

  function guardGameplayUI() {
    if (typeof Fishing !== 'undefined' && Fishing.isActive()) {
      toast('Finish or cancel fishing first');
      return false;
    }
    return true;
  }

  function openShop() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    refreshShop();
    show('modal-shop');
  }

  function refreshShop() {
    const s = Game.state;
    const body = $('shop-body');
    if (!body) return;
    let html = '<h3>Seeds</h3><div class="shop-grid">';
    for (const item of Shop.seedCatalog(s)) {
      const disabled = !item.inSeason ? 'disabled' : '';
      html += `<button class="shop-item ${disabled}" data-buy-seed="${item.id}" ${!item.inSeason ? 'disabled' : ''}>
        <span class="si-emoji">${item.emoji}</span>
        <span class="si-name">${item.name}</span>
        <span class="si-meta">${item.inSeason ? item.cost + 'g' : 'Out of season'}</span>
      </button>`;
    }
    html += `</div>
      <h3>Supplies</h3><div class="shop-grid">
      <button class="shop-item" data-buy-feed="1"><span class="si-emoji">🌾</span><span class="si-name">Hay / Feed</span><span class="si-meta">5g</span></button>
      <button class="shop-item" data-buy-fert="1"><span class="si-emoji">🧪</span><span class="si-name">Fertilizer</span><span class="si-meta">20g</span></button>
      <button class="shop-item" data-buy-rod="1"><span class="si-emoji">🎣</span><span class="si-name">${(s.inventory.rod || 0) === 0 ? 'Fishing Rod' : (s.inventory.rod || 0) >= 2 ? 'Best Rod (owned)' : 'Fiberglass Rod'}</span><span class="si-meta">${(s.inventory.rod || 0) === 0 ? '100g' : (s.inventory.rod || 0) >= 2 ? 'Owned' : '200g'}</span></button>
      <button class="shop-item" data-buy-water="1"><span class="si-emoji">💧</span><span class="si-name">Copper Watering Can</span><span class="si-meta">${s.waterUpgrade ? 'Owned' : '150g'}</span></button>
      </div>
      <h3>Furniture</h3><div class="shop-grid">`;
    for (const d of Object.values(Decor.DEFS)) {
      html += `<button class="shop-item" data-buy-decor="${d.id}">
        <span class="si-emoji">${d.emoji}</span><span class="si-name">${d.name}</span><span class="si-meta">${d.cost}g</span>
      </button>`;
    }
    html += '</div>';
    if (typeof Home !== 'undefined') {
      html += `<h3>Home</h3><div class="shop-grid">`;
      for (const d of Object.values(Home.DEFS)) {
        html += `<button class="shop-item" data-buy-home="${d.id}">
          <span class="si-emoji">${d.emoji}</span><span class="si-name">${d.name}</span><span class="si-meta">${d.cost}g</span>
        </button>`;
      }
      html += '</div>';
    }
    body.innerHTML = html;
    body.querySelectorAll('[data-buy-seed]').forEach(b => b.onclick = () => Shop.buySeed(s, b.dataset.buySeed));
    body.querySelectorAll('[data-buy-feed]').forEach(b => b.onclick = () => Shop.buyFeed(s));
    body.querySelectorAll('[data-buy-fert]').forEach(b => b.onclick = () => Shop.buyFertilizer(s));
    body.querySelectorAll('[data-buy-rod]').forEach(b => b.onclick = () => Shop.buyRod(s));
    body.querySelectorAll('[data-buy-water]').forEach(b => b.onclick = () => Shop.buyWaterUpgrade(s));
    body.querySelectorAll('[data-buy-decor]').forEach(b => b.onclick = () => Shop.buyDecor(s, b.dataset.buyDecor));
    if (typeof Home !== 'undefined') {
      body.querySelectorAll('[data-buy-home]').forEach(b => b.onclick = () => Shop.buyHomeFurniture(s, b.dataset.buyHome));
    }
  }

  function openShipping() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    refreshShipping();
    show('modal-ship');
  }

  function refreshShipping() {
    const s = Game.state;
    const body = $('ship-body');
    let html = '<p class="muted">Items ship overnight. Money arrives in the morning!</p>';
    html += '<button class="btn btn-primary ship-all-btn" id="ship-all">📦 Ship everything</button>';
    html += '<div class="shop-grid">';
    for (const id of Object.keys(s.inventory.crops)) {
      const arr = s.inventory.crops[id];
      if (!arr.length) continue;
      const c = CROPS[id];
      const q = arr[arr.length - 1];
      const price = Farming.sellPrice(id, q);
      html += `<button class="shop-item" data-ship="crop:${id}">
        <span class="si-emoji">${c.emoji}</span>
        <span class="si-name">${c.name} ×${arr.length}</span>
        <span class="si-meta">~${price}🪙 each</span></button>`;
    }
    for (const id of Object.keys(s.inventory.products)) {
      if (!s.inventory.products[id]) continue;
      const p = PRODUCT_DEFS[id] || { emoji: '📦', name: id, sell: 10 };
      html += `<button class="shop-item" data-ship="product:${id}">
        <span class="si-emoji">${p.emoji}</span>
        <span class="si-name">${p.name} ×${s.inventory.products[id]}</span>
        <span class="si-meta">${p.sell || 10}🪙</span></button>`;
    }
    for (const id of Object.keys(s.inventory.dishes || {})) {
      if (!s.inventory.dishes[id]) continue;
      const r = RECIPES[id];
      html += `<button class="shop-item" data-ship="dish:${id}">
        <span class="si-emoji">${r.emoji}</span>
        <span class="si-name">${r.name} ×${s.inventory.dishes[id]}</span>
        <span class="si-meta">${r.sell}🪙</span></button>`;
    }
    html += '</div>';
    const pending = s.shipping.reduce((a, b) => a + (b.price || 0), 0);
    html += `<p class="pending">In bin: ${s.shipping.length} items ≈ ${pending}🪙</p>`;
    body.innerHTML = html;
    $('ship-all').onclick = () => Shop.shipAll(s);
    body.querySelectorAll('[data-ship]').forEach(b => {
      b.onclick = () => {
        const [kind, id] = b.dataset.ship.split(':');
        Shop.shipItem(s, kind, id);
      };
    });
  }

  function openKitchen() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    Kitchen.unlockFromStars(Game.state);
    refreshKitchen();
    show('modal-kitchen');
  }

  function refreshKitchen() {
    const s = Game.state;
    const body = $('kitchen-body');
    let html = '<div class="shop-grid">';
    for (const r of Object.values(RECIPES)) {
      const unlocked = r.unlock || s.recipesUnlocked[r.id];
      const can = Kitchen.canCook(s, r.id);
      const needs = Object.entries(r.needs).map(([k, n]) => {
        const have = Kitchen.countItem(s, k);
        const nm = (CROPS[k] && CROPS[k].name) || (PRODUCT_DEFS[k] && PRODUCT_DEFS[k].name) || k;
        return `${nm} ${have}/${n}`;
      }).join(', ');
      html += `<button class="shop-item ${can ? '' : 'disabled'}" data-cook="${r.id}" ${can ? '' : 'disabled'}>
        <span class="si-emoji">${r.emoji}</span>
        <span class="si-name">${unlocked ? r.name : '??? Locked'}</span>
        <span class="si-meta">${unlocked ? needs + ' → ' + r.sell + '🪙' : 'Unlock via journal'}</span>
      </button>`;
    }
    html += '</div>';
    body.innerHTML = html;
    body.querySelectorAll('[data-cook]').forEach(b => {
      b.onclick = () => Kitchen.cook(s, b.dataset.cook);
    });
  }

  function openWardrobe() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    const body = $('wardrobe-body');
    body.innerHTML = '<div class="outfit-grid"></div>';
    const grid = body.querySelector('.outfit-grid');
    for (const key of Object.keys(CONST.OUTFITS)) {
      const o = CONST.OUTFITS[key];
      const btn = document.createElement('button');
      btn.className = 'outfit-btn' + (Game.state.player.outfit === key ? ' selected' : '');
      btn.innerHTML = `<span class="outfit-swatch" style="background:${o.scarf}"></span>${key}`;
      btn.onclick = () => {
        Game.state.player.outfit = key;
        FarmAudio.click();
        openWardrobe();
        toast('Looking great, Amber! ✨');
      };
      grid.appendChild(btn);
    }
    show('modal-wardrobe');
  }

  function openStory() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    refreshStory();
    show('modal-story');
  }

  function refreshStory() {
    const s = Game.state;
    const body = $('story-body');
    if (!body || typeof Home === 'undefined') return;
    let html = '<div class="ach-list">';
    for (const key of Object.keys(Home.STORIES)) {
      const st = Home.STORIES[key];
      const locked = st.unlock && !s.achievements[st.unlock];
      const read = !!s.stories[key];
      if (locked) {
        html += `<div class="ach-item"><span>🔒</span>
          <div><strong>???</strong><br><small>Find the adventure that unlocks this story…</small></div>
          <span>🔒</span></div>`;
        continue;
      }
      html += `<div class="ach-item ${read ? 'done' : ''}" data-story="${key}">
        <span>📖</span>
        <div><strong>${st.title}</strong><br><small>${read ? 'Read ✓' : 'Tap to read'}</small></div>
        <span>✨</span>
      </div>`;
    }
    html += '</div>';
    body.innerHTML = html;
    body.querySelectorAll('[data-story]').forEach(b => {
      b.onclick = () => {
        const st = Home.STORIES[b.dataset.story];
        const title = $('story-title');
        const text = $('story-text');
        if (title) title.textContent = st.title;
        if (text) text.textContent = st.text;
        s.stories[b.dataset.story] = true;
        b.classList.add('done');
        FarmAudio.click();
      };
    });
  }

  function openDialogue(npc, line, id) {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    if ($('dlg-portrait')) $('dlg-portrait').textContent = npc.emoji || '💬';
    if ($('dlg-name')) $('dlg-name').textContent = npc.name;
    if ($('dlg-text')) $('dlg-text').textContent = line;
    if ($('dlg-gift')) $('dlg-gift').onclick = () => NPC.gift(Game.state, id);
    show('modal-dialogue');
  }

  function openJournal() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    const body = $('journal-body');
    let html = `<p class="stars-total">⭐ Farm Stars: ${Game.totalStars(Game.state)}</p><div class="ach-list">`;
    for (const a of ACHIEVEMENTS) {
      const done = !!Game.state.achievements[a.id];
      html += `<div class="ach-item ${done ? 'done' : ''}">
        <span>${a.emoji}</span>
        <div><strong>${a.name}</strong><br><small>${a.desc}</small></div>
        <span>${done ? '✅' : '🔒'} ${a.stars}⭐</span>
      </div>`;
    }
    html += '</div>';
    body.innerHTML = html;
    show('modal-journal');
  }

  function openQuestBoard() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    const s = Game.state;
    const q = Quests.ensure(s);
    const body = $('quest-body');
    const pct = Math.min(100, Math.floor(((q.progress || 0) / q.need) * 100));
    body.innerHTML = `
      <p class="quest-emoji">${q.emoji}</p>
      <p><strong>${q.desc}</strong></p>
      <div class="quest-bar"><div class="quest-fill" style="width:${pct}%"></div></div>
      <p>Progress: <strong>${q.progress || 0} / ${q.need}</strong></p>
      <p>Reward: <strong>${q.reward}🪙</strong></p>
      <p class="muted">${q.done ? 'All done — claim your reward!' : 'Keep playing — progress updates automatically.'}</p>
      <button class="btn btn-primary" id="quest-claim">${q.done ? 'Claim reward ⭐' : 'Check progress'}</button>
    `;
    $('quest-claim').onclick = () => {
      if (Quests.claim(s)) {
        closeModals();
        refreshHUD();
      } else {
        openQuestBoard();
      }
    };
    show('modal-quest');
  }

  function openAnimalShop() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    renderAnimalShop();
    show('modal-animals');
  }

  function animalBtn(def, s) {
    const count = Animals.countType(s, def.id);
    const hint = Animals.lockedHint(s, def);
    const locked = !!hint;
    const meta = locked
      ? hint
      : (def.product ? `${def.cost}🪙 · ${def.emoji}` : `${def.cost}🪙 · companion`);
    return `
      <button class="shop-item ${locked ? 'locked' : ''}" data-buy-animal="${def.id}" ${locked ? 'disabled' : ''}>
        <span class="si-emoji">${def.emoji}</span>
        <span class="si-name">${def.name} ×${count}</span>
        <span class="si-meta">${meta}</span>
      </button>`;
  }

  function renderAnimalShop() {
    const s = Game.state;
    const body = $('animals-body');
    const coopIds = ['chicken', 'rooster'];
    const barnIds = ['cow', 'goat', 'sheep', 'pig'];
    const coop = coopIds.map(id => animalBtn(ANIMAL_DEFS[id], s)).join('');
    const barn = barnIds.map(id => animalBtn(ANIMAL_DEFS[id], s)).join('');
    const chickens = Animals.countType(s, 'chicken');
    const barnCount = Animals.barnCount(s);
    const coopUp = s.coopUpgraded
      ? '<button class="shop-item owned" disabled><span class="si-emoji">🛠️</span><span class="si-name">Bigger Coop</span><span class="si-meta">Built</span></button>'
      : '<button class="shop-item" data-buy-upgrade="coop"><span class="si-emoji">🛠️</span><span class="si-name">Bigger Coop</span><span class="si-meta">200🪙 · holds 6</span></button>';
    const barnUp = s.barnUpgraded
      ? '<button class="shop-item owned" disabled><span class="si-emoji">🛠️</span><span class="si-name">Bigger Barn</span><span class="si-meta">Built</span></button>'
      : '<button class="shop-item" data-buy-upgrade="barn"><span class="si-emoji">🛠️</span><span class="si-name">Bigger Barn</span><span class="si-meta">300🪙 · holds 6</span></button>';
    body.innerHTML = `
      <h3>🐔 Coop (${chickens}/${Animals.coopCap(s)})</h3><div class="shop-grid">${coop}${coopUp}</div>
      <h3>🐄 Barn (${barnCount}/${Animals.barnCap(s)})</h3><div class="shop-grid">${barn}${barnUp}</div>
      <p class="muted">Pet and feed animals daily for better products! A happy rooster makes chickens grow hearts faster 🐓</p>
    `;
    body.querySelectorAll('[data-buy-animal]').forEach(b => {
      b.onclick = () => Animals.buy(s, b.dataset.buyAnimal);
    });
    body.querySelectorAll('[data-buy-upgrade]').forEach(b => {
      b.onclick = () => Shop.buyUpgrade(s, b.dataset.buyUpgrade);
    });
  }

  let currentAnimal = null;

  function openAnimalCard(a) {
    if (!guardGameplayUI()) return;
    currentAnimal = a;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    refreshAnimalCard();
    show('modal-animalcard');
    const inp = $('animalcard-input');
    if (inp) { try { inp.focus(); inp.select(); } catch (e) {} }
  }

  function refreshAnimalCard() {
    const a = currentAnimal;
    if (!a) return;
    const t = $('animalcard-title');
    if (t) t.textContent = a.name || 'Animal';
    const em = $('animalcard-emoji');
    const def = (typeof ANIMAL_DEFS !== 'undefined') ? ANIMAL_DEFS[a.type] : null;
    if (em) em.textContent = (def && def.emoji) || '🐾';
    const h = $('animalcard-hearts');
    if (h) {
      const n = Math.max(0, Math.min(5, a.hearts || 0));
      h.textContent = '♥'.repeat(n) + '♡'.repeat(5 - n);
    }
    const inp = $('animalcard-input');
    if (inp) inp.value = a.name || '';
    const btn = $('animalcard-save');
    if (btn) {
      btn.onclick = () => {
        const v = ((inp && inp.value) || '').trim().slice(0, 14);
        if (!v) { toast('Give your animal a name!'); if (inp) inp.focus(); return; }
        a.name = v;
        toast(`${v} loves the new name! 💛`);
        if (typeof FarmAudio !== 'undefined' && FarmAudio.success) FarmAudio.success();
        if (typeof Save !== 'undefined' && Game.state) Save.write(Game.state);
        closeModals();
      };
    }
    if (inp) {
      inp.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); if (btn) btn.click(); }
      };
    }
  }

  function openSellBox() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    refreshSellBox();
    show('modal-sellbox');
  }

  function refreshSellBox() {
    const s = Game.state;
    const body = $('sellbox-body');
    if (!body) return;
    let html = '<p class="muted">Sell unwanted items for coins right away!</p>';
    let any = false;
    html += '<div class="shop-grid">';
    for (const id of Object.keys(s.inventory.crops || {})) {
      const arr = s.inventory.crops[id];
      if (!arr || !arr.length) continue;
      const c = CROPS[id];
      const q = arr[arr.length - 1];
      const price = Farming.sellPrice(id, q);
      html += `<button class="shop-item" data-sell="crop:${id}">
        <span class="si-emoji">${c.emoji}</span>
        <span class="si-name">${c.name} ×${arr.length}</span>
        <span class="si-meta">Sell 1 · ${price}🪙</span></button>`;
      any = true;
    }
    for (const id of Object.keys(s.inventory.products || {})) {
      if (!s.inventory.products[id]) continue;
      const p = PRODUCT_DEFS[id] || { emoji: '📦', name: id, sell: 10 };
      html += `<button class="shop-item" data-sell="product:${id}">
        <span class="si-emoji">${p.emoji}</span>
        <span class="si-name">${p.name} ×${s.inventory.products[id]}</span>
        <span class="si-meta">Sell 1 · ${p.sell || 10}🪙</span></button>`;
      any = true;
    }
    for (const id of Object.keys(s.inventory.dishes || {})) {
      if (!s.inventory.dishes[id]) continue;
      const r = RECIPES[id];
      html += `<button class="shop-item" data-sell="dish:${id}">
        <span class="si-emoji">${r.emoji}</span>
        <span class="si-name">${r.name} ×${s.inventory.dishes[id]}</span>
        <span class="si-meta">Sell 1 · ${r.sell}🪙</span></button>`;
      any = true;
    }
    html += '</div>';
    if (!any) html += '<p class="muted">Nothing to sell — harvest or cook something first!</p>';
    body.innerHTML = html;
    body.querySelectorAll('[data-sell]').forEach(b => {
      b.onclick = () => {
        const [kind, id] = b.dataset.sell.split(':');
        Shop.sellItemNow(s, kind, id);
      };
    });
  }

  function showLetter(title, text) {
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    $('letter-title').textContent = title;
    $('letter-text').textContent = text;
    show('modal-letter');
  }

  /** Rori's crack bench — open a geode for a guaranteed gem */
  function openGeodeCracker() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    refreshGeodeCracker();
    show('modal-geode');
  }

  function refreshGeodeCracker() {
    const s = Game.state;
    const body = $('geode-body');
    if (!body) return;
    const n = Gems.geodeCount(s);
    const gems = ['quartz', 'amethyst', 'emerald', 'ruby', 'star_gem']
      .map(id => {
        const d = PRODUCT_DEFS[id];
        const have = (s.inventory.products[id] || 0) > 0 ? '' : ' · not found yet';
        return `<span class="si-emoji">${d.emoji}</span> ${d.name}${have}`;
      })
      .join(' &nbsp; ');
    let html = `<p class="muted">Geodes you carry: <b>${n}</b> 🥚</p>`;
    html += `<p class="muted">Every geode hides a gem — always!</p>`;
    html += `<p class="muted">Gem collection: ${gems}</p>`;
    if (n > 0) {
      html += `<button class="shop-item" id="btn-crack-geode"><span class="si-emoji">🔨</span>
        <span class="si-name">Crack a geode</span>
        <span class="si-meta">Tap!</span></button>`;
    }
    body.innerHTML = html;
    const btn = $('btn-crack-geode');
    if (btn) {
      btn.onclick = () => {
        const gem = Gems.crackGeode(s);
        if (!gem) return;
        const d = PRODUCT_DEFS[gem.id];
        FarmAudio.success();
        UI.toast(`It's a ${d.name}! ${d.emoji}`);
        refreshGeodeCracker();
        refreshHUD();
      };
    }
  }

  /** Village postbox — send a letter (+1 heart, 10g, once/day) */
  function openPostbox() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    refreshPostbox();
    show('modal-postbox');
  }

  function refreshPostbox() {
    const s = Game.state;
    const body = $('postbox-body');
    if (!body) return;
    const sentToday = s.letterSentDay === s.day;
    let html = `<p class="muted">A letter costs 10g and warms a heart. One per day.</p>`;
    if (sentToday) html += `<p class="muted">You already sent today's letter. 💌</p>`;
    html += '<div class="shop-grid">';
    for (const id of Object.keys(NPCS)) {
      const n = NPCS[id];
      const hearts = Math.min(5, s.npcHearts[id] || 0);
      const hp = '❤️'.repeat(hearts) + '🤍'.repeat(5 - hearts);
      html += `<button class="shop-item" data-letter="${id}" ${sentToday ? 'disabled' : ''}>
        <span class="si-emoji">${n.emoji}</span>
        <span class="si-name">${n.name}</span>
        <span class="si-meta">10🪙 · ${hp}</span></button>`;
    }
    html += '</div>';
    body.innerHTML = html;
    body.querySelectorAll('[data-letter]').forEach(b => {
      b.onclick = () => {
        const res = Mail.sendLetter(s, b.dataset.letter);
        UI.toast(res.msg);
        if (res.ok) refreshPostbox();
      };
    });
  }

  /** Village market stall — snacks for gifts */
  function openStall() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    refreshStall();
    show('modal-stall');
  }

  function refreshStall() {
    const s = Game.state;
    const body = $('stall-body');
    if (!body) return;
    const SNACKS = { snack_cookie: 15, snack_cocoa: 20, snack_bouquet: 25 };
    let html = '<p class="muted">Everyone in the valley loves a treat — perfect for gifts!</p>';
    html += '<div class="shop-grid">';
    for (const [id, cost] of Object.entries(SNACKS)) {
      const d = PRODUCT_DEFS[id];
      html += `<button class="shop-item" data-snack="${id}">
        <span class="si-emoji">${d.emoji}</span>
        <span class="si-name">${d.name}</span>
        <span class="si-meta">${cost}🪙</span></button>`;
    }
    html += '</div>';
    body.innerHTML = html;
    body.querySelectorAll('[data-snack]').forEach(b => {
      b.onclick = () => Shop.buySnack(s, b.dataset.snack);
    });
  }

  function showSleepConfirm() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    show('modal-sleep');
  }

  function openInventory(tab) {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    show('modal-inventory');
    setInvTab(tab || 'items');
  }

  function setInvTab(tab) {
    const s = Game.state;
    document.querySelectorAll('.inv-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    const body = $('inv-body');
    if (!body) return;
    let html = '';
    if (tab === 'items') {
      html += '<div class="inv-grid">';
      for (const id of Object.keys(s.inventory.crops || {})) {
        const arr = s.inventory.crops[id];
        if (!arr || !arr.length) continue;
        const c = CROPS[id];
        html += `<div class="inv-cell"><span class="si-emoji">${c.emoji}</span><span>${c.name}</span><span class="si-meta">×${arr.length}</span></div>`;
      }
      for (const id of Object.keys(s.inventory.products || {})) {
        if (!s.inventory.products[id]) continue;
        const p = PRODUCT_DEFS[id] || { emoji: '📦', name: id };
        html += `<div class="inv-cell"><span class="si-emoji">${p.emoji}</span><span>${p.name}</span><span class="si-meta">×${s.inventory.products[id]}</span></div>`;
      }
      for (const id of Object.keys(s.inventory.dishes || {})) {
        if (!s.inventory.dishes[id]) continue;
        const r = RECIPES[id];
        html += `<div class="inv-cell"><span class="si-emoji">${r.emoji}</span><span>${r.name}</span><span class="si-meta">×${s.inventory.dishes[id]}</span></div>`;
      }
      if ((s.inventory.feed || 0) > 0) {
        html += `<div class="inv-cell"><span class="si-emoji">🌾</span><span>Feed</span><span class="si-meta">×${s.inventory.feed}</span></div>`;
      }
      if ((s.inventory.fertilizer || 0) > 0) {
        html += `<div class="inv-cell"><span class="si-emoji">🧪</span><span>Fertilizer</span><span class="si-meta">×${s.inventory.fertilizer}</span></div>`;
      }
      html += '</div>';
      if (html === '<div class="inv-grid"></div>') html = '<p class="muted">Basket is empty — harvest something!</p>';
    } else if (tab === 'seeds') {
      html += '<div class="inv-grid">';
      for (const id of CROP_LIST) {
        const n = s.inventory.seeds[id] || 0;
        if (!n) continue;
        const c = CROPS[id];
        const season = TimeSys.seasonName(s);
        const ok = c.seasons.includes(season);
        html += `<div class="inv-cell ${ok ? '' : 'dim'}"><span class="si-emoji">${c.emoji}</span><span>${c.name} seeds</span><span class="si-meta">×${n}${ok ? '' : ' (wrong season)'}</span></div>`;
      }
      html += '</div>';
    } else if (tab === 'map') {
      const dayS = TimeSys.dayInSeason(s);
      const season = Utils.seasonName(TimeSys.seasonName(s));
      html = `<p class="muted">Farm · Day ${s.day} · ${season} ${dayS}/7 · Year ${s.year || 1}</p>
        <div class="calendar-row">`;
      for (let d = 1; d <= 7; d++) {
        const fest = d === 7;
        const cur = d === dayS;
        html += `<span class="cal-day ${cur ? 'cur' : ''} ${fest ? 'fest' : ''}">${d}${fest ? '🎉' : ''}</span>`;
      }
      html += `</div>
        <ul class="map-legend">
          <li>🏠 Cottage — sleep, cook, wardrobe</li>
          <li>🌲 North path — Whispering Forest</li>
          <li>🏖️ South path — Sunny Beach</li>
          <li>🎣 Fish at pond / shore (need a rod)</li>
          <li>🛒 Bea’s stall — seeds, rod, scarecrow</li>
          <li>🐔 Finn · 👩‍🌾 Maple · 📋 Help Wanted</li>
          <li>🎉 Season day 7 — Festival!</li>
        </ul>`;
    } else if (tab === 'stats') {
      const st = s.stats || {};
      html = `<div class="stats-list">
        <p>⭐ Stars: <strong>${Game.totalStars(s)}</strong></p>
        <p>🪙 Coins: <strong>${Utils.formatCoins(s.coins)}</strong></p>
        <p>⚡ Energy: <strong>${Math.ceil(s.energy || 0)}/${CONST.ENERGY_MAX}</strong></p>
        <p>🌾 Harvested: <strong>${st.harvested || 0}</strong></p>
        <p>📦 Shipped: <strong>${st.shipped || 0}</strong></p>
        <p>🐔 Fed animals: <strong>${st.fed || 0}</strong></p>
        <p>🍳 Cooked: <strong>${st.cooked || 0}</strong></p>
        <p>🎣 Fish caught: <strong>${st.fished || 0}</strong></p>
        <p>🎣 Rod level: <strong>${s.inventory.rod || 0}</strong></p>
        <p>Version: <strong>${CONST.GAME_VERSION || '2.0'}</strong></p>
      </div>`;
    }
    body.innerHTML = html;
  }

  function openPauseMenu() {
    if (!guardGameplayUI()) return;
    Game.state.paused = true;
    if (typeof Game.clearInteract === 'function') Game.clearInteract();
    const ver = $('pause-version');
    if (ver) ver.textContent = 'v' + (CONST.GAME_VERSION || '2.1.0');
    show('modal-pause');
  }

  let bannerTimer = null;
  function showLocationBanner(title, sub) {
    const el = $('location-banner');
    if (!el) return;
    if ($('lb-title')) $('lb-title').textContent = title || '';
    if ($('lb-sub')) $('lb-sub').textContent = sub || '';
    el.classList.remove('hidden', 'fade-out');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => el.classList.add('hidden'), 500);
    }, 2200);
  }

  function showFishing(fish) {
    const name = $('fish-name');
    if (name) name.textContent = (fish.emoji || '🐟') + ' ' + (fish.name || 'Fish');
    show('modal-fishing');
  }

  function hideFishing() {
    hide('modal-fishing');
  }

  function updateFishingUI(barPos, target, progress, width) {
    const bar = $('fish-bar-fill');
    const fish = $('fish-marker');
    const prog = $('fish-progress-fill');
    const zone = $('fish-zone');
    if (bar) bar.style.bottom = (barPos * 100) + '%';
    if (fish) fish.style.bottom = (target * 100) + '%';
    if (prog) prog.style.width = (progress * 100) + '%';
    if (zone) {
      zone.style.height = (width * 100) + '%';
      zone.style.bottom = ((barPos - width / 2) * 100) + '%';
    }
  }

  function exportSave() {
    if (!Game.state || Game.state.scene === 'title') {
      toast('No game to export');
      return;
    }
    Save.write(Game.state);
    try {
      const raw = localStorage.getItem(CONST.SAVE_KEY);
      const b64 = btoa(unescape(encodeURIComponent(raw)));
      const ta = $('save-export-box');
      if (ta) {
        ta.value = b64;
        ta.select();
      }
      toast('Save copied below — select & copy!');
      FarmAudio.success();
    } catch (e) {
      toast('Export failed');
    }
  }

  function importSave() {
    const ta = $('save-export-box');
    if (!ta || !ta.value.trim()) {
      toast('Paste a save code first');
      return;
    }
    try {
      const raw = decodeURIComponent(escape(atob(ta.value.trim())));
      const data = JSON.parse(raw);
      if (!data || data.day == null) throw new Error('bad');
      localStorage.setItem(CONST.SAVE_KEY, raw);
      toast('Save imported! Use Continue on title.');
      FarmAudio.success();
      closeModals();
      Game.toTitle();
    } catch (e) {
      toast('Invalid save code');
      FarmAudio.error();
    }
  }

  function bindGlobal() {
    document.querySelectorAll('[data-close]').forEach(b => {
      b.addEventListener('click', () => {
        FarmAudio.click();
        closeModals();
      });
    });
    $('btn-journal')?.addEventListener('click', () => { FarmAudio.click(); openJournal(); });
    $('btn-inventory')?.addEventListener('click', () => { FarmAudio.click(); openInventory('items'); });
    $('btn-pause')?.addEventListener('click', () => {
      FarmAudio.click();
      openPauseMenu();
    });
    $('btn-save-quit')?.addEventListener('click', () => {
      Save.write(Game.state);
      closeModals();
      Game.toTitle();
    });
    $('hud-quest')?.addEventListener('click', () => {
      FarmAudio.click();
      openQuestBoard();
    });
    document.querySelectorAll('.inv-tab').forEach(t => {
      t.addEventListener('click', () => {
        FarmAudio.click();
        setInvTab(t.dataset.tab);
      });
    });
    $('btn-export-save')?.addEventListener('click', () => { FarmAudio.click(); exportSave(); });
    $('btn-import-save')?.addEventListener('click', () => { FarmAudio.click(); importSave(); });
    $('btn-fish-cancel')?.addEventListener('click', () => {
      if (typeof Fishing !== 'undefined') Fishing.cancel();
    });
  }

  return {
    toast, refreshHUD, updateTutorial, updatePrompt, showTitle, hideTitle, closeModals,
    openShop, refreshShop, openShipping, refreshShipping, openKitchen, refreshKitchen,
    openWardrobe, openStory, refreshStory, openDialogue, openJournal, openQuestBoard, openAnimalShop,
    openAnimalCard, refreshAnimalCard,
    openSellBox, refreshSellBox,
    openGeodeCracker, refreshGeodeCracker, openPostbox, refreshPostbox,
    openStall, refreshStall,
    openInventory, openPauseMenu, showLetter, showSleepConfirm,
    showLocationBanner, showFishing, hideFishing, updateFishingUI,
    exportSave, importSave, bindGlobal, show, hide,
  };
})();

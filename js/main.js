'use strict';
// Startup screen, input, the sim-and-draw loop, saving, and the player's powers.

const Game = { n: 1, keep: false, tab: 'fate', drawMs: 0, tickMs: 0, stroke: null, speed: 1, acc: 0, last: 0, running: false, power: null, fps: 60, ticksThisSec: 0, secT: 0, uiT: 0, miniT: 0, realmT: 0, saveT: 0, keys: new Set() };
const BASE_TPS = 30;
const PACE = [0.35, 0.6, 1, 1.8, 3.5], PACE_NAME = ['Glacial', 'Slow', 'Normal', 'Quick', 'Frantic'];

// ---- startup ----
const POP_STOPS = [2000, 5000, 10000, 20000, 50000, 100000, 200000, 400000, 1000000, 2000000, 0];  // the last stop means: as many as this computer can run
const popStop = k => POP_STOPS[k];
const popStopName = v => v ? fmt(v) : 'No limit but the land';
function currentOptions() {
  const [w, h] = $('oSize').value.split('x').map(Number);
  const raw = $('oSeed').value.trim();
  let seed = parseInt(raw, 10);
  if (isNaN(seed)) { seed = 0; for (const ch of raw) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) | 0; }
  const pv = popStop(+$('oMax').value);
  return { w, h, seed: Math.abs(seed), type: $('oType').value, tribes: +$('oTribes').value, perTribe: 22, maxPop: pv || POP_AUTO_MAX, autoPop: !pv, inv: PACE[+$('oInv').value] };
}
function previewWorld() {
  const o = currentOptions();
  const pv = genWorld({ ...o, w: Math.min(o.w, 210), h: Math.round(Math.min(o.w, 210) * o.h / o.w) });
  const cv = $('oPrev'); cv.width = pv.w; cv.height = pv.h;
  const g = cv.getContext('2d'), im = g.createImageData(pv.w, pv.h);
  for (let i = 0, n = pv.w * pv.h; i < n; i++) {
    const b = pv.biome[i], c = PAL[b], e = Math.max(0, pv.elev[i]), prev = Math.max(0, pv.elev[Math.max(0, i - pv.w - 1)]);
    const sh = pv.water[i] ? 1 : clamp(1 + (prev - e) * 7, 0.65, 1.35);
    const rv = pv.river[i];
    im.data[i * 4] = rv ? 58 : c[0] * sh; im.data[i * 4 + 1] = rv ? 128 : c[1] * sh; im.data[i * 4 + 2] = rv ? 172 : c[2] * sh; im.data[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  let land = 0, wild = new Set(), tin = 0, cu = 0;
  for (let i = 0, n = pv.w * pv.h; i < n; i++) { if (!pv.water[i]) land++; if (pv.wild[i]) wild.add(pv.wild[i]); if (pv.ore[i] === ORE.TIN) tin++; if (pv.ore[i] === ORE.COPPER) cu++; }
  const crops = [...wild].map(c => CROPS[c].name);
  $('oDesc').textContent = `${Math.round(land / (pv.w * pv.h) * 100)}% land. Wild crops: ${crops.length ? crops.join(', ') : 'none, so farming will be hard to start'}. ${tin < 30 ? 'Tin is scarce here.' : 'Tin is reasonably common.'}`;
}
function initStart() {
  $('oSeed').value = Math.floor(Math.random() * 999999);
  let t = 0;
  const later = () => { clearTimeout(t); t = setTimeout(previewWorld, 60); };
  $('oSeed').addEventListener('input', later);
  $('oType').addEventListener('change', later);
  $('oSize').addEventListener('change', later);
  $('oRoll').onclick = () => { $('oSeed').value = Math.floor(Math.random() * 999999); previewWorld(); };
  $('oTribes').oninput = e => { $('oTribesV').textContent = e.target.value; };
  $('oMax').oninput = e => { $('oMaxV').textContent = popStopName(popStop(+e.target.value)); };
  $('oInv').oninput = e => { $('oInvV').textContent = PACE_NAME[+e.target.value]; };
  $('oGo').onclick = () => beginWorld(currentOptions());
  $('oLoad').onclick = () => loadGame();
  previewWorld();
  hasSave().then(ok => { $('oLoad').hidden = !ok; }).catch(() => {});
}
function beginWorld(opt) {
  $('oGo').textContent = 'Shaping the world…';
  setTimeout(() => {
    createWorld(opt);
    startGame();
    centerOnFirst();
    $('oGo').textContent = 'Begin';
  }, 30);
}
function startGame() {
  initPathing();
  linkSeaNet();
  if (!W.wx) initWeather();
  W.autoPop = !!W.autoPop;
  Render.dirtyTiles.clear(); Render.dirtyChunks.clear();
  resize();
  initRender($('game'));
  $('startup').hidden = true;
  ['top', 'left', 'bottom', 'miniWrap'].forEach(id => { $(id).hidden = false; });
  const m = $('mini'); m.height = Math.round(m.width * W.h / W.w);
  UI.follow = null; UI.followDead = null; UI.focusKey = null;
  applyMins();
  select(null);
  setSpeed(1);
  updateTop(); updateRealms(); updateChronicle(true);
  if (!Game.running) { Game.running = true; Game.last = performance.now(); requestAnimationFrame(frame); }
}
function centerOnFirst() {
  const t = W.towns[0];
  if (t) centerOn(t.x, t.y, 2.2); else centerOn(W.w / 2, W.h / 2, 1);
}

// ---- main loop ----
function setSpeed(s) {
  Game.speed = s;
  document.querySelectorAll('#speed button').forEach(b => b.classList.toggle('on', +b.dataset.sp === s));
}
// A crash anywhere in a frame used to stop the game for good: now it pauses, tells the player, and sends the owner a report.
function frame(now) {
  try { frameBody(now); }
  catch (err) {
    console.error(err);
    reportCrash(err, Game.speed ? 'while running' : 'while paused');
    if (Game.speed) setSpeed(0);
    if (!(Game.crashT > now - 8000)) { Game.crashT = now; toast('Something went wrong, so the game has paused. A crash report was sent to the maker. Press play to carry on.', 7000); }
    Game.last = now;
  }
  requestAnimationFrame(frame);
}
function frameBody(now) {
  const dt = Math.min(0.1, (now - Game.last) / 1000);
  Game.last = now;
  runSim(dt);
  panKeys(dt);
  if (UI.follow) {
    const p = UI.follow;
    if (p.alive) {
      if (p.aboard) shipPos(p.aboard, _pos); else personPos(p, _pos);
      const c = Render.cam, q = Math.min(1, dt * 7);
      let gx = _pos.x - Render.vw / 2 / c.z - c.x;
      if (W.wrap) { const pw = W.w * TS; gx = ((gx % pw) + pw * 1.5) % pw - pw / 2; }  // follow them over the date line, not back round the world
      c.x += gx * q; c.y += (_pos.y - Render.vh / 2 / c.z - c.y) * q;
      clampCam();
    } else { UI.followDead = p; UI.follow = null; toast(`${p.name} has died (${p.cause}).`, 4000); }
  }
  const t0f = performance.now();
  drawFrame(dt);
  Game.drawMs = Game.drawMs * 0.95 + (performance.now() - t0f) * 0.05;
  Game.uiT += dt; Game.miniT += dt; Game.realmT += dt; Game.secT += dt; Game.saveT += dt;
  if (Game.uiT > 0.22) { Game.uiT = 0; updateTop(); updateChronicle(); updateInspector(); updateFocus(); }
  if (Game.miniT > 1.5) { Game.miniT = 0; if (!UI.mins.mini) drawMinimap($('mini')); autoPopulation(); }
  if (Game.realmT > 1.8) { Game.realmT = 0; updateRealms(); }
  if (Game.secT > 1) {
    $('rate').textContent = Game.speed ? `${(Game.ticksThisSec / Game.secT / TPY).toFixed(1)} yr/s` : '';
    Game.secT = 0; Game.ticksThisSec = 0;
  }
  // a very big world takes a moment to save, so it only saves when asked
  if (Game.saveT > 240) { Game.saveT = 0; if (W.people.length && W.people.length < 40000) saveGame(true); }
  if (!W.people.length && !W.emptyNote) {
    W.emptyNote = true;
    chron('collapse', 'The last person in the world has died.');
    toast('Everyone has died. Use New tribe to start again here, or begin a new world.', 8000);
  } else if (W.people.length) W.emptyNote = false;
}
function runSim(dt) {
  if (!Game.speed || !W) return;
  const t0 = performance.now();
  let n = 0;
  // the screen always gets its time: whatever speed is asked for, the sim only ever takes what's left of the frame
  // at the fast settings the sim takes the larger share of each frame, so a huge world still rushes through the years
  let budget = Game.speed >= 999 ? 44 : Game.speed >= 30 ? 26 : Game.speed >= 10 ? 15 : Math.max(5, 10 - Game.drawMs * 0.5);
  // while someone is dragging, zooming or typing, the screen comes first: the years can rush again a moment after they let go
  if (t0 - (Game.touchT || 0) < 350) budget = Math.min(budget, 10);
  if (Game.speed >= 999) {
    while (performance.now() - t0 < budget) { stepWorld(); Game.ticksThisSec++; n++; }
  } else {
    Game.acc += dt * BASE_TPS * Game.speed;
    while (Game.acc >= 1) {
      stepWorld(); Game.acc -= 1; Game.ticksThisSec++; n++;
      if (performance.now() - t0 > budget) { Game.acc = Math.min(Game.acc, 4); break; }
    }
  }
  if (n) { const each = (performance.now() - t0) / n; Game.tickMs = Game.tickMs ? Game.tickMs * 0.98 + each * 0.02 : each; }
}
// Finds out what this computer can do. The limit rises while ticks stay cheap and eases back when they don't; drawing costs are already capped.
// The panels were laid out for a 1600×900 window; bigger or smaller windows scale them to match.
let UI_Z = 1;
const POP_TICK_TARGET = 6, POP_AUTO_MAX = 2000000;
// However many live in the world, only so many are simulated one by one; the rest are crowds. This finds out how many this computer can run.
function autoPopulation() {
  if (!W || !Game.tickMs || !Game.speed) return;
  const n = W.people.length;
  if (n < 3000) return;
  const perPerson = Game.tickMs / n;
  const target = clamp(POP_TICK_TARGET / Math.max(perPerson, 1e-5), 8000, 200000);
  W.agentCap = Math.round(W.agentCap + (target - W.agentCap) * 0.15);
}
function syncPopCtl() {
  const el = $('popCtl'); if (!el) return;
  const k = W.autoPop ? POP_STOPS.length - 1 : Math.max(0, POP_STOPS.findIndex(v => v >= W.maxPop));
  el.value = k;
  $('popCtlV').textContent = W.autoPop ? 'No limit but the land' : fmt(W.maxPop);
  el.oninput = () => {
    const v = popStop(+el.value);
    W.autoPop = !v;
    W.maxPop = v || POP_AUTO_MAX;
    $('popCtlV').textContent = W.autoPop ? 'No limit but the land' : fmt(W.maxPop);
  };
}
function resize() {
  const cv = $('game');
  const dpr = 1;
  Render.vw = cv.width = Math.floor(window.innerWidth * dpr);
  Render.vh = cv.height = Math.floor(window.innerHeight * dpr);
  UI_Z = Math.round(clamp(Math.min(window.innerWidth / 1600, window.innerHeight / 900), 0.6, 2.2) * 20) / 20;
  document.documentElement.style.setProperty('--ui', UI_Z);
  const lw = window.innerWidth / UI_Z;
  for (const [n, at] of [[1800, 1800], [1500, 1640], [1320, 1480], [980, 980]]) document.body.classList.toggle('nw' + n, lw <= at);
  if (W) clampCam();
}
function panKeys(dt) {
  const k = Game.keys, c = Render.cam, v = 620 * dt / c.z;
  if (!k.size) return;
  let moved = false;
  if (k.has('a') || k.has('arrowleft')) { c.x -= v; moved = true; }
  if (k.has('d') || k.has('arrowright')) { c.x += v; moved = true; }
  if (k.has('w') || k.has('arrowup')) { c.y -= v; moved = true; }
  if (k.has('s') || k.has('arrowdown')) { c.y += v; moved = true; }
  if (moved) { UI.follow = null; clampCam(); }
}

// ---- mouse ----
function screenToTile(sx, sy) {
  const c = Render.cam;
  let x = Math.floor((sx / c.z + c.x) / TS); const y = Math.floor((sy / c.z + c.y) / TS);
  if (W.wrap) x = ((x % W.w) + W.w) % W.w;  // the copy of the world to the east or west is the same world
  if (x < 0 || y < 0 || x >= W.w || y >= W.h) return -1;
  return y * W.w + x;
}
// How far across the screen a point of the world lies from the cursor; on a wrapping world, from whichever copy is nearer.
function scrDX(wx, sx) {
  const c = Render.cam;
  let d = wx - (sx / c.z + c.x);
  if (W.wrap) { const pw = W.w * TS; d = ((d % pw) + pw * 1.5) % pw - pw / 2; }
  return d * c.z;
}
function pickAt(sx, sy) {
  for (const h of Render.battleHits || []) if (Math.abs(h.x - sx) < (h.w || 14) && Math.abs(h.y - sy) < (h.h || 14)) return { kind: 'battle', obj: h.B };
  for (const A of W.armies) { if (A.battle || !A.soldiers.length) continue; const c = Render.cam, ax = scrDX((A.x + 0.5) * TS, sx), ay = ((A.y + 0.5) * TS - c.y) * c.z - 18; if (Math.abs(ax + 4) < 12 && Math.abs(ay - sy) < 14) return { kind: 'army', obj: A }; }
  for (const L of Render.labels) if (sx >= L.x && sx <= L.x + L.w && sy >= L.y && sy <= L.y + L.h) return { kind: 'town', obj: L.t };
  const c = Render.cam, z = c.z;
  if (z >= 0.9) {
    let best = null, bd = Math.max(10, z * 3);
    for (const p of W.people) {
      if (p.hidden) continue;
      personPos(p, _pos);
      const dx = scrDX(_pos.x, sx), dy = (_pos.y - c.y) * z - sy, d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) return { kind: 'person', obj: best };
  }
  if (z >= 0.5) {
    let best = null, bd = Math.max(16, z * 9);
    for (const s of W.ships) {
      shipPos(s, _pos);
      const d = Math.hypot(scrDX(_pos.x, sx), (_pos.y - c.y) * z - sy + z * 3);
      if (d < bd) { bd = d; best = s; }
    }
    if (best) return { kind: 'ship', obj: best };
  }
  const i = screenToTile(sx, sy);
  if (i < 0) return null;
  const b = W.bAt.get(i);
  if (b && b.type === 'hearth' && b.town) return { kind: 'town', obj: b.town };
  if (b) return { kind: 'building', obj: b };
  const own = W.townById[W.owner[i]];
  if (own && Math.hypot(wdx(own.x, tx(i)), ty(i) - own.y) < 3) return { kind: 'town', obj: own };
  return { kind: 'tile', obj: i };
}
function initInput() {
  const cv = $('game');
  let drag = null;
  // when the player last touched anything (runSim gives the screen more of the frame just after), and what they are pressing on
  const touch = () => { Game.touchT = performance.now(); };
  window.addEventListener('mousedown', e => { touch(); UI.pressEl = e.target; }, true);
  window.addEventListener('mouseup', () => { UI.pressEl = null; }, true);
  window.addEventListener('mousemove', e => { if (e.buttons) touch(); }, true);
  window.addEventListener('wheel', touch, { capture: true, passive: true });
  window.addEventListener('keydown', touch, true);
  cv.addEventListener('mousedown', e => {
    if (Game.power && isBrush(Game.power)) { beginStroke(e.clientX, e.clientY); return; }
    drag = { x: e.clientX, y: e.clientY, cx: Render.cam.x, cy: Render.cam.y, moved: false }; cv.classList.add('drag');
  });
  cv.addEventListener('dblclick', e => {
    if (Game.power) return;
    const hit = pickAt(e.clientX, e.clientY);
    if (hit && hit.kind === 'person') { select('person', hit.obj); setFocus(hit.obj); }
  });
  window.addEventListener('mousemove', e => {
    if (Game.stroke) { strokeAt(e.clientX, e.clientY); return; }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved) { UI.follow = null; Render.cam.x = drag.cx - dx / Render.cam.z; Render.cam.y = drag.cy - dy / Render.cam.z; clampCam(); }
    }
    if (W && e.target === cv && !drag) hoverTip(e.clientX, e.clientY); else $('tip').hidden = true;
  });
  window.addEventListener('mouseup', e => {
    if (Game.stroke) { endStroke(); return; }
    if (!drag) return;
    const was = drag; drag = null; cv.classList.remove('drag');
    if (was.moved || e.target !== cv || !W) return;
    if (Game.power) { usePower(Game.power, e.clientX, e.clientY); return; }
    const hit = pickAt(e.clientX, e.clientY);
    if (hit) select(hit.kind, hit.obj); else select(null);
  });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const c = Render.cam, f = Math.exp(-e.deltaY * 0.0014);
    const wx = e.clientX / c.z + c.x, wy = e.clientY / c.z + c.y;
    c.z = clamp(c.z * f, 0.05, 10); clampCam();
    c.x = wx - e.clientX / c.z; c.y = wy - e.clientY / c.z; clampCam();
  }, { passive: false });
  window.addEventListener('resize', () => { resize(); });
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || !W) return;
    const k = e.key.toLowerCase();
    if (!$('startup').hidden) return;
    if (k === ' ') { e.preventDefault(); setSpeed(Game.speed ? 0 : (Game.lastSpeed || 1)); if (Game.speed === 0) return; }
    if (k >= '1' && k <= '5') setSpeed([1, 3, 10, 30, 999][+k - 1]);
    if (Game.speed) Game.lastSpeed = Game.speed;
    if (k === 'm') { const ms = ['normal', 'kingdoms', 'resources', 'fertility', 'faith', 'weather']; setMode(ms[(ms.indexOf(Render.mode) + 1) % ms.length]); }
    if (k === 't') { const m = $('techModal'); if (m.hidden) openTech(); else m.hidden = true; }
    if (k === 'b') toggleBorders();
    if (k === 'n') cycleNames();
    if (k === 'h') toggleAll();
    if (k === 'f') { if (UI.follow) stopFocus(); else if (Render.sel && Render.sel.kind === 'person') setFocus(Render.sel.obj); }
    if (k === 'escape') {
      if (Game.power) setPower(null);
      else if (UI.follow || UI.followDead) stopFocus();
      else if (!closeModals()) select(null);
    }
    Game.keys.add(k);
  });
  window.addEventListener('keyup', e => Game.keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => Game.keys.clear());

  $('speed').addEventListener('click', e => { const s = e.target.dataset.sp; if (s !== undefined) { setSpeed(+s); if (+s) Game.lastSpeed = +s; } });
  $('modes').addEventListener('click', e => { if (e.target.dataset.m) setMode(e.target.dataset.m); });
  $('tools').addEventListener('click', e => {
    const t = e.target;
    if (t.dataset.tab) {
      Game.tab = t.dataset.tab;
      document.querySelectorAll('#toolTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === Game.tab));
      document.querySelectorAll('.toolset').forEach(el => { el.hidden = el.dataset.set !== Game.tab; });
    }
    if (t.dataset.p) setPower(Game.power === t.dataset.p ? null : t.dataset.p);
    if (t.dataset.n) { Game.n = +t.dataset.n; document.querySelectorAll('.repeat [data-n]').forEach(b => b.classList.toggle('on', +b.dataset.n === Game.n)); }
    if (t.id === 'bKeep') { Game.keep = !Game.keep; t.classList.toggle('on', Game.keep); }
  });
  $('bBorders').onclick = toggleBorders;
  $('bNames').onclick = cycleNames;
  $('bNames').textContent = NAMES_TEXT[UI.names];
  $('bFar').onclick = cycleBlds;
  $('bFar').textContent = BLDS_TEXT[UI.blds];
  $('bHide').onclick = toggleAll;
  document.addEventListener('click', e => {
    const k = e.target.dataset ? e.target.dataset.min : null;
    if (k) { UI.mins[k] = !UI.mins[k]; applyMins(); }
  });
  $('filters').addEventListener('click', e => {
    const f = e.target.dataset.f; if (!f) return;
    UI.filter = f;
    document.querySelectorAll('#filters button').forEach(b => b.classList.toggle('on', b.dataset.f === f));
    updateChronicle(true);
  });
  $('log').addEventListener('click', e => {
    const ev = e.target.closest('.ev'); if (!ev) return;
    const x = +ev.dataset.x, y = +ev.dataset.y;
    if (x >= 0) { centerOn(x, y, Math.max(Render.cam.z, 1.6)); const t = W.townById[+ev.dataset.t]; if (t) select('town', t); }
  });
  $('warList').addEventListener('click', e => {
    const b = e.target.closest('.battleRow');
    if (b) { const B = W.battles.find(x => x.id === +b.dataset.b); if (B) { select('battle', B); stopFocus(); centerOn(B.x, B.y, Math.max(Render.cam.z, 2.4)); } return; }
    const r = e.target.closest('.warRow'); if (!r) return;
    const w = W.wars.find(x => x.id === +r.dataset.war);
    if (w) { select('war', w); const pl = w.firstTarget || w.leadB.capital; if (pl && pl.alive) centerOn(pl.x, pl.y); }
  });
  // hovering a realm in the list lights up everything it rules on the map
  $('realmList').addEventListener('mousemove', e => { const r = e.target.closest('.realm'); UI.hoverPol = r ? W.polities[+r.dataset.pol] : null; });
  $('realmList').addEventListener('mouseleave', () => { UI.hoverPol = null; });
  $('realmList').addEventListener('click', e => {
    const r = e.target.closest('.realm'); if (!r) return;
    const p = W.polities[+r.dataset.pol];
    select('pol', p);
    if (p.capital) centerOn(p.capital.x, p.capital.y);
  });
  // the panel redraws often, so act on press rather than on click
  const panelAct = e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    e.preventDefault();
    const act = a.dataset.act, id = +a.dataset.id;
    if (act === 'close') select(null);
    else if (act === 'focus') { const p = Render.sel.obj; if (UI.follow === p) stopFocus(); else setFocus(p); updateInspector(); }
    else if (act === 'focuskid') { const p = (UI.followDead || (Render.sel && Render.sel.obj)); const kid = p && p.lastKid; if (kid && kid.alive) { UI.followDead = null; select('person', kid); setFocus(kid); } }
    else if (act === 'unfocus') stopFocus();
    else if (act === 'techs') openTech(W.polities[id]);
    else if (act === 'town') { const t = W.townById[id]; if (t) { select('town', t); stopFocus(); centerOn(t.x, t.y); } }
    else if (act === 'pol') select('pol', W.polities[id]);
    else if (act === 'person') { const p = W.people[id]; if (p) { select('person', p); personPos(p, _pos); centerOn(_pos.x / TS, _pos.y / TS); } }
    else if (act === 'ship') { const s = W.ships.find(x => x.id === id); if (s) { select('ship', s); shipPos(s, _pos); centerOn(_pos.x / TS, _pos.y / TS); } }
    else if (act === 'war') { const w = W.wars.find(x => x.id === id); if (w) select('war', w); }
    else if (act === 'battle') { const b = W.battles.find(x => x.id === id); if (b) { select('battle', b); centerOn(b.x, b.y); } }
    else if (act === 'army') { const b = W.armies.find(x => x.id === id); if (b) { select('army', b); centerOn(b.x, b.y); } }
    else if (act === 'watch') { const b = W.battles.find(x => x.id === id); if (b) { select('battle', b); stopFocus(); centerOn(b.x, b.y, 3.4); setSpeed(1); Game.lastSpeed = 1; } }
  };
  $('right').addEventListener('mousedown', panelAct);
  $('editBody').addEventListener('change', editAct); $('editBody').addEventListener('click', editAct);  // the person editor (ui.js)
  $('focus').addEventListener('mousedown', panelAct);
  $('techRealm').addEventListener('change', e => { UI.techRealm = +e.target.value; openTech(); });
  $('techTabs').addEventListener('click', e => { if (e.target.dataset.v) { UI.techView = e.target.dataset.v; openTech(); } });
  const mini = $('mini');
  const jump = e => { const r = mini.getBoundingClientRect(); centerOn((e.clientX - r.left) / r.width * W.w, (e.clientY - r.top) / r.height * W.h); UI.follow = null; };
  let miniDown = false;
  mini.addEventListener('mousedown', e => { miniDown = true; jump(e); });
  window.addEventListener('mousemove', e => { if (miniDown) jump(e); });
  window.addEventListener('mouseup', () => { miniDown = false; });

  $('bTech').onclick = () => openTech();
  $('bStats').onclick = openStats;
  $('bEcon').onclick = openEcon;
  $('bHelp').onclick = () => { $('helpBody').innerHTML = HELP_HTML; $('helpModal').hidden = false; };
  $('bSave').onclick = () => saveGame(false);
  $('bNew').onclick = () => {
    Game.beforeNew = Game.speed;
    setSpeed(0);
    $('startup').hidden = false; $('oBack').hidden = false;
    hasSave().then(ok => { $('oLoad').hidden = !ok; }).catch(() => {});
  };
  $('oBack').onclick = () => { $('startup').hidden = true; setSpeed(Game.beforeNew || 1); };
  document.addEventListener('click', e => { if (e.target.dataset.close !== undefined) e.target.closest('.modal').hidden = true; });
  $('techTree').addEventListener('click', e => {
    const el = e.target.closest('[data-tech]'); if (!el) return;
    UI.techSel = el.dataset.tech;
    document.querySelectorAll('.tile.sel').forEach(n => n.classList.remove('sel'));
    el.classList.add('sel');
    drawTechLines(); techDetail(UI.techSel);
  });
}
function closeModals() {
  let any = false;
  for (const id of ['techModal', 'statsModal', 'helpModal', 'econModal', 'fbModal', 'patronModal']) if ($(id) && !$(id).hidden) { $(id).hidden = true; any = true; }
  return any;
}
function hoverTip(sx, sy) {
  const tip = $('tip');
  if (Render.cam.z < 0.4) { tip.hidden = true; return; }
  const i = screenToTile(sx, sy);
  if (i < 0) { tip.hidden = true; return; }
  const b = W.bAt.get(i);
  let text = '';
  if (b && !b.ruin) text = b.name || holyName(b) || (b.type === 'house' ? HOUSES[b.tier].name : BLD[b.type].name);
  else if (b) text = 'Ruins';
  else if (typeof wonderAt === 'function' && wonderAt(i)) text = wonderTip(wonderAt(i));  // a great work (wonders.js)
  else if (W.occ[i] === 2) text = `Field: ${['fallow', 'just sown', 'growing', 'ripe'][W.stage[i]]}`;
  else if (W.plant[i]) text = `${PLANTS[W.plant[i]].name}: ${['just planted', 'growing', 'ready to pick'][W.plantS[i]]}`;
  else if (W.ore[i] > 0 && W.oreAmt[i] > 0) text = `${ORE_NAME[W.ore[i]]} deposit`;
  else if (typeof bridgeAt === 'function' && bridgeAt(i)) { const br = bridgeInfo(i); text = `${br.name}${br.name.includes(br.kind) ? '' : ' (' + br.kind.toLowerCase() + ')'}${br.built ? ', built ' + br.built : ''}${br.broken ? ' · broken' : ''}`; }
  else if (W.road[i]) text = ['', 'Footpath', 'Dirt road', 'Paved road', 'Asphalt road'][W.road[i]];
  // whatever else is here, say whose land it is
  const wn = waterNameAt(i);
  if (wn) text = text ? `${text} · ${wn}` : wn;
  if (W.canal[i]) { const cn = W.canals[W.canalId[i] - 1]; text = cn ? `${cn.name}${cn.level === 2 ? ' (ship canal)' : ' (barge canal)'}` : 'Canal'; }
  if (W.snowD[i] > 20) text = `${text ? text + ' · ' : ''}${W.snowD[i] > 200 ? 'Glacier' : W.snowD[i] > 90 ? 'Deep snow' : 'Snow'}`;
  if (W.ice[i] > 80) text = `${text ? text + ' · ' : ''}Frozen over`;
  const own = W.townById[W.owner[i]];
  if (own) { const who = own.occupier && own.occupier.alive ? `${own.polity.name}, held by ${own.occupier.name}` : own.polity.name; text = text ? `${text} · ${own.name}, ${who}` : `${own.name}, ${who}`; }
  if (Render.mode === 'weather') text = wxDescribe(i) + (text ? ` · ${text}` : '');
  if (Render.mode === 'land' && W.land && !W.water[i]) text = `Land value ${Math.round(W.land[i])}${own ? ' · ' + landWord(W.land[i], landPeak(own)) : ''}` + (text ? ` · ${text}` : '');
  if (!text) { tip.hidden = true; return; }
  tip.textContent = text; tip.hidden = false;
  tip.style.left = (sx + 14) / UI_Z + 'px'; tip.style.top = (sy + 12) / UI_Z + 'px';
}
function setMode(m) {
  Render.mode = m;
  document.querySelectorAll('#modes button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  if (m === 'land' && !W.land) landYear();
  if (m === 'fertility' || m === 'resources' || m === 'faith' || m === 'land') paintMode();
}

// ---- powers ----
function setPower(p) {
  Game.power = p; Game.pair = null;
  document.querySelectorAll('#tools [data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  $('game').classList.toggle('aim', !!p);
  if (p) toast(isBrush(p) ? 'Drag on the map to paint. Esc cancels.' : p === 'ally' || p === 'gift' ? `Click the ${p === 'gift' ? 'town that teaches' : 'first town'}, then the ${p === 'gift' ? 'one that learns' : 'second'}. Esc cancels.` : 'Click the map to use it. Esc cancels.', 2200);
}
function nearestTown(i, maxD) {
  let best = null, bd = maxD;
  for (const t of W.towns) { const d = Math.hypot(t.x - tx(i), t.y - ty(i)); if (d < bd) { bd = d; best = t; } }
  return best;
}
function climatePatch(i, v) {
  const cx = Math.floor(tx(i) / W.w * 10), cy = Math.floor(ty(i) / W.h * 10);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (cy + dy >= 0 && cy + dy < 10 && cx + dx >= 0 && cx + dx < 10) W.climate[(cy + dy) * 10 + cx + dx] = v;
}
// One click, as many repeats as the toolbar says. Spread out slightly so five tribes don't land on one spot.
function usePower(p, sx, sy) {
  if (p === 'ally' || p === 'gift') { pairPower(p, sx, sy); return; }
  const n = Game.n;
  let done = 0;
  for (let k = 0; k < n; k++) {
    const jitter = (p === 'tribe' || p === 'meteor' || p === 'herd' || p === 'quake') && k > 0;
    const ox = jitter ? (rnd() - 0.5) * 240 * Render.cam.z * 0.25 : 0, oy = jitter ? (rnd() - 0.5) * 240 * Render.cam.z * 0.25 : 0;
    if (powerOnce(p, sx + ox, sy + oy, k)) done++;
  }
  if (n > 1 && done > 1 && (p === 'inspire' || p === 'tribe' || p === 'meteor')) toast(`${done} times over.`);
  if (!Game.keep) setPower(null);
}
function powerOnce(p, sx, sy, k) {
  const i = screenToTile(sx, sy);
  if (i < 0) return false;
  const t = nearestTown(i, 40);
  switch (p) {
    case 'rain': climatePatch(i, 1.5); toast('Rain falls. This year the harvests here will be heavy.'); break;
    case 'drought': climatePatch(i, 0.3); toast('The rains stop in this region.'); if (t && k === 0) chronT('famine', `The rains fail around ${t.name}.`, t); break;
    case 'plague':
      if (!t) { toast('No settlement close enough.'); return false; }
      t.lastPlague = year(); t.plagueDead = 0; t.plagueName = t.plagueName || pick(['the Grey Cough', 'Blood Fever', 'the Withering']); infectTown(t, 4 + Math.floor(tn(t) / 20));
      if (k === 0) chronT('plague', `${cap(t.plagueName)} appears without warning in ${t.name}.`, t);
      break;
    case 'fire':
      if (!t) { toast('No settlement close enough.'); return false; }
      greatFire(t); break;
    case 'inspire':
      if (!t) { toast('No settlement close enough.'); return false; }
      { const open = techCache(t).front.map(i => TECHS[i]).filter(T => eligible(t, T)).sort((a, b) => a.diff - b.diff);
        if (!open.length) { toast(`${t.name} has nothing it could work out next.`); return false; }
        discover(t, open[0]); if (Game.n === 1) toast(`Inspiration strikes in ${t.name}: ${open[0].name}.`); }
      break;
    case 'genius':
      if (!t || !tn(t)) { toast('No settlement close enough.'); return false; }
      return makeGenius(t, k);
    case 'bless': case 'curse':
      if (!t) { toast('No settlement close enough.'); return false; }
      if (k > 0) return false;  // once is enough: repeats would only stack the years
      if (p === 'bless') {
        for (let r = 0; r < R.N; r++) t.stock[r] += Math.min(Math.max(t.stock[r] * 0.3, wantOf(t, r)), tn(t) * 3);
        t.unrest = 0; t.famine = 0; giveBoon(t, 'bless', 8);
        chronT('wonder', `${t.name} is blessed. For years to come its harvests are heavy, its children healthy and its people glad.`, t);
        toast(`${t.name} is blessed for 8 years.`);
      } else {
        giveBoon(t, 'curse', 8); t.unrest = Math.min(100, t.unrest + 15);
        chronT('collapse', `A curse falls on ${t.name}. Crops wither, children sicken and nobody can say why.`, t);
        toast(`${t.name} is cursed for 8 years.`);
      }
      break;
    case 'bounty': case 'famine': {
      if (k > 0) return false;
      const near = W.towns.filter(o => Math.hypot(o.x - tx(i), o.y - ty(i)) < 45);
      climatePatch(i, p === 'bounty' ? 1.4 : 0.35);
      for (const o of near) {
        giveBoon(o, p === 'bounty' ? 'plenty' : 'want', p === 'bounty' ? 6 : 4);
        if (p === 'bounty') { o.stock[R.FOOD] += tn(o) * 1.5; o.famine = 0; } else o.stock[R.FOOD] *= 0.4;
      }
      const big = near.sort((a, b) => tn(b) - tn(a))[0];
      if (big) chronT(p === 'bounty' ? 'misc' : 'famine', p === 'bounty' ? `Years of plenty begin around ${big.name}: barns overflow and nobody goes hungry.` : `Blight and rot spread through the stores around ${big.name}. Hard years are coming.`, big);
      toast(near.length ? `${p === 'bounty' ? 'Years of plenty' : 'Hunger'} for ${near.length} settlement${near.length === 1 ? '' : 's'} here.` : 'Nobody lives close enough to notice.');
      break;
    }
    case 'prophet':
      if (!t || !t.members.length) { toast('No settlement close enough.'); return false; }
      return prophet(t, k);
    case 'hero':
      if (!t || !t.members.length) { toast('No settlement close enough.'); return false; }
      return makeHero(t, k);
    case 'quake': quakeAt(i, k); break;
    case 'flood': return floodAt(i, k);
    case 'migrate':
      if (!t) { toast('No settlement close enough.'); return false; }
      return migrate(t);
    case 'golden':
      if (!t) { toast('No settlement close enough.'); return false; }
      { const pol = t.polity;
        if (pol.dAge === 1) { if (k === 0) toast(`${pol.name} is already in a golden age.`); return false; }
        pol.dAge = 1; pol.dAgeY = Math.floor(year()); pol.dRun = 3;
        for (const o of W.towns) if (o.polity === pol) recomputeMods(o);
        const cap0 = pol.capital && pol.capital.alive ? pol.capital : t;
        chronT('tech', `A golden age of learning dawns in ${pol.name}. Scholars crowd ${cap0.name}, and new ideas come thick and fast.`, cap0);
        toast(`A golden age for ${pol.name}: faster research and ideas spreading further, for at least 15 years.`); }
      break;
    case 'tribe':
      if (W.water[i] || W.biome[i] === B.SNOW) { if (Game.n === 1) toast('They need dry land to stand on.'); return false; }
      { const nt = spawnTribe(i, 20); if (k === 0) chronT('found', `A band of strangers, the ${nt.culture.name}, appears at ${nt.name}.`, nt); updatePolities(); updateTerritory(); }
      break;
    case 'meteor': meteor(i); break;
    case 'herd':
      if (W.water[i]) return false;
      { const ty = HERD_TYPES.map((H, ix) => H.biomes.includes(W.biome[i]) ? ix : -1).filter(v => v >= 0); const ht = ty.length ? pick(ty) : rint(HERD_TYPES.length); W.herds.push({ id: W.nextId++, x: tx(i) + 0.5, y: ty2(i) + 0.5, type: ht, n: HERD_TYPES[ht].cap, tx: tx(i), ty: ty2(i), owner: null }); }
      break;
    case 'war':
      if (!t) { toast('No settlement close enough.'); return false; }
      { let foe = null, bd = 1e9; for (const o of W.towns) { if (o.polity === t.polity || atWar(t.polity, o.polity)) continue; const d = Math.hypot(o.x - t.x, o.y - t.y); if (d < bd) { bd = d; foe = o; } }
        if (!foe) { toast(`${t.polity.name} has nobody left to fight.`); return false; }
        t.polity.truce[foe.polity.id] = 0; startWar(t.polity, foe.polity, 'provoked', t, foe); toast(`${t.polity.name} goes to war with ${foe.polity.name}.`); }
      break;
    case 'peace':
      if (!t) { toast('No settlement close enough.'); return false; }
      { const wars = [...new Set(Object.values(t.polity.warsWith))]; if (!wars.length) { if (k === 0) toast(`${t.polity.name} is already at peace.`); return false; } for (const w of wars) endWar(w, null, 'treaty'); toast('The guns fall silent.'); }
      break;
    case 'revolt':
      if (!t) { toast('No settlement close enough.'); return false; }
      if (t.polity.capital === t || t.nomad) { toast('The capital can’t break away from itself.'); return false; }
      if (!startRevolt(t.polity, t)) secede(t.polity, t, 14);
      updateTerritory(); break;
  }
  return true;
}
const ty2 = i => (i / W.w) | 0;
// ---- the observer's people: a genius, a hero, a prophet ----
// A young grown-up, one the town would pick (pref) if it has one; if nobody is of age, someone comes of age now.
function youngAdult(t, pref, skip) {
  const M = t.members, ok = [], best = [];
  for (let q = 0; q < M.length; q++) { const p = M[q], a = ageOf(p); if (!p.alive || p.army || p.btl || p.aboard || a < 17 || a > 34 || skip(p)) continue; ok.push(p); if (pref(p)) best.push(p); }
  if (best.length) return pick(best);
  if (ok.length) return pick(ok);
  for (let q = 0; q < M.length; q++) { const p = M[q], a = ageOf(p); if (p.alive && !p.army && !p.btl && !p.aboard && a >= 14 && a < 60 && !skip(p)) ok.push(p); }
  if (ok.length) return pick(ok);
  const p = newPerson(t, rint(2), 17 + rnd() * 3);
  p.ti = p.nt = nearTile(t.i, 3); plog(p, `Came of age in ${t.name}.`);
  return p;
}
const showPerson = (p, msg) => { select('person', p); setFocus(p); if (msg) toast(msg, 3200); };
function makeGenius(t, k) {
  const c = youngAdult(t, p => p.job === J.SCHOLAR, p => hasTrait(p, 'genius'));
  forceTrait(c, 'genius');  // and no longer dull
  if (c.job !== J.SCHOLAR && c.job > J.ELDER) { t.jobs[c.job]--; c.job = J.SCHOLAR; t.jobs[J.SCHOLAR]++; c.skill = 0; }
  c.fame += 5; c.gWork = -1;
  plog(c, 'Something changed. The ideas started coming.');
  (W.genii || (W.genii = [])).push(c);
  const T = geniusPick(t);
  if (T) { c.gWork = T.ix; t.prog[T.ix] += inventCost(t, T) * GENIUS_PUSH; }  // straight to work
  if (k === 0) chronT('tech', `${c.name} of ${t.name} turns out to have one of the great minds of the age.`, t);
  if (k === Game.n - 1) showPerson(c, `${c.name}, ${Math.floor(ageOf(c))}, of ${t.name} is a genius${T ? ' and is already at work on ' + T.name : ''}.`);
  return true;
}
function makeHero(t, k) {
  const p = youngAdult(t, q => q.job === J.SOLDIER || hasTrait(q, 'brave'), q => q.fame >= 25);
  for (const id of ['brave', 'charismatic', pick(['strong', 'tough', 'swift']), pick(['warlike', 'wise', 'kind', 'ambitious'])]) forceTrait(p, id);
  p.fame += 25; p.xp = Math.max(p.xp || 0, 40);
  plog(p, 'Marked out for greatness: fearless, and followed without question.');
  const war = Object.keys(t.polity.warsWith).length > 0;
  if (k === 0) chronT('gov', `${p.name} comes of age in ${t.name}: fearless, quick to lead, and followed without question.${war ? ' The war has found its general.' : ''}`, t);
  if (k === Game.n - 1) showPerson(p, `A hero rises in ${t.name}: ${p.name}.`);
  return true;
}
// Founds a faith where there is none; otherwise fires up the one there and carries it to the towns around.
function prophet(t, k) {
  if (k > 0) return false;
  const p = youngAdult(t, q => q.job === J.SERVICE || hasTrait(q, 'pious'), () => false);
  forceTrait(p, 'pious'); forceTrait(p, 'charismatic'); p.fame += 12;
  let F = t.faith >= 0 && W.faiths ? W.faiths[t.faith] : null;
  const fresh = !F;
  if (fresh) { F = newFaith(t, null); t.faith = F.id; F.founder = p.name; plog(p, `Founded the worship of ${F.kind}.`); }
  else { F.fervor = Math.min(1.5, (F.fervor || 1) + 0.25); plog(p, `Preached ${F.name} through the country round ${t.name}.`); }
  recomputeMods(t);
  let won = 0;
  for (const o of W.towns) {
    if (o === t || o.faith === F.id) continue;
    const d = Math.hypot(o.x - t.x, o.y - t.y);
    if (d < 55 && rnd() < (o.faith < 0 ? 0.8 : 0.5) * (1 - d / 70)) { o.faith = F.id; recomputeMods(o); won++; }
  }
  chronT('gov', fresh ? `In ${t.name}, ${p.name} has a vision and teaches a new faith: ${F.name}, the way of ${F.kind}.${won ? ` ${won} town${won === 1 ? '' : 's'} nearby take${won === 1 ? 's' : ''} it up.` : ''}` : `The prophet ${p.name} preaches ${F.name} in ${t.name}${won ? `, and ${won} town${won === 1 ? '' : 's'} round about turn${won === 1 ? 's' : ''} to it` : ''}.`, t);
  showPerson(p, fresh ? `${p.name} founds ${F.name}.` : `${p.name} preaches ${F.name}${won ? ': ' + won + ' towns convert' : ''}.`);
  return true;
}
// ---- the observer's disasters, aimed (life.js has the ones that come on their own) ----
const crowdLoss = (t, f) => { if (t.alive && t.folk > 0) { const d = Math.floor(t.folk * f); t.folk -= d; W.folkN -= d; t.scale = tn(t) / Math.max(1, t.members.length); return d; } return 0; };
function quakeAt(i, k) {
  const x = tx(i), y = ty(i), r = 9 + rint(6), SE = TECH_IX.seismic;
  let wrecked = 0, dead = 0, worst = null;
  for (const t of W.towns.slice()) {
    const d = Math.hypot(t.x - x, t.y - y);
    if (d > r + t.radius * 0.6) continue;
    const f = clamp(1 - d / (r + t.radius), 0.15, 1) * (t.tech[TECH_IX.engineering] ? 0.7 : 1) * (SE !== undefined && t.tech[SE] ? 0.3 : t.tech[TECH_IX.skyscrapers] ? 0.5 : 1);
    for (const b of t.blds.slice()) if (b.type !== 'hearth' && !b.ruin && rnd() < 0.08 * f) { if (FXH) FXH.rubble(b.x, b.y, 2); removeBuilding(b); wrecked++; }
    const go = Math.floor(t.members.length * 0.025 * f);
    for (let q = 0; q < go && t.alive; q++) { const v = t.members[rint(t.members.length)]; if (v) { killPerson(v, 'killed in an earthquake'); dead++; } }
    dead += crowdLoss(t, 0.025 * f);
    if (t.alive) { t.unrest = Math.min(100, t.unrest + 10); if (!worst || tn(t) > tn(worst)) worst = t; }
  }
  for (let dy = -r; dy <= r; dy += 2) for (let dx = -r; dx <= r; dx += 2) { const j = (y + dy) * W.w + x + dx; if (j > 0 && j < W.tree.length && W.tree[j] && dx * dx + dy * dy < r * r && rnd() < 0.3) { W.tree[j] = W.tree[j] >> 1; dirty(j); } }
  W.fights = W.fights || []; W.fights.push({ x, y, t: W.tick });
  if (worst) chronT('collapse', `The earth shakes under ${worst.name}. ${wrecked} buildings are down and ${dead} are dead.`, worst);
  else chron('misc', 'The earth shakes in empty country.', x, y);
  if (k === 0) toast(worst ? `${wrecked} buildings down, ${dead} dead.` : 'The ground shakes. Nobody lives close enough to be hurt.');
}
// A river bursts its banks or the sea comes in: low ground near the water goes under for a season, fields drown, weak houses go,
// and the mud left behind is rich. The water lies over the land as a storm surge does (life.js surgesTick drains it).
function floodAt(i, k) {
  const x0 = tx(i), y0 = ty(i), R0 = 10, w = W.w, flood = new Set(), dep = new Map(), q = [];
  for (let dy = -R0; dy <= R0; dy++) for (let dx = -R0; dx <= R0; dx++) {
    const x = x0 + dx, y = y0 + dy;
    if (dx * dx + dy * dy > R0 * R0 || x < 1 || y < 1 || x >= w - 1 || y >= W.h - 1) continue;
    const j = y * w + x;
    if ((W.water[j] && W.water[j] !== 3) || W.river[j]) { q.push(j); dep.set(j, 0); if (!W.water[j]) flood.add(j); }
  }
  if (!q.length) { if (k === 0) toast('A flood needs a river or a coast close by.'); return false; }
  for (let h = 0; h < q.length; h++) {
    const j = q[h], d = dep.get(j);
    if (d >= 4) continue;
    for (const n of [j - 1, j + 1, j - w, j + w]) {
      if (n < 0 || n >= W.water.length || dep.has(n) || W.water[n] || W.elev[n] > 0.3) continue;
      const dx = n % w - x0, dy = ((n / w) | 0) - y0;
      if (dx * dx + dy * dy > (R0 + 3) * (R0 + 3)) continue;
      dep.set(n, d + 1); flood.add(n); q.push(n);
    }
  }
  if (!flood.size) { if (k === 0) toast('The banks here are too high to flood.'); return false; }
  let crops = 0, houses = 0, dead = 0, worst = null;
  for (const j of flood) { if (W.occ[j] === 2 && W.stage[j]) { W.stage[j] = 0; crops++; } W.fert[j] = Math.min(255, W.fert[j] + 12); W.plant[j] = 0; dirty(j); }
  for (const t of W.towns.slice()) {
    if (Math.hypot(t.x - x0, t.y - y0) > R0 + t.radius) continue;
    let hit = 0;
    for (const b of t.blds.slice()) { if (b.type === 'hearth' || b.ruin || !flood.has(b.i)) continue; hit++; if (rnd() < (b.type === 'house' && b.tier <= 4 ? 0.45 : 0.08)) { removeBuilding(b); if (b.type === 'house') houses++; } }
    for (const p of t.members.slice()) if (p.alive && flood.has(p.ti) && rnd() < 0.08) { killPerson(p, 'drowned in a flood'); dead++; }
    if (!t.alive || !hit) continue;
    dead += crowdLoss(t, 0.03 * hit / Math.max(1, t.blds.length));
    t.stock[R.FOOD] *= 0.8;
    if (!worst || tn(t) > tn(worst)) worst = t;
  }
  (W.surges || (W.surges = [])).push({ tiles: [...flood], until: W.tick + Math.round(TPY * (0.25 + rnd() * 0.15)) });
  const parts = [houses && `${houses} houses swept away`, dead && `${dead} drowned`, crops && `${crops} fields under water`].filter(Boolean);
  if (worst) chronT('misc', `Floodwater pours over the low ground at ${worst.name}${parts.length ? ': ' + parts.join(', ') : ''}. The mud it leaves will be rich.`, worst);
  if (k === 0) toast(parts.length ? cap(parts.join(', ')) + '.' : 'The water rises over empty ground.');
  return true;
}
// A large party sets out to find new land, through the same founding as any colony (society.js tryColonize), pushed to go now.
function migrate(t) {
  if (tn(t) < 16 || t.members.length < 8) { toast(`${t.name} is too small to spare a party of settlers.`); return false; }
  const n0 = W.towns.length, cp = colonyPush, fs0 = findSite, was = t.moved, why = t.pushWhy, since = t.sinceColony;
  colonyPush = () => 2; t.moved = -999; t.sinceColony = 0;
  try {
    for (let q = 0; q < 6 && W.towns.length === n0; q++) {
      t.pushWhy = q < 2 ? '' : 'land';
      if (q >= 3) findSite = (o, mn, mx) => fs0(o, mn, Math.max(mx, 110), true);  // a full world: they take poorer land, further off
      nodeBudget = Math.max(nodeBudget, 30000);
      tryColonize(t);
    }
  } finally { colonyPush = cp; findSite = fs0; t.pushWhy = why; if (W.towns.length === n0) { t.moved = was; t.sinceColony = since; } }
  const nt = W.towns.length > n0 ? W.towns[W.towns.length - 1] : null;
  if (!nt) { toast(`The people of ${t.name} find nowhere to go. They stay.`); return false; }
  // the founding code sends a village's worth; this was meant to be a great trek, so more follow on foot when they can
  if (W.landId[nt.i] === W.landId[t.i]) {
    const more = Math.min(30, Math.floor(t.members.length * 0.12));
    for (let q = 0, moved = 0; q < t.members.length * 2 && moved < more && t.members.length > 8; q++) {
      const p = t.members[rint(t.members.length)];
      if (!p || p.army || p.btl || p.aboard || p.leader || ageOf(p) < 15 || ageOf(p) > 55) continue;
      moveTo(p, nt); startMigrate(p, nearTile(nt.i, 3)); moved++;
    }
    planJobs(t); planJobs(nt);
  }
  const lead = nt.members.find(p => p.alive && !p.hidden) || nt.members[0];
  if (lead) showPerson(lead, `${tn(nt)} people leave ${t.name} to found ${nt.name}.`); else toast(`Settlers leave ${t.name} to found ${nt.name}.`);
  return true;
}
// ---- powers that join two towns: click the first, then the second ----
function pairPower(p, sx, sy) {
  const i = screenToTile(sx, sy), t = i >= 0 ? nearestTown(i, 40) : null;
  if (!t) { toast('No settlement close enough.'); return; }
  const a = Game.pair && Game.pair.alive ? Game.pair : null;
  if (!a) { Game.pair = t; select('town', t); toast(p === 'gift' ? `${t.name} will teach. Now click the town that learns.` : `${t.name} chosen. Now click a town of the other realm.`, 2600); return; }
  if (t === a) { toast('Pick a different town.'); return; }
  const ok = p === 'ally' ? allyPower(a, t) : giftPower(a, t);
  Game.pair = null;
  if (ok && !Game.keep) setPower(null);
}
function allyPower(a, b) {
  const A = a.polity, B = b.polity;
  if (A === B) { toast('Those two towns are in the same realm.'); return false; }
  if (areAllies(A, B)) { toast(`${A.name} and ${B.name} are already allies.`); return false; }
  if (atWar(A, B)) endWar(A.warsWith[B.id], null, 'treaty');
  A.known[B.id] = 1; B.known[A.id] = 1;
  adjustRel(A, B, 40);
  makeAlliance(A, B);
  if (A.pop + B.pop < 60) chronT('gov', `${A.name} and ${B.name} swear an alliance.`, a);
  toast(`${A.name} and ${B.name} are now allies.`);
  return true;
}
// The second town learns what the first knows and it is ready for: the most advanced first, as many as the toolbar's repeat says.
function giftPower(a, b) {
  const got = [];
  for (let q = 0; q < Game.n; q++) {
    let best = -1, bs = -1;
    for (const ix of techCache(a).known) { if (b.tech[ix] || !a.tech[ix] || !eligible(b, TECHS[ix])) continue; const T = TECHS[ix], s = T.era * 10 + (T.side ? 0 : 5) + rnd(); if (s > bs) { bs = s; best = ix; } }
    if (best < 0) break;
    learn(b, best);
    const T = TECHS[best];
    if (!b.polity.firsts[T.id]) b.polity.firsts[T.id] = Math.floor(year());
    got.push(T.name);
  }
  if (!got.length) { toast(`${a.name} knows nothing that ${b.name} is ready to learn.`); return false; }
  chronT('tech', `Travellers from ${a.name} teach ${b.name} ${got.length === 1 ? got[0] : got.length + ' new things, ' + got.slice(0, 3).join(', ') + (got.length > 3 ? ' and more' : '')}.`, b);
  toast(`${b.name} learns ${got.slice(0, 3).join(', ')}${got.length > 3 ? ` and ${got.length - 3} more` : ''} from ${a.name}.`);
  select('town', b);
  return true;
}
// A soft light over a blessed town, a shadow over a cursed one, a faint tint for years of plenty or want: one gradient a town, only on screen.
const BOON_RGB = { bless: '255,224,140', curse: '70,40,100', plenty: '150,220,120', want: '150,100,60' };
function drawBoons(ctx, c, z, vw, vh) {
  const yr = Math.floor(year()), pulse = 0.85 + Math.sin(performance.now() / 700) * 0.15;
  let any = false;
  for (const t of W.towns) {
    const b = t.boon;
    if (!b) continue;
    const k = b.bless >= yr ? 'bless' : b.curse >= yr ? 'curse' : b.plenty >= yr ? 'plenty' : b.want >= yr ? 'want' : null;
    if (!k) continue;
    const sx = ((t.x + 0.5) * TS - c.x) * z, sy = ((t.y + 0.5) * TS - c.y) * z, r = Math.max(14, (t.radius || 13) * 0.9 * TS * z);
    if (sx + r < 0 || sy + r < 0 || sx - r > vw || sy - r > vh) continue;
    const big = k === 'bless' || k === 'curse', a = (big ? 0.26 : 0.13) * pulse, col = BOON_RGB[k];
    const g = ctx.createRadialGradient(sx, sy, r * 0.1, sx, sy, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.6, `rgba(${col},${a * 0.55})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.globalCompositeOperation = k === 'curse' || k === 'want' ? 'source-over' : 'lighter'; any = true;
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.283); ctx.fill();
    if (big) { ctx.strokeStyle = `rgba(${col},${0.3 * pulse})`; ctx.lineWidth = Math.max(1, z * 0.8); ctx.beginPath(); ctx.arc(sx, sy, r * 0.72, 0, 6.283); ctx.stroke(); }
  }
  if (any) ctx.globalCompositeOperation = 'source-over';
}
// ---- reshaping the world: drag to paint land, deposits and soil ----
const isBrush = p => /^(b_|o_|c_|s_)/.test(p);
const BRUSH_BIOME = { grass: B.GRASS, forest: B.FOREST, jungle: B.JUNGLE, steppe: B.STEPPE, desert: B.DESERT, tundra: B.TUNDRA, marsh: B.MARSH, rock: B.ROCK, snow: B.SNOW };
function beginStroke(sx, sy) {
  Game.stroke = { lastX: -1, lastY: -1, x0: 1e9, y0: 1e9, x1: -1, y1: -1, sea: false };
  strokeAt(sx, sy);
}
function strokeAt(sx, sy) {
  const st = Game.stroke, i = screenToTile(sx, sy);
  if (!st || i < 0) return;
  const x = tx(i), y = ty(i), r = +$('brush').value;
  if (x === st.lastX && y === st.lastY) return;
  st.lastX = x; st.lastY = y;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r + 1) continue;
    const nx = x + dx, ny = y + dy;
    if (nx < 2 || ny < 2 || nx >= W.w - 2 || ny >= W.h - 2) continue;
    paintLand(ny * W.w + nx, Game.power, st);
  }
  st.x0 = Math.min(st.x0, x - r); st.x1 = Math.max(st.x1, x + r); st.y0 = Math.min(st.y0, y - r); st.y1 = Math.max(st.y1, y + r);
  // show the new ground as the brush moves, without waiting for the mouse to lift
  repaintLand(clamp(x - r, 1, W.w - 2), clamp(y - r, 1, W.h - 2), clamp(x + r, 1, W.w - 2), clamp(y + r, 1, W.h - 2));
}
function endStroke() {
  const st = Game.stroke; Game.stroke = null;
  if (!st || st.x1 < 0) return;
  if (st.sea) relinkLand();
  if (st.sea || st.canal) { linkSeaNet(); for (const t of W.towns) t.portI = -1; }
  pathCache.clear(); shipCache.clear();
  for (const t of W.towns) { if (t.x >= st.x0 - 40 && t.x <= st.x1 + 40 && t.y >= st.y0 - 40 && t.y <= st.y1 + 40) { scanTown(t); t.portI = -1; } }
  if (Render.mode === 'fertility' || Render.mode === 'resources') paintMode();
  buildSnow();
  if (!Game.keep) setPower(null);
}
function paintLand(i, p, st) {
  const n = Game.n, kind = p.slice(2), wasWater = W.water[i];
  if (p === 'b_land') {
    if (!wasWater) return;
    W.water[i] = 0; W.elev[i] = 0.06; W.biome[i] = B.GRASS; W.shoreDist[i] = 0; W.fish[i] = W.baseFish[i] = 0;
    W.fert[i] = W.baseFert[i] = 110; W.forage[i] = W.baseForage[i] = rnd() < 0.4 ? 3 : 0; W.temp[i] = W.temp[i]; W.moist[i] = Math.max(W.moist[i], 0.4);
    W.baseCost[i] = 10; W.cost[i] = 10; st.sea = true; dirty(i); return;
  }
  if (p === 'b_sea') {
    if (wasWater === 3) return;
    const b = W.bAt.get(i);
    if (b && !(b.type === 'hearth' && b.town && b.town.alive)) removeBuilding(b);
    else if (b) return;
    if (W.occ[i] === 2) dropField(i);
    W.occ[i] = 0; W.water[i] = 1; W.elev[i] = -0.05; W.biome[i] = B.SHALLOW; W.river[i] = 0; W.tree[i] = W.baseTree[i] = 0; W.forage[i] = W.baseForage[i] = 0; W.ore[i] = 0; W.oreAmt[i] = 0; W.wild[i] = 0; W.fert[i] = W.baseFert[i] = 0; W.road[i] = 0; W.shoreDist[i] = 3;
    W.fish[i] = W.baseFish[i] = 3 + rint(4); W.cost[i] = 255; W.baseCost[i] = 255; st.sea = true; dirty(i); return;
  }
  if (p === 'b_fish') { if (wasWater === 1) W.fish[i] = W.baseFish[i] = Math.min(9, W.baseFish[i] + n); return; }
  if (wasWater) return;
  if (p === 'b_trees') { W.baseTree[i] = W.tree[i] = Math.min(6, Math.max(W.tree[i], 3 + rint(3))); updCost(i); dirty(i); return; }
  if (p === 'b_canal') { if (W.occ[i] === 1 || W.occ[i] === 3) return; if (W.occ[i] === 2) dropField(i); W.canal[i] = 2; W.tree[i] = 0; W.forage[i] = 0; W.plant[i] = 0; st.canal = true; updCost(i); dirty(i); for (let k = 0; k < 4; k++) dirty(i + NB_D[k]); return; }
  if (p === 'b_berries') { W.forage[i] = W.baseForage[i] = Math.min(9, Math.max(W.baseForage[i], 4 + rint(3))); dirty(i); return; }
  if (p === 'b_clear') { W.tree[i] = W.baseTree[i] = 0; W.forage[i] = 0; W.plant[i] = 0; updCost(i); dirty(i); return; }
  if (BRUSH_BIOME[kind] !== undefined && p[0] === 'b') {
    const bi = BRUSH_BIOME[kind];
    W.biome[i] = bi;
    const tr = bi === B.FOREST ? 4 + rint(3) : bi === B.JUNGLE ? 5 + rint(2) : bi === B.GRASS ? (rnd() < 0.08 ? 2 : 0) : bi === B.STEPPE ? (rnd() < 0.02 ? 1 : 0) : bi === B.MARSH ? (rnd() < 0.3 ? 2 : 0) : 0;
    if (!W.occ[i]) W.tree[i] = tr;
    W.baseTree[i] = tr;
    const fe = bi === B.DESERT ? 18 : bi === B.ROCK || bi === B.SNOW ? 10 : bi === B.TUNDRA ? 35 : bi === B.STEPPE ? 80 : bi === B.MARSH ? 120 : 150;
    W.fert[i] = W.baseFert[i] = fe;
    W.forage[i] = W.baseForage[i] = bi === B.FOREST || bi === B.GRASS || bi === B.JUNGLE ? (rnd() < 0.5 ? 4 : 0) : bi === B.DESERT || bi === B.ROCK || bi === B.SNOW ? 0 : rnd() < 0.4 ? 2 : 0;
    W.elev[i] = bi === B.ROCK ? 0.62 : bi === B.SNOW ? 0.8 : Math.min(W.elev[i], 0.28);
    W.moist[i] = bi === B.DESERT ? 0.08 : bi === B.JUNGLE || bi === B.MARSH ? 0.85 : bi === B.FOREST ? 0.65 : bi === B.GRASS ? 0.45 : W.moist[i];
    if (bi === B.TUNDRA || bi === B.SNOW) W.temp[i] = Math.min(W.temp[i], 0.14);
    if (bi === B.JUNGLE) W.temp[i] = Math.max(W.temp[i], 0.7);
    if (bi === B.DESERT) W.temp[i] = Math.max(W.temp[i], 0.5);
    const c = bi === B.ROCK ? 34 + W.elev[i] * 70 : bi === B.SNOW ? 110 : bi === B.MARSH ? 28 : bi === B.JUNGLE ? 20 : bi === B.DESERT ? 13 : bi === B.TUNDRA ? 14 : 10;
    W.baseCost[i] = clamp(c + W.tree[i] * 1.5 + W.elev[i] * 16, 8, 255);
    updCost(i); dirty(i); return;
  }
  if (p[0] === 'o') {
    if (W.occ[i] === 1) return;
    const o = +kind;
    W.ore[i] = o; W.oreAmt[i] = o ? (o <= 2 ? 1500 : 800) * n : 0; dirty(i); return;
  }
  if (p[0] === 'c') { W.wild[i] = +kind; return; }
  if (p === 's_up') { W.baseFert[i] = Math.min(255, W.baseFert[i] + 30 * n); W.fert[i] = Math.min(255, W.fert[i] + 30 * n); return; }
  if (p === 's_down') { W.baseFert[i] = Math.max(0, W.baseFert[i] - 30 * n); W.fert[i] = Math.max(0, W.fert[i] - 30 * n); return; }
  if (p === 's_wet') { W.moist[i] = clamp(W.moist[i] + 0.1 * n, 0, 1); return; }
  if (p === 's_dry') { W.moist[i] = clamp(W.moist[i] - 0.1 * n, 0, 1); return; }
  if (p === 's_warm') { W.temp[i] = clamp(W.temp[i] + 0.08 * n, 0, 1); return; }
  if (p === 's_cold') { W.temp[i] = clamp(W.temp[i] - 0.08 * n, 0, 1); return; }
}
// New land or new sea changes what can be walked to.
function relinkLand() {
  const n = W.w * W.h, q = new Int32Array(n);
  W.landId.fill(-1);
  let lid = 0;
  for (let i = 0; i < n; i++) {
    if (W.water[i] || W.landId[i] >= 0) continue;
    lid++;
    let qh = 0, qt = 0; q[qt++] = i; W.landId[i] = lid;
    while (qh < qt) {
      const j = q[qh++];
      for (let k = 0; k < 8; k++) { const ni = j + NB_D[k]; if (ni >= 0 && ni < n && !W.water[ni] && W.landId[ni] < 0) { W.landId[ni] = lid; q[qt++] = ni; } }
    }
  }
}
// ---- focus: the camera locks to one person and a small panel follows their day ----
function setFocus(p) {
  if (!p || !p.alive) return;
  UI.follow = p; UI.followDead = null; UI.focusKey = null;
  if (Render.cam.z < 3) { const c = Render.cam; c.z = 3.4; }
  updateFocus();
}
function stopFocus() { UI.follow = null; UI.followDead = null; UI.focusKey = null; updateFocus(); }
// Map names: everything, realm names only, or none at all.
const NAMES_TEXT = { all: 'Names: all', realms: 'Names: realms', none: 'Names: off' };
function cycleNames() {
  UI.names = UI.names === 'all' ? 'realms' : UI.names === 'realms' ? 'none' : 'all';
  $('bNames').textContent = NAMES_TEXT[UI.names];
  try { localStorage.setItem('aod-names', UI.names); } catch (e) {}
}
function toggleBorders() { UI.borders = !UI.borders; $('bBorders').classList.toggle('on', UI.borders); }
const BLDS_TEXT = { auto: 'Buildings: auto', on: 'Buildings: on', off: 'Buildings: off' };
function cycleBlds() {
  UI.blds = UI.blds === 'auto' ? 'on' : UI.blds === 'on' ? 'off' : 'auto';
  $('bFar').textContent = BLDS_TEXT[UI.blds];
  try { localStorage.setItem('aod-blds', UI.blds); } catch (e) {}
}
function applyMins() {
  const M = UI.mins;
  for (const k of ['realms', 'wars', 'chronicle']) $(k).classList.toggle('mini', !!M[k]);
  $('right').classList.toggle('mini', !!M.right);
  $('tools').classList.toggle('mini', !!M.tools);
  $('miniWrap').classList.toggle('mini', !!M.mini);
  document.querySelectorAll('[data-min]').forEach(b => { b.textContent = M[b.dataset.min] ? '+' : '–'; b.title = M[b.dataset.min] ? 'Show' : 'Minimise'; });
  try { localStorage.setItem('aod-panels', JSON.stringify(M)); } catch (e) {}
}
function toggleAll() {
  UI.allHidden = !UI.allHidden;
  document.body.classList.toggle('bare', UI.allHidden);
  $('bHide').textContent = UI.allHidden ? 'Show panels' : 'Hide panels';
}
function meteor(i) {
  const r = 7, x0 = tx(i), y0 = ty(i);
  let killed = 0;
  for (const p of W.people.slice()) {
    if (Math.hypot(p.ti % W.w - x0, ((p.ti / W.w) | 0) - y0) < r) { killPerson(p, 'struck by a meteor'); killed++; }
  }
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r) continue;
    const j = (y0 + dy) * W.w + x0 + dx;
    if (j < 0 || j >= W.occ.length || W.water[j] === 3) continue;
    const b = W.bAt.get(j);
    if (b) { if (b.type === 'hearth' && b.town && b.town.alive) continue; removeBuilding(b); }
    if (W.occ[j] === 2) dropField(j);
    if (W.occ[j] === 3) W.occ[j] = 0;
    if (!W.water[j]) { W.tree[j] = 0; W.forage[j] = 0; W.fert[j] = 0; W.road[j] = 0; W.baseTree[j] = Math.floor(W.baseTree[j] / 2); updCost(j); }
    dirty(j);
    for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) {
      const q = (ty(j) * TS + py) * W.w * TS + tx(j) * TS + px;
      if (Render.base) { const dark = 40 + hash2(j, py * px, 7) * 40; Render.base[q] = rgb(dark, dark * 0.9, dark * 0.8); }
    }
  }
  W.fights = W.fights || []; W.fights.push({ x: x0, y: y0, t: W.tick });
  const t = nearestTown(i, 30);
  const dead = killed === 1 ? 'One person dies' : `${killed} people die`;
  chron('collapse', `A fire falls from the sky${t ? ' near ' + t.name : ''}.${killed ? ` ${dead} in the blast.` : ''}`, x0, y0, t);
  toast(killed ? `${dead} in the blast.` : 'The ground shakes. Nobody was close.');
}

// ---- saving: the whole world is plain data, so IndexedDB can store it as it is ----
function db() {
  return new Promise((ok, no) => {
    const r = indexedDB.open('ages-of-dust', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('saves');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}
async function hasSave() {
  const d = await db();
  return new Promise(ok => { const q = d.transaction('saves').objectStore('saves').count('slot1'); q.onsuccess = () => ok(q.result > 0); q.onerror = () => ok(false); });
}
async function saveGame(quiet) {
  try {
    W.rs = RS;
    const flat = packWorld(W);  // packed first (see core.js): if that fails, the old save is never touched
    const d = await db();
    await new Promise((ok, no) => {
      const tx1 = d.transaction('saves', 'readwrite');
      tx1.oncomplete = ok; tx1.onerror = () => no(tx1.error); tx1.onabort = () => no(tx1.error || new Error('the save was cancelled'));
      try { tx1.objectStore('saves').put({ flat, ver: W.ver, when: Date.now() }, 'slot1'); }
      catch (e) { try { tx1.abort(); } catch (e2) {} no(e); }  // one put in one transaction: the last good save stays as it was
    });
    if (!quiet) toast(`Saved at year ${Math.floor(year())}.`);
  } catch (err) {
    console.error(err);
    toast('Could not save: ' + err.message, 5000);
  }
}
async function loadGame() {
  try {
    const d = await db();
    const rec = await new Promise((ok, no) => { const q = d.transaction('saves').objectStore('saves').get('slot1'); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
    if (!rec) { toast('No saved world.'); return; }
    if ((rec.flat ? rec.ver : rec.world.ver) !== SAVE_VER) { toast('That save is from an older version of the game and can’t be loaded here.', 6000); return; }
    W = rec.flat ? unpackWorld(rec.flat) : rec.world; RS = W.rs;  // older saves hold the world as it was
    for (const t of W.towns) recomputeMods(t);  // inventions may do new things since this was saved; also widens saves from before the new ones
    startGame();
    setSpeed(0);
    centerOnFirst();
    toast(`Welcome back to year ${Math.floor(year())}.`);
  } catch (err) {
    console.error(err);
    toast('Could not load: ' + err.message, 5000);
  }
}

try { UI.mins = JSON.parse(localStorage.getItem('aod-panels')) || {}; } catch (e) { UI.mins = {}; }
try { const v = localStorage.getItem('aod-names'); if (NAMES_TEXT[v]) UI.names = v; } catch (e) {}
try { const v = localStorage.getItem('aod-blds'); if (BLDS_TEXT[v]) UI.blds = v; } catch (e) {}
initInput();
initStart();

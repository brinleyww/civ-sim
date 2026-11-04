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
function frame(now) {
  const dt = Math.min(0.1, (now - Game.last) / 1000);
  Game.last = now;
  runSim(dt);
  panKeys(dt);
  if (UI.follow) {
    const p = UI.follow;
    if (p.alive) {
      if (p.aboard) shipPos(p.aboard, _pos); else personPos(p, _pos);
      const c = Render.cam, q = Math.min(1, dt * 7);
      c.x += (_pos.x - Render.vw / 2 / c.z - c.x) * q; c.y += (_pos.y - Render.vh / 2 / c.z - c.y) * q;
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
  requestAnimationFrame(frame);
}
function runSim(dt) {
  if (!Game.speed || !W) return;
  const t0 = performance.now();
  let n = 0;
  // the screen always gets its time: whatever speed is asked for, the sim only ever takes what's left of the frame
  // at the fast settings the sim takes the larger share of each frame, so a huge world still rushes through the years
  const budget = Game.speed >= 999 ? 44 : Game.speed >= 30 ? 26 : Game.speed >= 10 ? 15 : Math.max(5, 10 - Game.drawMs * 0.5);
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
  const x = Math.floor((sx / c.z + c.x) / TS), y = Math.floor((sy / c.z + c.y) / TS);
  if (x < 0 || y < 0 || x >= W.w || y >= W.h) return -1;
  return y * W.w + x;
}
function pickAt(sx, sy) {
  for (const h of Render.battleHits || []) if (Math.abs(h.x - sx) < (h.w || 14) && Math.abs(h.y - sy) < (h.h || 14)) return { kind: 'battle', obj: h.B };
  for (const A of W.armies) { if (A.battle || !A.soldiers.length) continue; const c = Render.cam, ax = ((A.x + 0.5) * TS - c.x) * c.z, ay = ((A.y + 0.5) * TS - c.y) * c.z - 18; if (Math.abs(ax + 4 - sx) < 12 && Math.abs(ay - sy) < 14) return { kind: 'army', obj: A }; }
  for (const L of Render.labels) if (sx >= L.x && sx <= L.x + L.w && sy >= L.y && sy <= L.y + L.h) return { kind: 'town', obj: L.t };
  const c = Render.cam, z = c.z;
  if (z >= 0.9) {
    let best = null, bd = Math.max(10, z * 3);
    for (const p of W.people) {
      if (p.hidden) continue;
      personPos(p, _pos);
      const dx = (_pos.x - c.x) * z - sx, dy = (_pos.y - c.y) * z - sy, d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) return { kind: 'person', obj: best };
  }
  if (z >= 0.5) {
    let best = null, bd = Math.max(16, z * 9);
    for (const s of W.ships) {
      shipPos(s, _pos);
      const d = Math.hypot((_pos.x - c.x) * z - sx, (_pos.y - c.y) * z - sy + z * 3);
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
  if (own && Math.hypot(tx(i) - own.x, ty(i) - own.y) < 3) return { kind: 'town', obj: own };
  return { kind: 'tile', obj: i };
}
function initInput() {
  const cv = $('game');
  let drag = null;
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
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || !W) return;
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
  $('bFar').onclick = toggleFarBlds;
  $('bFar').classList.toggle('on', UI.farBlds);
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
  for (const id of ['techModal', 'statsModal', 'helpModal', 'econModal']) if (!$(id).hidden) { $(id).hidden = true; any = true; }
  return any;
}
function hoverTip(sx, sy) {
  const tip = $('tip');
  if (Render.cam.z < 0.4) { tip.hidden = true; return; }
  const i = screenToTile(sx, sy);
  if (i < 0) { tip.hidden = true; return; }
  const b = W.bAt.get(i);
  let text = '';
  if (b && !b.ruin) text = b.name || (b.type === 'house' ? HOUSES[b.tier].name : BLD[b.type].name);
  else if (b) text = 'Ruins';
  else if (W.occ[i] === 2) text = `Field: ${['fallow', 'just sown', 'growing', 'ripe'][W.stage[i]]}`;
  else if (W.plant[i]) text = `${PLANTS[W.plant[i]].name}: ${['just planted', 'growing', 'ready to pick'][W.plantS[i]]}`;
  else if (W.ore[i] > 0 && W.oreAmt[i] > 0) text = `${ORE_NAME[W.ore[i]]} deposit`;
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
  Game.power = p;
  document.querySelectorAll('#tools [data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  $('game').classList.toggle('aim', !!p);
  if (p) toast(isBrush(p) ? 'Drag on the map to paint. Esc cancels.' : 'Click the map to use it. Esc cancels.', 1800);
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
  const n = Game.n;
  let done = 0;
  for (let k = 0; k < n; k++) {
    const jitter = (p === 'tribe' || p === 'meteor' || p === 'herd') && k > 0;
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
      { const open = TECHS.filter(T => T.dom && eligible(t, T)).sort((a, b) => a.diff - b.diff);
        if (!open.length) { toast(`${t.name} has nothing it could work out next.`); return false; }
        discover(t, open[0]); if (Game.n === 1) toast(`Inspiration strikes in ${t.name}: ${open[0].name}.`); }
      break;
    case 'genius':
      if (!t || !tn(t)) { toast('No settlement close enough.'); return false; }
      { const c = t.members[rint(t.members.length)]; addTrait(c, 'genius'); plog(c, 'Something changed. The ideas started coming.'); if (Game.n === 1) toast(`${c.name} of ${t.name} is a genius now.`); }
      break;
    case 'bless':
      if (!t) { toast('No settlement close enough.'); return false; }
      for (let r = 0; r < R.N; r++) t.stock[r] += Math.max(t.stock[r] * 0.5, wantOf(t, r));
      t.unrest = 0; t.famine = 0; if (k === 0) toast(`${t.name} prospers.`);
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
      secede(t.polity, t, 14); updateTerritory(); break;
  }
  return true;
}
const ty2 = i => (i / W.w) | 0;
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
function toggleFarBlds() {
  UI.farBlds = !UI.farBlds; $('bFar').classList.toggle('on', UI.farBlds);
  try { localStorage.setItem('aod-farblds', UI.farBlds ? '1' : '0'); } catch (e) {}
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
    const d = await db();
    await new Promise((ok, no) => {
      const tx1 = d.transaction('saves', 'readwrite');
      tx1.objectStore('saves').put({ world: W, when: Date.now() }, 'slot1');
      tx1.oncomplete = ok; tx1.onerror = () => no(tx1.error); tx1.onabort = () => no(tx1.error);
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
    if (rec.world.ver !== SAVE_VER) { toast('That save is from an older version of the game and can’t be loaded here.', 6000); return; }
    W = rec.world; RS = W.rs;
    for (const t of W.towns) recomputeMods(t);  // inventions may do new things since this was saved
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
try { if (localStorage.getItem('aod-farblds') === '0') UI.farBlds = false; } catch (e) {}
initInput();
initStart();

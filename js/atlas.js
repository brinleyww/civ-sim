// The Atlas: every few years a coarse picture of who holds the land, kept in W.atlas, and a viewer that plays history back.
// W.atlas = { s: tiles per cell, gw, gh, st: years between frames, ly: last year recorded, sz: rough size, n: ['name|hue|light'], L: [land masks], f: [frames] }
// a frame = { y, p: world pop, l: land mask index, g: owners (run-length), r: [id, name ix, people, cells, label x, label y, ...], h: [year, headline, ...] }
const AT_ABC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_', AT_IX = {};
for (let k = 0; k < 64; k++) AT_IX[AT_ABC.charCodeAt(k)] = k;
const AT_HL = { collapse: 6, war: 5, gov: 4, found: 4, wonder: 4, revolution: 4, plague: 3, famine: 3, ruler: 2, tech: 2 };
const AT_MAXF = 320, AT_MAXSZ = 1.5e6;
// a number in base 32, low digits first; the top half of the alphabet means another digit follows
function atVar(out, n) { while (n >= 32) { out.push(AT_ABC[32 + (n & 31)]); n = Math.floor(n / 32); } out.push(AT_ABC[n]); }
function atRle(a) {
  const out = []; let v = a[0], c = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] === v) { c++; continue; } atVar(out, v); atVar(out, c); v = a[i]; c = 1; }
  atVar(out, v); atVar(out, c);
  return out.join('');
}
function atUnrle(s, n) {
  const a = new Uint16Array(n); let i = 0, q = 0;
  const rd = () => { let v = 0, m = 1; for (;;) { const c = AT_IX[s.charCodeAt(q++)]; if (c >= 32) { v += (c - 32) * m; m *= 32; } else return v + c * m; } };
  while (q < s.length && i < n) { const v = rd(), c = rd(); a.fill(v, i, Math.min(n, i + c)); i += c; }
  return a;
}
function atInit() {
  const s = Math.max(1, Math.ceil(W.w / 160));
  W.atlas = { s, gw: Math.ceil(W.w / s), gh: Math.ceil(W.h / s), st: 5, ly: -1e9, sz: 0, n: [], L: [], f: [] };
  return W.atlas;
}
let AT_NM = null, AT_NA = null;
function atName(A, pol) {
  if (AT_NA !== A) { AT_NA = A; AT_NM = new Map(A.n.map((s, k) => [s, k])); }
  const s = pol.name + '|' + Math.round(pol.hue) + '|' + Math.round(pol.light);
  let k = AT_NM.get(s);
  if (k === undefined) { k = A.n.length; A.n.push(s); AT_NM.set(s, k); }
  return k;
}
// One picture of the world as it is now (not stored).
function atSnap(A) {
  const s = A.s, gw = A.gw, gh = A.gh, w = W.w, h = W.h, own = W.owner, wat = W.water, wrap = !!W.wrap;
  const polOf = new Int32Array(W.nextTown + 1).fill(-1);
  for (const t of W.towns) { const P = t.occupier && t.occupier.alive ? t.occupier : t.polity; if (P && t.id < polOf.length) polOf[t.id] = P.id; }
  const NP = W.polities.length, cnt = new Int32Array(NP), cells = new Int32Array(NP), sx = new Float64Array(NP), sy = new Float64Array(NP), sc = new Float64Array(NP), ss = new Float64Array(NP), touch = [];
  const n = gw * gh, cellP = new Int32Array(n).fill(-1), land = new Uint16Array(n);
  for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
    const y0 = cy * s, x0 = cx * s, y1 = Math.min(h, y0 + s), x1 = Math.min(w, x0 + s);
    let tot = 0, ln = 0, owned = 0, best = -1, bc = 0;
    for (let y = y0; y < y1; y++) for (let i = y * w + x0, e = y * w + x1; i < e; i++) {
      tot++; if (wat[i]) continue; ln++;
      const o = own[i]; if (o < 0 || o >= polOf.length) continue;
      const p = polOf[o]; if (p < 0) continue;
      owned++; const c = ++cnt[p]; if (c === 1) touch.push(p); if (c > bc) { bc = c; best = p; }
    }
    for (let k = 0; k < touch.length; k++) cnt[touch[k]] = 0;
    touch.length = 0;
    const ci = cy * gw + cx;
    if (ln * 2 < tot) continue;
    land[ci] = 1;
    if (owned * 2 < ln || best < 0) continue;
    cellP[ci] = best; cells[best]++; sy[best] += cy;
    if (wrap) { const a = cx / gw * 6.2832; sc[best] += Math.cos(a); ss[best] += Math.sin(a); } else sx[best] += cx;
  }
  // the realms on the map, biggest first, so the commonest get the shortest codes
  const ids = [];
  for (let p = 0; p < NP; p++) if (cells[p]) ids.push(p);
  ids.sort((a, b) => (W.polities[b].pop || 0) - (W.polities[a].pop || 0) || cells[b] - cells[a]);
  const loc = new Int32Array(NP), mx = new Float64Array(NP), my = new Float64Array(NP), bd = new Float64Array(NP).fill(1e18), bx = new Int32Array(NP), by = new Int32Array(NP);
  ids.forEach((p, k) => {
    loc[p] = k + 1; my[p] = sy[p] / cells[p];
    mx[p] = wrap ? ((Math.atan2(ss[p], sc[p]) / 6.2832 * gw) % gw + gw) % gw : sx[p] / cells[p];
  });
  // the label sits on the realm's own cell nearest its middle, so a curved realm isn't named out at sea
  const g = new Uint16Array(n); let last = 0;
  for (let ci = 0; ci < n; ci++) {
    const p = cellP[ci];
    if (p < 0) { g[ci] = land[ci] ? 0 : last; if (land[ci]) last = 0; continue; }  // sea takes the value before it, so coasts don't break runs
    g[ci] = last = loc[p];
    const cx = ci % gw, cy = (ci - cx) / gw; let dx = Math.abs(cx - mx[p]); if (wrap && dx > gw / 2) dx = gw - dx;
    const d = dx * dx + (cy - my[p]) * (cy - my[p]);
    if (d < bd[p]) { bd[p] = d; bx[p] = cx; by[p] = cy; }
  }
  const r = [];
  for (const p of ids) { const P = W.polities[p]; r.push(p, atName(A, P), Math.round(P.pop || 0), cells[p], bx[p], by[p]); }
  return { y: Math.floor(year()), p: worldPop(), g: atRle(g), r, h: [], land: atRle(land) };
}
function atHeads(A, yr) {
  const L = W.log, c = [], from = Math.max(A.ly, yr - A.st * 2);
  for (let k = L.length - 1; k >= 0 && c.length < 600; k--) {
    const e = L[k]; if (e.yr <= from) break;
    const p = AT_HL[e.kind]; if (!p) continue;
    const t = W.townById[e.town];
    c.push([p * 1e7 + (t ? Math.min(9e6, tn(t)) : 0) - c.length * 1e-3, e]);
  }
  c.sort((a, b) => b[0] - a[0]);
  // the best of each kind first, so three sieges of one war don't crowd out a new kingdom
  const out = [], seen = new Set(), kinds = new Set();
  for (const [, e] of c) { if (out.length >= 3) break; if (!kinds.has(e.kind)) { kinds.add(e.kind); seen.add(e.text); out.push(e); } }
  for (const [, e] of c) { if (out.length >= 3) break; if (!seen.has(e.text)) { seen.add(e.text); out.push(e); } }
  out.sort((a, b) => a.yr - b.yr);
  const h = []; for (const e of out) h.push(e.yr, e.text.length > 180 ? e.text.slice(0, 177) + '…' : e.text);
  return h;
}
const atFsz = f => f.g.length + f.r.length * 4 + f.h.reduce((s, v) => s + (typeof v === 'string' ? v.length + 6 : 5), 0) + 30;
// Called once a year. Records a frame every A.st years; when the atlas grows too big, every other old frame goes and the gap doubles.
function atlasYear(force) {
  if (!W || !W.owner) return;
  let A = W.atlas;
  if (!A || !A.f || A.gw !== Math.ceil(W.w / A.s)) A = atInit();
  const yr = Math.floor(year());
  if (!force && yr < A.ly + A.st) return;
  const op = typeof document !== 'undefined' && AT.modal && !AT.modal.hidden, F0 = op ? atFrames() : null, end = op && AT.cur >= F0.length - 1, was = op ? F0[Math.min(AT.cur, F0.length - 1)] : null;
  const f = atSnap(A);
  f.h = atHeads(A, yr);
  const lm = f.land; delete f.land;
  if (!A.L.length || A.L[A.L.length - 1] !== lm) { A.L.push(lm); A.sz += lm.length; }
  f.l = A.L.length - 1;
  A.f.push(f); A.ly = yr; A.sz += atFsz(f);
  if (A.f.length > AT_MAXF || A.sz > AT_MAXSZ) atThin(A);
  if (op) atRefresh(end, was);
}
function atThin(A) {
  const F = A.f, out = [];
  for (let k = 0; k < F.length; k++) {
    const f = F[k];
    if (k % 2 === 1 && k < F.length - 1) {  // dropped: its news goes on to the frame that now covers its years
      const nx = F[k + 1], h = nx.h.slice();
      for (let q = f.h.length - 2; q >= 0 && h.length < 6; q -= 2) h.unshift(f.h[q], f.h[q + 1]);
      nx.h = h; continue;
    }
    out.push(f);
  }
  // land masks nobody points at any more go too
  const used = [...new Set(out.map(f => f.l))].sort((a, b) => a - b), re = new Map(used.map((l, k) => [l, k]));
  A.L = used.map(l => A.L[l]); for (const f of out) f.l = re.get(f.l);
  A.f = out; A.st = Math.min(80, A.st * 2);
  A.sz = A.L.reduce((s, l) => s + l.length, 0) + out.reduce((s, f) => s + atFsz(f), 0);
}

// ---- the viewer ----
const AT = { modal: null, cur: 0, t: 0, play: false, sp: 1, sel: -1, live: null, raf: 0, last: 0, img: new Map(), grid: new Map(), land: new Map(), A: null, shown: -1, hov: -1 };
const AT_CSS = `
#atlasModal .card { max-width: 1320px; }
.atlasBody { display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; }
.atMapW { position: relative; flex: 1 1 0; min-height: 160px; }
.atMapW canvas { position: absolute; display: block; border: 1px solid var(--axis, var(--line)); border-radius: 4px; cursor: pointer; }
.atCtl { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; color: var(--chart-ink2, var(--ink2)); font-size: 13px; }
.atCtl input[type=range] { flex: 1; min-width: 140px; accent-color: var(--gold); }
.atCtl .on { background: var(--gold); color: var(--panel2); border-color: var(--gold); }
.atCtl b { color: var(--chart-ink, var(--ink)); font: 600 15px var(--serif); min-width: 86px; display: inline-block; }
.atInfo { flex: none; max-height: 34vh; overflow: auto; display: grid; grid-template-columns: minmax(150px, 0.8fr) minmax(200px, 1.1fr) minmax(220px, 1.6fr); gap: 14px; font-size: 12.5px; color: var(--chart-ink2, var(--ink2)); }
.atInfo h4 { font: 600 12px var(--sans); color: var(--muted, var(--ink3)); text-transform: uppercase; letter-spacing: .06em; margin: 0 0 4px; }
.atInfo .big { font: 600 22px var(--serif); color: var(--chart-ink, var(--ink)); }
.atRl { display: flex; gap: 6px; align-items: center; padding: 1px 3px; border-radius: 3px; cursor: pointer; font-variant-numeric: tabular-nums; }
.atRl:hover, .atRl.sel { background: var(--grid, var(--line)); color: var(--chart-ink, var(--ink)); }
.atRl i { width: 10px; height: 10px; border-radius: 2px; flex: none; }
.atRl span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.atNews div { margin-bottom: 4px; line-height: 1.35; } .atNews em { color: var(--gold); font-style: normal; margin-right: 5px; }
.atSel { margin-top: 6px; padding: 5px 8px; border-left: 3px solid var(--gold); background: var(--grid, var(--line)); border-radius: 0 3px 3px 0; }
.atSel b { color: var(--chart-ink, var(--ink)); }
.atStream { flex: none; margin-bottom: 0; }
.atStream canvas { height: 120px; cursor: pointer; }
#atlasModal { --atlas-sea: #1a2b38; --atlas-land: #4e4a3a; --atlas-ink: #f4ead2; --atlas-halo: rgba(15,20,28,.7); }
:root[data-theme="light"] #atlasModal { --atlas-sea: #b9d3e2; --atlas-land: #d9ceb0; --atlas-ink: #1f1a10; --atlas-halo: rgba(255,250,240,.8); }
@media (max-width: 900px) { .atInfo { grid-template-columns: 1fr 1fr; } }
`;
function atEl() {
  if (AT.modal) return AT.modal;
  const st = document.createElement('style'); st.textContent = AT_CSS; document.head.appendChild(st);
  const m = document.createElement('div'); m.id = 'atlasModal'; m.className = 'modal'; m.hidden = true;
  m.innerHTML = `<div class="card wide viz"><button class="close" data-close title="Close (Esc)">×</button><h2>Atlas</h2>
  <div class="atlasBody">
    <div class="atMapW"><canvas id="atMap"></canvas><div class="ctip" id="atTip" hidden></div></div>
    <div class="atCtl"><button id="atPrev" title="Back one frame (←)">◀</button><button id="atPlay" title="Play or pause (Space)">▶ Play</button><button id="atNext" title="On one frame (→)">▶</button>
      <b id="atYear"></b><input id="atSlider" type="range" min="0" max="0" step="1" aria-label="Year">
      <span id="atSpeed"><button data-asp="1">1×</button><button data-asp="2">2×</button><button data-asp="4">4×</button></span>
      <button id="atNow" title="The world as it is right now">Now</button></div>
    <div class="atInfo"><div id="atStat"></div><div id="atRealms"></div><div><div id="atNews" class="atNews"></div><div id="atSelBox"></div></div></div>
    <div class="chartWrap atStream" id="atStreamW"><h3>Share of the world’s people</h3><canvas id="atStream"></canvas></div>
  </div></div>`;
  document.body.appendChild(m);
  AT.modal = m; AT.card = m.firstChild; AT.cv = $('atMap'); AT.mw = AT.cv.parentNode; AT.tip = $('atTip'); AT.sl = $('atSlider'); AT.scv = $('atStream'); AT.sw = $('atStreamW');
  $('atPrev').onclick = () => atGo(AT.cur - 1);
  $('atNext').onclick = () => atGo(AT.cur + 1);
  $('atPlay').onclick = () => atPlay(!AT.play);
  $('atNow').onclick = () => { if (!W) return; if (!W.atlas) atlasYear(true); const A = W.atlas, f = atSnap(A); f.h = atHeads(A, f.y); f.lm = f.land; delete f.land; AT.live = f; atPlay(false); atGo(atFrames().length - 1); };
  $('atSpeed').onclick = e => { const s = +e.target.dataset.asp; if (s) { AT.sp = s; atCtl(); } };
  AT.sl.oninput = () => { atPlay(false); atGo(+AT.sl.value); };
  const cell = e => { const r = AT.cv.getBoundingClientRect(), A = W.atlas, k = (AT.cv.clientWidth || 1) / (r.width || 1); return [Math.floor((e.clientX - r.left) * k / AT.sc), Math.floor((e.clientY - r.top) * k / AT.sc), (e.clientX - r.left) * k, (e.clientY - r.top) * k, A]; };
  const realmAt = e => {
    const [cx, cy, mx, my, A] = cell(e), f = atFrames()[atShownIx()];
    if (!f || cx < 0 || cy < 0 || cx >= A.gw || cy >= A.gh) return null;
    const ci = cy * A.gw + cx;
    if (!atLand(f)[ci]) return { mx, my, sea: 1 };
    const v = atGrid(f)[ci];
    return { mx, my, f, k: v - 1 };
  };
  AT.cv.onmousemove = e => {
    const h = realmAt(e), tip = AT.tip;
    if (!h || h.sea) { tip.hidden = true; return; }
    const f = h.f, r = f.r, tot = atLandCells(f);
    if (h.k < 0) tip.innerHTML = '<b>Unclaimed land</b>';
    else { const q = h.k * 6, [nm] = atNm(r[q + 1]); tip.innerHTML = `<b>${esc(nm)}</b><div>${fmt(r[q + 2])} people, ${atPct(r[q + 2] / Math.max(1, f.p))} of the world</div><div>${atPct(r[q + 3] / tot)} of the land</div>`; }
    tip.hidden = false;
    const tw = tip.offsetWidth, W0 = AT.mw.clientWidth, ox = AT.cv.offsetLeft, oy = AT.cv.offsetTop;
    tip.style.left = (ox + h.mx + 14 + tw > W0 ? ox + h.mx - tw - 14 : ox + h.mx + 14) + 'px'; tip.style.top = (oy + h.my + 12) + 'px';
  };
  AT.cv.onmouseleave = () => { AT.tip.hidden = true; };
  AT.cv.onclick = e => { const h = realmAt(e); if (!h || h.sea || h.k < 0) atSelect(-1); else { const id = h.f.r[h.k * 6]; atSelect(AT.sel === id ? -1 : id); } };
  $('atRealms').onclick = e => { const el = e.target.closest('[data-aid]'); if (el) { const id = +el.dataset.aid; atSelect(AT.sel === id ? -1 : id); } };
  // the stream chart: hover for the shares, click to go there
  const sk = e => { const r = AT.scv.getBoundingClientRect(), k = (AT.scv.clientWidth || 1) / (r.width || 1), mx = (e.clientX - r.left) * k, S = AT.str; if (!S) return null; return { mx, ix: S.ix(mx) }; };
  AT.scv.onclick = e => { const h = sk(e); if (h) { atPlay(false); atGo(h.ix); } };
  AT.scv.onmousemove = e => {
    const h = sk(e); if (!h) return;
    const S = AT.str, f = atFrames()[h.ix], tip = AT.sw.querySelector('.ctip') || AT.sw.appendChild(Object.assign(document.createElement('div'), { className: 'ctip' }));
    const rows = S.ser.map(s => [s, s.v[h.ix]]).filter(x => x[1] > 0.001).sort((a, b) => b[1] - a[1]).slice(0, 8);
    tip.innerHTML = `<b>Year ${fmt(f.y)}</b>` + rows.map(([s, v]) => `<div><i style="background:${s.col}"></i>${esc(s.name)}: ${atPct(v)}</div>`).join('');
    tip.hidden = false; const tw = tip.offsetWidth, W0 = AT.scv.clientWidth;
    tip.style.left = (h.mx + 14 + tw > W0 ? h.mx - tw - 14 : h.mx + 14) + 'px'; tip.style.top = (AT.scv.offsetTop + 6) + 'px';
  };
  AT.scv.onmouseleave = () => { const t = AT.sw.querySelector('.ctip'); if (t) t.hidden = true; };
  window.addEventListener('keydown', e => {
    if (m.hidden) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight') { atPlay(false); atGo(AT.cur + (k === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 10 : 1)); }
    else if (k === 'Home' || k === 'End') { atPlay(false); atGo(k === 'Home' ? 0 : atFrames().length - 1); }
    else if (k === ' ') atPlay(!AT.play);
    else if (k === 'Escape') { m.hidden = true; atPlay(false); }
    else return;
    e.preventDefault(); e.stopPropagation();
  }, true);
  window.addEventListener('resize', () => { if (!m.hidden) { AT.shown = -1; atShow(true); } });
  return m;
}
const atPct = v => (v >= 0.1 ? Math.round(v * 100) : v >= 0.01 ? (v * 100).toFixed(1) : (v * 100).toFixed(2)) + '%';
function atNm(k) { const s = (W.atlas.n[k] || '?|0|50').split('|'); return [s[0], +s[1], +s[2]]; }
function atCol(k, a) { const [, h, l] = atNm(k); return a === undefined ? `hsl(${h},72%,${l}%)` : `hsla(${h},72%,${l}%,${a})`; }
const atFrames = () => { const F = W && W.atlas ? W.atlas.f : []; return AT.live ? F.concat([AT.live]) : F; };
const atShownIx = () => AT.t > 0.5 && AT.cur < atFrames().length - 1 ? AT.cur + 1 : AT.cur;
// small caches, so a long atlas doesn't hold hundreds of pictures
function atCache(M, key, max, make) { let v = M.get(key); if (v !== undefined) { M.delete(key); M.set(key, v); return v; } v = make(); M.set(key, v); if (M.size > max) M.delete(M.keys().next().value); return v; }
function atReset() { if (AT.A !== W.atlas) { AT.A = W.atlas; AT.img.clear(); AT.grid.clear(); AT.land.clear(); AT.live = null; AT.sel = -1; AT.cur = 1e9; } }
const atGrid = f => atCache(AT.grid, f, 80, () => atUnrle(f.g, W.atlas.gw * W.atlas.gh));
const atLand = f => { const s = f.lm || W.atlas.L[f.l] || ''; return atCache(AT.land, s, 16, () => atUnrle(s, W.atlas.gw * W.atlas.gh)); };
const AT_ID = new WeakMap(); let AT_IDN = 0;
const atId = f => { let k = AT_ID.get(f); if (!k) AT_ID.set(f, k = ++AT_IDN); return k; };
function atLandCells(f) { if (f.lc) return f.lc; const L = atLand(f); let c = 0; for (let i = 0; i < L.length; i++) c += L[i]; Object.defineProperty(f, 'lc', { value: Math.max(1, c), enumerable: false, writable: true }); return f.lc; }
function atRGB(s) {
  s = (s || '').trim(); let m;
  if (s[0] === '#') { if (s.length === 4) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]; const v = parseInt(s.slice(1, 7), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
  if ((m = s.match(/[\d.]+/g)) && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [80, 80, 70];
}
// A frame painted three pixels a cell, borders on the outer pixels, so the lines stay thin however the map is scaled.
function atImg(f) {
  return atCache(AT.img, atId(f) + ':' + AT.sel, 30, () => {
    const A = W.atlas, gw = A.gw, gh = A.gh, K = 3, cs = getComputedStyle(AT.modal);
    const sea = atRGB(cs.getPropertyValue('--atlas-sea')), ld = atRGB(cs.getPropertyValue('--atlas-land'));
    const G = atGrid(f), L = atLand(f), r = f.r, nr = r.length / 6, wrap = !!W.wrap, sel = AT.sel;
    const cols = [null], selV = new Int32Array(1);
    selV[0] = -1;
    for (let k = 0; k < nr; k++) { const [, h, l] = atNm(r[k * 6 + 1]); cols.push(hslRgb(h / 360, 0.8, l / 100)); if (r[k * 6] === sel) selV[0] = k + 1; }
    const cv = document.createElement('canvas'); cv.width = gw * K; cv.height = gh * K;
    const g = cv.getContext('2d'), im = g.createImageData(gw * K, gh * K), d = im.data, IW = gw * K;
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const coast = mix(ld, [0, 0, 0], 0.28), dimSel = sel >= 0;
    const at = (cx, cy) => { if (wrap) cx = (cx + gw) % gw; if (cx < 0 || cy < 0 || cx >= gw || cy >= gh) return -1; const i = cy * gw + cx; return L[i] ? G[i] : -1; };
    for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
      const i = cy * gw + cx;
      let fill, edge;
      if (!L[i]) { fill = edge = sea; }
      else {
        const v = G[i], nb = [at(cx - 1, cy), at(cx + 1, cy), at(cx, cy - 1), at(cx, cy + 1)];
        let shore = coast;
        if (!v) { fill = edge = ld; }
        else {
          const c = cols[v], on = !dimSel || v === selV[0];
          fill = mix(ld, c, on ? (dimSel ? 0.85 : 0.62) : 0.16); edge = on ? mix(c, [255, 255, 255], dimSel ? 0.35 : 0.12) : mix(ld, c, 0.3);
          shore = mix(fill, [0, 0, 0], 0.3);
        }
        // the sea isn't a frontier: coasts get a dark line, only land against other land gets the bright border
        for (let sy = 0; sy < K; sy++) for (let sx = 0; sx < K; sx++) {
          let s0 = false, b0 = false;
          const chk = n => { if (n < 0) s0 = true; else if (n !== v) b0 = true; };
          if (sx === 0) chk(nb[0]); if (sx === K - 1) chk(nb[1]); if (sy === 0) chk(nb[2]); if (sy === K - 1) chk(nb[3]);
          const c = s0 ? shore : b0 ? edge : fill;
          const q = ((cy * K + sy) * IW + cx * K + sx) * 4; d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; d[q + 3] = 255;
        }
        continue;
      }
      for (let sy = 0; sy < K; sy++) for (let sx = 0; sx < K; sx++) { const q = ((cy * K + sy) * IW + cx * K + sx) * 4; d[q] = fill[0]; d[q + 1] = fill[1]; d[q + 2] = fill[2]; d[q + 3] = 255; }
    }
    g.putImageData(im, 0, 0);
    return cv;
  });
}
function atDrawMap() {
  const F = atFrames(), A = W.atlas; if (!F.length) return;
  const dpr = window.devicePixelRatio || 1, cw = Math.max(50, AT.mw.clientWidth - 2), ch = Math.max(50, AT.mw.clientHeight - 2);
  const sc = Math.min(cw / A.gw, ch / A.gh), dw = Math.floor(A.gw * sc), dh = Math.floor(A.gh * sc), cv = AT.cv;
  AT.sc = sc;
  if (cv.width !== Math.round(dw * dpr) || cv.height !== Math.round(dh * dpr)) { cv.width = Math.round(dw * dpr); cv.height = Math.round(dh * dpr); cv.style.width = dw + 'px'; cv.style.height = dh + 'px'; }
  cv.style.left = Math.floor((cw - dw) / 2) + 'px'; cv.style.top = Math.floor((ch - dh) / 2) + 'px';
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingEnabled = true; g.globalAlpha = 1;
  g.drawImage(atImg(F[AT.cur]), 0, 0, dw, dh);
  const nx = F[AT.cur + 1];
  if (AT.t > 0 && nx) { const t = AT.t; g.globalAlpha = t * t * (3 - 2 * t); g.drawImage(atImg(nx), 0, 0, dw, dh); g.globalAlpha = 1; }
  // names, biggest realms first; one that would overlap a name already written is left out
  const f = F[atShownIx()], r = f.r, cs = getComputedStyle(AT.modal), ink = cs.getPropertyValue('--atlas-ink').trim() || '#f4ead2', halo = cs.getPropertyValue('--atlas-halo').trim() || 'rgba(15,20,28,.7)';
  const ord = []; for (let k = 0; k < r.length; k += 6) ord.push(k);
  ord.sort((a, b) => (r[b] === AT.sel) - (r[a] === AT.sel) || r[b + 3] - r[a + 3]);
  const taken = [];
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  for (const q of ord) {
    const cells = r[q + 3], [nm] = atNm(r[q + 1]), isS = r[q] === AT.sel;
    const span = 1.7 * Math.sqrt(cells) * sc + 24;
    let size = Math.round(Math.min(clamp(7 + Math.sqrt(cells) * sc * 0.11, 10, 30), span / (nm.length * (cells > 60 ? 1.15 : 0.62))));
    if (isS) size = Math.max(size, 12);
    if (size < 9) continue;
    const spaced = size >= 13, txt = spaced ? nm.toUpperCase().split('').join(' ') : nm;
    g.font = `italic 600 ${size}px Georgia, serif`;
    const w = g.measureText(txt).width, sx = (r[q + 4] + 0.5) * sc, sy = (r[q + 5] + 0.5) * sc;
    const xs = [sx]; if (W.wrap) { if (sx - w / 2 < 0) xs.push(sx + dw); if (sx + w / 2 > dw) xs.push(sx - dw); }
    const boxes = xs.map(x => [x - w / 2 - 3, sy - size * 0.6, x + w / 2 + 3, sy + size * 0.6]);
    if (!isS && boxes.some(b => taken.some(t => b[0] < t[2] && b[2] > t[0] && b[1] < t[3] && b[3] > t[1]))) continue;
    taken.push(...boxes);
    g.globalAlpha = AT.sel >= 0 && !isS ? 0.45 : 0.92;
    for (const x of xs) { g.lineWidth = size >= 14 ? 3.5 : 2.5; g.strokeStyle = halo; g.strokeText(txt, x, sy); g.fillStyle = ink; g.fillText(txt, x, sy); }
  }
  g.globalAlpha = 1;
}
function atStreamData() {
  const F = atFrames(), key = F.length + ':' + (F.length ? F[F.length - 1].y : 0) + ':' + AT.sel + ':' + (AT.live ? 1 : 0);
  if (AT.strK === key && AT.str) return AT.str;
  // the eight realms that ever held most of the world, plus whichever is picked
  const peak = new Map();
  for (const f of F) { const r = f.r, p = Math.max(1, f.p); for (let k = 0; k < r.length; k += 6) { const v = r[k + 2] / p; if (v > (peak.get(r[k]) || 0)) peak.set(r[k], v); } }
  const ids = [...peak.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0]);
  if (AT.sel >= 0 && !ids.includes(AT.sel) && peak.has(AT.sel)) ids.push(AT.sel);
  const ser = ids.map(id => ({ id, v: new Float32Array(F.length), name: '', nk: 0 }));
  const ix = new Map(ids.map((id, k) => [id, k]));
  F.forEach((f, j) => { const r = f.r, p = Math.max(1, f.p); for (let k = 0; k < r.length; k += 6) { const s = ix.get(r[k]); if (s !== undefined) { ser[s].v[j] = Math.min(1, r[k + 2] / p); ser[s].nk = r[k + 1]; } } });
  for (const s of ser) { s.name = atNm(s.nk)[0]; s.col = atCol(s.nk); }
  // bottom of the stack: the realm that peaked earliest, so the story reads left to right
  const first = s => { for (let j = 0; j < s.v.length; j++) if (s.v[j] > 0) return j; return 1e9; };
  ser.sort((a, b) => first(a) - first(b));
  AT.strK = key; AT.str = { ser, ix: null };
  return AT.str;
}
function atDrawStream() {
  const F = atFrames(), cv = AT.scv; if (F.length < 1) return;
  const S = atStreamData(), dpr = window.devicePixelRatio || 1, W0 = cv.clientWidth || 600, H0 = cv.clientHeight || 120;
  if (cv.width !== Math.round(W0 * dpr) || cv.height !== Math.round(H0 * dpr)) { cv.width = Math.round(W0 * dpr); cv.height = Math.round(H0 * dpr); }
  const g = cv.getContext('2d'), cs = getComputedStyle(AT.card), C = n => cs.getPropertyValue(n).trim();
  const grid = C('--grid') || '#2c2c2a', axis = C('--axis') || '#383835', muted = C('--muted') || '#898781', ink = C('--chart-ink') || '#f0efec';
  const pad = { l: 46, r: 12, t: 6, b: 18 }, n = F.length, y0 = F[0].y, y1 = Math.max(y0 + 1, F[n - 1].y);
  const px = y => pad.l + (y - y0) / (y1 - y0) * (W0 - pad.l - pad.r), py = v => H0 - pad.b - v * (H0 - pad.t - pad.b);
  S.ix = mx => { const y = y0 + (mx - pad.l) / (W0 - pad.l - pad.r) * (y1 - y0); let b = 0; for (let j = 0; j < n; j++) if (Math.abs(F[j].y - y) < Math.abs(F[b].y - y)) b = j; return b; };
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W0, H0);
  g.font = '11px "Segoe UI", system-ui, sans-serif'; g.textBaseline = 'middle';
  for (let k = 0; k <= 4; k++) { const y = Math.round(py(k / 4)) + 0.5; g.strokeStyle = k ? grid : axis; g.lineWidth = 1; g.beginPath(); g.moveTo(pad.l, y); g.lineTo(W0 - pad.r, y); g.stroke(); g.fillStyle = muted; g.textAlign = 'right'; g.fillText(k * 25 + '%', pad.l - 6, y); }
  g.textAlign = 'center';
  const step = niceMax((y1 - y0) / 6) || 1;
  for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) { g.fillStyle = muted; g.fillText('Year ' + fmt(v), clamp(px(v), pad.l + 16, W0 - 28), H0 - 7); }
  const base = new Float32Array(n), xs = F.map(f => px(f.y));
  for (const s of S.ser) {
    const top = new Float32Array(n); for (let j = 0; j < n; j++) top[j] = Math.min(1, base[j] + s.v[j]);
    g.fillStyle = AT.sel >= 0 && s.id !== AT.sel ? atCol(s.nk, 0.25) : atCol(s.nk, 0.85);
    g.beginPath();
    if (n === 1) { g.rect(xs[0] - 2, py(top[0]), 4, py(base[0]) - py(top[0])); }
    else { for (let j = 0; j < n; j++) g.lineTo(xs[j], py(top[j])); for (let j = n - 1; j >= 0; j--) g.lineTo(xs[j], py(base[j])); }
    g.closePath(); g.fill();
    base.set(top);
  }
  const x = Math.round(xs[Math.min(n - 1, AT.cur)] + (AT.t && AT.cur < n - 1 ? (xs[AT.cur + 1] - xs[AT.cur]) * AT.t : 0)) + 0.5;
  g.strokeStyle = ink; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, pad.t); g.lineTo(x, H0 - pad.b); g.stroke();
}
// first and last year a realm is seen, and its height
function atLife(id) {
  let a = -1, b = -1, pk = 0, py = 0, pc = 0, nk = 0;
  for (const f of atFrames()) { const r = f.r; for (let k = 0; k < r.length; k += 6) if (r[k] === id) { if (a < 0) a = f.y; b = f.y; nk = r[k + 1]; if (r[k + 2] > pk) { pk = r[k + 2]; py = f.y; } pc = Math.max(pc, r[k + 3]); break; } }
  return { a, b, pk, py, pc, nk };
}
function atInfo() {
  const F = atFrames(), f = F[atShownIx()]; if (!f) return;
  const r = f.r, tot = atLandCells(f);
  let held = 0; for (let k = 0; k < r.length; k += 6) held += r[k + 3];
  $('atYear').textContent = (f === AT.live ? 'Now, ' : 'Year ') + fmt(f.y);
  $('atStat').innerHTML = `<h4>${f === AT.live ? 'The world now' : 'The world in ' + fmt(f.y)}</h4><div class="big">${fmt(f.p)}</div><div>people alive</div><div style="margin-top:6px">${r.length / 6} realm${r.length === 6 ? '' : 's'} on the map</div><div>${atPct(held / tot)} of the land held</div>`;
  const rows = [];
  for (let k = 0; k < Math.min(r.length, 42); k += 6) rows.push(`<div class="atRl${r[k] === AT.sel ? ' sel' : ''}" data-aid="${r[k]}"><i style="background:${atCol(r[k + 1])}"></i><span>${esc(atNm(r[k + 1])[0])}</span><b>${fmt(r[k + 2])}</b><small>${atPct(r[k + 2] / Math.max(1, f.p))}</small></div>`);
  $('atRealms').innerHTML = `<h4>Largest realms</h4>${rows.join('') || '<div>Nobody holds any land yet.</div>'}`;
  const h = f.h || [], hs = [];
  for (let k = 0; k < h.length; k += 2) hs.push(`<div><em>${h[k]}</em>${esc(h[k + 1])}</div>`);
  $('atNews').innerHTML = `<h4>What happened</h4>${hs.join('') || '<div>Quiet years.</div>'}`;
  let sb = '';
  if (AT.sel >= 0) {
    const L = atLife(AT.sel), P = W.polities[AT.sel], here = r.some((v, k) => k % 6 === 0 && v === AT.sel);
    if (L.a >= 0) sb = `<div class="atSel"><b>${esc(atNm(L.nk)[0])}</b>: on the map ${L.a === L.b ? 'in ' + L.a : 'from ' + fmt(L.a) + ' to ' + (P && P.alive && L.b === F[F.length - 1].y ? 'now' : fmt(L.b))}. At its height, ${fmt(L.pk)} people in ${fmt(L.py)}.${here ? '' : ' <i>Not on the map this year.</i>'} <a href="#" id="atUnsel">Show all</a></div>`;
  }
  $('atSelBox').innerHTML = sb;
  const u = $('atUnsel'); if (u) u.onclick = e => { e.preventDefault(); atSelect(-1); };
}
function atCtl() {
  const F = atFrames();
  AT.sl.max = Math.max(0, F.length - 1); AT.sl.value = AT.cur;
  $('atPlay').textContent = AT.play ? '❚❚ Pause' : '▶ Play';
  $('atPlay').classList.toggle('on', AT.play);
  for (const b of $('atSpeed').children) b.classList.toggle('on', +b.dataset.asp === AT.sp);
  $('atNow').classList.toggle('on', !!AT.live && AT.cur === F.length - 1);
}
function atShow(full) {
  if (!W || !W.atlas) return;
  const ix = atShownIx();
  atDrawMap(); atDrawStream();
  if (full || ix !== AT.shown) { AT.shown = ix; atInfo(); atCtl(); }
}
function atGo(k) { const n = atFrames().length; AT.cur = clamp(k | 0, 0, Math.max(0, n - 1)); AT.t = 0; AT.shown = -1; atShow(true); }
function atSelect(id) { AT.sel = id; AT.shown = -1; atShow(true); }
function atPlay(on) {
  if (on && AT.cur >= atFrames().length - 1) AT.cur = 0;  // playing from the end starts again from the beginning
  AT.play = !!on; AT.t = 0; atCtl();
  if (AT.play && !AT.raf) { AT.last = performance.now(); AT.raf = requestAnimationFrame(atTick); }
  if (!AT.play) atShow();
}
function atTick(now) {
  AT.raf = 0;
  if (!AT.play || AT.modal.hidden) { AT.play = false; return; }
  const dt = Math.min(0.1, (now - AT.last) / 1000), n = atFrames().length; AT.last = now;
  AT.t += dt * 2.5 * AT.sp;
  while (AT.t >= 1) { AT.t -= 1; AT.cur++; }
  if (AT.cur >= n - 1) { AT.cur = n - 1; AT.t = 0; AT.play = false; atShow(true); return; }
  atShow();
  AT.raf = requestAnimationFrame(atTick);
}
// new frames came in while the atlas is open: follow them if we were at the end
function atRefresh(atEnd, y) {
  AT.live = null;
  const F = atFrames();
  if (atEnd && !AT.play) AT.cur = F.length - 1;
  else if (y) { let b = 0; for (let j = 0; j < F.length; j++) if (Math.abs(F[j].y - y.y) < Math.abs(F[b].y - y.y)) b = j; AT.cur = b; }
  AT.cur = clamp(AT.cur, 0, Math.max(0, F.length - 1)); AT.shown = -1;
  if (!AT.play) atShow(true); else atCtl();
}
function openAtlas() {
  if (!W) return;
  if (!W.atlas || !W.atlas.f.length) atlasYear(true);
  const m = atEl(); atReset();
  m.hidden = false;
  AT.live = null; AT.cur = atFrames().length - 1; AT.t = 0; AT.shown = -1;
  requestAnimationFrame(() => atShow(true));
}
if (typeof document !== 'undefined') { const b = document.getElementById('bAtlas'); if (b) b.onclick = openAtlas; }

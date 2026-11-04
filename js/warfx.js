'use strict';
// Everything you can see of a fight that isn't a soldier: slashes, blood, bodies, smoke, flying things, banners and battle plates.
// None of it is part of the world or its saves. The simulation calls these hooks only when there's a screen to draw on.

const FX = { parts: [], decals: [], bodies: [], words: [], smoke: [], planes: [], said: {} };
const fxSeen = (x, y) => { const c = Render.cam, z = c.z, sx = (x * TS - c.x) * z, sy = (y * TS - c.y) * z; return z >= 0.35 && sx > -40 && sy > -40 && sx < Render.vw + 40 && sy < Render.vh + 40; };
function fxPart(x, y, vx, vy, life, col, size, grav) {
  const P = FX.parts;
  if (P.length > 700) P.shift();
  P.push({ x, y, vx, vy, t: Render.time, life, col, size, grav });
}
function fxDecal(x, y, r, kind) {
  const D = FX.decals;
  if (D.length > 260) D.shift();
  D.push({ x, y, r, kind, t: W.tick, a: hash2(x * 7 | 0, y * 11 | 0, 3) * 6.283 });
}
const puff = (x, y, n, col, spread, size, life) => { for (let k = 0; k < n; k++) fxPart(x, y, (rnd2() - 0.5) * spread, (rnd2() - 0.5) * spread - 0.3, life * (0.6 + rnd2() * 0.8), col, size, 0); };
// Effects use their own dice, so watching a battle doesn't change how it comes out.
let fxSeed = 12345;
const rnd2 = () => { fxSeed = (fxSeed * 1664525 + 1013904223) | 0; return (fxSeed >>> 0) / 4294967296; };
function setupFX() {
  FX.parts.length = 0; FX.decals.length = 0; FX.bodies.length = 0; FX.words.length = 0; FX.smoke.length = 0; FX.planes.length = 0; FX.said = {};
  FXH = {
    hit(att, def, w, pain, crit) {
      const x = def.ti % W.w + 0.5, y = ((def.ti / W.w) | 0) + 0.5;
      if (!fxSeen(x, y)) return;
      const n = Math.min(7, 1 + Math.round(pain / 12));
      const dirx = x - (att.ti % W.w + 0.5), diry = y - (((att.ti / W.w) | 0) + 0.5), dl = Math.max(0.3, Math.hypot(dirx, diry));
      for (let k = 0; k < n; k++) fxPart(x, y - 0.3, dirx / dl * (1 + rnd2() * 2) + (rnd2() - 0.5) * 1.5, diry / dl * (1 + rnd2()) - rnd2() * 2, 0.35 + rnd2() * 0.25, def.mount === 2 ? '#ffd34d' : rnd2() < 0.3 ? '#e04a3a' : '#a81f1f', 1.1 + rnd2(), 7);
      if (rnd2() < 0.18 && def.mount !== 2) fxDecal(x + (rnd2() - 0.5) * 0.6, y + 0.2 + (rnd2() - 0.5) * 0.4, 0.05 + rnd2() * 0.05, 0);
      if (Render.cam.z >= 2.6 && (crit || pain > 18)) fxWord(x, y - 1.2, `-${Math.round(pain)}`, crit ? '#ffd34d' : '#ff8f7a', 0.7, 11);
    },
    clash(att, def) {
      const x = (att.ti % W.w + def.ti % W.w) / 2 + 0.5, y = (((att.ti / W.w) | 0) + ((def.ti / W.w) | 0)) / 2 + 0.2;
      if (fxSeen(x, y)) for (let k = 0; k < 2; k++) fxPart(x, y, (rnd2() - 0.5) * 3, -rnd2() * 2, 0.18, '#ffe9a8', 1, 5);
    },
    spark(x, y) { if (fxSeen(x, y)) for (let k = 0; k < 3; k++) fxPart(x + 0.5, y, (rnd2() - 0.5) * 3, -rnd2() * 2.4, 0.22, '#ffe9a8', 1, 6); },
    blood(x, y, n) {
      if (!fxSeen(x, y)) return;
      for (let k = 0; k < n; k++) fxPart(x + 0.2, y, (rnd2() - 0.5) * 3, -rnd2() * 2, 0.4, '#a81f1f', 1.2, 7);
      fxDecal(x, y + 0.2, 0.06 + rnd2() * 0.06, 0);
    },
    fall(p, dead) {
      const x = p.ti % W.w, y = (p.ti / W.w) | 0;
      if (!fxSeen(x, y)) return;
      personPos(p, _pos);
      fxDecal(_pos.x / TS, _pos.y / TS + 0.1, 0.1 + rnd2() * 0.08, 0);
      if (dead) {
        if (p.mount === 2) this.boom(x, y, 2);
        const col = toHexRgb(p.town.polity.color);
        const sp = personSprite(p.culture.skin, p.id % HAIRS.length, p.sex, J.SOLDIER, 0, p.town.polity.era || 0, false, p.wep || 0, p.arm || 0, col, p.mount || 0, false, -1);
        const B = FX.bodies;
        if (B.length > 320) B.shift();
        B.push({ x: _pos.x, y: _pos.y, sp, left: p.face < 0, t: W.tick, burnt: p.mount === 2 });
        fxWord(_pos.x / TS, _pos.y / TS - 1.1, '✝', '#f5f0e0', 0.9, 12);
      }
    },
    muzzle(x, y, fx, fy, big) {
      if (!fxSeen(x, y)) return;
      const dx = fx - x, dy = fy - y, d = Math.max(0.5, Math.hypot(dx, dy));
      fxPart(x + 0.5 + dx / d * 0.7, y + 0.2 + dy / d * 0.7, 0, 0, 0.09, '#ffe27a', big ? 5 : 2.4, 0);
      puff(x + 0.5 + dx / d * 0.8, y + dy / d * 0.5, big ? 5 : 1, 'rgba(225,222,215,.55)', 0.7, big ? 3.4 : 1.8, big ? 1.4 : 0.8);
    },
    boom(x, y, r) {
      if (!fxSeen(x, y)) return;
      if (!W.water[Math.round(y) * W.w + Math.round(x)]) fxDecal(x + 0.5, y + 0.5, 0.12 * r, 1);
      fxPart(x + 0.5, y + 0.3, 0, 0, 0.14, '#fff2c0', 6 * r, 0);
      for (let k = 0; k < 8 * r; k++) fxPart(x + 0.5, y + 0.3, (rnd2() - 0.5) * 7, -rnd2() * 6, 0.4 + rnd2() * 0.3, rnd2() < 0.5 ? '#ff9a3a' : '#5a4a38', 1.2 + rnd2() * r * 0.5, 8);
      puff(x + 0.5, y, 3 * r, 'rgba(70,64,58,.6)', 1.2, 2.5 + r, 1.8);
    },
    rubble(x, y, n) {
      if (!fxSeen(x, y)) return;
      for (let k = 0; k < 4 * n; k++) fxPart(x + 0.5, y + 0.3, (rnd2() - 0.5) * 4, -rnd2() * 4, 0.4 + rnd2() * 0.2, '#8f8b80', 1.3, 8);
      puff(x + 0.5, y, n, 'rgba(180,172,155,.5)', 0.8, 2.6, 1.2);
    },
    snowPuff(x, y) { if (fxSeen(x, y)) puff(x + 0.5, y, 4, 'rgba(240,245,250,.8)', 2.4, 3, 1.4); },
    burn(x, y) {
      if (!W.fires) W.fires = [];
      if (W.fires.length > 90) W.fires.shift();
      W.fires.push({ x: x | 0, y: y | 0, t: W.tick });
    },
    word(x, y, text, col) {
      if (!fxSeen(x, y) || Render.cam.z < 0.9) return;
      // the same shout from the same part of the field only needs saying once
      const key = text + ((x / 8) | 0) + '.' + ((y / 8) | 0), now = Render.time;
      if (FX.said[key] > now - 2.5) return;
      FX.said[key] = now;
      fxWord(x, y - 1.6, text, col, 1.5, 13, true);
    },
    plane(x0, y0, x1, y1, col, shotDown) { if (FX.planes.length < 16) FX.planes.push({ x0, y0, x1, y1, t: Render.time, col, down: !!shotDown }); },
    trench(S) { for (const u of S.units) if (u.men.length && fxSeen(u.x, u.y)) { for (let k = 0; k < 4; k++) fxDecal(u.x - u.uy * (k - 1.5) * 1.8 + u.ux * 1.2, u.y + u.ux * (k - 1.5) * 1.8 + u.uy * 1.2, 0.5, 2); } },
  };
}
function fxWord(x, y, text, col, life, size, bold) {
  if (FX.words.length > 50) FX.words.shift();
  FX.words.push({ x, y, text, col, t: Render.time, life, size, bold });
}
// Ground marks and bodies go under the living.
function drawGroundFX(ctx, c, z) {
  const now = W.tick, D = FX.decals;
  for (let k = D.length - 1; k >= 0; k--) {
    const d = D[k], age = now - d.t, life = d.kind === 0 ? 700 : 2400;
    if (age > life) { D.splice(k, 1); continue; }
    const sx = (d.x * TS - c.x) * z, sy = (d.y * TS - c.y) * z, r = d.r * TS * z;
    if (sx < -30 || sy < -30 || sx > Render.vw + 30 || sy > Render.vh + 30) continue;
    ctx.globalAlpha = (1 - age / life) * 0.8;
    if (d.kind === 0) { ctx.fillStyle = '#6a1412'; ctx.beginPath(); ctx.ellipse(sx, sy, r * 1.4, r * 0.8, d.a, 0, 6.283); ctx.fill(); }
    else if (d.kind === 1) { ctx.fillStyle = '#2a2520'; ctx.beginPath(); ctx.ellipse(sx, sy, r * 2, r * 1.3, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#4a4238'; ctx.beginPath(); ctx.ellipse(sx, sy - r * 0.2, r * 1.2, r * 0.7, 0, 0, 6.283); ctx.fill(); }
    else { ctx.fillStyle = '#4a3a24'; ctx.save(); ctx.translate(sx, sy); ctx.rotate(d.a * 0.2); ctx.fillRect(-r * 2, -r * 0.45, r * 4, r * 0.9); ctx.fillStyle = '#2d2316'; ctx.fillRect(-r * 2, -r * 0.1, r * 4, r * 0.5); ctx.restore(); }
  }
  ctx.globalAlpha = 1;
  const B = FX.bodies, u = z * 0.25;
  for (let k = B.length - 1; k >= 0; k--) {
    const b = B[k], age = now - b.t;
    if (age > 900) { B.splice(k, 1); continue; }
    if (z < 1) continue;
    const sx = (b.x - c.x) * z, sy = (b.y - c.y) * z;
    if (sx < -30 || sy < -30 || sx > Render.vw + 30 || sy > Render.vh + 30) continue;
    // the fall itself takes a moment, then they lie where they fell
    const f = Math.min(1, age / 8), ang = (b.left ? -1 : 1) * f * 1.5;
    ctx.globalAlpha = age > 640 ? (900 - age) / 260 : 1;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    ctx.drawImage(darkSprite(b.sp), -b.sp.footX * u, -b.sp.footY * u, b.sp.width * u, b.sp.height * u);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
// Copies of a sprite, cached on the sprite itself: darkened for the dead, flat white for the instant someone's hit.
function darkSprite(sp) {
  if (sp.dark) return sp.dark;
  const c = document.createElement('canvas'); c.width = sp.width; c.height = sp.height; c.footX = sp.footX; c.footY = sp.footY;
  const g = c.getContext('2d'); g.drawImage(sp, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(20,10,10,.45)'; g.fillRect(0, 0, c.width, c.height);
  sp.dark = c;
  return c;
}
function flashSprite(sp) {
  if (sp.flash) return sp.flash;
  const c = document.createElement('canvas'); c.width = sp.width; c.height = sp.height;
  const g = c.getContext('2d'); g.drawImage(sp, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
  sp.flash = c;
  return c;
}
// Sparks, smoke and words go on top of everything.
function drawTopFX(ctx, c, z, dt) {
  const now = Render.time, P = FX.parts;
  for (let k = P.length - 1; k >= 0; k--) {
    const f = P[k], a = now - f.t;
    if (a > f.life) { P[k] = P[P.length - 1]; P.pop(); continue; }
    const q = a / f.life;
    const x = f.x + f.vx * a, y = f.y + f.vy * a + (f.grav || 0) * a * a * 0.5;
    const sx = (x * TS - c.x) * z, sy = (y * TS - c.y) * z, s = f.size * Math.max(z * 0.5, 0.8);
    ctx.globalAlpha = 1 - q * q;
    ctx.fillStyle = f.col;
    if (s > 2.4) { ctx.beginPath(); ctx.arc(sx, sy, s * (f.grav ? 1 : 0.5 + q), 0, 6.283); ctx.fill(); }
    else ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
  // bombers crossing the field
  for (let k = FX.planes.length - 1; k >= 0; k--) {
    const f = FX.planes[k], a = (now - f.t) / 2.4;
    if (a > 1) { FX.planes.splice(k, 1); continue; }
    const dx = f.x1 - f.x0, dy = f.y1 - f.y0, d = Math.max(1, Math.hypot(dx, dy)), ex = f.x0 + dx / d * (a * 80 - 20), ey = f.y0 + dy / d * (a * 80 - 20);
    const sx = (ex * TS - c.x) * z, sy = (ey * TS - c.y) * z - 34, u = Math.max(1.2, z * 0.8), ang = Math.atan2(dy, dx);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(sx, sy + 34, 9 * u, 3 * u, 0, 0, 6.283); ctx.fill();
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang);
    ctx.fillStyle = f.down && a > 0.45 ? '#3a3a3a' : '#59636c'; ctx.fillRect(-7 * u, -u, 14 * u, 2 * u); ctx.fillRect(-2 * u, -6 * u, 3 * u, 12 * u); ctx.fillRect(-7 * u, -3 * u, 2 * u, 6 * u);
    ctx.fillStyle = f.col; ctx.fillRect(-2 * u, -6 * u, 3 * u, 2 * u); ctx.fillRect(-2 * u, 4 * u, 3 * u, 2 * u);
    ctx.restore();
    if (f.down && a > 0.45) { ctx.fillStyle = 'rgba(255,140,50,.85)'; ctx.beginPath(); ctx.arc(sx, sy, 4 * u, 0, 6.283); ctx.fill(); }
  }
  for (const s of W.swarms) {
    const sx = ((s.x + 0.5) * TS - c.x) * z, sy = ((s.y + 0.5) * TS - c.y) * z, rad = 5 * TS * z;
    ctx.fillStyle = 'rgba(40,36,18,.8)';
    for (let k = 0; k < 90; k++) { const a = hash2(k, 5, 1) * 6.283 + now * (1 + hash2(k, 2, 3)), d = Math.sqrt(hash2(k, 7, 2)) * rad; ctx.fillRect(sx + Math.cos(a) * d, sy + Math.sin(a) * d * 0.7, Math.max(1, z * 0.4), Math.max(1, z * 0.3)); }
  }
  for (const s of W.cyclones) {
    const sx = ((s.x + 0.5) * TS - c.x) * z, sy = ((s.y + 0.5) * TS - c.y) * z, rad = s.r * TS * z;
    if (sx < -rad || sy < -rad || sx > Render.vw + rad || sy > Render.vh + rad) continue;
    ctx.strokeStyle = 'rgba(240,244,250,.5)'; ctx.lineWidth = Math.max(1.5, z);
    for (let k = 0; k < 4; k++) { ctx.beginPath(); for (let q = 0; q < 24; q++) { const a = q * 0.32 + k * 1.57 - now * 1.5, d = rad * (q / 24); const x1 = sx + Math.cos(a) * d, y1 = sy + Math.sin(a) * d * 0.8; if (q) ctx.lineTo(x1, y1); else ctx.moveTo(x1, y1); } ctx.stroke(); }
  }
  // blizzards cross the map as a white whirl
  for (const s of W.storms) {
    const sx = ((s.x + 0.5) * TS - c.x) * z, sy = ((s.y + 0.5) * TS - c.y) * z, rad = s.r * TS * z;
    if (sx < -rad || sy < -rad || sx > Render.vw + rad || sy > Render.vh + rad) continue;
    ctx.fillStyle = 'rgba(238,244,250,.16)'; ctx.beginPath(); ctx.arc(sx, sy, rad, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(250,252,255,.75)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k < 70; k++) {
      const a = hash2(k, s.life & 7, 11) * 6.283 + now * (0.5 + hash2(k, 3, 2)), d = Math.sqrt(hash2(k, 9, 4)) * rad;
      const x1 = sx + Math.cos(a) * d, y1 = sy + Math.sin(a) * d * 0.8;
      ctx.moveTo(x1, y1); ctx.lineTo(x1 + 2.5, y1 + 1);
    }
    ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const W0 = FX.words;
  for (let k = W0.length - 1; k >= 0; k--) {
    const f = W0[k], a = now - f.t;
    if (a > f.life) { W0.splice(k, 1); continue; }
    const sx = (f.x * TS - c.x) * z, sy = (f.y * TS - c.y) * z - a * 16;
    ctx.globalAlpha = a > f.life * 0.6 ? (f.life - a) / (f.life * 0.4) : 1;
    ctx.font = `${f.bold ? '700 ' : '600 '}${f.size}px Georgia, serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(12,10,8,.85)'; ctx.strokeText(f.text, sx, sy);
    ctx.fillStyle = f.col; ctx.fillText(f.text, sx, sy);
  }
  ctx.globalAlpha = 1;
}
// ---- things that fly ----
function drawShots(ctx, c, z) {
  const S0 = W.shots; if (!S0.length) return;
  const now = W.tick;
  for (let k = S0.length - 1; k >= 0; k--) {
    const f = S0[k], age = now - f.t;
    const dist = Math.hypot(f.x1 - f.x0, f.y1 - f.y0);
    const life = f.kind === 3 ? Math.max(10, dist * 1.1) : f.kind === 4 ? 14 : f.kind === 2 ? 3 : Math.max(4, dist * 0.8);
    if (age > life) { S0.splice(k, 1); continue; }
    const q = age / life;
    const ax = (f.x0 + 0.5) * TS, ay = (f.y0 + 0.5) * TS, bx = (f.x1 + 0.5) * TS, by = (f.y1 + 0.5) * TS;
    const lift = f.kind === 3 ? Math.sin(q * Math.PI) * dist * 1.6 : f.kind === 0 || f.kind === 5 || f.kind === 6 ? Math.sin(q * Math.PI) * dist * 0.7 : 0;
    const x = (lerp(ax, bx, q) - c.x) * z, y = (lerp(ay, by, q) - lift - c.y) * z;
    if (x < -40 || y < -40 || x > Render.vw + 40 || y > Render.vh + 40) continue;
    if (f.kind === 2) {
      ctx.strokeStyle = 'rgba(255,225,150,.85)'; ctx.lineWidth = Math.max(1, z * 0.25);
      ctx.beginPath(); ctx.moveTo((lerp(ax, bx, Math.max(0, q - 0.4)) - c.x) * z, (lerp(ay, by, Math.max(0, q - 0.4)) - c.y) * z); ctx.lineTo(x, y); ctx.stroke();
    } else if (f.kind === 3) {
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect((lerp(ax, bx, q) - c.x) * z - z, (lerp(ay, by, q) - c.y) * z, 2 * z, z);
      ctx.fillStyle = '#2a2826'; ctx.beginPath(); ctx.arc(x, y, Math.max(1.4, 0.9 * z), 0, 6.283); ctx.fill();
    } else if (f.kind === 4) {
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(x, y, Math.max(1, 0.7 * z), 0, 6.283); ctx.fill();
    } else if (f.kind === 5) {
      ctx.fillStyle = '#8b887f'; ctx.fillRect(x - 0.5 * z, y - 0.5 * z, Math.max(1, z * 0.6), Math.max(1, z * 0.6));
    } else {
      // arrows and javelins point the way they're going, tipping over at the top of the arc
      const vy = (by - ay) / life - Math.cos(q * Math.PI) * Math.PI * dist * (f.kind === 6 ? 0.7 : 0.7) / life;
      const vx = (bx - ax) / life, n = Math.max(0.1, Math.hypot(vx, vy)), L = (f.kind === 6 ? 2.6 : 1.8) * z;
      ctx.strokeStyle = f.kind === 6 ? '#7a5a35' : '#e8dcc0'; ctx.lineWidth = Math.max(1, z * 0.22);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx / n * L, y - vy / n * L); ctx.stroke();
    }
  }
}
// ---- what fights alongside the soldiers ----
function drawEngine(ctx, g, col, c, z) {
  const D = SIEGE[g.type], sx = (g.x * TS + 3 - c.x) * z, sy = (g.y * TS + 3 - c.y) * z, u = z * 0.25;
  const recoil = W.tick - g.fireT < 6 ? (6 - (W.tick - g.fireT)) * u * 0.5 : 0;
  const wood = '#6b4a2c', dark = '#46301c', iron = '#3a3d42';
  const r = (x, y, w, h, c2) => { ctx.fillStyle = c2; ctx.fillRect(sx + x * u, sy + y * u, w * u, h * u); };
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(sx - 10 * u, sy, 20 * u, 2 * u);
  switch (D.id) {
    case 'ram': r(-12 - recoil / u, -6, 24, 7, wood); r(-11 - recoil / u, -7, 22, 2, dark); r(-14 - recoil / u * 1.4, -3, 28, 2, '#8d7048'); r(13 - recoil / u * 1.4, -4, 3, 4, iron); r(-10, 1, 3, 3, dark); r(7, 1, 3, 3, dark); r(-8, -9, 16, 2, col); break;
    case 'tower': r(-7, -38, 14, 40, wood); r(-7, -38, 2, 40, '#8a6238'); r(-8, -40, 16, 3, dark); r(-5, -33, 10, 4, '#2a1d12'); r(-5, -24, 10, 4, '#2a1d12'); r(-5, -15, 10, 4, '#2a1d12'); r(-9, 0, 3, 3, dark); r(6, 0, 3, 3, dark); r(-1, -46, 2, 7, dark); r(1, -46, 7, 4, col); break;
    case 'catapult': { const arm = W.tick - g.fireT < 8 ? -1 : 0.6; r(-9, -4, 18, 4, wood); r(-9, 0, 3, 3, dark); r(6, 0, 3, 3, dark); r(-6, -9, 2, 5, dark); r(4, -9, 2, 5, dark); ctx.save(); ctx.translate(sx, sy - 7 * u); ctx.rotate(arm); ctx.fillStyle = '#8a6238'; ctx.fillRect(-u, -12 * u, 2 * u, 14 * u); ctx.fillStyle = '#55585f'; ctx.fillRect(-2 * u, -14 * u, 4 * u, 3 * u); ctx.restore(); r(-8, -11, 16, 2, col); break; }
    case 'trebuchet': { const arm = W.tick - g.fireT < 10 ? 1.2 : -0.9; r(-10, -3, 20, 3, wood); r(-3, -24, 2, 22, dark); r(2, -24, 2, 22, dark); ctx.save(); ctx.translate(sx, sy - 22 * u); ctx.rotate(arm); ctx.fillStyle = '#8a6238'; ctx.fillRect(-u, -22 * u, 2 * u, 28 * u); ctx.fillStyle = '#55585f'; ctx.fillRect(-4 * u, 4 * u, 8 * u, 6 * u); ctx.restore(); r(-10, 0, 3, 2, col); r(7, 0, 3, 2, col); break; }
    case 'rocketarty': r(-10, -4, 20, 4, '#4f5a44'); r(5, -7, 5, 3, '#3f4836'); r(6, -6, 3, 1, '#9db7c6'); r(-9, -9, 12, 5, '#3a3d42'); for (let q = 0; q < 4; q++) r(-8 + q * 3, -9, 2, 2, '#1c1e21'); r(-9, 0, 3, 3, '#1c1e21'); r(-3, 0, 3, 3, '#1c1e21'); r(5, 0, 3, 3, '#1c1e21'); r(-10, -3, 3, 1, col); break;
    case 'cannon': r(-7, -5, 15, 3, iron); r(8, -6, 2, 5, iron); r(-5, -2, 8, 2, wood); r(-5, 0, 4, 4, dark); r(2, 0, 4, 4, dark); r(-9, -4, 3, 2, col); break;
    default: r(-8, -6, 18, 2, iron); r(-2, -5, 8, 3, '#55595f'); r(-6, -3, 10, 2, shadeHex('#55595f', -0.2)); r(-6, -1, 4, 5, '#2c2f33'); r(2, -1, 4, 5, '#2c2f33'); r(-10, -3, 4, 1, col);
  }
  if (recoil && (D.id === 'cannon' || D.id === 'artillery' || D.id === 'rocketarty')) { ctx.fillStyle = 'rgba(255,220,120,.8)'; ctx.beginPath(); ctx.arc(sx + 12 * u, sy - 5 * u, 3 * u, 0, 6.283); ctx.fill(); }
}
function drawConvoy(ctx, f, c, z) {
  const sx = (f.x * TS - c.x) * z, sy = (f.y * TS - c.y) * z, u = Math.max(z * 0.25, 0.4);
  const col = toHexRgb(f.pol.color);
  if (f.motor) { ctx.fillStyle = shadeHex(col, -0.3); ctx.fillRect(sx - 7 * u, sy - 6 * u, 10 * u, 6 * u); ctx.fillStyle = '#3a3d42'; ctx.fillRect(sx + 3 * u, sy - 4 * u, 4 * u, 4 * u); ctx.fillStyle = '#222'; ctx.fillRect(sx - 5 * u, sy, 3 * u, 2 * u); ctx.fillRect(sx + 3 * u, sy, 3 * u, 2 * u); return; }
  ctx.fillStyle = '#e6dcc2'; ctx.fillRect(sx - 6 * u, sy - 7 * u, 10 * u, 5 * u); ctx.fillStyle = '#6b4a2c'; ctx.fillRect(sx - 7 * u, sy - 3 * u, 12 * u, 2 * u); ctx.fillStyle = '#3a2c1a'; ctx.fillRect(sx - 5 * u, sy - u, 2 * u, 2 * u); ctx.fillRect(sx + u, sy - u, 2 * u, 2 * u);
  ctx.fillStyle = '#6b4a2c'; ctx.fillRect(sx + 6 * u, sy - 5 * u, 6 * u, 3 * u); ctx.fillRect(sx + 7 * u, sy - 2 * u, u, 2 * u); ctx.fillRect(sx + 10 * u, sy - 2 * u, u, 2 * u); ctx.fillRect(sx + 11 * u, sy - 6 * u, 2 * u, 2 * u);
  ctx.fillStyle = col; ctx.fillRect(sx - 2 * u, sy - 7 * u, 3 * u, 5 * u);
}
function drawFlag(ctx, sx, sy, col, h, w, wave) {
  ctx.fillStyle = '#2a2622'; ctx.fillRect(sx, sy - h, Math.max(1, h * 0.08), h);
  const fw = w, fh = w * 0.62, t = Render.time * 5 + wave;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(sx + 1, sy - h);
  ctx.lineTo(sx + 1 + fw * 0.5, sy - h + Math.sin(t) * 1.2);
  ctx.lineTo(sx + 1 + fw, sy - h + 0.6 + Math.sin(t + 1.4) * 1.4);
  ctx.lineTo(sx + 1 + fw, sy - h + fh + Math.sin(t + 1.4) * 1.4);
  ctx.lineTo(sx + 1 + fw * 0.5, sy - h + fh + Math.sin(t) * 1.2);
  ctx.lineTo(sx + 1, sy - h + fh);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(sx + 1, sy - h + fh - 1, fw * 0.5, 1);
}
const PHASE_TEXT = { invest: 'Under siege', storm: 'Storming the town', field: 'Fighting' };
const WX_ICON = ['', '🌧', '❄', '🌫', '☀'];
// The plate over every fight: who's fighting who, how many are left on each side, and what's going on.
function drawBattles(ctx, c, z) {
  const R0 = Render, vw = R0.vw, vh = R0.vh; R0.battleHits = R0.battleHits || []; R0.battleHits.length = 0;
  const sel = R0.sel && R0.sel.kind === 'battle' ? R0.sel.obj : null;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const B of W.battles) {
    const A = B.sA, D = B.sB;
    // the men themselves, in their realm's colour, even from far off
    if (z < 1.4) {
      const size = z < 0.7 ? 1.5 : 2;
      for (let s = 0; s < 2; s++) {
        const S = s ? D : A; ctx.fillStyle = S.pol.color;
        for (const u of S.units) for (let k = 0; k < u.men.length; k++) {
          const p = u.men[k]; if (p.hidden) continue;
          const sx = ((p.ti % W.w + 0.5) * TS - c.x) * z, sy = ((((p.ti / W.w) | 0) + 0.5) * TS - c.y) * z;
          if (W.tick - p.atkT < 3) { ctx.fillStyle = '#fff2c0'; ctx.fillRect(sx - 1, sy - 1, size + 2, size + 2); ctx.fillStyle = S.pol.color; }
          else ctx.fillRect(sx, sy, size, size);
        }
      }
    }
    // company banners
    if (z >= 1.0) {
      for (let s = 0; s < 2; s++) {
        const S = s ? D : A;
        for (const u of S.units) {
          if (!u.men.length) continue;
          const sx = ((u.x + 0.5) * TS - c.x) * z, sy = ((u.y + 0.5) * TS - c.y) * z;
          if (sx < -40 || sy < -40 || sx > vw + 40 || sy > vh + 40) continue;
          if (u.order !== 'rout') drawFlag(ctx, sx, sy, S.pol.color, 11 + z * 5, 7 + z * 2.2, u.id);
          if (z >= 2.2 && u.order !== 'rout') { ctx.font = '600 10px Georgia, serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(12,10,8,.8)'; const t0 = `${u.name} ${u.men.length}`; ctx.strokeText(t0, sx + 2, sy - 16 - z * 5); ctx.fillStyle = '#fff6e0'; ctx.fillText(t0, sx + 2, sy - 16 - z * 5); }
          // chosen battle: arrows show where each company has been told to go
          if (sel === B && u.order !== 'rout') {
            const tx0 = ((u.tx + 0.5) * TS - c.x) * z, ty0 = ((u.ty + 0.5) * TS - c.y) * z, L = Math.hypot(tx0 - sx, ty0 - sy);
            if (L > 8) {
              ctx.strokeStyle = S.pol.color; ctx.globalAlpha = 0.8; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx0, ty0); ctx.stroke(); ctx.setLineDash([]);
              const ang = Math.atan2(ty0 - sy, tx0 - sx); ctx.fillStyle = S.pol.color; ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx0 - Math.cos(ang - 0.4) * 9, ty0 - Math.sin(ang - 0.4) * 9); ctx.lineTo(tx0 - Math.cos(ang + 0.4) * 9, ty0 - Math.sin(ang + 0.4) * 9); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
            }
          }
        }
        if (z >= 1) for (const a of S.armies) for (const g of a.guns) drawEngine(ctx, g, S.pol.color, c, z);
      }
    }
    // the plate
    const sx = ((B.x + 0.5) * TS - c.x) * z, sy = ((B.y + 0.5) * TS - c.y) * z - (B.town ? 86 : 46) - z * 7;
    if (sx < -110 || sy < -40 || sx > vw + 110 || sy > vh + 40) continue;
    const na = A.ok === undefined ? A.men0 : A.ok, nb = D.ok === undefined ? D.men0 : D.ok, tot = Math.max(1, na + nb);
    const pulse = 1 + Math.sin(R0.time * 6) * 0.06, W0 = z < 0.6 ? 60 : 130, H0 = z < 0.6 ? 6 : 22;
    if (z >= 0.6) {
      const label = `${B.name}`;
      ctx.font = '600 11px Georgia, serif';
      const lw = Math.max(W0, ctx.measureText(label).width + 26);
      ctx.fillStyle = sel === B ? 'rgba(52,38,16,.92)' : 'rgba(20,14,10,.82)';
      ctx.fillRect(sx - lw / 2, sy - 16, lw, 34);
      ctx.fillStyle = '#fff6e0'; ctx.fillText(label, sx, sy - 8);
      const bw = lw - 10, ba = bw * na / tot;
      ctx.fillStyle = A.pol.color; ctx.fillRect(sx - bw / 2, sy + 1, ba, 7);
      ctx.fillStyle = D.pol.color; ctx.fillRect(sx - bw / 2 + ba, sy + 1, bw - ba, 7);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(sx - bw / 2 + ba - 0.5, sy, 1.5, 9);
      ctx.font = '600 9px Georgia, serif';
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(`${na}`, sx - bw / 2 + 2, sy + 4.5);
      ctx.textAlign = 'right'; ctx.fillText(`${nb}`, sx + bw / 2 - 2, sy + 4.5); ctx.textAlign = 'center';
      ctx.font = '9px Georgia, serif'; ctx.fillStyle = '#d8ccb0';
      ctx.fillText(`${B.phase === 'pursuit' ? 'Rout and pursuit' : PHASE_TEXT[B.stage] || 'Fighting'}${B.wx ? ' · ' + WX_NAME[B.wx] : ''}`, sx, sy + 13);
    }
    // crossed swords
    ctx.save(); ctx.translate(sx, z >= 0.6 ? sy - 24 : sy); ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(20,14,10,.8)'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 6.283); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = A.pol.color; ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.stroke();
    ctx.strokeStyle = D.pol.color; ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(-5, 5); ctx.stroke();
    ctx.restore();
    R0.battleHits.push({ B, x: sx, y: z >= 0.6 ? sy : sy, w: z >= 0.6 ? 70 : 14, h: 26 });
    // rain or snow falling through the fight
    if (B.wx && z >= 1 && (B.wx === WX.RAIN || B.wx === WX.SNOW)) {
      const cx = ((B.x + 0.5) * TS - c.x) * z, cy = ((B.y + 0.5) * TS - c.y) * z, rad = 26 * TS * z * 0.35;
      ctx.strokeStyle = B.wx === WX.RAIN ? 'rgba(170,200,230,.45)' : 'rgba(250,250,255,.7)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < 60; k++) {
        const h = hash2(k, B.id, 5), v = (R0.time * (B.wx === WX.RAIN ? 1.8 : 0.35) + hash2(k, B.id, 9)) % 1;
        const dx0 = (h - 0.5) * rad * 2 + (B.wx === WX.SNOW ? Math.sin(R0.time + k) * 5 : 0), dy0 = (v - 0.5) * rad * 1.3;
        ctx.moveTo(cx + dx0, cy + dy0); ctx.lineTo(cx + dx0 - (B.wx === WX.RAIN ? 1.5 : 0), cy + dy0 + (B.wx === WX.RAIN ? 7 : 1.5));
      }
      ctx.stroke();
    }
  }
  // armies on the march: a banner, a head-count, and where they're going
  for (const A of W.armies) {
    if (A.battle || !A.soldiers.length || A.phase === 'sail') continue;
    const col = A.pol.color;
    const sx = ((A.x + 0.5) * TS - c.x) * z, sy = ((A.y + 0.5) * TS - c.y) * z;
    const showRoute = (z < 1.4 && z >= 0.15 && A.goal !== 'garrison') || (R0.sel && R0.sel.obj === A);
    if (showRoute && A.target) {
      const tx0 = ((A.target.x + 0.5) * TS - c.x) * z, ty0 = ((A.target.y + 0.5) * TS - c.y) * z;
      ctx.strokeStyle = col; ctx.globalAlpha = 0.65; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -R0.time * 18;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx0, ty0); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.globalAlpha = 1;
    }
    if (sx < -60 || sy < -60 || sx > vw + 60 || sy > vh + 60) continue;
    if (A.camp && z >= 1) { for (let k = 0; k < Math.min(5, 1 + A.soldiers.length / 12); k++) { const tx1 = sx + (hash2(A.id, k, 1) - 0.5) * 34 * z * 0.5, ty1 = sy + (hash2(A.id, k, 2) - 0.5) * 24 * z * 0.5, u = z * 0.25; ctx.fillStyle = '#d8ccb0'; ctx.beginPath(); ctx.moveTo(tx1, ty1 - 7 * u); ctx.lineTo(tx1 + 7 * u, ty1 + 3 * u); ctx.lineTo(tx1 - 7 * u, ty1 + 3 * u); ctx.closePath(); ctx.fill(); ctx.fillStyle = col; ctx.fillRect(tx1 - u, ty1 - 2 * u, 2 * u, 5 * u); } }
    if (z >= 1) for (const g of A.guns) { g.x = A.x - 2 + (g.id % 5); g.y = A.y + (g.id % 3); drawEngine(ctx, g, col, c, z); }
    drawFlag(ctx, sx, sy - 6 - z * 2, col, 15, 12, A.id);
    if (z >= 0.3) {
      ctx.font = '600 10px Georgia, serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(12,10,8,.85)';
      const t0 = z >= 0.9 ? `${A.name} · ${A.soldiers.length}` : `${A.soldiers.length}`;
      ctx.strokeText(t0, sx + 8, sy - 26 - z * 2); ctx.fillStyle = '#fff6e0'; ctx.fillText(t0, sx + 8, sy - 26 - z * 2);
    }
  }
  if (z >= 0.5) for (const f of W.convoys) { const sx = (f.x * TS - c.x) * z, sy = (f.y * TS - c.y) * z; if (sx > -30 && sy > -30 && sx < vw + 30 && sy < vh + 30) drawConvoy(ctx, f, c, z); }
  if (W.missiles) for (const m of W.missiles) {
    const x = lerp(m.x0, m.x1, m.t), y = lerp(m.y0, m.y1, m.t), h = Math.sin(m.t * Math.PI) * 60;
    const sx = (x * TS - c.x) * z, sy = (y * TS - c.y) * z - h * z;
    ctx.strokeStyle = 'rgba(230,230,230,.55)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let q = 0; q <= 1.0001; q += 0.1) { const f = q * m.t, xx = lerp(m.x0, m.x1, f), yy = lerp(m.y0, m.y1, f), hh = Math.sin(f * Math.PI) * 60; const px = (xx * TS - c.x) * z, py = (yy * TS - c.y) * z - hh * z; if (q === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.stroke();
    ctx.fillStyle = '#efefef'; ctx.fillRect(sx - 2, sy - 2, 4, 4); ctx.fillStyle = '#ffb545'; ctx.fillRect(sx - 3, sy + 2, 6, 3);
  }
}

'use strict';
// Trains as real rolling stock: a locomotive of its age (steam with its tender, diesel, electric with a pantograph, a high-speed
// set, a maglev), then coaches or wagons (boxcars, tank wagons, coal hoppers, container flats). Each car follows the track
// on its own and turns smoothly through the curves. Seen from above, 24 art pixels to a tile, lit from the north-west.

const RAIL_Y = 0.42;  // where the track lies across a tile (render.js paints it two pixels in)
// car: [length in tiles, sprite length in art px]
const CAR_LEN = { steam: 0.95, tender: 0.55, diesel: 1.05, electric: 1.05, hsr: 1.2, maglev: 1.2, coach: 1.0, hcoach: 1.05, mcoach: 1.05, box: 0.85, hopper: 0.8, tank: 0.8, flat: 0.95 };
const CAR_GAP = 0.07;
const trainCache = new Map();
// The picture of one car, facing east (+x, the front), at twice art size for crisp rotation.
function trainSprite(kind, col) {
  const key = kind + '|' + col;
  let c = trainCache.get(key);
  if (c) return c;
  const L = Math.round(CAR_LEN[kind] * 24), Wd = 8, S = 2;
  c = document.createElement('canvas'); c.width = (L + 2) * S; c.height = (Wd + 2) * S;
  const g = c.getContext('2d');
  g.scale(S, S); g.translate(1, 1);
  const r = (x, y, w, h, cl) => { g.fillStyle = cl; g.fillRect(x, y, w, h); };
  const rr = (x, y, w, h, rad, cl) => { g.fillStyle = cl; g.beginPath(); g.roundRect(x, y, w, h, rad); g.fill(); };
  const hi = shadeHex(col, 0.32), lo = shadeHex(col, -0.38), roof = '#b9bcc0', roofLo = '#8e9196', glass = '#2e3e4e', glassHi = '#86a2ba';
  // the underframe and buffers that show at each end, and the shadow side
  const frame = () => { r(0.5, 1, L - 1, Wd - 2, '#26272b'); r(0, 2, 0.6, 1, '#55595f'); r(0, Wd - 3, 0.6, 1, '#55595f'); r(L - 0.6, 2, 0.6, 1, '#55595f'); r(L - 0.6, Wd - 3, 0.6, 1, '#55595f'); };
  // a coach body: livery sides, a pale roof down the middle, windows along both edges
  const coachBody = (x0, len, body, winStep) => {
    rr(x0, 0.5, len, Wd - 1, 1, body); r(x0 + 0.5, 0.5, len - 1, 1, shadeHex(body, 0.3)); r(x0 + 0.5, Wd - 1.5, len - 1, 1, shadeHex(body, -0.35));
    rr(x0 + 1, 2, len - 2, Wd - 4, 1, roof); r(x0 + 1, 2, len - 2, 0.7, '#d4d7da'); r(x0 + 1, Wd - 2.7, len - 2, 0.7, roofLo);
    for (let x = x0 + 2; x < x0 + len - 2; x += winStep) { r(x, 1.1, winStep * 0.55, 0.8, glass); r(x, Wd - 1.9, winStep * 0.55, 0.8, glass); }
  };
  frame();
  switch (kind) {
    case 'steam': {
      // the boiler: a long black cylinder, shaded round, with bands; smokebox and chimney at the front, the cab at the back
      rr(0.5, 1, 7, Wd - 2, 1, '#2a2b2f'); r(1, 1.4, 6, 1, '#4a4b50');                                 // cab
      r(1.5, 2.5, 4.5, Wd - 5, '#3a3b40');                                                              // cab roof
      rr(7, 1.6, L - 9, Wd - 3.2, 2.4, '#1d1e22'); r(7.5, 2, L - 10, 1, '#55575d'); r(7.5, Wd - 3, L - 10, 0.8, '#0e0e10');
      for (let x = 10; x < L - 4; x += 4) r(x, 1.6, 0.6, Wd - 3.2, '#b08a3a');                          // brass bands
      g.fillStyle = '#121214'; g.beginPath(); g.arc(L - 4.5, Wd / 2, 1.3, 0, 6.283); g.fill();           // chimney
      g.fillStyle = '#3a3b40'; g.beginPath(); g.arc(L - 4.5, Wd / 2, 0.7, 0, 6.283); g.fill();
      g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(L - 9, Wd / 2, 0.8, 0, 6.283); g.fill();             // the brass dome
      r(L - 1.6, 1, 1.2, Wd - 2, '#b8322c'); r(L - 1.6, 1, 1.2, 0.6, '#e06a5a');                         // red buffer beam
      r(L - 0.6, Wd / 2 - 0.5, 0.6, 1, '#fff3b0');                                                       // lamp
      break;
    }
    case 'tender': {
      rr(0.5, 0.8, L - 1, Wd - 1.6, 1, '#2a2b2f'); r(1, 1.2, L - 2, 0.6, '#4a4b50');
      for (let q = 0; q < 9; q++) { const x = 2 + (q * 5.3) % (L - 4), y = 2.2 + (q * 2.7) % (Wd - 4.4); r(x, y, 1.4, 1.2, q % 2 ? '#141416' : '#2e2f33'); }  // coal
      break;
    }
    case 'diesel': case 'electric': {
      rr(0.5, 0.5, L - 1, Wd - 1, 1.6, col); r(1.5, 0.5, L - 3, 0.9, hi); r(1.5, Wd - 1.4, L - 3, 0.9, lo);
      rr(2.5, 2, L - 5, Wd - 4, 0.8, kind === 'diesel' ? '#4a4d52' : roof); r(2.5, 2, L - 5, 0.6, kind === 'diesel' ? '#6a6d72' : '#d4d7da');
      if (kind === 'diesel') { for (let x = 6; x < L - 6; x += 3.2) { g.fillStyle = '#2a2c30'; g.beginPath(); g.arc(x, Wd / 2, 0.9, 0, 6.283); g.fill(); } r(L - 8, Wd / 2 - 0.4, 2, 0.8, '#1a1a1c'); }  // fans and exhaust
      else { g.strokeStyle = '#1e1f22'; g.lineWidth = 0.45; g.beginPath(); g.moveTo(5, 2.4); g.lineTo(8, Wd / 2); g.lineTo(5, Wd - 2.4); g.moveTo(L - 5, 2.4); g.lineTo(L - 8, Wd / 2); g.lineTo(L - 5, Wd - 2.4); g.stroke(); r(5, Wd / 2 - 0.25, L - 10, 0.5, '#6a6d72'); }  // pantographs
      r(L - 1.6, 1.4, 0.9, Wd - 2.8, glass); r(L - 1.6, 1.4, 0.9, 0.6, glassHi); r(0.7, 1.4, 0.9, Wd - 2.8, glass);  // cabs at both ends
      r(L - 0.5, 1, 0.5, 0.8, '#fff3b0'); r(L - 0.5, Wd - 1.8, 0.5, 0.8, '#fff3b0');
      r(L - 3, 0.5, 0.8, Wd - 1, '#e8c23a');                                                              // the yellow warning end
      break;
    }
    case 'hsr': case 'maglev': {
      // a long pointed nose, white with the livery stripe, the cab glass right at the front
      const nose = kind === 'maglev' ? 12 : 9, b = kind === 'maglev' ? '#eef2f5' : '#f2f2ee';
      g.fillStyle = b; g.beginPath(); g.moveTo(0.5, 0.5); g.lineTo(L - nose, 0.5); g.quadraticCurveTo(L, 0.8, L, Wd / 2); g.quadraticCurveTo(L, Wd - 0.8, L - nose, Wd - 0.5); g.lineTo(0.5, Wd - 0.5); g.closePath(); g.fill();
      g.fillStyle = '#c8ccd0'; g.beginPath(); g.moveTo(0.5, Wd - 1.6); g.lineTo(L - nose, Wd - 1.6); g.quadraticCurveTo(L - 1, Wd - 1.8, L - 0.6, Wd / 2 + 0.6); g.lineTo(L - nose, Wd - 0.5); g.lineTo(0.5, Wd - 0.5); g.closePath(); g.fill();
      r(0.5, 1.2, L - nose, 0.8, col); r(0.5, Wd - 2, L - nose, 0.8, col);
      g.fillStyle = glass; g.beginPath(); g.moveTo(L - nose + 1.5, 2); g.quadraticCurveTo(L - 2.5, 2.4, L - 2.6, Wd / 2); g.quadraticCurveTo(L - 2.5, Wd - 2.4, L - nose + 1.5, Wd - 2); g.closePath(); g.fill();
      g.fillStyle = glassHi; g.fillRect(L - nose + 2, 2.4, 2, 0.6);
      for (let x = 2; x < L - nose - 1; x += 2.2) { r(x, 0.6, 1.2, 0.6, glass); r(x, Wd - 1.2, 1.2, 0.6, glass); }
      if (kind === 'hsr') { g.strokeStyle = '#2a2c30'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(4, 3); g.lineTo(7, Wd / 2); g.lineTo(4, Wd - 3); g.stroke(); }
      else r(1, Wd / 2 - 0.3, L - nose, 0.6, '#5fd0e0');
      break;
    }
    case 'coach': coachBody(0.3, L - 0.6, col, 2.4); break;
    case 'hcoach': coachBody(0.3, L - 0.6, '#f2f2ee', 2.2); r(1, 1.2, L - 2, 0.6, col); r(1, Wd - 1.8, L - 2, 0.6, col); break;
    case 'mcoach': coachBody(0.3, L - 0.6, '#eef2f5', 2.2); r(1, Wd / 2 - 0.3, L - 2, 0.6, '#5fd0e0'); break;
    case 'box': {
      // a covered goods wagon: planked sides in oxide red, a curved roof with its ridge
      const b = '#7a3a2a';
      rr(0.5, 0.6, L - 1, Wd - 1.2, 0.6, b); r(0.5, 0.6, L - 1, 0.8, '#9a5240'); r(0.5, Wd - 1.4, L - 1, 0.8, '#5a2a1e');
      r(1.2, 2, L - 2.4, Wd - 4, '#8a8c90'); r(1.2, 2, L - 2.4, 0.7, '#aeb0b4'); r(1.2, Wd / 2 - 0.2, L - 2.4, 0.4, '#6a6c70');
      for (let x = 3; x < L - 2; x += 3) r(x, 0.6, 0.35, Wd - 1.2, '#5a2a1e');
      break;
    }
    case 'hopper': {
      rr(0.5, 0.6, L - 1, Wd - 1.2, 0.5, '#4a4c50'); r(0.5, 0.6, L - 1, 0.7, '#6a6c70'); r(0.5, Wd - 1.3, L - 1, 0.7, '#2e3034');
      r(1.5, 1.8, L - 3, Wd - 3.6, '#18181a');
      for (let q = 0; q < 10; q++) { const x = 2 + (q * 4.7) % (L - 5), y = 2.2 + (q * 1.9) % (Wd - 4.6); r(x, y, 1.3, 1, q % 3 ? '#2a2a2e' : '#3c3c42'); }
      r(L / 2 - 0.3, 0.6, 0.6, Wd - 1.2, '#2e3034');
      break;
    }
    case 'tank': {
      // a black or grey barrel lying lengthwise, shaded round, with its filler dome on top
      const b = col === '#oil' ? '#2a2b2f' : '#9aa0a6';
      r(1, 1.2, L - 2, Wd - 2.4, '#3a3c40');
      rr(1.2, 1.4, L - 2.4, Wd - 2.8, 2.4, b); r(2, 1.9, L - 4, 0.9, shadeHex(b, 0.35)); r(2, Wd - 2.8, L - 4, 0.9, shadeHex(b, -0.4));
      g.fillStyle = shadeHex(b, 0.15); g.beginPath(); g.arc(L / 2, Wd / 2, 1.1, 0, 6.283); g.fill();
      break;
    }
    case 'flat': {
      r(0.5, 1.4, L - 1, Wd - 2.8, '#55595f'); r(0.5, 1.4, L - 1, 0.5, '#70757c');
      // one long or two short containers, in a shipping line's colours
      const C = ['#c8452f', '#3a7fb5', '#d8a53a', '#4fa35e', '#e8e4d8', '#7a4a8a'];
      const a = C[(col.length * 7 + L) % C.length], b2 = C[(col.charCodeAt(1) + 3) % C.length], half = (L - 2) / 2;
      const box = (x, w, cl) => { r(x, 1.2, w, Wd - 2.4, cl); r(x, 1.2, w, 0.7, shadeHex(cl, 0.3)); r(x, Wd - 1.9, w, 0.7, shadeHex(cl, -0.35)); for (let q = x + 1.2; q < x + w - 0.5; q += 1.2) r(q, 1.9, 0.25, Wd - 3.8, shadeHex(cl, -0.18)); };
      box(1, half - 0.3, a); box(1 + half + 0.3, half - 0.3, b2);
      break;
    }
  }
  c.L = L + 2; c.Wd = Wd + 2;
  trainCache.set(key, c);
  return c;
}
// What runs on a line: by what the towns at its ends know, passenger and goods trains turn about.
function trainConsist(r) {
  const t = r.a && r.a.alive ? r.a : r.b, freight = ((r.trips || 0) + (r.id || 0)) % 2 === 1;
  const kn = id => t && typeof knows === 'function' && knows(t, id);
  const loco = kn('maglev') ? 'maglev' : kn('hsr') ? 'hsr' : kn('electricrail') ? 'electric' : kn('combustion') ? 'diesel' : 'steam';
  const big = t ? tn(t) : 0, n = clamp(Math.round(3 + Math.sqrt(big) / 18), 3, 8);
  const out = [loco];
  if (loco === 'steam') out.push('tender');
  if (loco === 'hsr' || loco === 'maglev') { for (let k = 0; k < Math.min(n, 6); k++) out.push(loco === 'hsr' ? 'hcoach' : 'mcoach'); out.push(loco); return out; }
  if (!freight) { for (let k = 0; k < n; k++) out.push('coach'); return out; }
  const box = kn('containers') ? 'flat' : 'box';
  for (let k = 0; k < n + 1; k++) out.push([box, 'hopper', 'tank', box, 'hopper'][(k * 3 + (r.id || 0)) % 5]);
  return out;
}
// A point along a line's tile path, `pos` in steps from its start (tiles; between two tiles, on the straight between them).
function railAt(path, pos, out) {
  const L = path.length - 1, w = W.w, p = clamp(pos, 0, L), k = Math.min(Math.floor(p), L - 1 < 0 ? 0 : L - 1), f = p - k;
  const a = path[k], b = path[Math.min(k + 1, L)];
  out.x = a % w + (b % w - a % w) * f + RAIL_Y; out.y = ((a / w) | 0) + (((b / w) | 0) - ((a / w) | 0)) * f + RAIL_Y;
  return out;
}
const _ra = { x: 0, y: 0 }, _rb = { x: 0, y: 0 }, _rc = { x: 0, y: 0 };
const TRAIN_FAR = { steam: '#1e1f23', tender: '#2a2b2f', diesel: null, electric: null, hsr: '#f2f2ee', maglev: '#eef2f5', coach: null, hcoach: '#e8e8e4', mcoach: '#e8ecef', box: '#7a3a2a', hopper: '#3a3c40', tank: '#9aa0a6', flat: '#c8452f' };
// Draws every running train. In screen pixels (the caller has reset the transform).
function drawTrainSets(ctx, c, z) {
  if (!W.rails) return;
  const vw = ctx.canvas.width, vh = ctx.canvas.height, now = Render.time;
  // close up, the full pictures; further out a car is a few pixels long, and a crisp outlined block reads better than a smudge
  const near = z >= 1.6, far = z < 0.32;
  for (const r of W.rails) {
    if (!r.done || r.path.length < 3) continue;
    const L = r.path.length - 1;
    railAt(r.path, r.pos, _ra);
    const hx = (_ra.x * TS - c.x) * z, hy = (_ra.y * TS - c.y) * z;
    if (hx < -400 || hy < -400 || hx > vw + 400 || hy > vh + 400) continue;
    const t = r.a && r.a.alive ? r.a : r.b, col = t && t.polity ? toHexRgb(t.polity.color) : '#2f5f9f';
    const cars = trainConsist(r);
    // the locomotive is always at the far end of the line: it pulls one way and propels the other, like a push-pull set
    let off = 0;
    if (far) {
      let tail = r.pos; for (const k of cars) tail -= CAR_LEN[k] + CAR_GAP;
      railAt(r.path, Math.max(0, tail), _rb);
      const tx = (_rb.x * TS - c.x) * z, ty = (_rb.y * TS - c.y) * z;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(12,12,14,.9)'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.strokeStyle = cars[0] === 'steam' ? '#5a5b60' : col; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.lineCap = 'butt';
      continue;
    }
    for (let q = 0; q < cars.length; q++) {
      const kind = cars[q], len = CAR_LEN[kind], mid = r.pos - off - len / 2;
      off += len + CAR_GAP;
      if (mid - len / 2 < 0 || mid > L) continue;  // still in the station, or not yet out of it
      railAt(r.path, mid, _rc); railAt(r.path, mid + len * 0.45, _ra); railAt(r.path, mid - len * 0.45, _rb);
      const sx = (_rc.x * TS - c.x) * z, sy = (_rc.y * TS - c.y) * z;
      if (sx < -40 || sy < -40 || sx > vw + 40 || sy > vh + 40) continue;
      let ang = Math.atan2(_ra.y - _rb.y, _ra.x - _rb.x);
      if (q === cars.length - 1 && (kind === 'hsr' || kind === 'maglev') && q > 0) ang += Math.PI;  // the rear power car faces back
      const lpx = Math.max(3, len * TS * z), wpx = Math.max(2.2, 0.4 * TS * z);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang);
      if (near) {
        const sp = trainSprite(kind, kind === 'tank' && q % 2 ? '#oil' : col), k = lpx / (sp.L - 2);
        ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(-lpx / 2 + 0.25 * TS * z * 0.3, -wpx / 2 + 0.3 * TS * z * 0.25, lpx, wpx * 1.05);
        ctx.drawImage(sp, -sp.L * k / 2, -sp.Wd * k / 2, sp.L * k, sp.Wd * k);
      } else {
        // a clean little block with a dark outline: each car on its own, gaps between
        const fc = TRAIN_FAR[kind] || col;
        ctx.fillStyle = 'rgba(10,10,12,.85)'; ctx.fillRect(-lpx / 2 - 0.6, -wpx / 2 - 0.6, lpx + 1.2, wpx + 1.2);
        ctx.fillStyle = fc; ctx.fillRect(-lpx / 2, -wpx / 2, lpx, wpx);
        if (lpx > 4) { ctx.fillStyle = shadeHex(fc, 0.3); ctx.fillRect(-lpx / 2, -wpx / 2, lpx, Math.max(0.5, wpx * 0.28)); }
      }
      ctx.restore();
      // steam and smoke from the chimney, drifting back over the train and thinning out
      if (q === 0 && kind === 'steam' && z >= 0.6) {
        for (let k = 0; k < 4; k++) {
          const age = ((now * 1.6 + k / 4) % 1), back = 0.2 + age * 1.4;
          railAt(r.path, r.pos - CAR_LEN.steam * 0.3 - back * (r.dir > 0 ? 1 : -1), _rb);
          const px = (_rb.x * TS - c.x) * z, py = (_rb.y * TS - c.y) * z - (1 + age * 6) * z;
          ctx.fillStyle = `rgba(232,232,232,${0.55 * (1 - age)})`; ctx.beginPath(); ctx.arc(px, py, (0.6 + age * 2.2) * z, 0, 6.283); ctx.fill();
        }
      }
    }
  }
}

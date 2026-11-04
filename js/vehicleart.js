'use strict';
// Road vehicles from the ox cart to the driverless pod, seen from above in the pixel style of the ships and people
// (24 art pixels to a tile). Each is drawn once facing east, then cached for each of eight headings and each body colour.

const VEH_COLS = ['#b8322c', '#2f5f9f', '#e8e4d8', '#2a2c30', '#8c939a', '#3f7f4a', '#d8a53a', '#6a3a7a', '#c86a2a', '#5fa8c8', '#7a2c2c', '#f2f2ee', '#4a5a6a', '#9a8a5a'];
// length and width in art pixels, without the wheels
const VEH_SIZE = {
  oxcart: [13, 6], carriage: [13, 6], bicycle: [6, 3], vintage: [9, 5], sedan: [9, 5], hatch: [8, 5], suv: [10, 6], van: [11, 6],
  ev: [9, 5], pod: [7, 5], bus: [20, 6], coach: [20, 6], tram: [24, 6], lorry: [17, 6], tanker: [17, 6], flatbed: [17, 6], train: [22, 6], taxi: [9, 5],
};
const vehCache = new Map();
// The sprite for a kind, colour and heading (0 east, then every 45 degrees clockwise on screen). Drawn at twice the art size,
// so a diagonal turned through 45 degrees stays crisp.
function vehicleSprite(kind, col, dir) {
  const key = kind + '|' + col + '|' + dir;
  let c = vehCache.get(key);
  if (c) return c;
  if (vehCache.size > 3000) vehCache.clear();
  const [L, Wd] = VEH_SIZE[kind] || VEH_SIZE.sedan, base = vehBase(kind, col, L, Wd);
  const S = 2, D = Math.ceil(Math.hypot(base.width, base.height)) + 2;
  c = document.createElement('canvas'); c.width = c.height = D * S;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.translate(D * S / 2, D * S / 2); g.rotate(dir * Math.PI / 4); g.scale(S, S);
  g.drawImage(base, -base.width / 2, -base.height / 2);
  c.art = D;  // art pixels across
  vehCache.set(key, c);
  return c;
}
// Facing east (+x), seen from above, lit from the north-west.
function vehBase(kind, col, L, Wd) {
  const c = document.createElement('canvas');
  c.width = L + 2; c.height = Wd + 2;
  const g = c.getContext('2d');
  const r = (x, y, w, h, cl) => { g.fillStyle = cl; g.fillRect(x + 1, y + 1, w, h); };
  const hi = shadeHex(col, 0.3), lo = shadeHex(col, -0.35), mid = shadeHex(col, 0.12);
  const glass = '#3a4c5e', glassHi = '#7f9cb4', tyre = '#1c1d20', head = '#fff3b0', tail = '#d8302a';
  // a car body: rounded corners, light along the north side, dark along the south, wheels just showing
  const body = (x0, len, w0) => {
    r(x0 + 1, -1 + 0, 2, 1, tyre); r(x0 + len - 3, -1 + 0, 2, 1, tyre); r(x0 + 1, w0, 2, 1, tyre); r(x0 + len - 3, w0, 2, 1, tyre);
    r(x0, 1, len, w0 - 2, col); r(x0 + 1, 0, len - 2, w0, col);
    r(x0 + 1, 0, len - 2, 1, hi); r(x0 + 1, w0 - 1, len - 2, 1, lo); r(x0 + len - 1, 1, 1, w0 - 2, mid);
  };
  const lights = (x0, len, w0) => { r(x0 + len - 1, 0, 1, 1, head); r(x0 + len - 1, w0 - 1, 1, 1, head); r(x0, 0, 1, 1, tail); r(x0, w0 - 1, 1, 1, tail); };
  switch (kind) {
    case 'oxcart': {
      // the ox in front, the yoke, then a plank cart on two big wheels with its load
      r(9, 1, 4, 4, '#6b4a2c'); r(12, 2, 1, 2, '#4a3220'); r(13, 1, 0, 0, '#000'); r(12, 0, 1, 1, '#e8e0cc'); r(12, 5, 1, 1, '#e8e0cc'); r(9, 1, 4, 1, '#8a6238');
      r(7, 2, 2, 2, '#46301c');
      r(0, 0, 7, 6, '#8a6238'); r(0, 0, 7, 1, '#a07848'); r(0, 5, 7, 1, '#5e4527'); for (let x = 1; x < 7; x += 2) r(x, 1, 1, 4, '#7a5530');
      r(2, -1, 3, 1, tyre); r(2, 6, 3, 1, tyre); r(1, 1, 5, 3, col);
      break;
    }
    case 'carriage': {
      r(10, 0, 3, 2, '#4a3220'); r(10, 4, 3, 2, '#5a3a24'); r(12, 0, 1, 1, '#2a1c10'); r(12, 5, 1, 1, '#2a1c10');  // two horses
      r(8, 2, 2, 2, '#46301c');
      r(1, -1, 2, 1, tyre); r(5, -1, 2, 1, tyre); r(1, 6, 2, 1, tyre); r(5, 6, 2, 1, tyre);
      r(0, 0, 8, 6, col); r(0, 0, 8, 1, hi); r(0, 5, 8, 1, lo); r(1, 1, 6, 4, shadeHex(col, -0.15)); r(7, 1, 1, 4, '#d6b86a'); r(0, 1, 1, 4, '#d6b86a');
      break;
    }
    case 'bicycle': {
      r(0, 1, 6, 1, '#2a2c30'); r(0, 0, 1, 3, '#2a2c30'); r(5, 0, 1, 3, '#2a2c30');
      r(2, 0, 2, 3, col); r(3, 1, 1, 1, '#d8b48a');  // the rider's back and head
      break;
    }
    case 'vintage': {
      // tall black body, a long bonnet, mudguards and a spare wheel on the back
      r(1, -1, 2, 1, tyre); r(6, -1, 2, 1, tyre); r(1, 5, 2, 1, tyre); r(6, 5, 2, 1, tyre);
      r(0, 0, 9, 5, col); r(0, 0, 9, 1, hi); r(0, 4, 9, 1, lo);
      r(6, 1, 3, 3, shadeHex(col, 0.18)); r(8, 2, 1, 1, '#c5ccd3');  // bonnet and radiator
      r(2, 1, 4, 3, shadeHex(col, -0.2)); r(5, 1, 1, 3, glass);
      r(0, 1, 1, 3, tyre); r(9 - 1, 0, 1, 1, head); r(9 - 1, 4, 1, 1, head);
      break;
    }
    case 'sedan': case 'taxi': case 'hatch': case 'suv': case 'ev': {
      body(0, L, Wd);
      const roofA = kind === 'hatch' ? 1 : 2, roofB = L - (kind === 'suv' ? 3 : 4);
      r(roofB, 1, 1, Wd - 2, glass); r(roofB, 1, 1, 1, glassHi);                  // windscreen
      r(roofA, 1, 1, Wd - 2, glass);                                               // rear window
      r(roofA + 1, 1, roofB - roofA - 1, Wd - 2, kind === 'ev' ? '#2c3a48' : mid); // the roof (glass on an electric car)
      if (kind === 'ev') r(roofA + 1, 1, roofB - roofA - 1, 1, '#5a7a94');
      if (kind === 'suv') { r(roofA + 1, 1, roofB - roofA - 1, 1, '#2a2c30'); r(roofA + 1, Wd - 2, roofB - roofA - 1, 1, '#2a2c30'); }
      if (kind === 'taxi') { r((L >> 1) - 1, (Wd >> 1), 2, 1, '#fff3b0'); }
      lights(0, L, Wd);
      if (kind === 'ev') { r(L - 1, 1, 1, Wd - 2, '#bfe8f0'); }
      break;
    }
    case 'van': {
      body(0, L, Wd);
      r(L - 3, 1, 1, Wd - 2, glass); r(L - 3, 1, 1, 1, glassHi); r(1, 1, L - 4, Wd - 2, hi); r(1, Wd - 2, L - 4, 1, mid);
      lights(0, L, Wd);
      break;
    }
    case 'pod': {
      // a rounded capsule, all glass on top, a cyan light all the way round
      r(1, -1, 1, 1, tyre); r(L - 2, -1, 1, 1, tyre); r(1, Wd, 1, 1, tyre); r(L - 2, Wd, 1, 1, tyre);
      r(1, 0, L - 2, Wd, '#e8ecef'); r(0, 1, L, Wd - 2, '#e8ecef');
      r(1, 1, L - 2, Wd - 2, '#2c3a48'); r(2, 1, L - 4, 1, '#5a7a94');
      r(0, 1, 1, Wd - 2, '#5fd0e0'); r(L - 1, 1, 1, Wd - 2, '#5fd0e0');
      break;
    }
    case 'bus': case 'coach': {
      body(0, L, Wd);
      r(L - 2, 1, 1, Wd - 2, glass);
      for (let x = 2; x < L - 3; x += 2) { r(x, 0, 1, 1, glass); r(x, Wd - 1, 1, 1, shadeHex('#3a4c5e', -0.2)); }  // windows down both sides
      r(4, 2, 3, Wd - 4, '#c5ccd3'); r(L - 8, 2, 2, Wd - 4, '#c5ccd3');  // air-conditioning on the roof
      if (kind === 'coach') r(1, 2, L - 4, 1, shadeHex(col, 0.35));
      lights(0, L, Wd);
      break;
    }
    case 'tram': {
      const half = (L >> 1);
      body(0, half - 1, Wd); body(half, L - half, Wd);
      r(half - 1, 1, 1, Wd - 2, '#2a2c30');  // the articulation
      for (let x = 2; x < L - 2; x += 2) if (x !== half - 1) { r(x, 0, 1, 1, glass); r(x, Wd - 1, 1, 1, glass); }
      r(L - 2, 1, 1, Wd - 2, glass); r(1, 1, 1, Wd - 2, glass);
      r(half + 3, 2, 3, Wd - 4, '#55595f'); r(half + 4, 1, 1, Wd - 2, '#2a2c30');  // pantograph
      break;
    }
    case 'lorry': case 'tanker': case 'flatbed': {
      // a cab in front, a gap, the trailer behind
      const cab = 4, tl = L - cab - 1;
      r(1, -1, 2, 1, tyre); r(4, -1, 2, 1, tyre); r(tl - 3, -1, 2, 1, tyre); r(1, Wd, 2, 1, tyre); r(4, Wd, 2, 1, tyre); r(tl - 3, Wd, 2, 1, tyre);
      r(L - 3, -1, 2, 1, tyre); r(L - 3, Wd, 2, 1, tyre);
      r(L - cab, 0, cab, Wd, col); r(L - cab, 0, cab, 1, hi); r(L - cab, Wd - 1, cab, 1, lo); r(L - 2, 1, 1, Wd - 2, glass); r(L - 2, 1, 1, 1, glassHi);
      r(L - 1, 0, 1, 1, head); r(L - 1, Wd - 1, 1, 1, head);
      r(tl, 2, 1, Wd - 4, '#2a2c30');
      if (kind === 'tanker') {
        r(0, 0, tl, Wd, '#b8bec4'); r(0, 1, tl, 1, '#e8ecef'); r(0, Wd - 1, tl, 1, '#7a8088'); r(2, 2, tl - 4, 1, '#d0d6dc');
        for (let x = 3; x < tl - 1; x += 4) r(x, 0, 1, Wd, '#8c939a');
      } else if (kind === 'flatbed') {
        r(0, 0, tl, Wd, '#55595f'); r(0, 0, tl, 1, '#70757c');
        const box = ['#c8452f', '#3a7fb5', '#d8a53a', '#4fa35e'][col.length % 4];
        r(1, 1, tl - 2, Wd - 2, box); r(1, 1, tl - 2, 1, shadeHex(box, 0.25)); r((tl >> 1), 1, 1, Wd - 2, shadeHex(box, -0.3));
      } else {
        r(0, 0, tl, Wd, '#e8e4d8'); r(0, 0, tl, 1, '#fff'); r(0, Wd - 1, tl, 1, '#a8a498'); r(1, 2, tl - 2, 1, shadeHex(col, -0.1));
      }
      r(0, 0, 1, 1, tail); r(0, Wd - 1, 1, 1, tail);
      break;
    }
    case 'train': {
      body(0, L, Wd);
      for (let x = 2; x < L - 2; x += 2) { r(x, 0, 1, 1, glass); r(x, Wd - 1, 1, 1, glass); }
      r(1, 2, L - 2, Wd - 4, shadeHex(col, -0.2));
      break;
    }
  }
  return c;
}
// Which picture: the kind of vehicle for a travel class (core.js classes) and a town's age, and a stable colour for this driver.
function vehicleKind(t, tr, h) {
  if (tr <= 2) return 'oxcart';
  if (tr === 3) return t && knows(t, 'bicycle') && h < 0.7 ? 'bicycle' : 'carriage';
  if (tr === 4) return t && knows(t, 'electricrail') && h < 0.45 ? 'tram' : h < 0.85 ? 'bus' : 'coach';
  if (tr >= 7) return h < 0.75 ? 'pod' : 'ev';
  if (tr === 6) return h < 0.6 ? 'ev' : h < 0.75 ? 'suv' : 'sedan';
  // the first motor cars are all much alike; later there's a choice
  if (!t || !knows(t, 'computers')) return h < 0.7 ? 'vintage' : h < 0.85 ? 'van' : 'sedan';
  return h < 0.45 ? 'sedan' : h < 0.62 ? 'hatch' : h < 0.78 ? 'suv' : h < 0.9 ? 'van' : h < 0.96 ? 'taxi' : 'sedan';
}
function vehicleColour(kind, h, pol) {
  if (kind === 'taxi') return '#e8c23a';
  if (kind === 'bus' || kind === 'tram' || kind === 'coach') return pol ? toHexRgb(pol.color) : '#d8a53a';
  if (kind === 'vintage') return h < 0.7 ? '#26282c' : '#5a2c2c';
  if (kind === 'oxcart' || kind === 'carriage') return ['#d8b24a', '#8a6238', '#a0a0a0', '#5a2c2c'][(h * 4) | 0];
  if (kind === 'pod') return '#e8ecef';
  return VEH_COLS[(h * 9973 | 0) % VEH_COLS.length];
}
// Draws one vehicle at world position (x, y) in terrain pixels (inside the world transform), heading ang in radians.
function drawVehicleSprite(ctx, x, y, ang, kind, col) {
  const dir = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
  const sp = vehicleSprite(kind, col, dir), s = sp.art / 4;  // 4 art pixels to a terrain pixel
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  const [L, Wd] = VEH_SIZE[kind] || VEH_SIZE.sedan, sl = Math.max(L, Wd) / 8;
  ctx.beginPath(); ctx.ellipse(x + 0.25, y + 0.35, sl, sl * 0.55, 0, 0, 6.283); ctx.fill();
  ctx.drawImage(sp, x - s / 2, y - s / 2, s, s);
}

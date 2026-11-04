'use strict';
// Car parks, garages and bike hubs, drawn at 12 art pixels a tile like every other building (citylife.js has the list),
// and the cars parked in them, at homes and at workplaces when zoomed in close.

const PARK_GROUND = { gravel: '#a39d8e', grass: '#7f9a5a', asphalt: '#4a4d50', court: '#8a8478', coach: '#55585c', rail: '#4a4d50', bus: '#55585c', moto: '#5a5d61', taxi: '#4a4d50', camper: '#6f7a5f', lockup: '#8a8478', canopy: '#4a4d50', solar: '#4a4d50', pod: '#55595f' };
const PARK_WALL = { deco: ['#e8dcc0', '#d8a53a'], brick: ['#94503a', '#6b3a2a'], concrete: ['#a8a49a', '#7d7a72'], brutal: ['#8c887c', '#5f5c55'], split: ['#b0aca2', '#7d7a72'],
  helix: ['#b8b4aa', '#8a867c'], glass: ['#7fa8c0', '#4a6a80'], steel: ['#8c939a', '#5a6168'], green: ['#5f9a48', '#3f6a30'], timber: ['#b8946a', '#7a5a3a'], adapt: ['#d8d4c8', '#9a968c'],
  shops: ['#c9805e', '#8a4a3a'], plaza: ['#b3a78f', '#8a7e66'], park: ['#6f9a50', '#4f7a38'], shed: ['#8a8e92', '#5a5e62'], dock: ['#4a4d50', '#2f9f8c'], scooter: ['#4a4d50', '#3aa0c8'], drone: ['#c5ccd3', '#e8743a'], asphalt: ['#8c8a82', '#6a6860'] };
const PARK_CARS = ['#b8322c', '#2f5f9f', '#e8e4d8', '#2a2c30', '#8c939a', '#3f7f4a', '#d8a53a', '#5fa8c8', '#7a2c2c', '#f2f2ee'];
(function parkArt() {
  if (typeof SPR === 'undefined' || typeof PARK_IDS === 'undefined') return;
  const pSign = (r, x, y) => { r(x, y, 4, 5, '#2f5fae'); r(x + 1, y + 1, 1, 3, '#fff'); r(x + 2, y + 1, 1, 1, '#fff'); r(x + 2, y + 2, 1, 1, '#fff'); };
  const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
  for (const id of PARK_IDS) {
    const D = BLD[id], L = D.look, k = L.kind, st = L.style, lv = L.lv, h0 = hash(id.length, id.charCodeAt(0) + id.charCodeAt(id.length - 1));
    SPR[id] = (r, g, w, h) => {
      const px = w, foot = 'rgba(0,0,0,.25)';
      const car = (x, y, n, vertical) => { const c = PARK_CARS[(h0 + n * 7) % PARK_CARS.length]; if (vertical) { r(x, y, 2, 3, c); r(x, y + 1, 2, 1, 'rgba(20,30,40,.55)'); } else { r(x, y, 3, 2, c); r(x + 1, y, 1, 2, 'rgba(20,30,40,.55)'); } };
      if (k === 'lot' || k === 'truck' || k === 'pnr' || k === 'ev') {
        r(0, 2, px, px - 2, PARK_GROUND[st] || '#4a4d50');
        if (st === 'grass') { for (let y = 3; y < px; y += 3) for (let x = (y % 2); x < px; x += 4) r(x, y, 1, 1, '#6a8a48'); }
        else r(0, 2, px, 1, 'rgba(255,255,255,.12)');
        if (st === 'lockup') {  // a row of lock-up garages with up-and-over doors
          for (let x = 1; x < px - 1; x += 4) { r(x, 3, 3, 6, '#b0aca2'); r(x, 4, 3, 4, ['#3f6a84', '#7a2c2c', '#3f7f4a', '#55595f'][(x + h0) % 4]); r(x, 4, 3, 1, 'rgba(255,255,255,.25)'); }
          for (let x = 1; x < px - 2; x += 5) car(x, 10, x, false);
          r(0, px - 1, px, 1, foot); return;
        }
        if (k === 'truck') {  // long vehicles in herringbone bays
          const col = st === 'bus' ? '#d8a53a' : st === 'coach' ? '#e8e4d8' : '#c8452f';
          for (let y = 4; y < px - 3; y += 5) for (let x = 1; x < px - 9; x += 11) { r(x, y, 9, 3, col); r(x, y, 2, 3, st === 'coach' || st === 'bus' ? '#3f6a84' : '#e8e4d8'); r(x + 1, y + 3, 1, 1, '#1c1e22'); r(x + 7, y + 3, 1, 1, '#1c1e22'); }
          pSign(r, px - 5, 3); r(0, px - 1, px, 1, foot); return;
        }
        // bays: white lines, cars in most of them
        const lineC = st === 'gravel' || st === 'grass' ? 'rgba(255,255,255,0)' : 'rgba(240,240,230,.75)';
        for (let y = 4; y < px - 2; y += 5) {
          r(1, y + 4, px - 2, 1, 'rgba(0,0,0,.15)');
          for (let x = 1; x < px - 2; x += 3) {
            r(x, y, 1, 4, lineC);
            const n = x * 3 + y * 5;
            if (((h0 >> (n % 13)) + n) % 5 < 3) {
              if (st === 'moto') { r(x + 1, y + 1, 1, 2, PARK_CARS[n % PARK_CARS.length]); continue; }
              const c = st === 'taxi' ? '#e8c23a' : st === 'camper' ? '#efefef' : st === 'pod' ? '#e8ecef' : PARK_CARS[(h0 + n) % PARK_CARS.length];
              r(x + 1, y, 2, 3, c); r(x + 1, y + 1, 2, 1, 'rgba(20,30,40,.55)');
            }
          }
        }
        if (k === 'ev' && (st === 'canopy' || st === 'solar' || st === 'pod' || lv === 0)) {  // a solar canopy over the bays, chargers at the ends
          for (let y = 3; y < px - 3; y += 5) { r(0, y - 1, px, 2, '#2d4a6a'); for (let x = 0; x < px; x += 3) r(x, y - 1, 1, 2, '#4a6a8a'); }
          for (let y = 5; y < px - 2; y += 5) r(0, y, 1, 2, '#4fa35e');
        }
        if (k === 'pnr') {  // a bus or tram stop and a shelter on one side
          r(px - 7, 3, 6, 3, st === 'rail' ? '#8a3b30' : '#d8a53a'); r(px - 6, 4, 4, 1, '#3f6a84'); r(px - 8, 7, 7, 2, '#c5ccd3'); r(px - 8, 7, 7, 1, '#efefef');
        }
        if (k === 'lot' && st === 'asphalt' && px >= 24) { r(px / 2 - 1, 2, 2, px - 2, '#6a6d70'); }  // a drive aisle down the middle
        pSign(r, 1, 3);
        if (st === 'attended' || id === 'attendedlot') { r(px - 4, px - 5, 3, 3, '#e8e4d8'); r(px - 4, px - 5, 3, 1, '#c8452f'); }
        r(0, px - 1, px, 1, foot);
        return;
      }
      if (k === 'under') {  // a square or a park on top, the ramp down at the edge
        const [top, edge] = PARK_WALL[st] || PARK_WALL.plaza;
        r(0, 2, px, px - 2, top);
        if (st === 'park') { for (let q = 0; q < px * px / 30; q++) { const x = (hash(q, h0) % (px - 3)) + 1, y = (hash(h0, q) % (px - 6)) + 3; r(x, y, 3, 3, '#3f7a30'); r(x + 1, y - 1, 1, 1, '#5f9a48'); } }
        else for (let y = 3; y < px; y += 3) for (let x = (y % 6 ? 0 : 1); x < px; x += 3) r(x, y, 2, 2, edge);
        r(1, px - 7, Math.min(9, px - 2), 5, '#2a2c30'); r(1, px - 7, Math.min(9, px - 2), 1, '#55595f'); r(2, px - 6, 3, 1, '#e8c23a');
        pSign(r, px - 6, px - 8);
        r(0, px - 1, px, 1, foot);
        return;
      }
      if (k === 'bike') {
        const [wall, trim] = PARK_WALL[st] || PARK_WALL.shed;
        r(0, 2, px, px - 2, '#7a7870');
        const decks = Math.max(1, lv);
        if (lv >= 2) { for (let d = 0; d < decks; d++) { const y = px - 3 - (d + 1) * Math.floor((px - 5) / decks); r(1, y, px - 2, 2, wall); r(1, y, px - 2, 1, '#efefef'); } }
        else { r(1, 3, px - 2, 2, wall); r(1, 3, px - 2, 1, trim); }
        for (let y = lv >= 2 ? 5 : 7; y < px - 2; y += 3) for (let x = 2; x < px - 2; x += 2) { r(x, y, 1, 2, '#2a2c30'); r(x, y, 1, 1, [trim, '#c8452f', '#3a7fb5', '#e8e4d8'][(x + y + h0) % 4]); }
        if (st === 'dock' || st === 'scooter') { r(px - 3, 4, 2, 4, trim); r(px - 3, 4, 2, 1, '#fff'); }
        r(0, px - 1, px, 1, foot);
        return;
      }
      if (k === 'roof') {  // a low building with the car park (or the drone pad) on its roof
        r(0, 4, px, px - 4, '#a8a49a'); r(0, 4, px, 2, '#c5c1b5'); r(1, px - 5, px - 2, 4, '#c9805e'); for (let x = 2; x < px - 2; x += 3) r(x, px - 4, 2, 2, '#3f6a84');
        if (st === 'drone') { r(3, 6, px - 6, px - 13, '#55595f'); r(px / 2 - 2, 7, 4, 1, '#efefef'); r(px / 2 - 2, 7, 1, 4, '#efefef'); r(px / 2 + 1, 7, 1, 4, '#efefef'); r(px / 2 - 2, 9, 4, 1, '#efefef'); r(2, 5, 2, 2, '#e8743a'); }
        else for (let x = 2; x < px - 3; x += 4) car(x, 7, x, false);
        r(0, px - 1, px, 1, foot);
        return;
      }
      if (k === 'robot') {  // a slim tower of stored cars, a lift shaft and the entry bay at the foot
        const [wall, dark] = PARK_WALL[st] || PARK_WALL.steel, tw = Math.max(6, px - 4), x0 = (px - tw) >> 1, top = Math.max(0, px - 4 - lv * 2);
        r(0, px - 4, px, 4, '#6a6d70');
        r(x0, top, tw, px - 4 - top, wall); r(x0, top, 1, px - 4 - top, 'rgba(255,255,255,.3)');
        for (let y = top + 2; y < px - 5; y += 2) for (let x = x0 + 1; x < x0 + tw - 1; x += 3) r(x, y, 2, 1, (x + y + h0) % 4 ? PARK_CARS[(x * 3 + y + h0) % PARK_CARS.length] : dark);
        r(x0 + (tw >> 1), top, 1, px - 4 - top, dark);
        r(x0 + 1, px - 5, tw - 2, 2, '#2a2c30'); r(x0 + 1, px - 5, tw - 2, 1, '#e8c23a');
        pSign(r, x0 + tw - 4, Math.max(0, top - 1));
        r(0, px - 1, px, 1, foot);
        return;
      }
      // multi-storey, mall and valet garages: open decks with cars between the slabs, a ramp, a stair tower
      const [wall, trim] = PARK_WALL[st] || PARK_WALL.concrete;
      const decks = Math.max(2, lv), deckH = Math.max(2, Math.floor((px - 4) / decks));
      r(0, 1, px, px - 1, wall);
      for (let d = 0; d < decks; d++) {
        const y = 2 + d * deckH;
        r(0, y, px, 1, trim);
        r(1, y + 1, px - 2, deckH - 1, '#2f3134');
        for (let x = 2; x < px - 3; x += 3) if (((x + d * 5 + h0) % 4) < 3) r(x, y + deckH - 2, 2, 1, PARK_CARS[(x + d * 3 + h0) % PARK_CARS.length]);
        if (st === 'brutal') for (let x = 1; x < px; x += 3) r(x, y + 1, 1, deckH - 1, wall);
        if (st === 'green') for (let x = 0; x < px; x += 2) r(x, y + 1, 1, 1, '#79b45a');
        if (st === 'timber') for (let x = 0; x < px; x += 2) r(x, y + 1, 1, deckH - 1, trim);
        if (st === 'glass') r(1, y + 1, px - 2, 1, 'rgba(160,210,235,.5)');
        if (k === 'mall') r(0, y, 2, deckH, ['#c8452f', '#3a7fb5', '#d8a53a', '#4fa35e', '#8a5fb0', '#e8743a'][d % 6]);
      }
      if (st === 'helix') { r(px - 5, 2, 4, px - 4, trim); for (let y = 3; y < px - 2; y += 3) r(px - 5, y, 4, 1, wall); }
      else { r(px - 4, 1, 3, px - 2, trim); r(px - 4, 1, 3, 1, '#efefef'); }  // the stair and lift tower
      if (st === 'split') for (let d = 0; d < decks; d++) r(0, 3 + d * deckH + (deckH >> 1), px >> 1, 1, trim);
      if (st === 'deco') { r(0, 1, px, 2, '#d8a53a'); r(2, px - 4, 4, 3, '#3a2c1a'); r(px - 8, px - 5, 3, 4, '#c8452f'); }
      if (st === 'shops' || k === 'mall') { r(0, px - 5, px, 4, '#c9805e'); for (let x = 1; x < px - 1; x += 4) { r(x, px - 4, 3, 3, '#3f6a84'); r(x, px - 5, 3, 1, ['#c8452f', '#3fa35e', '#d8a53a'][(x + h0) % 3]); } }
      else { r(2, px - 4, 5, 3, '#1c1e22'); r(2, px - 4, 5, 1, '#e8c23a'); }  // the way in, under a height barrier
      if (k === 'valet') { r(px - 10, px - 6, 7, 2, '#c8452f'); r(px - 9, px - 4, 1, 3, '#d8a53a'); r(px - 5, px - 4, 1, 3, '#d8a53a'); }
      pSign(r, px - 9, 3);
      r(0, px - 1, px, 1, foot);
    };
  }
})();

// Parked cars, drawn when close in: in the bays of a surface lot, beside a house, by a workplace.
function drawParked(ctx, c, z, vw, vh) {
  if (z < 1.6 || typeof drawVehicleSprite !== 'function' || typeof vehicleKind !== 'function') return;
  const c0 = Render.cam;
  let set = false;
  for (const t of W.towns) {
    if (!t.alive || !t.mod.car || !(t.cars > 0)) continue;
    const tx0 = (t.x * TS - c.x) * z, ty0 = (t.y * TS - c.y) * z;
    if (tx0 < -900 || ty0 < -900 || tx0 > vw + 900 || ty0 > vh + 900) continue;
    for (const b of t.blds) {
      if (!b.cars || !b.done || b.ruin) continue;
      const sx = (b.x * TS - c.x) * z, sy = (b.y * TS - c.y) * z, bw = b.size * TS * z;
      if (sx < -bw || sy < -bw || sx > vw + 10 || sy > vh + 10) continue;
      const D = b.type === 'house' ? null : BLD[b.type];
      const surface = D && D.parking && (D.look.kind === 'lot' || D.look.kind === 'pnr' || D.look.kind === 'ev');
      if (D && D.parking && !surface) continue;  // inside a garage: out of sight
      if (!set) { ctx.save(); ctx.setTransform(z, 0, 0, z, -c0.x * z, -c0.y * z); ctx.imageSmoothingEnabled = z < 3; set = true; }
      const n = surface ? Math.min(b.cars, b.size * b.size * 6) : Math.min(b.cars, b.type === 'house' ? 2 : 3);
      for (let k = 0; k < n; k++) {
        const hh = ((b.id * 31 + k * 17) % 97) / 97, kind = vehicleKind(t, Math.min(6, Math.max(5, t.trans || 5)), hh);
        if (kind === 'bus' || kind === 'tram' || kind === 'coach') continue;
        let wx, wy, ang;
        if (surface) {  // in rows of bays across the lot
          const per = b.size * 3, row = (k / per) | 0, col = k % per;
          wx = (b.x + 0.2 + col * (b.size / per) + 0.1) * TS; wy = (b.y + 0.55 + row * 0.75) * TS; ang = Math.PI / 2;
        } else {  // on the drive or the forecourt, just below the building
          wx = (b.x + 0.25 + k * 0.5) * TS; wy = (b.y + b.size + 0.12) * TS; ang = 0;
        }
        drawVehicleSprite(ctx, wx, wy, ang, kind, vehicleColour(kind, hh, t.polity));
      }
    }
  }
  if (set) ctx.restore();
}

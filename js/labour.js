'use strict';
// Land and labour. Every tile has a price set by how close it is to a busy centre, to the water and to a good road; dear land
// draws homes, shops and offices, and farms and smoky works move out to where land is cheap. Old buildings on valuable land
// get bought and pulled down for something newer. Each kind of work splits into real trades that come and go with inventions,
// filled from people with the right schooling, paid by what's short, and leaving people out of work when a machine takes over.

// ---- land value ----
// Distance to the nearest sea or lake, up to 8 tiles; worked out once and again whenever the coast may have changed.
function waterDist() {
  const n = W.w * W.h, D = new Uint8Array(n).fill(9), Q = new Int32Array(n);
  let h = 0, e = 0;
  for (let i = 0; i < n; i++) if (W.water[i]) { D[i] = 0; Q[e++] = i; }
  while (h < e) {
    const i = Q[h++], d = D[i] + 1;
    if (d > 8) continue;
    const x = i % W.w;
    if (x > 0 && D[i - 1] > d) { D[i - 1] = d; Q[e++] = i - 1; }
    if (x < W.w - 1 && D[i + 1] > d) { D[i + 1] = d; Q[e++] = i + 1; }
    if (i >= W.w && D[i - W.w] > d) { D[i - W.w] = d; Q[e++] = i - W.w; }
    if (i < n - W.w && D[i + W.w] > d) { D[i + W.w] = d; Q[e++] = i + W.w; }
  }
  W.waterD = D; W.waterDY = Math.floor(year());
}
// A town's centre is worth more the bigger it is; the value falls away with distance, slower where people can get about faster.
const landReach = t => 1.5 + Math.sqrt(tn(t)) * 0.18 * (1 + (t.trans || 0) * 0.15);
const landPeak = t => 4 + Math.sqrt(tn(t)) * 1.6;
function landYear() {
  const n = W.w * W.h;
  if (!W.land || W.land.length !== n) W.land = new Float32Array(n);
  if (!W.waterD || year() - W.waterDY > 20) waterDist();
  const L = W.land, w = W.w;
  L.fill(0);
  for (const t of W.towns) {
    if (!t.alive || t.nomad || tn(t) < 8) continue;
    const reach = landReach(t), peak = landPeak(t), R = Math.min(70, Math.ceil(reach * 2.6));
    const x0 = Math.max(0, t.x - R), x1 = Math.min(w - 1, t.x + R), y0 = Math.max(0, t.y - R), y1 = Math.min(W.h - 1, t.y + R);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * w + x;
      if (W.water[i]) continue;
      const v = peak * Math.exp(-Math.hypot(x - t.x, y - t.y) / reach), o = L[i];
      // where two towns' land meets, each one's pull adds a little to the other's
      L[i] = o > v ? o + v * 0.25 : v + o * 0.25;
    }
  }
  for (let i = 0; i < n; i++) {
    if (W.water[i]) continue;
    let v = L[i];
    // farmland is worth something on its own, however far out
    const farm = W.fert[i] * 0.012;
    if (v > 0.3) {
      const wd = W.waterD[i];
      if (wd <= 5) v *= 1 + 0.45 * (1 - (wd - 1) / 5);       // a sea or lake view
      if (W.river[i]) v *= 1.15;
      if (W.road[i] >= 2) v *= 1.1;
      v *= 1 - Math.min(0.5, slopeAt(i) * 3);
      if (W.biome[i] === B.MARSH) v *= 0.7;
    }
    L[i] = v > farm ? v : farm;
  }
}
const landAt = i => W.land ? W.land[i] : 0;
// Land against the town's own centre, 0 at the edge of nowhere, about 1 downtown (more on the waterfront).
const landRel = (t, i) => W.land ? W.land[i] / landPeak(t) : 0;
// What a plot sells for, in the realm's own money.
const plotPrice = (t, i, size) => landAt(i) * size * size * 6 * (t.polity.cur.level || 1);
function landWord(v, peak) {
  const r = v / Math.max(peak, 1);
  return r > 0.9 ? 'Prime: the dearest ground in town' : r > 0.55 ? 'Dear: close to the centre' : r > 0.25 ? 'Middling: inner suburbs' : r > 0.08 ? 'Cheap: the edge of town' : 'Farmland prices';
}

// Who wants dear land and who goes where it's cheap. Shops, banks, offices, colleges and services pay for the centre;
// farms, quarries, smoky works and anything that needs room move out.
const LAND_PREF = {};
(() => {
  const dear = ['market', 'bank', 'exchange', 'mall', 'theatre', 'bazaar', 'guildhall', 'conference', 'techcampus', 'ecentre', 'printshop', 'courthouse', 'forum', 'parliament', 'museum', 'cinema', 'library', 'greatlibrary', 'supermarket', 'phoneexchange', 'hotel', 'weighhouse', 'mint', 'embassy', 'school', 'clinic', 'medcentre', 'police', 'metro', 'grandstation', 'station', 'hsrstation', 'healthoffice', 'scribe'];
  const cheap = ['quarry', 'mine', 'oilwell', 'charcoalpit', 'brickworks', 'orchard', 'dairy', 'stockyard', 'greenhouse', 'treenursery', 'apiary', 'henhouse', 'fishpond', 'dovecote', 'windfarm', 'solarfarm', 'refinery', 'tankworks', 'munitions', 'plasticsplant', 'steelworks', 'textile', 'factory', 'foundry', 'gasworks', 'cannery', 'shambles', 'tannery', 'airport', 'airbase', 'missilesilo', 'launchpad', 'nuclear', 'fusionplant', 'trainyard', 'busdepot', 'recyclecentre', 'powerplant', 'sawmill', 'windmill', 'stud', 'studfarm', 'showground', 'prison', 'carplant', 'gigafactory', 'chipfab', 'robotworks', 'armsfactory', 'gunfoundry', 'siegeyard', 'drillyard', 'supplydepot', 'bunker', 'kiln', 'smelter'];
  for (const id of dear) LAND_PREF[id] = 1;
  for (const id of cheap) LAND_PREF[id] = -1;
})();
function landPrefOf(type, tier, t) {
  if (type === 'house') {
    if (tier >= HOUSE_IX.apartment) return 1;
    if (tier >= HOUSE_IX.townhouse) return 0.6;
    return tn(t) > 300 ? -0.5 : 0;  // in a city the cheap housing goes up where the land is cheap
  }
  const p = LAND_PREF[type];
  if (p !== undefined) return p;
  const d = BLD[type];
  if (!d) return 0;
  if (d.smoke >= 2 || d.place === 'far' || d.yield) return -1;
  if (d.service || d.study || d.store) return 0.6;
  return 0;
}

// ---- buying out the old town ----
// An old building on dear land is worth more as a plot than as what stands on it: someone buys it, pulls it down and puts up
// something modern. Old houses go first; then workshops and stations that new inventions have made pointless.
const OBSOLETE = { huntlodge: 'breeding', charcoalpit: 'blast', weaver: 'factory', kiln: 'massprod', smithy: 'massprod', watchtower: 'artillery', fort: 'artillery', councilhut: 'constitution', smokehouse: 'refrigeration', scribe: 'printing', healer: 'antibiotics', well: 'waterplant', cistern: 'waterplant', stable: 'cars', caravanserai: 'railway', coachinn: 'cars', mill: 'electric', windmill: 'electric', sawmill: 'massprod', dovecote: 'refrigeration', rootcellar: 'refrigeration', gasworks: 'electric', smelter: 'steel', weighhouse: 'computers', tram: 'motorbus', phoneexchange: 'mobilephones' };
const HERITAGE = { monument: 1, palace: 1, royalpalace: 1, cathedral: 1, templecomplex: 1, castle: 1, citadel: 1, starfort: 1, hanginggardens: 1, greatlibrary: 1, amphitheatre: 1, hippodrome: 1, temple: 1, shrine: 1, plaza: 1, hearth: 1, museum: 1, aqueduct: 1 };
function redevelopYear(t) {
  const n = tn(t), cur = t.polity.cur;
  if (t.nomad || n < 150 || t.attack || !W.land || cur.kind < 2) return;
  const yr = Math.floor(year());
  const top = bestHouse(t);
  // farms on the edge of a growing city are sold for building land; the town ploughs further out
  if (t.stock[R.FOOD] > n * 2) {
    let sold = 0;
    for (let k = t.fields.length - 1; k >= 0 && sold < 1 + n / 400; k--) {
      const f = t.fields[k];
      if (landRel(t, f.i) < 0.45) continue;
      t.fields.splice(k, 1); W.occ[f.i] = 0; W.stage[f.i] = 0; updCost(f.i); dirty(f.i);
      sold++;
    }
    if (sold && n > 400 && !(t.farmNoteY > yr - 60)) { t.farmNoteY = yr; chronT('misc', `Farms on the edge of ${t.name} are sold off as building land. The ploughs move further out.`, t); }
  }
  // then the old buildings
  const cands = [];
  for (const b of t.blds) {
    if (!b.done || b.ruin || b.up >= 0 || b.size !== 1) continue;
    const age = (W.tick - b.age) / TPY;
    if (age < 40) continue;
    let why = 0;
    if (b.type === 'house') { if (top >= 0 && b.tier <= top - 2) why = 1; }
    else if (!HERITAGE[b.type] && OBSOLETE[b.type] && knows(t, OBSOLETE[b.type])) why = 2;
    if (!why) continue;
    const r = landRel(t, b.i);
    if (r < 0.3) continue;
    cands.push([b, r * (why === 2 ? 1.4 : 1) * Math.min(2, age / 80)]);
  }
  if (!cands.length) return;
  cands.sort((a, b) => b[1] - a[1]);
  let bought = 0, spent = 0, waterfront = false;
  const want = 1 + Math.floor(n / 600);
  for (let k = 0; k < cands.length && bought < want; k++) {
    const b = cands[k][0], i = b.i;
    const price = plotPrice(t, i, 1) + (b.type === 'house' ? HOUSES[b.tier].work : BLD[b.type].work || 50) * 0.3 * cur.level;
    if (t.cash < price * 2) break;
    const owners = t.members.filter(p => p.home === b);
    if (owners.length) { t.cash -= price; for (const p of owners) p.cash += price / owners.length; }
    removeBuilding(b);
    // something modern on the plot: the best home the town can build
    if (top >= 0 && !(HOUSES[top].size > 1) && canPay(t.stock, HOUSES[top].cost) && buildable(i, 1, true)) { pay(t.stock, HOUSES[top].cost); addBuilding(t, 'house', i, top); }
    bought++; spent += price;
    if (W.waterD && W.waterD[i] <= 3) waterfront = true;
  }
  if (bought) {
    t.devY = yr; t.devN = (t.devN || 0) + bought;
    if (bought >= 2 && n > 500 && !(t.devNoteY > yr - 40)) {
      t.devNoteY = yr;
      chronT('misc', `Developers in ${t.name} buy up ${bought} old buildings ${waterfront ? 'on the waterfront' : 'near the centre'} for ${fmtMoney(spent)} ${cur.name}s, pull them down and build ${HOUSES[top].name.toLowerCase()}s.`, t);
    }
  }
}

// ---- trades ----
// id|Name|work|invention that brings it|invention that ends it|workplaces (building:people,...)|per 1000 people|schooling 0-3|pay|n = worth a line in the chronicle
// Schooling: 0 none, 1 an apprenticeship, 2 reading and writing, 3 a college or university.
const OCC_SRC = `
herbgatherer|Herb gatherer|FORAGE|herbs|pharma||3|0|0.7
shellfisher|Shellfish gatherer|FORAGE|shellfish|aquaculture||3|0|0.7
honeyhunter|Honey hunter|FORAGE|gathering|beekeeping||2|0|0.7
trapper|Trapper|HUNT|snares|||4|0|0.8
bowhunter|Bowhunter|HUNT|bow|rifle||4|0|0.8
gamekeeper|Gamekeeper|HUNT|feudalism|||1|1|1
falconer|Falconer|HUNT|feudalism|rifle||0.5|1|1.1
netfisher|Net fisher|FISH|fishing|deeptrawl||6|0|0.8
whaler|Whaler|FISH|longships|combustion||1|0|1.1|n
trawlerman|Trawlerman|FISH|deeptrawl|||4|1|1.1
fishfarmer|Fish farmer|FISH|aquaculture||fishpond:2|3|1|1
peasant|Peasant|FARM|agriculture|enclosure||10|0|0.6|n
ploughman|Ploughman|FARM|plough|tractor||4|0|0.75
tenant|Tenant farmer|FARM|feudalism|||6|0|0.75
paddyfarmer|Paddy farmer|FARM|paddies|tractor||4|0|0.7
yeoman|Yeoman farmer|FARM|enclosure|||5|1|0.9
harvesthand|Harvest hand|FARM|reaper|tractor||3|0|0.8
tractordriver|Tractor driver|FARM|tractor|precisionag||4|1|1|n
agronomist|Agronomist|FARM|fertilizer|||0.6|3|1.8
croptech|Precision-farming technician|FARM|precisionag|||1|2|1.5
shepherd|Shepherd|HERD|husbandry|||5|0|0.8
dairyworker|Dairy worker|HERD|dairy||dairy:4|1|0|0.85
drover|Drover|HERD|riding|railway||2|0|0.9|n
groom|Groom|HERD|riding|cars|stable:3,studfarm:6|1|0|0.8
stockman|Stockman|HERD|breeding||stockyard:6|2|1|1
vet|Veterinarian|HERD|veterinary|||0.5|3|1.9
forester|Forester|WOOD|forestry||treenursery:3|1|1|1
charcoalburner|Charcoal burner|WOOD|charcoal|blast|charcoalpit:3|1|0|0.8|n
sawyer|Sawyer|WOOD|carpentry|massprod|sawmill:4|3|0|0.9
lumberjack|Lumberjack|WOOD|steel|||3|0|1
loggingop|Logging machine operator|WOOD|combustion|robotics||2|1|1.2
quarryman|Quarryman|STONE|stonetools|dynamite|quarry:3|4|0|0.9
stonecutter|Stonecutter|STONE|masonry|massprod|quarry:2|3|1|1
blaster|Quarry blaster|STONE|dynamite|||1|1|1.2
brickmaker|Brickmaker|CLAY|mudbrick|factory|brickworks:6|2|0|0.8|n
copperminer|Copper miner|MINE|copper|||2|0|1.1
collier|Collier|MINE|deepmine|robotics|mine:4|3|0|1.2|n
oilman|Oil driller|MINE|combustion||oilwell:4|0|1|1.5
mineengineer|Mining engineer|MINE|steam|||0.6|3|2
geologist|Geologist|MINE|science|||0.4|3|1.8
minebot|Mining robot supervisor|MINE|robotics|||1|2|1.6
mason|Mason|BUILD|masonry|||4|1|1.1
carpenter|Carpenter|BUILD|carpentry||carpenter:3|5|1|1
thatcher|Thatcher|BUILD|thatching|urbanhousing||3|0|0.8
navvy|Navvy|BUILD|canals|massprod||3|0|0.9
surveyor|Surveyor|BUILD|math|||0.6|2|1.5
architect|Architect|BUILD|engineering|||0.5|3|2.2
plumber|Plumber|BUILD|sewerworks|||2|1|1.3
electrician|Electrician|BUILD|electric|||2|1|1.4
steelerector|Steel erector|BUILD|steel|||2|1|1.3
craneop|Crane operator|BUILD|skyscrapers|||1.5|1|1.4
civileng|Civil engineer|BUILD|science|||0.5|3|2
printbuilder|Construction-robot operator|BUILD|robotics|||1|2|1.6
potter|Potter|CRAFT|pottery|massprod|kiln:3|2|0|1
spinner|Spinner|CRAFT|weaving|spinningjenny||3|0|0.8|n
weaver|Handloom weaver|CRAFT|weaving|powerloom|weaver:3|3|0|1|n
bronzesmith|Bronzesmith|CRAFT|bronze|iron|smithy:2|0.5|1|1.2
smith|Blacksmith|CRAFT|iron|massprod|smithy:2|2|1|1.3
tanner|Tanner|CRAFT|tanning||tannery:4|1|0|0.9
dyer|Dyer|CRAFT|dyes||dyeworks:3|0.5|0|1
glassblower|Glassblower|CRAFT|glass||glassworks:4|0.5|1|1.4
baker|Baker|CRAFT|baking||bakery:3|2|0|1
brewer|Brewer|CRAFT|brewing||brewery:3|1|1|1.1
cooper|Cooper|CRAFT|carpentry|plastics||1.5|1|1
wheelwright|Wheelwright|CRAFT|wheel|cars||1|1|1.1|n
cobbler|Cobbler|CRAFT|tanning|massprod||2|0|0.9
tailor|Tailor|CRAFT|weaving|||2|1|1
goldsmith|Goldsmith|CRAFT|currency||mint:2|0.4|1|1.8
clockmaker|Clockmaker|CRAFT|clocks|transistors||0.4|1|1.5
printer|Printer|CRAFT|printing|computers|printshop:4|0.5|2|1.4|n
miller|Miller|CRAFT|watermill|massprod|mill:2,windmill:2|0.5|0|1
millwright|Millwright|CRAFT|watermill|electric||0.5|1|1.3
gunsmith|Gunsmith|CRAFT|gunpowder|massprod|gunfoundry:4,armsfactory:6|0.3|1|1.4
millhand|Mill hand|CRAFT|factory|robotics|textile:20|6|0|0.9|n
factoryhand|Factory worker|CRAFT|factory|robotics|factory:15,cannery:10|5|0|1
machinist|Machinist|CRAFT|steam||foundry:4|2|1|1.4
steelworker|Steelworker|CRAFT|steel||steelworks:20|0|0|1.2
assembler|Assembly-line worker|CRAFT|massprod|robotics|carplant:30,munitions:12|5|0|1.2|n
chemist|Industrial chemist|CRAFT|fertilizer||plasticsplant:4|0.5|3|2
refiner|Refinery worker|CRAFT|combustion||refinery:12|0|1|1.4
electronics|Electronics technician|CRAFT|transistors||chipfab:20|2|2|1.6
robottech|Robotics technician|CRAFT|robotics||robotworks:15|2|2|1.8|n
batteryhand|Battery-plant worker|CRAFT|batteries||gigafactory:30|0|1|1.4
nanofab|Nanofabricator|CRAFT|nanotech|||2|3|2.2
merchant|Merchant|TRADE|barter|||4|1|2.2
stallholder|Market trader|TRADE|wheel||market:6,bazaar:10|2|0|1.3
caravaneer|Caravaneer|TRADE|caravans|railway|caravanserai:6|1|0|1.5|n
carter|Carter|TRADE|wheel|lorries||3|0|1|n
coachman|Coachman|TRADE|carriages|cars|coachinn:4|1|0|1|n
shopkeeper|Shopkeeper|TRADE|currency|||6|1|1.6
moneychanger|Moneychanger|TRADE|currency|banking||0.5|1|2
banker|Banker|TRADE|banking||bank:6,desk_fin:0.3|0.6|2|3.2
shipagent|Shipping agent|TRADE|insurance||warehouse:3|0.5|2|1.9
broker|Stockbroker|TRADE|stockmarket||exchange:8,desk_fin:0.1|0.3|2|3.5
docker|Docker|TRADE|ships|containers|merchantport:10,wharf:4|2|0|1.2|n
salesman|Travelling salesman|TRADE|railway|ecommerce||2|1|1.5
railwayman|Railwayman|TRADE|railway||station:12,grandstation:30,trainyard:20|1|1|1.3
shopassistant|Shop assistant|TRADE|factory||mall:40,supermarket:25|8|0|1
cashier|Cashier|TRADE|supermarkets|agi|supermarket:15|3|0|1|n
adman|Advertising executive|TRADE|radio||desk_media:0.2|0.6|3|2.6
trucker|Lorry driver|TRADE|lorries|autopilot||4|0|1.3|n
secretary|Secretary|SERVICE|typewriter|thinkingmachines|desk_gen:0.1,desk_law:0.08|0|1|1.2
receptionist|Receptionist|SERVICE|telephone|agi|desk_gen:0.04|0|1|1|n
officemgr|Office manager|TRADE|accounts||desk_gen:0.08,desk_trade:0.08,desk_tech:0.05,desk_media:0.05|0|2|2.4
insurer|Insurance underwriter|TRADE|maritimeloans||desk_fin:0.15|0|2|2.6
actuary|Actuary|SCHOLAR|statistics||desk_fin:0.04|0|3|3
estateagent|Estate agent|TRADE|banking||desk_trade:0.1|0|1|1.8
shippingclerk|Shipping clerk|TRADE|commenda||desk_trade:0.35|0|2|1.5
consultant|Management consultant|SCHOLAR|massprod||desk_gen:0.08|0|3|3
hrofficer|Personnel officer|SERVICE|massprod||desk_gen:0.05|0|2|1.9
callcentre|Call-centre worker|SERVICE|telephone|agi|desk_gen:0.15|0|1|0.9|n
paralegal|Paralegal|SCHOLAR|law||desk_law:0.3|0|2|1.6
taxofficer|Tax officer|SERVICE|currency||desk_gov:0.2|0|2|1.6
editor|Editor|SCHOLAR|printing||desk_media:0.15|0|3|2.2
marketing|Marketing officer|TRADE|radio||desk_media:0.15,desk_gen:0.03|0|2|2.2
designer|Designer|CRAFT|computers||desk_media:0.1,desk_tech:0.08|0|3|2.2
analyst|Business analyst|SCHOLAR|computers||desk_fin:0.08,desk_gen:0.05,desk_tech:0.07|0|3|2.6
itsupport|IT support|SCHOLAR|computers||desk_gen:0.05,desk_tech:0.1|0|2|1.8
architect|Architect|SCHOLAR|engineering||desk_gen:0.03|0.1|3|2.6
craneman|Container crane operator|TRADE|containers|robotics|containerport:12|0|1|1.6
boatwright|Boatwright|CRAFT|rafts|massprod|boatyard:4,slipway:3|0.3|1|1.2
harbourpilot|Harbour pilot|SAILOR|navigation|autopilot|wetdock:2,companydocks:2,merchantport:2|0.1|2|2.4
lighterman|Lighterman|SAILOR|sailing|containers||0.4|0|1|n
quant|Quant trader|TRADE|computers|agi|exchange:3,desk_fin:0.06|0.1|3|4
courier|Delivery driver|TRADE|ecommerce|autopilot|ecentre:20|3|0|1.1
scribe|Scribe|SCHOLAR|writing|printing|scribe:3|2|2|1.8|n
astronomer|Astronomer|SCHOLAR|astronomy||observatory:3|0.2|3|2
philosopher|Philosopher|SCHOLAR|philosophy||academy:4|0.3|3|1.8
librarian|Librarian|SCHOLAR|paper||library:3,greatlibrary:8|0.3|2|1.4
clerk|Clerk|SCHOLAR|accounts|computers|desk_gen:0.25,desk_trade:0.2,desk_gov:0.15|6|2|1.4|n
accountant|Accountant|SCHOLAR|accounts||desk_gen:0.05,desk_fin:0.15,desk_trade:0.1|1|2|2
lawyer|Lawyer|SCHOLAR|law||courthouse:4,desk_law:0.45|0.6|3|3
journalist|Journalist|SCHOLAR|printing||printshop:2,desk_media:0.35|0.5|2|1.6
teacher|Schoolteacher|SCHOLAR|schools||school:6|4|2|1.4
professor|Professor|SCHOLAR|university||university:10,campus:30|0.3|3|2.4
scientist|Research scientist|SCHOLAR|science||lab:12|0.4|3|2.4
engineer|Engineer|SCHOLAR|steam|||1.5|3|2.3
typist|Typist|SCHOLAR|typewriter|computers|desk_gen:0.1,desk_law:0.1|3|2|1.3|n
programmer|Programmer|SCHOLAR|computers||datacentre:10,techcampus:60,desk_tech:0.5|3|3|2.8|n
datasci|Data scientist|SCHOLAR|internet||desk_tech:0.15|1|3|2.8
geneticist|Geneticist|SCHOLAR|genetics||genecentre:20|0.2|3|2.8
quantumeng|Quantum engineer|SCHOLAR|quantum||quantumlab:20|0.2|3|3.2
aitrainer|AI trainer|SCHOLAR|agi|||2|2|2|n
spearman|Spearman|SOLDIER|phalanx|musket||5|0|1
legionary|Legionary|SOLDIER|legions|musket||5|1|1.2
archer|Archer|SOLDIER|bow|musket|archery:6|3|0|1
knight|Knight|SOLDIER|knights|musket|stable:2|0.5|1|2.5|n
musketeer|Musketeer|SOLDIER|musket|rifle||6|0|1
gunner|Gunner|SOLDIER|cannon||gunfoundry:4,fort2:6|1|1|1.2
rifleman|Rifleman|SOLDIER|rifle|||6|0|1.1
officer|Officer|SOLDIER|legions||warcollege:6,barracks:2|1|2|2.2
tankcrew|Tank crew|SOLDIER|tanks||tankworks:6|1|1|1.4
pilot|Military pilot|SOLDIER|bomber||airbase:10,fighterbase:15|0.3|2|2.4
droneop|Drone operator|SOLDIER|combatdrones||dronebase:12|0.3|2|2|n
cybersoldier|Cyber soldier|SOLDIER|cyberwar||cybercmd:15|0.2|3|2.6
healer|Healer|SERVICE|herbs|medicine|healer:2|1|0|1
midwife|Midwife|SERVICE|midwifery|||1|1|1.1
priest|Priest|SERVICE|priests||temple:3,cathedral:8,shrine:1,templecomplex:10|2|1|1.2
monk|Monk|SERVICE|theology||monastery:10|0|1|0.6
servant|Domestic servant|SERVICE|kingship|massprod||10|0|0.6|n
innkeeper|Innkeeper|SERVICE|caravans||coachinn:3,caravanserai:2|1|0|1.1
cook|Cook|SERVICE|baking|||3|0|1
physician|Physician|SERVICE|medicine||infirmary:3,hospital:6|0.8|3|2.6
surgeon|Surgeon|SERVICE|surgery||hospital:3,medcentre:10,teachhosp:6|0.2|3|3.2
apothecary|Apothecary|SERVICE|apothecary|pharma|apothecary:2|0.4|2|1.6
nurse|Nurse|SERVICE|nursing||hospital:15,clinic:6,medcentre:40|3|2|1.4
pharmacist|Pharmacist|SERVICE|pharma|||0.6|3|2.2
taxman|Tax collector|SERVICE|taxation|computers||0.6|1|1.6
civilservant|Civil servant|SERVICE|law||forum:4,parliament:10,courthouse:3,desk_gov:0.6|2|2|1.7
watchman|Night watchman|SERVICE|townwatch|welfare|watchhouse:4|1|0|0.9|n
police|Police officer|SERVICE|welfare||police:15|2|1|1.4
firefighter|Firefighter|SERVICE|firewardens||fireward:4,firestation:12|1|1|1.3
lamplighter|Lamplighter|SERVICE|gaslight|lightbulb|gasworks:4|1|0|0.8|n
postman|Postman|SERVICE|couriers|internet||1.5|1|1.1|n
telephonist|Telephone operator|SERVICE|telephone|computers|phoneexchange:15|1|1|1.1|n
tramdriver|Tram driver|SERVICE|trams|motorbus|tram:10|0.5|0|1.1
busdriver|Bus driver|SERVICE|motorbus|autopilot|busdepot:15|1|0|1.2
entertainer|Entertainer|SERVICE|citizenship||amphitheatre:4,theatre:6,hippodrome:6,stadium:10,cinema:4|1|0|1.2
actor|Actor|SERVICE|humanism||theatre:6,filmstudio:20|0.3|1|1.5
careworker|Care worker|SERVICE|welfare||almshouse:4|4|1|1
socialworker|Social worker|SERVICE|welfare|||1|3|1.5
binman|Sanitation worker|SERVICE|sewerworks||sewers:8,recyclecentre:10|2|0|1.1
itsupport|IT support|SERVICE|internet|||2|2|1.6
tourguide|Tour guide|SERVICE|masstourism||resort:10,themepark:20,museum:3|1|1|1.1
influencer|Influencer|SERVICE|socialmedia|||1|0|1.2|n
oarsman|Oarsman|SAILOR|triremes|navigation||4|0|0.9
seaman|Able seaman|SAILOR|sailing|||4|0|1
shipwright|Shipwright|SAILOR|ships||shipyard:6|1|1|1.3
navigator|Navigator|SAILOR|navigation|gps||0.4|2|2
stoker|Stoker|SAILOR|steamship|combustion||2|0|1|n
marineeng|Marine engineer|SAILOR|steamship|||0.6|2|1.9
harbourpilot|Harbour pilot|SAILOR|navigation||merchantport:2,containerport:4|0.2|2|2
keeper|Lighthouse keeper|SAILOR|mapmaking|computers|lighthouse:2|0|0|0.9|n
vintner|Vintner|GARDEN|vineyards|||2|1|1.1
orchardist|Orchardist|GARDEN|orchards||orchard:4|2|0|0.9
beekeeper|Beekeeper|GARDEN|beekeeping||apiary:2|1|0|0.9
marketgardener|Market gardener|GARDEN|grafting||marketgarden:6|2|0|0.9
nurseryman|Nurseryman|GARDEN|seedbank||greenhouse:4,botanic:4|1|1|1
parkkeeper|Park keeper|GARDEN|sanitation||citypark:6|1|0|1
hydroponist|Hydroponics technician|GARDEN|hydroponics||verticalfarm:10,skyfarm:20|0.5|2|1.5`;
// Whoever doesn't have a trade of their own in a kind of work does the plain version of it, for less.
const CASUAL_NAME = { [J.FORAGE]: 'Gatherer', [J.HUNT]: 'Hunter', [J.FISH]: 'Fisher', [J.FARM]: 'Farmhand', [J.HERD]: 'Herder', [J.WOOD]: 'Woodcutter', [J.STONE]: 'Quarry hand', [J.CLAY]: 'Clay digger', [J.MINE]: 'Mine labourer', [J.BUILD]: 'Labourer', [J.CRAFT]: 'Workshop hand', [J.TRADE]: 'Pedlar', [J.SCHOLAR]: 'Tutor', [J.SOLDIER]: 'Soldier', [J.SERVICE]: 'Servant', [J.SAILOR]: 'Deckhand', [J.GARDEN]: 'Gardener' };
const OCCS = [];
const OCC_IX = {};
for (const line of OCC_SRC.trim().split('\n')) {
  const [id, name, job, tech, gone, wp, base, edu, pay, note] = line.trim().split('|');
  const O = { id, name, j: J[job], tech: tech ? TECH_IX[tech] : -1, gone: gone ? TECH_IX[gone] : -1, wp: [], base: +base, edu: +edu, pay: +pay, note: note === 'n', casual: false };
  if (O.j === undefined) throw new Error('bad trade ' + line);
  if (O.tech === undefined) continue;  // its invention isn't in this world
  if (O.gone === undefined) O.gone = -1;
  O.desk = null;
  if (wp) for (const s of wp.split(',')) { const [b, c] = s.split(':'); if (b.startsWith('desk_')) (O.desk || (O.desk = [])).push([b.slice(5), +c]); else if (BLD[b]) O.wp.push([b, +c]); }
  OCC_IX[id] = OCCS.length; OCCS.push(O);
}
// every quay needs its gangs: three dockers a berth, more where cargo is handled by hand
if (OCC_IX.docker !== undefined) { const O = OCCS[OCC_IX.docker]; for (const k of PORT_ALL) if (!O.wp.some(x => x[0] === k) && BLD[k].berths) O.wp.push([k, BLD[k].berths * ((BLD[k].era || 0) >= 7 ? 1.5 : 3)]); }
// the plain jobs go on the end, one for each kind of work
const CASUAL_IX = new Int16Array(J.N).fill(-1);
for (let j = J.FORAGE; j < J.N; j++) if (CASUAL_NAME[j]) { CASUAL_IX[j] = OCCS.length; OCCS.push({ id: 'casual' + j, name: CASUAL_NAME[j], j, tech: -1, gone: -1, wp: [], base: 0, edu: 0, pay: 0.8, note: false, casual: true }); }
const NO = OCCS.length;
const SELF_J = new Uint8Array(J.N);
for (const j of [J.FORAGE, J.HUNT, J.FISH, J.FARM, J.HERD, J.WOOD, J.STONE, J.CLAY, J.MINE, J.GARDEN, J.SAILOR, J.SOLDIER]) SELF_J[j] = 1;
const OCC_BY_J = []; for (let j = 0; j < J.N; j++) OCC_BY_J.push([]);
OCCS.forEach((O, k) => OCC_BY_J[O.j].push(k));
const EDU_NAME = ['No schooling', 'Apprenticed', 'Schooled', 'College-educated'];
// best-paid trades first when there aren't enough schooled people to go round
const OCC_PAY_ORDER = OCCS.map((O, k) => k).filter(k => !OCCS[k].casual && OCCS[k].edu > 0).sort((a, b) => OCCS[b].pay - OCCS[a].pay);

const occOpen = (t, O) => (O.tech < 0 || t.tech[O.tech]) && !(O.gone >= 0 && t.tech[O.gone]);
// Schooling spreads a generation at a time: the share with each level drifts towards what the town's schools can give.
function eduYear(t) {
  if (!t.eduMix) t.eduMix = new Float32Array(3);
  // with real schooling records (education.js) the town's levels are just what its people have
  if (t.edu && t.edu.mix) { const M = t.edu.mix, E0 = t.eduMix; for (let q = 0; q < 3; q++) E0[q] += (M[q] - E0[q]) * 0.5; return; }
  const n = Math.max(tn(t), 1), E = t.eduMix, K = id => TECH_IX[id] !== undefined && t.tech[TECH_IX[id]];
  const c = id => t.count[id] || 0;
  const a1 = clamp(0.12 + (K('guilds') ? 0.2 : 0) + (K('printing') ? 0.08 : 0) + (K('schools') ? 0.15 : 0) + t.literacy * 0.3, 0, 0.95);
  const a2 = clamp(t.literacy * 0.92, 0, a1);
  const seats = c('academy') * 120 + c('university') * 500 + c('campus') * 1800 + c('lab') * 60 + c('teachhosp') * 200 + c('techcampus') * 400;
  const a3 = clamp((K('university') ? 0.01 : 0) + (K('science') ? 0.02 : 0) + (K('computers') ? 0.06 : 0) + (K('internet') ? 0.06 : 0) + seats / n * 3, 0, Math.min(0.55, a2));
  E[0] += (a1 - E[0]) * 0.06; E[1] += (a2 - E[1]) * 0.06; E[2] += (a3 - E[2]) * 0.05;
  if (E[1] > E[0]) E[1] = E[0]; if (E[2] > E[1]) E[2] = E[1];
}
function rollEdu(t) {
  const E = t.eduMix, r = rnd();
  return !E ? 0 : r < E[2] ? 3 : r < E[1] ? 2 : r < E[0] ? 1 : 0;
}
// The labour market for a year: how many of each trade the town wants, how many it can find with the right schooling,
// what each is paid, and how many people are left without work.
const _occD = new Float32Array(NO), _occF = new Float32Array(NO);
function labourYear(t) {
  if (t.nomad) return;
  const n = tn(t);
  if (n < 20) return;
  if (!t.occN || t.occN.length !== NO) { t.occN = new Float32Array(NO); t.occPay = new Float32Array(NO); t.occVac = new Float32Array(NO); for (let k = 0; k < NO; k++) t.occPay[k] = OCCS[k].pay; }
  eduYear(t);
  const sc = t.scale, cur = t.polity.cur, money = cur.kind >= 2, E = t.eduMix;
  const D = _occD, F = _occF; D.fill(0); F.fill(0);
  const left = new Float32Array(J.N);
  let workers = 0;
  for (let j = J.FORAGE; j < J.N; j++) { left[j] = t.jobs[j] * sc; workers += left[j]; }
  if (workers < 1) return;
  // what each trade is wanted for: a share of the town, plus the hands each workplace needs
  for (let k = 0; k < NO; k++) {
    const O = OCCS[k];
    if (O.casual || !occOpen(t, O)) continue;
    let d = O.base * n / 1000;
    for (const [b, c] of O.wp) d += (t.count[b] || 0) * c;
    if (O.desk && t.deskBy) for (const [k, c] of O.desk) d += (t.deskBy[k] || 0) * c;  // the desks the town's offices hold
    D[k] = d;
  }
  // no trade can take more than its own kind of work has people for: scale each kind's demand down to fit.
  // Land, sea and army work isn't hired by the place: everyone doing it follows one of its trades, bar a few hired hands.
  for (let j = J.FORAGE; j < J.N; j++) {
    let s = 0; for (const k of OCC_BY_J[j]) s += D[k];
    if (s <= 0) continue;
    const room = SELF_J[j] ? left[j] * 0.88 : left[j];
    // hired work: the trades grow with the town's trade (up to six times what its workplaces alone ask for),
    // and whoever's left over takes casual work
    const f = SELF_J[j] ? room / s : s > room ? room / s : Math.min(6, room * 0.8 / s);
    for (const k of OCC_BY_J[j]) D[k] *= f;
  }
  // schooled trades first, the best paid first, while there are schooled people to fill them
  const pool = [workers * E[0], workers * E[1], workers * E[2]];
  for (const k of OCC_PAY_ORDER) {
    if (!D[k]) continue;
    const O = OCCS[k], e = O.edu - 1;
    const take = Math.min(D[k], pool[e], left[O.j]);
    F[k] = take; left[O.j] -= take;
    for (let q = 0; q <= e; q++) pool[q] = Math.max(0, pool[q] - take);
  }
  for (let k = 0; k < NO; k++) {
    const O = OCCS[k];
    if (O.casual || O.edu > 0 || !D[k]) continue;
    const take = Math.min(D[k], left[O.j]); F[k] = take; left[O.j] -= take;
  }
  // and whoever's left in each kind of work does the plain version of it
  let casual = 0;
  for (let j = J.FORAGE; j < J.N; j++) { const k = CASUAL_IX[j]; if (k >= 0) { F[k] = left[j]; if (j >= J.WOOD && j !== J.SOLDIER) casual += left[j]; } }
  // trades that a new invention has just made pointless: their people are out of work, and the old take longest to find more
  const yr = Math.floor(year());
  let lost = 0;
  for (let k = 0; k < NO; k++) {
    const O = OCCS[k], was = t.occN[k];
    if (was >= 1 && !occOpen(t, O)) {
      lost += was * 0.6;
      if (O.note && was * 1 >= 15 && !(t.occNoteY > yr - 15)) {
        t.occNoteY = yr;
        chronT('misc', `${O.gone >= 0 ? TECHS[O.gone].name + ' puts' : 'The times put'} the ${O.name.toLowerCase()}s of ${t.name} out of work: ${Math.round(was)} of them.`, t);
      }
      for (const p of t.members) if (p.occ === k) { p.lostOcc = k; p.occ = -1; }
    }
    if (O.note && was < 1 && F[k] >= 1) {
      W.occFirst = W.occFirst || {};
      if (!W.occFirst[O.id] && tn(t) >= 80) { W.occFirst[O.id] = yr; chronT('misc', `The world's first ${O.name.toLowerCase()}s go to work in ${t.name}.`, t); }
    }
  }
  t.displaced = (t.displaced || 0) * 0.7 + lost;
  // unemployment: people between jobs, people whose trade has gone, a slump, and too many chasing casual work
  let u = 0;
  if (money) {
    u = 0.02 + t.displaced / workers + cur.slump * 0.1 + Math.max(0, casual / workers - 0.3) * 0.3 + Math.max(0, t.crowd - 1) * 0.08 - (cur.boom || 0) * 0.02;
    if (t.tech[TECH_IX.welfare]) u *= 0.9;
    u = clamp(u, 0, 0.45);
  }
  t.unemp = t.unemp * 0.5 + u * 0.5;
  // pay: trades that can't be filled pay more; plain work pays less the more people want it
  let vacS = 0, demS = 0;
  for (let k = 0; k < NO; k++) {
    const O = OCCS[k], vac = D[k] > 0.5 ? Math.max(0, D[k] - F[k]) / D[k] : 0;
    t.occVac[k] = Math.max(0, D[k] - F[k]);
    const target = O.pay * (1 + vac * 0.9) * (O.casual ? 1 - t.unemp : 1) * (1 + O.edu * 0.04 * (1 - E[Math.max(0, O.edu - 1)]));
    t.occPay[k] = t.occPay[k] * 0.7 + target * 0.3;
    t.occN[k] = F[k];
    if (O.edu >= 2) { vacS += t.occVac[k]; demS += D[k]; }
  }
  // a town short of its engineers, clerks and doctors works worse; one with plenty of them works better
  const skilled = (workers * E[1]) / Math.max(n * 0.3, 1);
  const q = clamp(1 - (demS > 1 ? vacS / demS : 0) * 0.25 + Math.min(skilled, 1) * 0.08, 0.82, 1.1);
  if (Math.abs(q - (t.labQ || 1)) > 0.01) { t.labQ = q; recomputeMods(t); }
  // out of work for long is its own kind of unrest
  t.unrest = Math.max(0, t.unrest + Math.max(0, t.unemp - 0.06) * (t.tech[TECH_IX.welfare] ? 22 : 45));
  if (t.unemp > 0.2 && n > 300 && !(t.unempNoteY > yr - 25)) { t.unempNoteY = yr; chronT('collapse', `One in ${Math.round(1 / t.unemp)} in ${t.name} can't find work. Queues form at every gate that's hiring.`, t); }
  assignTrades(t);
}
// The people simulated one by one get trades in the same proportions, keeping the one they have if it still exists.
function assignTrades(t) {
  const sc = t.scale, quota = new Float32Array(NO);
  for (let k = 0; k < NO; k++) quota[k] = t.occN[k] / sc;
  const working = [];
  for (const p of t.members) {
    if (p.job <= J.ELDER) { p.occ = -1; continue; }
    if (p.edu < 0) p.edu = rollEdu(t);
    working.push(p);
    // keep the trade while there's room for it (a small town's share of a trade can be a fraction of a person)
    if (p.occ >= 0 && OCCS[p.occ].j === p.job && quota[p.occ] > 0.3) { quota[p.occ]--; continue; }
    p.occ = p.occ >= 0 ? -3 : -2;  // -3: had a trade and has to change it
  }
  for (const p of working) {
    if (p.occ > -2) continue;
    const changing = p.occ === -3;
    const L = OCC_BY_J[p.job];
    let best = -1, bs = 0;
    for (const k of L) { if (quota[k] <= 0 || OCCS[k].edu > p.edu) continue; const s = quota[k] * (0.5 + rnd()); if (s > bs) { bs = s; best = k; } }
    if (best < 0) best = CASUAL_IX[p.job];
    if (best < 0) { p.occ = -1; continue; }
    // skill belongs to the kind of work (planJobs resets it on a real change); a new trade within it keeps most of it
    p.occ = best; quota[best]--;
    if (changing && OCCS[best].edu >= 2) p.skill = Math.max(0, p.skill - 2);
  }
  // who's out of work: those whose trade has gone first, then whoever's unlucky
  let idle = Math.round(working.length * (t.unemp || 0));
  working.sort((a, b) => (b.lostOcc >= 0 ? 2 : 0) + (ageOf(b) > 45 ? 1 : 0) - (a.lostOcc >= 0 ? 2 : 0) - (ageOf(a) > 45 ? 1 : 0) + (rnd() - 0.5));
  for (const p of working) {
    if (idle > 0 && p.job !== J.SOLDIER && !p.army) { idle--; p.idleY++; }
    else { p.idleY = 0; if (p.lostOcc >= 0 && rnd() < 0.4) p.lostOcc = -1; }
  }
}
const occName = p => p.occ >= 0 ? OCCS[p.occ].name : JOB_NAME[p.job];
// What a person is paid against the plain rate for their kind of work.
const occPayOf = p => p.occ >= 0 && p.town.occPay ? p.town.occPay[p.occ] : JOB_PAY[p.job];
function townWorkHTML(t) {
  if (!t.occN) return '';
  const rows = [];
  for (let k = 0; k < NO; k++) if (t.occN[k] >= 0.5) rows.push(k);
  rows.sort((a, b) => t.occN[b] - t.occN[a]);
  const max = rows.length ? t.occN[rows[0]] : 1;
  const short = [];
  for (let k = 0; k < NO; k++) if (t.occVac[k] >= 1 && t.occVac[k] > t.occN[k] * 0.15) short.push(k);
  short.sort((a, b) => t.occVac[b] - t.occVac[a]);
  const E = t.eduMix || [0, 0, 0];
  const u = t.unemp || 0, wage = t.wage || 0, cn = t.polity.cur.kind >= 2 ? t.polity.cur.name : null;
  return `${cn ? bar('Out of work', u, 0.4, u > 0.12 ? '#e0705a' : '#c8a45a', Math.round(u * 100) + '%') : ''}
  <div class="sub">Schooling: ${Math.round(E[0] * 100)}% apprenticed or better, ${Math.round(E[1] * 100)}% schooled, ${Math.round(E[2] * 100)}% college.${t.displaced > 1 ? ` About ${fmt(Math.round(t.displaced))} lost a trade to a new invention and are still looking.` : ''}</div>
  ${rows.slice(0, 9).map(k => bar(esc(OCCS[k].name), t.occN[k], max, JOB_COLOR[OCCS[k].j], `${fmt(Math.round(t.occN[k]))}${cn ? ' · ' + fmtMoney(wage * t.occPay[k]) : ''}`)).join('')}
  ${rows.length > 9 ? `<div class="sub">and ${rows.length - 9} more trades.</div>` : ''}
  ${short.length ? `<div class="sub" style="color:#f0b46a">Short of ${short.slice(0, 4).map(k => OCCS[k].name.toLowerCase() + 's').join(', ')}.</div>` : ''}`;
}

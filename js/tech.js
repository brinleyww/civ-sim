'use strict';
// Goods, jobs, the technology web and every building. Inventions need real preconditions: nobody smelts bronze without tin.

const R = { FOOD: 0, WOOD: 1, STONE: 2, CLAY: 3, BRICK: 4, COPPER: 5, TIN: 6, IRON: 7, COAL: 8, BRONZE: 9, STEEL: 10, TOOLS: 11, CLOTH: 12, GOODS: 13, OIL: 14, GOLD: 15, SALT: 16, SULFUR: 17, URANIUM: 18, GEMS: 19, N: 20 };
const RES_NAME = ['Food', 'Wood', 'Stone', 'Clay', 'Brick', 'Copper', 'Tin', 'Iron ore', 'Coal', 'Bronze', 'Steel', 'Tools', 'Cloth', 'Pottery & goods', 'Oil', 'Gold', 'Salt', 'Sulphur', 'Uranium', 'Gems & silver'];
const J = { NONE: 0, CHILD: 1, ELDER: 2, FORAGE: 3, HUNT: 4, FISH: 5, FARM: 6, HERD: 7, WOOD: 8, STONE: 9, CLAY: 10, MINE: 11, BUILD: 12, CRAFT: 13, TRADE: 14, SCHOLAR: 15, SOLDIER: 16, SERVICE: 17, SAILOR: 18, GARDEN: 19, N: 20 };
const JOB_NAME = ['Idle', 'Child', 'Elder', 'Forager', 'Hunter', 'Fisher', 'Farmer', 'Herder', 'Woodcutter', 'Quarrier', 'Clay digger', 'Miner', 'Builder', 'Craftsperson', 'Merchant', 'Scholar', 'Soldier', 'Public servant', 'Sailor', 'Planter'];
const JOB_COLOR = ['#cfcfcf', '#f0e3b0', '#b9b2a6', '#7fbf4d', '#b5662a', '#4aa3d8', '#e3c23c', '#c9a77a', '#6b8e23', '#9aa0a6', '#c08552', '#5b5f66', '#e8863a', '#a35fd0', '#3cc0a8', '#f4f1de', '#d63b3b', '#6a8fe0', '#2f7fb8', '#5fbf7a'];

const ERAS = ['Old Stone Age', 'New Stone Age', 'Bronze Age', 'Iron Age', 'Middle Ages', 'Renaissance', 'Industrial Age', 'Modern Age', 'Space Age', 'Information Age', 'Fusion Age', 'Orbital Age', 'Interplanetary Age', 'Stellar Age'];

// dom: the kind of labour whose practitioners stumble on the idea. diff: person-years of practice, roughly.
// cond: what must physically be around. carry: true when the tech can't spread to a town without the same condition.
const TECHS = [
  { id: 'fire', name: 'Fire', era: 0, start: 1, desc: 'Warmth, cooking and protection.' },
  { id: 'stonetools', name: 'Stone Tools', era: 0, start: 1, desc: 'Knapped flint blades and scrapers.' },
  { id: 'gathering', name: 'Gathering & Hunting', era: 0, start: 1, desc: 'Knowing the land: which plants feed you and where the herds go.' },

  { id: 'fishing', name: 'Fishing', era: 0, dom: J.FORAGE, diff: 900, req: [], cond: t => t.near.water > 0, condText: 'Lives by water', fx: {} , desc: 'Hooks, nets and weirs. Coasts and rivers can now feed people.' },
  { id: 'hides', name: 'Sewn Clothing', era: 0, dom: J.HUNT, diff: 1400, req: [], fx: { cold: 0.5 }, desc: 'Bone needles and hides let people survive cold winters.' },
  { id: 'bow', name: 'Bow & Arrow', era: 0, dom: J.HUNT, diff: 2200, req: [], fx: { hunt: 1.4, attack: 1.2 }, desc: 'Kills from a distance. Hunting improves sharply, and so does war.' },
  { id: 'herbs', name: 'Herbal Lore', era: 0, dom: J.FORAGE, diff: 2600, req: [], fx: { health: 0.92, infant: 0.9, forage: 1.1 }, desc: 'Generations of knowing which plants heal.' },
  { id: 'rafts', name: 'Dugout Boats', era: 0, dom: J.FISH, diff: 1600, req: ['fishing'], cond: t => t.near.water > 0, condText: 'Lives by water', fx: { sail: 1, fish: 1.3 }, desc: 'Hollowed logs can hug the coast and cross straits.' },

  { id: 'agriculture', name: 'Agriculture', era: 1, dom: J.FORAGE, diff: 14000, req: [], cond: t => t.near.wild > 0 || t.crop > 0, condText: 'Wild crops growing nearby', fx: {}, desc: 'Saved seed becomes a planted field. People can stay put, and numbers explode.' },
  { id: 'husbandry', name: 'Animal Husbandry', era: 1, dom: J.HUNT, diff: 9000, req: [], cond: t => t.near.domHerd > 0, condText: 'Tameable animals nearby', fx: {}, desc: 'Herds that follow you: meat, milk, wool and muscle.' },
  { id: 'pottery', name: 'Pottery', era: 1, dom: J.CLAY, alt: J.FORAGE, diff: 2800, req: [], cond: t => t.near.clay > 0 && !t.nomad, condText: 'Settled near clay', fx: { spoil: 0.8 }, desc: 'Fired clay stores grain safely from damp and mice.' },
  { id: 'weaving', name: 'Weaving', era: 1, dom: J.HERD, alt: J.FARM, diff: 3200, req: ['agriculture'], fx: { cold: 0.7 }, desc: 'Spun fibre and wool become cloth, sails and trade goods.' },
  { id: 'mudbrick', name: 'Mud Brick', era: 1, dom: J.BUILD, diff: 2600, req: ['pottery'], fx: { build: 1.1 }, desc: 'Sun-dried and fired bricks replace reed huts.' },
  { id: 'granary', name: 'Granaries', era: 1, dom: J.FARM, diff: 3000, req: ['agriculture', 'pottery'], fx: { spoil: 0.6, store: 1.5 }, desc: 'Sealed storage lets a good harvest outlast a bad year.' },
  { id: 'irrigation', name: 'Irrigation', era: 1, dom: J.FARM, diff: 5200, req: ['agriculture'], cond: t => t.near.river > 0, condText: 'Farms near a river', fx: { farm: 1.3, drought: 0.6 }, desc: 'Channels carry river water to the fields, softening drought.' },
  { id: 'plough', name: 'The Plough', era: 1, dom: J.FARM, diff: 8000, req: ['agriculture', 'husbandry'], fx: { farm: 1.35, fields: 1 }, desc: 'Oxen drag a blade: one farmer tends far more land.' },
  { id: 'wheel', name: 'The Wheel', era: 1, dom: J.CRAFT, diff: 8000, req: ['pottery', 'husbandry'], fx: { cargo: 1.6, craft: 1.1 }, desc: "Born on the potter's bench, it soon pulls carts." },
  { id: 'sailing', name: 'Sailing', era: 1, dom: J.FISH, diff: 7000, req: ['rafts', 'weaving'], fx: { fish: 1.2, cargo: 1.15, seaRange: 1.5 }, desc: 'Cloth catches the wind. Sea trade begins.' },

  { id: 'copper', name: 'Copper Working', era: 2, dom: J.CRAFT, diff: 4500, req: ['pottery'], cond: t => t.near.copper > 0 || t.stock[R.COPPER] > 0, condText: 'Copper nearby', fx: {}, desc: 'A kiln hot enough for pots turns green rock into metal.' },
  { id: 'bronze', name: 'Bronze', era: 2, dom: J.CRAFT, diff: 7000, req: ['copper'], cond: t => (t.near.tin > 0 || t.stock[R.TIN] > 0) && (t.near.copper > 0 || t.stock[R.COPPER] > 0), condText: 'Both copper and tin, mined or traded', fx: { tier: 1, attack: 1.3 }, desc: 'Copper and tin make a hard alloy. Long tin trade routes become vital.' },
  { id: 'masonry', name: 'Masonry', era: 2, dom: J.STONE, alt: J.BUILD, diff: 6500, req: ['mudbrick'], cond: t => t.near.stone > 0 || t.stock[R.STONE] > 10, condText: 'Stone available', fx: { defend: 1.25, build: 1.1 }, desc: 'Cut stone: lasting walls, temples and homes.' },
  { id: 'writing', name: 'Writing', era: 2, dom: J.SCHOLAR, alt: J.TRADE, diff: 9000, req: ['pottery', 'granary'], cond: t => tn(t) >= 45, condText: 'A town large enough to need records', fx: { research: 1.6, keep: 1 }, desc: 'Tallies of grain become script. Knowledge outlives those who know it.' },
  { id: 'calendar', name: 'Calendar', era: 2, dom: J.SCHOLAR, alt: J.FARM, diff: 6000, req: ['agriculture'], fx: { farm: 1.12 }, desc: 'Watching the sky tells you exactly when to plant.' },
  { id: 'math', name: 'Mathematics', era: 2, dom: J.SCHOLAR, diff: 8000, req: ['writing'], fx: { research: 1.25, build: 1.1 }, desc: 'Measuring land and grain grows into true reasoning about number.' },
  { id: 'law', name: 'Code of Law', era: 2, dom: J.SCHOLAR, alt: J.SERVICE, diff: 9000, req: ['writing'], cond: t => tn(t) >= 70, condText: 'Town of 70 or more', fx: { admin: 25 }, desc: 'Written law holds together people who never meet.' },
  { id: 'currency', name: 'Currency', era: 2, dom: J.TRADE, diff: 9000, req: ['bronze', 'writing'], fx: { cargo: 1.3, trade: 1.25 }, desc: 'Coin replaces barter; merchants range further.' },
  { id: 'riding', name: 'Horse Riding', era: 2, dom: J.HERD, diff: 6000, req: ['husbandry'], cond: t => t.near.horse > 0, condText: 'Wild horses nearby', fx: { speed: 1.1, attack: 1.2, cargo: 1.2 }, desc: 'Horses shrink distance for messengers, traders and raiders.' },
  { id: 'ships', name: 'Shipbuilding', era: 2, dom: J.TRADE, alt: J.FISH, diff: 9000, req: ['sailing', 'bronze'], fx: { cargo: 1.3, seaRange: 1.5 }, desc: 'Keels and planked hulls carry cargo across seas.' },

  { id: 'iron', name: 'Iron Smelting', era: 3, dom: J.CRAFT, alt: J.MINE, diff: 12000, req: ['bronze'], cond: t => t.near.iron > 0 || t.stock[R.IRON] > 0, condText: 'Iron ore available', fx: { tier: 1, attack: 1.25, wood: 1.15 }, desc: 'Common ore and hotter furnaces. Metal stops being a luxury.' },
  { id: 'paved', name: 'Paved Roads', era: 3, dom: J.BUILD, diff: 12000, req: ['masonry', 'wheel'], fx: { paved: 1, admin: 20, trade: 1.15 }, desc: 'Stone roads bind distant towns together.' },
  { id: 'engineering', name: 'Engineering', era: 3, dom: J.BUILD, alt: J.SCHOLAR, diff: 15000, req: ['masonry', 'math'], fx: { build: 1.3, planned: 1, wood: 1.1 }, desc: 'Cranes, arches and aqueducts. Cities start being laid out on purpose.' },
  { id: 'philosophy', name: 'Philosophy', era: 3, dom: J.SCHOLAR, diff: 16000, req: ['writing', 'law'], fx: { research: 1.4 }, desc: 'Asking why, and teaching others to ask.' },
  { id: 'medicine', name: 'Medicine', era: 3, dom: J.SCHOLAR, alt: J.SERVICE, diff: 15000, req: ['writing', 'herbs'], fx: { health: 0.86, infant: 0.85, plague: 0.8 }, desc: 'Physicians record what cures and what kills.' },
  { id: 'watermill', name: 'Water Mills', era: 3, dom: J.CRAFT, diff: 14000, req: ['wheel', 'engineering'], cond: t => t.near.river > 0, condText: 'A river to turn the wheel', fx: { farm: 1.18, craft: 1.2 }, desc: 'Rivers do the grinding. The first machines.' },

  { id: 'rotation', name: 'Crop Rotation', era: 4, dom: J.FARM, diff: 20000, req: ['plough', 'calendar', 'iron'], fx: { farm: 1.25, deplete: 0.4 }, desc: 'Legumes and fallow years keep soil from wearing out.' },
  { id: 'windmill', name: 'Windmills', era: 4, dom: J.CRAFT, diff: 18000, req: ['watermill', 'engineering'], fx: { farm: 1.1, craft: 1.1 }, desc: 'Power anywhere the wind blows.' },
  { id: 'compass', name: 'The Compass', era: 4, dom: J.TRADE, alt: J.SCHOLAR, diff: 22000, req: ['iron', 'math', 'ships'], fx: { seaRange: 1.4 }, desc: 'A magnetised needle finds north under any sky.' },
  { id: 'paper', name: 'Paper', era: 4, dom: J.CRAFT, alt: J.SCHOLAR, diff: 18000, req: ['weaving', 'writing'], fx: { research: 1.25 }, desc: 'Cheap writing material. Records multiply.' },
  { id: 'university', name: 'Universities', era: 4, dom: J.SCHOLAR, diff: 30000, req: ['philosophy', 'paper'], cond: t => tn(t) >= 130, condText: 'City of 130 or more', fx: { research: 1.5 }, desc: 'Scholars gather, argue and train successors.' },
  { id: 'banking', name: 'Banking', era: 4, dom: J.TRADE, diff: 26000, req: ['currency', 'math'], fx: { trade: 1.3, cargo: 1.25 }, desc: 'Credit lets ventures outrun coin.' },
  { id: 'optics', name: 'Optics', era: 4, dom: J.SCHOLAR, diff: 26000, req: ['math', 'paper'], fx: { research: 1.2 }, desc: 'Lenses extend the working life of old eyes and reveal the very far and very small.' },
  { id: 'gunpowder', name: 'Gunpowder', era: 4, dom: J.CRAFT, alt: J.SCHOLAR, diff: 30000, req: ['iron', 'paper'], cond: t => t.near.sulfur > 0 || t.stock[R.SULFUR] > 0 || t.near.coal > 0, condText: 'Sulphur or coal-seam brimstone, mined or traded', fx: { attack: 1.6, mine: 1.15 }, desc: 'Charcoal, sulphur and saltpetre. Castles stop being safe.' },
  { id: 'printing', name: 'Printing Press', era: 4, dom: J.CRAFT, alt: J.SCHOLAR, diff: 40000, req: ['paper', 'iron'], fx: { research: 1.6, spread: 2 }, desc: 'Books become cheap, and ideas outrun their authors.' },

  { id: 'navigation', name: 'Ocean Navigation', era: 5, dom: J.TRADE, alt: J.SCHOLAR, diff: 45000, req: ['compass', 'optics'], fx: { sail: 2, seaRange: 2.2 }, desc: 'Star tables and sturdy hulls open the deep ocean.' },
  { id: 'science', name: 'Scientific Method', era: 5, dom: J.SCHOLAR, diff: 70000, req: ['university', 'printing', 'optics'], fx: { research: 1.9 }, desc: 'Test it, publish it, and let others prove you wrong.' },
  { id: 'deepmine', name: 'Deep Mining', era: 5, dom: J.MINE, diff: 40000, req: ['iron', 'engineering'], fx: { mine: 1.5 }, desc: 'Shafts and pumps reach deep seams, including coal.' },
  { id: 'blast', name: 'Blast Furnace', era: 5, dom: J.CRAFT, alt: J.MINE, diff: 50000, req: ['deepmine'], cond: t => t.near.coal > 0 || t.stock[R.COAL] > 0, condText: 'Coal available', fx: { tier: 1, craft: 1.25 }, desc: 'Coke and forced air pour iron by the ton.' },
  { id: 'breeding', name: 'Selective Breeding', era: 5, dom: J.FARM, alt: J.HERD, diff: 50000, req: ['rotation', 'printing'], fx: { farm: 1.3, herd: 1.3 }, desc: 'Better seed and bigger stock, on purpose.' },

  { id: 'steam', name: 'Steam Engine', era: 6, dom: J.MINE, alt: J.SCHOLAR, diff: 90000, req: ['science', 'blast'], fx: { mine: 1.4, craft: 1.2 }, desc: 'First built to pump flooded mines. Then it moved everything else.' },
  { id: 'factory', name: 'Factory System', era: 6, dom: J.CRAFT, diff: 100000, req: ['steam', 'banking'], fx: { craft: 2.0, farm: 1.1 }, desc: 'Machines in one roof. Cities swallow the countryside.' },
  { id: 'railway', name: 'Railways', era: 6, dom: J.TRADE, alt: J.SCHOLAR, diff: 120000, req: ['steam'], fx: { rail: 1, cargo: 1.5, admin: 40 }, desc: 'Iron roads carry a town’s food and ore at the speed of steam.' },
  { id: 'steel', name: 'Mass Steel', era: 6, dom: J.CRAFT, alt: J.SCHOLAR, diff: 120000, req: ['blast', 'science'], fx: { tier: 1, build: 1.4 }, desc: 'Steel frames, cheap rails and taller buildings.' },
  { id: 'sanitation', name: 'Germ Theory & Sanitation', era: 6, dom: J.SCHOLAR, alt: J.SERVICE, diff: 120000, req: ['science', 'medicine'], fx: { health: 0.68, infant: 0.45, plague: 0.4 }, desc: 'Clean water and sewers save more lives than any drug.' },
  { id: 'vaccines', name: 'Vaccination', era: 6, dom: J.SCHOLAR, alt: J.SERVICE, diff: 140000, req: ['sanitation'], fx: { infant: 0.6, plague: 0.35 }, desc: 'Immunity without the disease.' },
  { id: 'fertilizer', name: 'Chemical Fertiliser', era: 6, dom: J.SCHOLAR, alt: J.FARM, diff: 160000, req: ['science', 'factory'], fx: { farm: 1.7, deplete: 0.3 }, desc: 'Nitrogen pulled from the air feeds billions.' },
  { id: 'telegraph', name: 'Telegraph', era: 6, dom: J.SCHOLAR, alt: J.TRADE, diff: 160000, req: ['science', 'railway'], fx: { spread: 2, admin: 60 }, desc: 'News outruns the fastest horse.' },

  { id: 'electric', name: 'Electricity', era: 7, dom: J.SCHOLAR, alt: J.CRAFT, diff: 220000, req: ['telegraph', 'steel'], fx: { craft: 1.5, research: 1.3 }, desc: 'Power on a wire, lighting every street.' },
  { id: 'combustion', name: 'Combustion Engine', era: 7, dom: J.CRAFT, alt: J.SCHOLAR, diff: 220000, req: ['steel', 'steam'], cond: t => t.near.oil > 0 || t.stock[R.OIL] > 0, condText: 'Oil, drilled or traded', fx: { farm: 1.5, fields: 3 }, desc: 'Tractors and trucks burn the ancient seas.' },
  { id: 'cars', name: 'Automobiles', era: 7, dom: J.CRAFT, diff: 260000, req: ['combustion', 'factory'], fx: { car: 1, cargo: 1.5 }, desc: 'Paved roads fill. Suburbs sprawl.' },
  { id: 'antibiotics', name: 'Antibiotics', era: 7, dom: J.SCHOLAR, alt: J.SERVICE, diff: 280000, req: ['vaccines'], fx: { health: 0.6, infant: 0.5, plague: 0.3 }, desc: 'A mould kills what once killed everyone.' },
  { id: 'massprod', name: 'Mass Production', era: 7, dom: J.CRAFT, diff: 300000, req: ['electric', 'factory'], fx: { craft: 1.8, build: 1.3 }, desc: 'The moving line.' },
  { id: 'flight', name: 'Powered Flight', era: 7, dom: J.SCHOLAR, alt: J.CRAFT, diff: 340000, req: ['combustion', 'electric'], fx: { plane: 1, trade: 1.2, spread: 2 }, desc: 'Oceans become an afternoon.' },
  { id: 'greenrev', name: 'Green Revolution', era: 7, dom: J.SCHOLAR, alt: J.FARM, diff: 400000, req: ['fertilizer', 'breeding', 'combustion'], fx: { farm: 1.9, fields: 2 }, desc: 'Dwarf grains and machinery multiply the harvest.' },
  { id: 'computers', name: 'Computers', era: 7, dom: J.SCHOLAR, diff: 600000, req: ['massprod', 'electric'], fx: { research: 2.5 }, desc: 'Machines that follow any instruction.' },

  { id: 'internet', name: 'The Internet', era: 8, dom: J.SCHOLAR, diff: 900000, req: ['computers', 'telegraph'], fx: { research: 1.8, spread: 3 }, desc: 'All knowledge, everywhere, instantly.' },
  { id: 'rockets', name: 'Rocketry', era: 8, dom: J.SCHOLAR, diff: 1000000, req: ['computers', 'flight'], fx: {}, desc: 'Controlled explosions reach orbit.' },
  { id: 'spaceflight', name: 'Crewed Spaceflight', era: 8, dom: J.SCHOLAR, diff: 1600000, req: ['rockets', 'internet'], fx: {}, desc: 'Someone from this world stands on another.' },
];
const knows = (t, id) => t.tech[TECH_IX[id]] === 1;
// An age arrives once most of the previous one is known, not with the first lucky early invention.
let ERA_MAIN = null;  // the age-making inventions by age, built on first use (TECHS is only complete once content.js has run)
function eraOfKnown(has) {
  if (!ERA_MAIN) { ERA_MAIN = ERAS.map(() => []); for (const T of TECHS) if (!T.side && ERA_MAIN[T.era]) ERA_MAIN[T.era].push(T); }
  let era = 0;
  for (let e = 1; e < ERAS.length; e++) {
    const P = ERA_MAIN[e - 1], N = ERA_MAIN[e];
    let prev = 0, cur = 0;
    for (const T of N) if (has(T)) { cur++; break; }
    if (!cur) break;
    for (const T of P) if (has(T)) prev++;
    if (prev >= P.length * 0.6) era = e; else break;
  }
  return era;
}

// ---- Buildings. House tiers go up as materials and knowledge allow; desert towns stay brick, forest towns stay timber. ----
const HOUSES = [
  { id: 'tent', name: 'Hide tent', cap: 5, cost: { [R.WOOD]: 1 }, work: 30, nomad: true },
  { id: 'hut', name: 'Thatched hut', cap: 5, cost: { [R.WOOD]: 4 }, work: 70 },
  { id: 'mudhouse', name: 'Mud-brick house', cap: 6, tech: 'mudbrick', cost: { [R.BRICK]: 5, [R.WOOD]: 1 }, work: 90 },
  { id: 'cottage', name: 'Timber house', cap: 7, tech: 'engineering', cost: { [R.WOOD]: 8 }, work: 90 },
  { id: 'stonehouse', name: 'Stone house', cap: 8, tech: 'masonry', cost: { [R.STONE]: 8, [R.WOOD]: 2 }, work: 120 },
  { id: 'townhouse', name: 'Townhouse', cap: 12, tech: 'printing', cost: { [R.BRICK]: 8, [R.WOOD]: 4, [R.GOODS]: 1 }, work: 130 },
  { id: 'tenement', name: 'Tenement', minPop: 130, cap: 22, tech: 'factory', cost: { [R.BRICK]: 16, [R.WOOD]: 4 }, work: 170 },
  { id: 'apartment', name: 'Apartment block', minPop: 240, cap: 40, tech: 'steel', cost: { [R.BRICK]: 16, [R.STEEL]: 8 }, work: 220 },
  // four to eight storeys of flats: for a crowded town that couldn't fill a tower. Built in one of a hundred styles (offices.js).
  { id: 'midrise', name: 'Mid-rise block', minPop: 200, cap: 50, tech: 'science', cost: { [R.BRICK]: 14, [R.STONE]: 6, [R.WOOD]: 4 }, work: 210 },
  { id: 'tower', name: 'High-rise', minPop: 420, cap: 80, tech: 'massprod', cost: { [R.STEEL]: 20, [R.BRICK]: 10 }, work: 300 },
  { id: 'skyscraper', name: 'Skyscraper', minPop: 900, cap: 170, tech: 'skyscrapers', cost: { [R.STEEL]: 34, [R.BRICK]: 14, [R.GOODS]: 4 }, work: 420 },
  { id: 'megablock', name: 'Mega-block', size: 2, minPop: 1600, cap: 520, tech: 'skyscrapers', cost: { [R.STEEL]: 70, [R.BRICK]: 40, [R.GOODS]: 8 }, work: 800 },
  { id: 'arcology', name: 'Arcology', size: 3, minPop: 3000, cap: 2200, tech: 'arcology', cost: { [R.STEEL]: 200, [R.BRICK]: 80, [R.GOODS]: 30 }, work: 2200 },
];
const HOUSE_IX = {}; HOUSES.forEach((H, i) => { H.tier = i; HOUSE_IX[H.id] = i; });

// want(t): how many this town would like. place: special siting rule. Recipes: {in, out, tech}.
const BLD = {
  hearth: { name: 'Camp hearth', size: 1, cost: {}, work: 1 },
  plaza: { name: 'Town square', size: 2, cost: { [R.WOOD]: 4 }, work: 60, want: t => (!t.nomad && tn(t) >= 25) ? 1 : 0 },
  granary: { name: 'Granary', size: 1, tech: 'granary', cost: { [R.WOOD]: 8, [R.BRICK]: 2 }, altCost: { [R.WOOD]: 12 }, work: 120, want: t => tn(t) >= 18 ? 1 + Math.floor(tn(t) / 120) : 0, store: 300, spoil: 1 },
  kiln: { name: 'Kiln', size: 1, tech: 'pottery', cost: { [R.WOOD]: 6, [R.CLAY]: 4 }, altCost: { [R.WOOD]: 10 }, work: 100, craft: 1, smoke: 1, want: t => tn(t) >= 12 ? 1 + Math.floor(tn(t) / 110) : 0 },
  weaver: { name: "Weaver's shed", size: 1, tech: 'weaving', cost: { [R.WOOD]: 8 }, work: 90, craft: 1, want: t => tn(t) >= 25 ? 1 + Math.floor(tn(t) / 180) : 0 },
  smelter: { name: 'Smelter', size: 1, tech: 'copper', cost: { [R.WOOD]: 6, [R.BRICK]: 5 }, altCost: { [R.WOOD]: 8, [R.STONE]: 6 }, work: 130, craft: 1, smoke: 1, want: t => (t.stock[R.COPPER] + t.stock[R.IRON] > 2 || t.mines.length) ? 1 + Math.floor(tn(t) / 220) : 0 },
  smithy: { name: 'Smithy', size: 1, tech: 'copper', cost: { [R.WOOD]: 8, [R.BRICK]: 3 }, altCost: { [R.WOOD]: 8, [R.STONE]: 4 }, work: 110, craft: 1, smoke: 1, want: t => (t.stock[R.BRONZE] + t.stock[R.STEEL] > 1 || t.count.smelter) && tn(t) >= 25 ? 1 + Math.floor(tn(t) / 160) : 0 },
  market: { name: 'Market', size: 2, tech: 'wheel', cost: { [R.WOOD]: 14, [R.BRICK]: 4 }, altCost: { [R.WOOD]: 18 }, work: 140, store: 150, want: t => tn(t) >= 45 ? 1 + Math.floor(tn(t) / 400) : 0 },
  temple: { name: 'Temple', size: 2, tech: 'mudbrick', cost: { [R.BRICK]: 16, [R.WOOD]: 6 }, altCost: { [R.STONE]: 16, [R.WOOD]: 6 }, work: 300, service: 1, want: t => tn(t) >= 55 ? 1 + Math.floor(tn(t) / 450) : 0 },
  scribe: { name: 'House of Tablets', size: 1, tech: 'writing', cost: { [R.BRICK]: 8, [R.WOOD]: 3 }, altCost: { [R.STONE]: 8, [R.WOOD]: 3 }, work: 160, study: 3, want: t => tn(t) >= 35 ? 1 + Math.floor(tn(t) / 140) : 0 },
  academy: { name: 'Academy', size: 2, tech: 'philosophy', cost: { [R.STONE]: 22, [R.WOOD]: 8 }, altCost: { [R.BRICK]: 22, [R.WOOD]: 8 }, work: 350, study: 7, want: t => tn(t) >= 90 ? 1 + Math.floor(tn(t) / 450) : 0 },
  university: { name: 'University', size: 2, tech: 'university', cost: { [R.STONE]: 30, [R.BRICK]: 20, [R.WOOD]: 10 }, work: 500, study: 18, want: t => tn(t) >= 130 ? 1 + Math.floor(tn(t) / 400) : 0 },
  lab: { name: 'Research laboratory', size: 2, tech: 'science', cost: { [R.BRICK]: 30, [R.STEEL]: 8 }, altCost: { [R.BRICK]: 40, [R.WOOD]: 10 }, work: 420, study: 30, want: t => tn(t) >= 180 ? Math.floor(tn(t) / 300) + 1 : 0 },
  barracks: { name: 'Barracks', size: 2, tech: 'law', cost: { [R.BRICK]: 14, [R.WOOD]: 8 }, altCost: { [R.STONE]: 14, [R.WOOD]: 8 }, work: 200, want: t => (t.warYear > W.tick / TPY - 60 && tn(t) >= 90) ? 1 : 0 },
  palace: { name: 'Palace', size: 3, tech: 'law', cost: { [R.STONE]: 40, [R.WOOD]: 20, [R.GOODS]: 10 }, altCost: { [R.BRICK]: 50, [R.WOOD]: 20, [R.GOODS]: 10 }, work: 700, want: t => (t.polity.capital === t && t.polity.towns >= 3 && tn(t) >= 90) ? 1 : 0 },
  dock: { name: 'Harbour', size: 1, tech: 'rafts', cost: { [R.WOOD]: 12 }, work: 110, place: 'shore', store: 100, want: t => (t.near.coast > 0 && tn(t) >= 28) ? 1 + Math.floor(tn(t) / 350) : 0 },
  quarry: { name: 'Quarry', size: 1, tech: 'masonry', cost: { [R.WOOD]: 8 }, work: 80, place: 'stone', want: t => t.sStone.length ? 1 + Math.floor(tn(t) / 300) : 0 },
  mine: { name: 'Mine', size: 1, tech: 'copper', cost: { [R.WOOD]: 8 }, work: 90, place: 'ore', want: () => 0 },
  sawmill: { name: 'Sawmill', size: 1, tech: 'watermill', cost: { [R.WOOD]: 14, [R.STONE]: 4 }, work: 140, want: t => tn(t) >= 100 ? 1 : 0, boost: { wood: 1.4 } },
  mill: { name: 'Water mill', size: 1, tech: 'watermill', cost: { [R.WOOD]: 12, [R.STONE]: 6 }, work: 130, place: 'river', want: t => (t.near.river > 0 && tn(t) >= 50) ? 1 + Math.floor(tn(t) / 300) : 0 },
  windmill: { name: 'Windmill', size: 1, tech: 'windmill', cost: { [R.WOOD]: 14, [R.BRICK]: 4 }, work: 130, want: t => tn(t) >= 60 ? 1 + Math.floor(tn(t) / 350) : 0 },
  hospital: { name: 'Hospital', size: 2, tech: 'sanitation', cost: { [R.BRICK]: 30, [R.STEEL]: 4 }, altCost: { [R.BRICK]: 40 }, work: 400, service: 3, want: t => tn(t) >= 120 ? 1 + Math.floor(tn(t) / 500) : 0 },
  factory: { name: 'Factory', size: 2, tech: 'factory', cost: { [R.BRICK]: 30, [R.STEEL]: 10 }, altCost: { [R.BRICK]: 40, [R.WOOD]: 10 }, work: 400, craft: 2, smoke: 2, want: t => tn(t) >= 130 ? 1 + Math.floor(tn(t) / 150) : 0 },
  powerplant: { name: 'Power station', size: 2, tech: 'electric', cost: { [R.BRICK]: 30, [R.STEEL]: 16 }, work: 500, smoke: 3, service: 3, want: t => tn(t) >= 180 ? 1 + Math.floor(tn(t) / 800) : 0 },
  station: { name: 'Railway station', size: 2, tech: 'railway', cost: { [R.BRICK]: 16, [R.STEEL]: 6 }, altCost: { [R.BRICK]: 22, [R.WOOD]: 8 }, work: 260, service: 1, want: t => tn(t) >= 90 ? 1 : 0 },
  oilwell: { name: 'Oil derrick', size: 1, tech: 'combustion', cost: { [R.STEEL]: 8 }, work: 160, place: 'ore', want: () => 0 },
  airport: { name: 'Airport', size: 3, tech: 'flight', cost: { [R.STEEL]: 30, [R.BRICK]: 30 }, work: 600, service: 2, place: 'far', want: t => tn(t) >= 260 ? 1 : 0 },
  launchpad: { name: 'Launch complex', size: 3, tech: 'rockets', cost: { [R.STEEL]: 60, [R.BRICK]: 30 }, work: 1500, service: 3, place: 'far', want: t => (t.polity.capital === t && tn(t) >= 200) ? 1 : 0 },
  monument: { name: 'Great Monument', size: 3, tech: 'mudbrick', cost: { [R.STONE]: 50, [R.BRICK]: 40, [R.GOODS]: 10 }, altCost: { [R.BRICK]: 90, [R.GOODS]: 10 }, work: 1500, want: t => (tn(t) >= 110 && t.stock[R.FOOD] > tn(t) * 5) ? 1 + Math.floor(tn(t) / 800) : 0 },
};
const BUILD_ORDER = ['plaza', 'granary', 'kiln', 'weaver', 'dock', 'smelter', 'smithy', 'market', 'scribe', 'temple', 'quarry', 'mill', 'windmill', 'sawmill', 'academy', 'barracks', 'university', 'lab', 'hospital', 'factory', 'station', 'powerplant', 'palace', 'airport', 'launchpad', 'monument'];

// Workshop recipes, tried in order of how short the town is of each output.
const RECIPES = {
  kiln: [
    { in: { [R.CLAY]: 3, [R.WOOD]: 1 }, out: { [R.GOODS]: 3 }, tech: 'pottery' },
    { in: { [R.CLAY]: 3, [R.WOOD]: 1 }, out: { [R.BRICK]: 4 }, tech: 'mudbrick' },
  ],
  weaver: [{ in: {}, out: { [R.CLOTH]: 2 }, tech: 'weaving' }],
  smelter: [
    { in: { [R.COPPER]: 2, [R.WOOD]: 2 }, out: { [R.BRONZE]: 1 }, tech: 'copper', not: 'bronze' },
    { in: { [R.COPPER]: 2.6, [R.TIN]: 0.4, [R.WOOD]: 2 }, out: { [R.BRONZE]: 3 }, tech: 'bronze' },  // about one part tin to seven of copper
    { in: { [R.IRON]: 2, [R.WOOD]: 3 }, out: { [R.STEEL]: 2 }, tech: 'iron', not: 'blast' },
    { in: { [R.IRON]: 2, [R.COAL]: 1 }, out: { [R.STEEL]: 3 }, tech: 'blast' },
  ],
  smithy: [
    { in: { [R.STEEL]: 1, [R.WOOD]: 1 }, out: { [R.TOOLS]: 3 }, tech: 'iron' },
    { in: { [R.BRONZE]: 1, [R.WOOD]: 1 }, out: { [R.TOOLS]: 2 }, tech: 'copper' },
  ],
  factory: [
    { in: { [R.STEEL]: 1, [R.COAL]: 1 }, out: { [R.TOOLS]: 8 }, tech: 'factory' },
    { in: { [R.CLAY]: 4, [R.COAL]: 1 }, out: { [R.BRICK]: 14 }, tech: 'factory' },
    { in: { [R.COAL]: 1 }, out: { [R.CLOTH]: 8, [R.GOODS]: 8 }, tech: 'factory' },
  ],
};

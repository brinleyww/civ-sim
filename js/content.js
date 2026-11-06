'use strict';
// The wider web of inventions, the wider town, and the arms and ships people can make. Loaded straight after tech.js.

// Side branches: any town can work one out if its people do the work and feel the need. They never hold up the main ages.
const S = (id, name, era, dom, diff, req, fx, desc, x) => TECHS.push(Object.assign({ id, name, era, dom, diff, req, fx, desc, side: 1 }, x));
S('spearcraft', 'Fire-Hardened Spears', 0, J.HUNT, 1000, [], { hunt: 1.15, attack: 1.1 }, 'A point charred hard over the fire brings down bigger game, and bigger enemies.', { tag: 'war' });
S('snares', 'Snares & Traps', 0, J.HUNT, 1200, [], { hunt: 1.1 }, 'Loops of sinew catch food while everyone sleeps.', { tag: 'nature' });
S('baskets', 'Basketry', 0, J.FORAGE, 1000, [], { forage: 1.12, store: 1.1 }, 'Woven reeds carry a whole day of gathering home.', { tag: 'nature' });
S('berrypatch', 'Tended Berry Patches', 0, J.FORAGE, 1100, [], { forage: 1.05 }, 'Someone pushes a cutting into the ground near camp, and comes back to find it fruiting.', { tag: 'nature' });
S('tracking', 'Tracking & Stalking', 0, J.HUNT, 1300, [], { hunt: 1.1 }, 'Prints, droppings, the wind on your neck: the animal is found before it knows.', { tag: 'nature' });
S('huntdogs', 'Hunting Dogs', 1, J.HUNT, 2300, ['tracking'], { hunt: 1.12 }, 'A wolf that came for scraps stays to run the deer down.', { tag: 'nature', alt: J.HERD });
S('replanting', 'Replanting', 1, J.WOOD, 2400, [], { wood: 1.05 }, 'When the forest near home runs short, people start putting trees back.', { tag: 'energy', alt: J.GARDEN });
S('kitchengarden', 'Kitchen Gardens', 1, J.FARM, 2200, ['agriculture'], {}, 'Beans, onions and greens in a plot by the door.', { tag: 'farm', alt: J.GARDEN });
S('herbgarden', 'Herb Gardens', 1, J.GARDEN, 2600, ['herbs', 'kitchengarden'], { health: 0.99 }, 'Medicine grown on purpose instead of hunted for in the hills.', { tag: 'med', alt: J.FORAGE });
S('flaxfields', 'Flax & Cotton Fields', 2, J.GARDEN, 4200, ['weaving', 'kitchengarden'], {}, 'A crop you wear instead of eat.', { tag: 'warm', alt: J.CRAFT });
S('vineyards', 'Vineyards', 2, J.GARDEN, 4200, ['kitchengarden', 'pottery'], {}, 'Patient work on a sunny slope, and something worth trading in the jar.', { tag: 'farm', alt: J.TRADE });
S('forestry', 'Managed Forests', 5, J.WOOD, 30000, ['replanting', 'science'], { wood: 1.25 }, 'Timber planted in rows and cut in rotation, for ever.', { tag: 'energy', alt: J.GARDEN });
S('seedbank', 'Seed Selection', 4, J.GARDEN, 16000, ['kitchengarden'], { farm: 1.05 }, 'The best plants of each year are kept back to sow the next.', { tag: 'farm', alt: J.FARM });
// Getting about. Each one changes how fast people go on each kind of road, and which way they choose to go.
S('commoditymoney', 'Goods as Money', 1, J.TRADE, 2400, [], { trade: 1.05 }, 'Salt, shells, cattle: something everyone wants that can be counted and passed on.', { tag: 'trade', alt: J.HERD });
S('accounts0', 'Clay Tallies', 2, J.TRADE, 4000, ['commoditymoney', 'pottery'], { trade: 1.05 }, 'A mark on a tablet says who owes what. Debt is older than coin.', { tag: 'trade', alt: J.SCHOLAR });
S('publicdebt', 'Public Bonds', 5, J.TRADE, 40000, ['banking'], { trade: 1.05 }, 'A government can spend money it doesn’t have, as long as someone believes it’ll pay.', { tag: 'trade', alt: J.SCHOLAR });
S('banknotes', 'Banknotes', 5, J.TRADE, 42000, ['banking', 'printing'], { cargo: 1.1 }, 'Paper is lighter than gold, and nobody needs to know how much gold there really is.', { tag: 'trade', alt: J.SCHOLAR });
S('incometax', 'Income Tax', 6, J.SERVICE, 100000, ['publicdebt', 'telegraph'], { admin: 15 }, 'A war measure that never quite goes away.', { tag: 'law', alt: J.SCHOLAR });
S('centralbank', 'Central Banking', 6, J.TRADE, 110000, ['banknotes', 'publicdebt'], {}, 'Someone’s job is now to worry about prices.', { tag: 'trade', alt: J.SCHOLAR });
S('insurance', 'Insurance', 5, J.TRADE, 40000, ['banking'], { trade: 1.06, seaRange: 1.05 }, 'Everyone pays a little so that nobody loses everything.', { tag: 'trade' });
S('fiatmoney', 'Paper Standard', 7, J.TRADE, 260000, ['centralbank'], { trade: 1.05 }, 'Money that’s worth what everyone agrees it’s worth.', { tag: 'trade', alt: J.SCHOLAR });
S('digitalmoney', 'Electronic Money', 8, J.TRADE, 800000, ['fiatmoney', 'internet'], { trade: 1.12, cargo: 1.05 }, 'Nobody’s touched a coin in years.', { tag: 'trade', alt: J.SCHOLAR });
S('bridges', 'Timber Bridges', 2, J.BUILD, 4000, ['mudbrick'], { cargo: 1.05 }, 'Logs across the narrow place. Roads can finally cross a river.', { tag: 'build', alt: J.TRADE });
S('packanimals', 'Pack Animals', 1, J.HERD, 2400, ['husbandry'], { trans: 1, cargo: 1.15 }, 'A loaded donkey goes further than a loaded person, and doesn’t complain as much.', { tag: 'trade', alt: J.TRADE });
S('carriages', 'Sprung Carriages', 4, J.CRAFT, 20000, ['wheel', 'iron'], { trans: 3, cargo: 1.08 }, 'Leather straps and iron springs: a road you can almost enjoy.', { tag: 'trade', alt: J.TRADE });
S('stagecoach', 'Stagecoach Lines', 5, J.TRADE, 38000, ['carriages', 'paved'], { admin: 15, spread: 1.15 }, 'Timetables, fresh horses at every inn, and news that arrives on a known day.', { tag: 'trade' });
S('bicycle', 'Bicycles', 6, J.CRAFT, 90000, ['steel'], { trans: 3, speed: 1.05 }, 'A working person can suddenly live miles from work.', { tag: 'machine', alt: J.SERVICE });
S('motorbus', 'Motor Buses', 7, J.SERVICE, 200000, ['combustion'], { trans: 4, urban: 400 }, 'A tram that doesn’t need rails.', { tag: 'urban', alt: J.CRAFT });
S('electricrail', 'Electric Railways', 7, J.BUILD, 240000, ['railway', 'electric'], { cargo: 1.2, speed: 1.05 }, 'No more smoke in the tunnels, and trains that stop and start in a moment.', { tag: 'machine', alt: J.SCHOLAR });
S('hsr', 'High-Speed Rail', 8, J.BUILD, 800000, ['electricrail', 'computers'], { speed: 1.1, admin: 40, cargo: 1.2 }, 'Two cities become one commute.', { tag: 'machine', alt: J.SCHOLAR });
S('evs', 'Electric Cars', 9, J.CRAFT, 2200000, ['cars', 'renewables'], { trans: 6, ev: 1 }, 'The same roads, without needing oil at all.', { tag: 'machine', alt: J.SCHOLAR });
S('autopilot', 'Self-Driving Vehicles', 10, J.SCHOLAR, 5000000, ['evs', 'agi'], { trans: 7, ev: 1, speed: 1.1, urban: 3000 }, 'Nobody owns a car any more. It just comes when called.', { tag: 'machine' });
S('maglev', 'Maglev Lines', 10, J.BUILD, 5200000, ['hsr', 'fusionnet'], { speed: 1.12, cargo: 1.3, admin: 60 }, 'Trains that float, at the speed of an aeroplane.', { tag: 'machine', alt: J.SCHOLAR });
S('hyperloop', 'Vacuum Tubes', 11, J.BUILD, 11000000, ['maglev', 'nanotech'], { speed: 1.15, cargo: 1.3, urban: 8000 }, 'Across a continent in the time it takes to finish a coffee.', { tag: 'machine', alt: J.SCHOLAR });
S('airtaxi', 'Air Taxis', 11, J.CRAFT, 11000000, ['autopilot', 'flight'], { speed: 1.15, urban: 6000 }, 'Streets fill with gardens. The traffic is overhead now.', { tag: 'machine', alt: J.SERVICE });
S('drones', 'Delivery Drones', 9, J.TRADE, 2000000, ['robotics'], { cargo: 1.3, trade: 1.15 }, 'The shop comes to you.', { tag: 'trade', alt: J.SCHOLAR });
// Living with winter.
S('snowshoes', 'Snowshoes & Sleds', 0, J.HUNT, 1500, [], { ski: 1, cold: 0.9 }, 'A wide foot doesn’t sink. A dragged load doesn’t get stuck.', { tag: 'warm', cond: t => W.temp[t.i] < 0.55, condText: 'Lives where it snows' });
S('icehouses', 'Ice Houses', 3, J.SERVICE, 10000, ['masonry'], { spoil: 0.85 }, 'Winter’s ice packed in straw keeps summer’s food fresh.', { tag: 'farm', cond: t => W.temp[t.i] < 0.6, condText: 'Lives where lakes freeze', alt: J.BUILD });
S('snowplough', 'Snow Ploughs', 6, J.BUILD, 100000, ['railway'], { plough: 1 }, 'The trains keep running, and then the roads do too.', { tag: 'machine', alt: J.SERVICE });
S('deicing', 'Icebreakers', 7, J.SAILOR, 240000, ['steamship', 'steel'], { seaRange: 1.1 }, 'A hull heavy enough to climb onto the ice and break it.', { tag: 'sea' });
// Water and salt.
S('saltworks', 'Salt Working', 1, J.FORAGE, 2200, [], { spoil: 0.9 }, 'Boiled or dug, salt is what keeps meat through the winter.', { tag: 'trade', cond: t => t.near.salt > 0 || t.near.coast > 0, condText: 'Salt flats or a salty shore nearby' });
S('dredging', 'River Dredging', 6, J.SAILOR, 100000, ['canals', 'steam'], { cargo: 1.12 }, 'A boat that digs out the bottom so the other boats can follow.', { tag: 'sea', alt: J.BUILD });
S('desalination', 'Desalination', 9, J.SCHOLAR, 2200000, ['renewables'], { urban: 1500, drought: 0.6 }, 'The whole ocean becomes a well.', { tag: 'energy', alt: J.SERVICE });
S('carboncapture', 'Carbon Capture', 9, J.SCHOLAR, 2400000, ['renewables', 'robotics'], {}, 'Pull the smoke of the last three centuries back out of the sky.', { tag: 'energy' });
// Canals.
S('barges', 'River Barges', 2, J.FISH, 4200, ['sailing'], { cargo: 1.12 }, 'A flat hull, a long pole and a slow steady river.', { tag: 'sea', alt: J.TRADE, cond: t => t.near.river > 0, condText: 'Lives on a river' });
S('locks', 'Canal Locks', 4, J.BUILD, 26000, ['canals'], { locks: 1 }, 'Two gates and a chamber, and a boat climbs a hill.', { tag: 'sea', alt: J.SCHOLAR });
S('shipcanal', 'Ship Canals', 6, J.BUILD, 110000, ['locks', 'steam'], { cargo: 1.15 }, 'Cut wide and deep: ocean ships cross a country, and two seas become one.', { tag: 'sea', alt: J.SAILOR });
// The sea: hulls and how to find your way across it.
S('clinker', 'Clinker Hulls', 2, J.FISH, 5000, ['sailing'], { seaRange: 1.1, sail: 2 }, 'Overlapping planks make a hull that flexes with the waves, tough enough for the open ocean.', { tag: 'sea', alt: J.SAILOR });
S('outrigger', 'Outrigger Canoes', 1, J.FISH, 3400, ['rafts'], { sail: 2, seaRange: 1.3 }, 'A float on an arm and a woven sail: whole families cross open ocean, steering by stars, swells and birds.', { tag: 'sea', alt: J.SAILOR, cond: t => t.near.coast > 2 && W.temp[t.i] > 0.55, condText: 'Lives on a warm open coast' });
S('lateen', 'Lateen Rig', 3, J.SAILOR, 9000, ['ships'], { seaRange: 1.2, cargo: 1.05 }, 'A slanted sail that can claw its way into the wind.', { tag: 'sea' });
S('longships', 'Longships', 3, J.SAILOR, 9000, ['clinker', 'iron'], { seaRange: 1.1 }, 'Fast, shallow, beachable anywhere. Coasts stop being safe.', { tag: 'sea', alt: J.SOLDIER, mil: 1 });
S('triremes', 'Triremes', 3, J.SAILOR, 9500, ['wargalley'], {}, 'Three banks of oars behind one bronze ram.', { tag: 'sea', alt: J.SOLDIER, mil: 1 });
S('sternrudder', 'Stern Rudder', 4, J.SAILOR, 15000, ['lateen'], { seaRange: 1.15 }, 'A single hinged blade turns a ship far bigger than any steering oar could.', { tag: 'sea', alt: J.CRAFT });
S('caravels', 'Caravels', 4, J.SAILOR, 18000, ['sternrudder', 'compass'], { seaRange: 1.3, sail: 2 }, 'Small, nimble, and able to come home against the wind: ships for the open ocean.', { tag: 'sea', alt: J.TRADE });
S('chronometer', 'Marine Chronometer', 5, J.SAILOR, 46000, ['navigation', 'optics'], { seaRange: 1.4 }, 'A clock that keeps time at sea, and ships finally know how far west they are.', { tag: 'sea', alt: J.SCHOLAR });
S('frigates', 'Frigates', 5, J.SAILOR, 42000, ['galleon'], {}, 'Fast single-deck warships, the eyes of the fleet.', { tag: 'sea', alt: J.SOLDIER, mil: 1 });
S('shipofline', 'Ships of the Line', 5, J.SAILOR, 50000, ['frigates', 'cannon'], {}, 'A hundred guns, and a way of fighting built around them.', { tag: 'sea', alt: J.SOLDIER, mil: 1 });
S('clipper', 'Clipper Ships', 6, J.SAILOR, 90000, ['chronometer', 'steel'], { cargo: 1.1, seaRange: 1.2 }, 'The fastest sail ever raised, racing tea across the world.', { tag: 'sea', alt: J.TRADE });
S('screw', 'Screw Propeller', 6, J.SAILOR, 110000, ['steamship'], { seaRange: 1.15 }, 'No paddle wheels to smash. Steam comes of age at sea.', { tag: 'sea', alt: J.CRAFT });
S('dreadnought', 'Battleships', 7, J.SAILOR, 230000, ['ironclad', 'steel'], {}, 'All big guns, and every other warship is obsolete overnight.', { tag: 'sea', alt: J.SOLDIER, mil: 1 });
S('submarines', 'Submarines', 7, J.SAILOR, 240000, ['ironclad', 'combustion'], {}, 'Merchant captains start watching the water instead of the horizon.', { tag: 'sea', alt: J.SOLDIER, mil: 1 });
S('sonar', 'Sonar', 7, J.SCHOLAR, 260000, ['submarines', 'electric'], {}, 'Listening for what you can’t see.', { tag: 'sea', alt: J.SAILOR, mil: 1 });
S('carriers', 'Aircraft Carriers', 7, J.SAILOR, 340000, ['flight', 'dreadnought'], {}, 'An airfield that sails. Sea power now reaches far inland.', { tag: 'sea', alt: J.SOLDIER, mil: 1 });
S('tankers', 'Oil Tankers', 7, J.SAILOR, 240000, ['screw', 'combustion'], { cargo: 1.2 }, 'Oil goes where it’s wanted, not where it’s found.', { tag: 'sea', alt: J.TRADE });
S('deeptrawl', 'Deep-Sea Trawlers', 7, J.FISH, 200000, ['screw'], { fish: 1.5 }, 'Whole shoals in a single net.', { tag: 'sea' });
S('cruisemissile', 'Missile Cruisers', 8, J.SAILOR, 900000, ['missile', 'destroyer'], {}, 'A fleet that can hit a city from over the horizon.', { tag: 'sea', alt: J.SOLDIER, mil: 1 });
S('nuclearnavy', 'Nuclear Navy', 8, J.SAILOR, 1000000, ['nuclear', 'sonar'], { seaRange: 1.2 }, 'Ships that only come back when the crew runs out of food.', { tag: 'sea', alt: J.SCHOLAR, mil: 1, cond: t => t.near.uranium > 0 || t.stock[R.URANIUM] > 0, condText: 'Uranium, mined or traded' });
S('autocargo', 'Autonomous Freighters', 9, J.SAILOR, 2200000, ['containers', 'robotics'], { cargo: 1.3 }, 'Vast ships with nobody aboard at all.', { tag: 'sea', alt: J.TRADE });
S('droneships', 'Drone Fleets', 10, J.SAILOR, 5200000, ['carriers', 'agi'], {}, 'One hull, a thousand small machines.', { tag: 'sea', alt: J.SOLDIER, mil: 1 });
// War in the far future.
S('railguns', 'Railguns', 10, J.SOLDIER, 5400000, ['missile', 'fusionnet'], {}, 'No powder, no shell: only speed.', { tag: 'war', alt: J.SCHOLAR, mil: 1 });
S('energyweapons', 'Energy Weapons', 11, J.SOLDIER, 11000000, ['railguns', 'orbital'], {}, 'Aim, and it has already hit.', { tag: 'war', alt: J.SCHOLAR, mil: 1 });
S('exosuits', 'Powered Armour', 10, J.CRAFT, 5400000, ['nanotech', 'kevlar'], { defend: 1.15 }, 'One soldier, the strength of ten, the armour of a small tank.', { tag: 'war', alt: J.SOLDIER, mil: 1 });
// The long future: new kinds of city and life.
S('skyfarms', 'Sky Farms', 10, J.GARDEN, 5000000, ['biotech', 'verticalfarm'], { farm: 1.4, urban: 2500 }, 'Whole towers of food, and the old fields go back to forest.', { tag: 'farm', alt: J.SCHOLAR });
S('neurallink', 'Neural Links', 11, J.SCHOLAR, 11000000, ['agi'], { research: 1.5, spread: 2 }, 'You don’t read it any more. You just know it.', { tag: 'lore' });
S('spacehabitats', 'Space Habitats', 12, J.BUILD, 20000000, ['orbital', 'nanotech'], { urban: 20000 }, 'Spinning towns where nobody has ever stood on a planet.', { tag: 'urban', alt: J.SCHOLAR });
S('terraforming', 'Terraforming', 12, J.SCHOLAR, 22000000, ['mars', 'climateeng'], { farm: 1.2 }, 'Deserts bloom on two worlds.', { tag: 'farm' });
S('postscarcity', 'Post-Scarcity', 13, J.SCHOLAR, 40000000, ['dyson', 'neurallink'], { craft: 2, farm: 1.5, research: 1.3 }, 'What do people do, when there’s enough?', { tag: 'lore' });
S('smoking', 'Smoked Meat', 0, J.HUNT, 1800, [], { spoil: 0.85 }, 'Meat hung over smoke lasts through the lean months.', { tag: 'farm' });
S('cooking', 'Cooking Pits', 0, J.FORAGE, 1100, [], { health: 0.97 }, 'Hot stones soften what raw food would not.', { tag: 'nature' });
S('burial', 'Burial Rites', 0, J.FORAGE, 1500, [], { happy: 5 }, 'People start caring for their dead, and for each other.', { tag: 'lore' });
S('tally', 'Tally Sticks', 0, J.FORAGE, 1500, [], { research: 1.03 }, 'Notches remember what heads forget.', { tag: 'math' });
S('cordage', 'Rope & Knots', 0, J.FISH, 1400, [], { fish: 1.1, cargo: 1.05 }, 'Twisted fibre becomes nets, lashings and loads.', { tag: 'sea' });
S('thatching', 'Thatched Shelter', 0, J.FORAGE, 1300, [], { cold: 0.85 }, 'A roof that sheds rain. Winter gets a little kinder.', { tag: 'warm' });
S('wells', 'Dug Wells', 1, J.BUILD, 2000, [], { urban: 25, drought: 0.9 }, 'Clean water without the walk to the river, so more people can live close together.', { tag: 'urban' });
S('storehouses', 'Storehouses', 1, J.BUILD, 1800, [], { store: 1.2 }, 'A raised dry shed for whatever the town has too much of.', { tag: 'build' });
S('palisade', 'Palisades', 1, J.BUILD, 2400, [], { defend: 1.15 }, 'Sharpened logs round the village. Raiders have to think twice.', { tag: 'war', alt: J.SOLDIER, mil: 1 });
S('baking', 'Baking', 1, J.FARM, 2500, ['agriculture', 'pottery'], { spoil: 0.9, health: 0.98 }, 'Ground grain and a hot oven turn into food that travels.', { tag: 'farm' });
S('brewing', 'Brewing', 1, J.FARM, 2400, ['agriculture', 'pottery'], { happy: 6 }, 'Spoiled grain turns out to have a use.', { tag: 'farm' });
S('orchards', 'Orchards', 1, J.FARM, 3000, ['agriculture'], { farm: 1.06 }, 'Trees planted for grandchildren.', { tag: 'farm' });
S('dairy', 'Dairying', 1, J.HERD, 2200, ['husbandry'], { herd: 1.2, infant: 0.95 }, 'Milk and cheese feed people without killing the herd.', { tag: 'farm' });
S('tanning', 'Tanning', 1, J.HERD, 2200, ['husbandry'], { cold: 0.9 }, 'Bark and patience make hide last for years.', { tag: 'warm' });
S('dyes', 'Dyes', 1, J.CRAFT, 2500, ['weaving'], { trade: 1.06 }, 'Coloured cloth is worth a long walk.', { tag: 'trade' });
S('weirs', 'Fish Weirs', 1, J.FISH, 2000, ['fishing'], { fish: 1.15 }, 'Stone fences in the shallows do the fishing for you.', { tag: 'sea' });
S('manure', 'Manuring', 1, J.FARM, 3000, ['agriculture'], { deplete: 0.8 }, 'What the herd leaves behind goes back on the field.', { tag: 'farm' });
S('carpentry', 'Carpentry', 1, J.WOOD, 2500, [], { wood: 1.1, build: 1.05 }, 'Joints replace lashings.', { tag: 'build' });
S('charcoal', 'Charcoal Burning', 1, J.WOOD, 3000, [], { craft: 1.05 }, 'Wood burned slowly burns far hotter the second time.', { tag: 'energy' });
S('barter', 'Market Days', 1, J.TRADE, 2000, [], { trade: 1.1 }, 'A fixed day and a fixed place to swap.', { tag: 'trade' });
S('oralaw', 'Clan Councils', 1, J.TRADE, 2200, [], { admin: 8, order: 4 }, 'The old settle quarrels before they turn to blood.', { tag: 'law', alt: J.FARM });
S('warband', 'Warrior Bands', 1, J.SOLDIER, 1800, [], { attack: 1.1, morale: 4 }, 'Young people who train for raiding instead of herding.', { tag: 'war', alt: J.HUNT, mil: 1 });
S('compbow', 'Composite Bow', 2, J.SOLDIER, 5000, ['bow', 'husbandry'], {}, 'Horn, sinew and glue: twice the reach in half the length.', { tag: 'war', alt: J.CRAFT, mil: 1 });
S('chariot', 'War Chariots', 2, J.SOLDIER, 6000, ['wheel', 'husbandry', 'copper'], { attack: 1.08 }, 'A fast platform that terrifies anyone on foot.', { tag: 'war', alt: J.HERD, mil: 1 });
S('bronzearmor', 'Bronze Armour', 2, J.CRAFT, 5000, ['bronze'], { defend: 1.05 }, 'Metal between the blade and the body.', { tag: 'metal', alt: J.SOLDIER, mil: 1 });
S('phalanx', 'Drill & Formation', 2, J.SOLDIER, 6000, ['bronze'], { attack: 1.1, morale: 10 }, 'A line that holds beats a mob of heroes.', { tag: 'war', mil: 1 });
S('ram', 'Battering Rams', 2, J.SOLDIER, 5500, ['wheel', 'copper'], {}, 'Walls stop being the end of the argument.', { tag: 'war', alt: J.BUILD, mil: 1 });
S('wargalley', 'War Galleys', 2, J.SAILOR, 7000, ['sailing', 'bronze'], {}, 'Oars and a bronze ram: ships built only to sink ships.', { tag: 'sea', alt: J.SOLDIER, mil: 1 });
S('cisterns', 'Cisterns', 2, J.BUILD, 4000, ['mudbrick'], { urban: 70, drought: 0.85 }, 'Sealed tanks hold the wet season through the dry one.', { tag: 'urban' });
S('glass', 'Glassmaking', 2, J.CRAFT, 5000, ['pottery', 'copper'], { trade: 1.05 }, 'Sand and fire make something people will cross a desert for.', { tag: 'craft' });
S('dikes', 'Dikes & Levees', 2, J.FARM, 5000, ['irrigation'], { farm: 1.1 }, 'The flood stays where it is told.', { tag: 'farm' });
S('scales', 'Weights & Measures', 2, J.TRADE, 4000, ['writing'], { trade: 1.1 }, 'A fair measure makes strangers willing to deal.', { tag: 'trade' });
S('caravans', 'Caravans', 2, J.TRADE, 5000, ['husbandry', 'wheel'], { cargo: 1.2, trade: 1.1 }, 'Long strings of pack beasts cross what nobody could walk alone.', { tag: 'trade' });
S('priests', 'Priesthood', 2, J.SERVICE, 4000, ['mudbrick'], { happy: 8, order: 3 }, 'Some people now live by keeping the gods content.', { tag: 'lore' });
S('kingship', 'Divine Kingship', 2, J.SERVICE, 4500, ['writing'], { admin: 15 }, 'The ruler stops being first among equals.', { tag: 'law', alt: J.SOLDIER });
S('taxation', 'Taxation', 2, J.SERVICE, 5000, ['writing'], { admin: 10, order: 2 }, 'A share of every harvest goes to the granaries of the state.', { tag: 'law', alt: J.TRADE });
S('surgery', 'Bronze Surgery', 2, J.SERVICE, 5000, ['herbs', 'bronze'], { health: 0.96 }, 'Sharp clean metal and steady hands.', { tag: 'med' });
S('astronomy', 'Astronomy', 2, J.SCHOLAR, 6000, ['calendar'], { seaRange: 1.1 }, 'The wandering stars get names and timetables.', { tag: 'sky' });
S('mapmaking', 'Cartography', 2, J.TRADE, 6000, ['writing'], { seaRange: 1.15, trade: 1.05 }, 'A route written down never needs a guide again.', { tag: 'sea', alt: J.SAILOR });
S('aqueduct', 'Aqueducts', 3, J.BUILD, 11000, ['engineering'], { urban: 160, health: 0.95 }, 'Water brought downhill for miles, enough for a real city.', { tag: 'urban' });
S('concrete', 'Concrete', 3, J.BUILD, 11000, ['engineering'], { build: 1.1, urban: 60 }, 'Liquid stone. Buildings can finally grow wide and tall.', { tag: 'urban' });
S('catapult', 'Torsion Catapults', 3, J.SOLDIER, 12000, ['engineering', 'iron'], {}, 'Twisted rope stores enough force to crack masonry.', { tag: 'war', alt: J.CRAFT, mil: 1 });
S('chainmail', 'Mail Armour', 3, J.CRAFT, 10000, ['iron'], { defend: 1.05 }, 'Thousands of riveted rings make a shirt of iron.', { tag: 'metal', alt: J.SOLDIER, mil: 1 });
S('legions', 'Professional Armies', 3, J.SOLDIER, 12000, ['law', 'iron'], { attack: 1.1, morale: 10 }, 'Paid, fed, drilled and far from home for twenty years.', { tag: 'war', alt: J.SERVICE, mil: 1 });
S('cavalry', 'Stirrups & Cavalry', 3, J.HERD, 10000, ['riding', 'iron'], { attack: 1.08 }, 'A rider who can brace can strike like a falling wall.', { tag: 'war', alt: J.SOLDIER, mil: 1 });
S('citizenship', 'Citizenship', 3, J.SCHOLAR, 12000, ['philosophy'], { happy: 5, order: 3 }, 'Some people now have rights no ruler gave them.', { tag: 'law' });
S('guilds', 'Craft Guilds', 3, J.CRAFT, 11000, ['currency', 'iron'], { craft: 1.15 }, 'Masters guard their secrets and train their successors.', { tag: 'craft', alt: J.TRADE });
S('feudalism', 'Feudal Oaths', 3, J.SERVICE, 12000, ['law', 'riding'], { admin: 20 }, 'Land for loyalty: a kingdom run by favours.', { tag: 'law', alt: J.SOLDIER });
S('theology', 'Theology', 3, J.SCHOLAR, 12000, ['philosophy'], { happy: 8 }, 'Faith is argued over in writing, and writing lasts.', { tag: 'lore', alt: J.SERVICE });
S('fortification', 'Fortification', 3, J.BUILD, 10000, ['masonry'], { defend: 1.25 }, 'Towers, gates and killing grounds.', { tag: 'war', alt: J.SOLDIER, mil: 1 });
S('horsecollar', 'Horse Collar', 3, J.HERD, 9000, ['plough'], { farm: 1.1 }, 'A padded collar lets a horse pull without choking.', { tag: 'farm', alt: J.FARM });
S('ironplough', 'Iron Plough', 3, J.FARM, 9000, ['plough', 'iron'], { farm: 1.12 }, 'Heavy clay soils can finally be turned.', { tag: 'farm' });
S('baths', 'Public Baths', 3, J.SERVICE, 9000, ['aqueduct'], { health: 0.94, happy: 4 }, 'Hot water for everyone, and fewer fevers.', { tag: 'med' });
S('crossbow', 'Crossbows', 4, J.CRAFT, 18000, ['iron', 'engineering'], {}, 'A peasant with a week of training can kill a knight.', { tag: 'war', alt: J.SOLDIER, mil: 1 });
S('plate', 'Plate Armour', 4, J.CRAFT, 20000, ['iron', 'guilds'], { defend: 1.06 }, 'A master smith can now wrap a body in steel.', { tag: 'metal', alt: J.SOLDIER, mil: 1 });
S('trebuchet', 'Trebuchets', 4, J.SOLDIER, 18000, ['catapult', 'math'], {}, 'A counterweight throws a boulder through a curtain wall.', { tag: 'war', alt: J.BUILD, mil: 1 });
S('castles', 'Castles', 4, J.BUILD, 18000, ['fortification', 'feudalism'], { defend: 1.3 }, 'A few people can hold a stone keep against an army.', { tag: 'war', alt: J.SOLDIER, mil: 1 });
S('longbow', 'Longbows', 4, J.SOLDIER, 15000, ['compbow', 'iron'], {}, 'Yew, years of practice and a volley that darkens the sky.', { tag: 'war', mil: 1 });
S('knights', 'Knighthood', 4, J.SOLDIER, 16000, ['feudalism', 'cavalry', 'chainmail'], { attack: 1.1, morale: 6 }, 'Armoured riders sworn to a lord.', { tag: 'war', alt: J.HERD, mil: 1 });
S('infirmaries', 'Infirmaries', 4, J.SERVICE, 16000, ['medicine'], { health: 0.93 }, 'The sick are brought to one place, with people who know them.', { tag: 'med' });
S('carrack', 'Carracks', 4, J.SAILOR, 20000, ['ships', 'compass'], { cargo: 1.2 }, 'Deep ocean-going hulls with holds full of pepper.', { tag: 'sea', alt: J.TRADE });
S('chartered', 'Chartered Companies', 4, J.TRADE, 24000, ['banking'], { trade: 1.2 }, 'Merchants with their own ships, their own laws, and shareholders.', { tag: 'trade' });
S('accounts', 'Double-Entry Books', 4, J.TRADE, 16000, ['currency', 'math'], { trade: 1.1 }, 'You can finally see where the money went.', { tag: 'math', alt: J.SCHOLAR });
S('clocks', 'Mechanical Clocks', 4, J.CRAFT, 18000, ['watermill'], { craft: 1.1 }, 'The whole town starts working to one bell.', { tag: 'machine' });
S('streets', 'Street Paving', 4, J.BUILD, 15000, ['paved'], { urban: 140, fire: 0.9 }, 'Mud and filth give way to stone and gutters.', { tag: 'urban' });
S('drains', 'Town Drains', 4, J.BUILD, 16000, ['aqueduct'], { urban: 260, health: 0.95, plague: 0.9 }, 'What leaves the city matters as much as what enters it.', { tag: 'urban', alt: J.SERVICE });
S('firewardens', 'Fire Wardens', 4, J.SERVICE, 14000, ['masonry'], { fire: 0.6 }, 'Night watchmen, buckets and a law against thatch.', { tag: 'urban' });
S('townwatch', 'Town Watch', 4, J.SERVICE, 12000, ['law'], { order: 8 }, 'Somebody is paid to stop the fights.', { tag: 'law', alt: J.SOLDIER });
S('humanism', 'Humanism', 4, J.SCHOLAR, 20000, ['university'], { happy: 5, research: 1.05 }, 'Old books and new questions about people.', { tag: 'lore' });
S('musket', 'Matchlock Muskets', 5, J.SOLDIER, 40000, ['gunpowder'], {}, 'Slow, loud and capable of punching through plate.', { tag: 'war', alt: J.CRAFT, mil: 1 });
S('cannon', 'Cannon', 5, J.SOLDIER, 42000, ['gunpowder', 'iron'], {}, 'Walls that stood for centuries fall in an afternoon.', { tag: 'war', alt: J.CRAFT, mil: 1 });
S('starforts', 'Star Forts', 5, J.BUILD, 38000, ['cannon', 'castles'], { defend: 1.25 }, 'Low angled earth shrugs off cannon that shatter stone.', { tag: 'war', alt: J.SOLDIER, mil: 1 });
S('galleon', 'Galleons', 5, J.SAILOR, 42000, ['navigation', 'cannon'], { cargo: 1.2 }, 'A floating fortress with a hold full of silver.', { tag: 'sea', alt: J.TRADE, mil: 1 });
S('bayonet', 'Flintlocks & Bayonets', 5, J.SOLDIER, 50000, ['musket'], { attack: 1.1 }, 'Every musketeer is also a pike now.', { tag: 'war', mil: 1 });
S('enlighten', 'The Enlightenment', 5, J.SCHOLAR, 55000, ['science'], { happy: 3, research: 1.08 }, 'Reason gets aimed at kings and priests.', { tag: 'law' });
S('absolutism', 'Absolutism', 5, J.SERVICE, 35000, ['printing', 'castles'], { admin: 30 }, 'One crown, no rivals, and a bureaucracy that answers to it.', { tag: 'law' });
S('constitution', 'Constitutionalism', 5, J.SCHOLAR, 50000, ['printing', 'banking'], { order: 6 }, 'The law now binds the one who makes it.', { tag: 'law', alt: J.TRADE });
S('stockmarket', 'Stock Exchange', 5, J.TRADE, 45000, ['banking', 'chartered'], { trade: 1.2 }, 'Anyone can own a piece of a voyage.', { tag: 'trade' });
S('plantation', 'Plantations', 5, J.FARM, 40000, ['rotation', 'navigation'], { farm: 1.12 }, 'Single crops at huge scale, grown for distant markets.', { tag: 'farm', alt: J.TRADE });
S('inoculation', 'Inoculation', 5, J.SERVICE, 45000, ['medicine', 'printing'], { plague: 0.8, infant: 0.9 }, 'A small sickness on purpose saves you from the big one.', { tag: 'med', alt: J.SCHOLAR });
S('canals', 'Canals', 3, J.BUILD, 18000, ['engineering', 'irrigation'], { cargo: 1.2 }, 'Dug by thousands, the way the Persians, the Romans and the Chinese emperors dug them: one horse can pull fifty tons on still water.', { tag: 'trade' });
S('pumps', 'Mine Pumps', 5, J.MINE, 35000, ['deepmine'], { mine: 1.15 }, 'The deepest seams stop flooding.', { tag: 'machine' });
S('encyclopedia', 'Encyclopedias', 5, J.SCHOLAR, 45000, ['printing'], { research: 1.08, spread: 1.2 }, 'Everything known, in order, on one shelf.', { tag: 'lore' });
S('rifle', 'Rifles', 6, J.SOLDIER, 110000, ['steel', 'musket'], {}, 'Grooves in the barrel: accurate killing at half a mile.', { tag: 'war', alt: J.CRAFT, mil: 1 });
S('artillery', 'Field Artillery', 6, J.SOLDIER, 120000, ['rifle', 'cannon', 'steel'], {}, 'Guns that fire over the horizon.', { tag: 'war', mil: 1 });
S('ironclad', 'Ironclads', 6, J.SAILOR, 120000, ['steam', 'steel', 'galleon'], {}, 'Steel hulls make wooden navies obsolete overnight.', { tag: 'sea', alt: J.CRAFT, mil: 1 });
S('steamship', 'Steamships', 6, J.SAILOR, 100000, ['steam', 'navigation'], { cargo: 1.4, seaRange: 1.5 }, 'A ship that ignores the wind.', { tag: 'sea', alt: J.TRADE });
S('gaslight', 'Gas Lighting', 6, J.CRAFT, 90000, ['blast'], { urban: 300 }, 'The city stays awake after dark.', { tag: 'urban', alt: J.SCHOLAR });
S('sewerworks', 'Sewer Networks', 6, J.BUILD, 110000, ['sanitation'], { urban: 1300, health: 0.85 }, 'Miles of brick tunnels make a million people possible.', { tag: 'urban', alt: J.SERVICE });
S('urbanhousing', 'Urban Housing', 6, J.BUILD, 80000, ['factory'], { urban: 700 }, 'Row upon row for the factory hands.', { tag: 'urban' });
S('trams', 'Trams', 6, J.BUILD, 100000, ['railway'], { urban: 1300, speed: 1.05 }, 'Workers no longer need to live within walking distance.', { tag: 'urban', alt: J.TRADE });
S('unions', 'Trade Unions', 6, J.CRAFT, 90000, ['factory'], { happy: 6, order: 3 }, 'Hands in the mills bargain together.', { tag: 'law', alt: J.SERVICE });
S('socialism', 'Socialism', 6, J.SCHOLAR, 100000, ['factory'], { happy: 3 }, 'Who should own the machines?', { tag: 'law', alt: J.CRAFT });
S('suffrage', 'Universal Suffrage', 6, J.SERVICE, 110000, ['constitution', 'telegraph'], { order: 6 }, 'Everyone gets a vote, whatever they own.', { tag: 'law', alt: J.SCHOLAR });
S('nationalism', 'Nationalism', 6, J.SOLDIER, 100000, ['printing', 'railway'], { morale: 15 }, 'Strangers will now die for one another.', { tag: 'law', alt: J.SCHOLAR });
S('corporations', 'Joint-Stock Corporations', 6, J.TRADE, 110000, ['stockmarket', 'factory'], { trade: 1.15, craft: 1.1 }, 'A legal person that never dies.', { tag: 'trade' });
S('schools', 'Public Schooling', 6, J.SERVICE, 90000, ['printing', 'factory'], { research: 1.1 }, 'Every child learns to read.', { tag: 'lore', alt: J.SCHOLAR });
S('refrigeration', 'Canning & Refrigeration', 6, J.CRAFT, 100000, ['factory'], { spoil: 0.5 }, 'Food stops caring about the seasons.', { tag: 'farm', alt: J.FARM });
S('trenches', 'Barbed Wire & Trenches', 6, J.SOLDIER, 110000, ['rifle'], { defend: 1.25 }, 'Defending suddenly costs far less than attacking.', { tag: 'war', mil: 1 });
S('dynamite', 'Dynamite', 6, J.MINE, 90000, ['science', 'deepmine'], { mine: 1.2 }, 'Rock moves on demand.', { tag: 'machine', alt: J.SCHOLAR });
S('machinegun', 'Machine Guns', 7, J.SOLDIER, 200000, ['rifle', 'massprod'], {}, 'One crew does the work of a company.', { tag: 'war', alt: J.CRAFT, mil: 1 });
S('kevlar', 'Body Armour', 7, J.CRAFT, 220000, ['plastics', 'machinegun'], { defend: 1.1 }, 'Woven synthetic fibre stops a bullet.', { tag: 'war', alt: J.SOLDIER, mil: 1 });
S('tanks', 'Tanks', 7, J.SOLDIER, 260000, ['machinegun', 'combustion'], { attack: 1.1 }, 'An armoured engine crosses the trench.', { tag: 'war', alt: J.CRAFT, mil: 1 });
S('bomber', 'Bombers', 7, J.SOLDIER, 300000, ['flight', 'machinegun'], {}, 'The front line no longer matters.', { tag: 'war', alt: J.SCHOLAR, mil: 1 });
S('destroyer', 'Destroyers', 7, J.SAILOR, 240000, ['ironclad', 'combustion'], {}, 'Fast, fuel-burning hunters of the sea.', { tag: 'sea', mil: 1 });
S('radio', 'Radio', 7, J.SCHOLAR, 200000, ['electric'], { spread: 1.5, morale: 5 }, 'One voice reaches every kitchen.', { tag: 'elec', alt: J.TRADE });
S('metro', 'Underground Railways', 7, J.BUILD, 240000, ['electric', 'trams'], { urban: 5000 }, 'A second city moves beneath the first.', { tag: 'urban' });
S('skyscrapers', 'Skyscrapers', 7, J.BUILD, 250000, ['steel', 'electric'], { urban: 3500 }, 'Steel frames and lifts: land stops being the limit.', { tag: 'urban', alt: J.CRAFT });
S('welfare', 'Welfare State', 7, J.SERVICE, 220000, ['suffrage', 'antibiotics'], { happy: 12, order: 5 }, 'Nobody starves for being old or sick.', { tag: 'law' });
S('plastics', 'Plastics', 7, J.CRAFT, 240000, ['combustion'], { craft: 1.2 }, 'Oil can be turned into almost anything.', { tag: 'craft', alt: J.SCHOLAR });
S('highways', 'Highways', 7, J.BUILD, 220000, ['cars'], { urban: 1300, cargo: 1.2 }, 'Concrete ribbons, and the suburbs spill out.', { tag: 'urban' });
S('television', 'Television', 7, J.SCHOLAR, 300000, ['radio'], { happy: 6 }, 'Everyone sees the same thing at the same moment.', { tag: 'elec' });
S('nuclear', 'Nuclear Fission', 7, J.SCHOLAR, 500000, ['electric', 'massprod'], { urban: 1000 }, 'A fist of uranium lights a whole city.', { tag: 'energy' });
S('waterplant', 'Water Treatment', 7, J.BUILD, 240000, ['sewerworks', 'electric'], { urban: 2600, health: 0.9 }, 'Clean water at any tap for any number of people.', { tag: 'urban', alt: J.SERVICE });
S('multinationals', 'Multinationals', 7, J.TRADE, 300000, ['corporations', 'flight'], { trade: 1.2 }, 'Companies richer than most realms.', { tag: 'trade' });
S('containers', 'Container Shipping', 7, J.SAILOR, 260000, ['steamship', 'massprod'], { cargo: 1.5 }, 'One steel box fits every ship, train and truck.', { tag: 'sea', alt: J.TRADE });
S('satellites', 'Satellites', 8, J.SCHOLAR, 800000, ['rockets'], { spread: 1.5, seaRange: 1.3 }, 'The whole planet, seen from above.', { tag: 'sky' });
S('missile', 'Guided Missiles', 8, J.SOLDIER, 700000, ['computers', 'bomber'], {}, 'It knows where it is going.', { tag: 'war', alt: J.SCHOLAR, mil: 1 });
S('renewables', 'Renewable Energy', 8, J.SCHOLAR, 700000, ['computers', 'electric'], { urban: 2600 }, 'Sun and wind, for as long as they last.', { tag: 'energy', alt: J.CRAFT });
S('robotics', 'Robotics', 8, J.CRAFT, 800000, ['computers'], { craft: 1.8, build: 1.5 }, 'Machines that build the machines.', { tag: 'machine', alt: J.SCHOLAR });
S('genetics', 'Genetic Medicine', 8, J.SCHOLAR, 800000, ['computers', 'antibiotics'], { health: 0.7, plague: 0.3 }, 'Disease is read like a book, and edited.', { tag: 'med' });
S('verticalfarm', 'Vertical Farming', 8, J.FARM, 700000, ['greenrev', 'computers'], { farm: 1.5, urban: 2600 }, 'Grain on the fortieth floor.', { tag: 'farm', alt: J.SCHOLAR });
S('arcology', 'Arcologies', 8, J.BUILD, 900000, ['skyscrapers', 'computers'], { urban: 14000 }, 'A whole city in one building.', { tag: 'urban' });
S('smartcity', 'Smart Cities', 8, J.BUILD, 900000, ['internet'], { urban: 9000, fire: 0.6 }, 'Traffic, power and water all think for themselves.', { tag: 'urban', alt: J.SCHOLAR });
S('thinkingmachines', 'Thinking Machines', 8, J.SCHOLAR, 1200000, ['computers', 'internet'], { research: 1.6 }, 'Perhaps the last invention people need to make.', { tag: 'math' });
S('fusion', 'Fusion Power', 8, J.SCHOLAR, 1500000, ['nuclear', 'thinkingmachines'], { urban: 6000 }, 'A small sun in a bottle.', { tag: 'energy' });

// The ages after spaceflight. Unlike the side branches, these carry the world's clock forward.
const M = (id, name, era, dom, diff, req, fx, desc, x) => TECHS.push(Object.assign({ id, name, era, dom, diff, req, fx, desc }, x));
M('mobilenet', 'Global Networks', 9, J.SCHOLAR, 2400000, ['internet'], { research: 1.3, spread: 2 }, 'Everyone alive, in the same conversation.', { tag: 'math' });
M('nanotech', 'Nanotechnology', 9, J.CRAFT, 2600000, ['computers', 'internet'], { craft: 1.5, build: 1.3 }, 'Machines the size of molecules, building from the bottom up.', { tag: 'machine', alt: J.SCHOLAR });
M('biotech', 'Engineered Crops', 9, J.FARM, 2200000, ['greenrev', 'internet'], { farm: 1.6, deplete: 0.6 }, 'Plants written like software.', { tag: 'farm', alt: J.SCHOLAR });
M('quantum', 'Quantum Computing', 9, J.SCHOLAR, 3000000, ['internet'], { research: 1.6 }, 'Problems that would take forever take an afternoon.', { tag: 'math' });
M('agi', 'General Intelligence', 10, J.SCHOLAR, 6000000, ['quantum', 'thinkingmachines'], { research: 2, craft: 1.5 }, 'Someone new to talk to.', { tag: 'math' });
M('fusionnet', 'The Fusion Grid', 10, J.SCHOLAR, 5000000, ['fusion', 'nanotech'], { urban: 8000, ev: 1 }, 'Energy stops being a thing anyone worries about.', { tag: 'energy' });
M('longevity', 'Longevity Medicine', 10, J.SERVICE, 5000000, ['biotech', 'nanotech'], { health: 0.6, infant: 0.7 }, 'A hundred and fifty becomes middle age.', { tag: 'med', alt: J.SCHOLAR });
M('climateeng', 'Climate Engineering', 10, J.SCHOLAR, 5000000, ['nanotech'], { drought: 0.5, farm: 1.1 }, 'The weather is now a decision.', { tag: 'energy' });
M('orbital', 'Orbital Stations', 11, J.SCHOLAR, 9000000, ['spaceflight', 'fusionnet'], { research: 1.2 }, 'A permanent address above the sky.', { tag: 'sky' });
M('spaceelevator', 'Space Elevator', 11, J.BUILD, 12000000, ['orbital', 'nanotech'], { cargo: 1.5 }, 'A cable to orbit, and cargo that goes up for the price of a train ticket.', { tag: 'sky', alt: J.SCHOLAR });
M('orbitalsolar', 'Orbital Power', 11, J.SCHOLAR, 10000000, ['orbital'], { urban: 14000 }, 'Sunlight that never sets, beamed down.', { tag: 'energy' });
M('lunar', 'Lunar Cities', 11, J.SCHOLAR, 12000000, ['orbital'], { research: 1.2 }, 'Children who have never seen rain.', { tag: 'sky' });
M('mars', 'Mars Settlement', 12, J.SCHOLAR, 16000000, ['lunar', 'spaceelevator'], { research: 1.1 }, 'The second world.', { tag: 'sky' });
M('asteroidmine', 'Asteroid Mining', 12, J.MINE, 18000000, ['lunar', 'spaceelevator'], { mine: 2, craft: 1.3 }, 'A single rock with more metal than every mine that ever was.', { tag: 'metal', alt: J.SCHOLAR });
M('mindupload', 'Digital Minds', 12, J.SCHOLAR, 20000000, ['agi', 'longevity'], { research: 1.4 }, 'Death becomes a choice for a few.', { tag: 'med' });
M('antimatter', 'Antimatter Drives', 13, J.SCHOLAR, 28000000, ['mars', 'asteroidmine'], { seaRange: 1.1 }, 'A gram of nothing, and you’re gone.', { tag: 'sky' });
M('dyson', 'Dyson Swarm', 13, J.BUILD, 32000000, ['asteroidmine', 'orbitalsolar'], { urban: 40000, research: 1.3 }, 'Mirrors by the billion, drinking the sun.', { tag: 'energy', alt: J.SCHOLAR });
M('starship', 'Starships', 13, J.SCHOLAR, 40000000, ['antimatter', 'mindupload'], {}, 'Someone from this world will see another sun.', { tag: 'sky' });

// Healing: from knowing which leaf to chew to rewriting a gene. contagion: how easily sickness passes between people. recover: how many of the badly hurt live.
S('midwifery', 'Midwifery', 1, J.SERVICE, 2300, ['herbs'], { infant: 0.88 }, 'Women who have seen a hundred births see this one through.', { tag: 'med', alt: J.FORAGE });
S('bonesetting', 'Splints & Bonesetting', 1, J.HUNT, 2000, ['herbs'], { recover: 1.15, health: 0.98 }, 'A broken leg used to mean a slow death. Now it means a limp.', { tag: 'med', alt: J.SERVICE });
S('apothecary', 'Apothecaries', 3, J.SERVICE, 10000, ['medicine', 'glass'], { health: 0.96 }, 'Remedies measured, mixed and written down, so the next one works like the last.', { tag: 'med', alt: J.TRADE });
S('quarantine', 'Quarantine', 4, J.SERVICE, 15000, ['medicine', 'law'], { contagion: 0.6 }, 'Forty days at anchor before anyone comes ashore.', { tag: 'med', alt: J.SAILOR });
S('hospitals', 'Hospitals', 4, J.SERVICE, 17000, ['infirmaries', 'theology'], { health: 0.95, recover: 1.1 }, 'Long halls of beds, and an order of people sworn to tend them.', { tag: 'med', alt: J.SCHOLAR });
S('anatomy', 'Anatomy', 5, J.SCHOLAR, 40000, ['medicine', 'printing'], { health: 0.95, recover: 1.2 }, 'The body opened, drawn and printed, and surgeons stop guessing.', { tag: 'med', alt: J.SERVICE });
S('microscope', 'Microscopes', 5, J.SCHOLAR, 44000, ['optics', 'anatomy'], { plague: 0.9 }, 'Tiny animals in a drop of water. Nobody yet knows what they do.', { tag: 'med' });
S('epidemiology', 'Epidemiology', 6, J.SCHOLAR, 105000, ['sanitation', 'printing'], { contagion: 0.6 }, 'A map of the dead points straight at the pump.', { tag: 'med', alt: J.SERVICE });
S('anaesthesia', 'Anaesthesia', 6, J.SERVICE, 100000, ['anatomy', 'science'], { recover: 1.3, health: 0.96 }, 'Surgery stops being a race against the patient’s screaming.', { tag: 'med', alt: J.SCHOLAR });
S('nursing', 'Professional Nursing', 6, J.SERVICE, 95000, ['hospitals', 'sanitation'], { health: 0.93, recover: 1.2 }, 'Clean wards, fresh air and a lamp at night halve the deaths.', { tag: 'med' });
S('xrays', 'X-Rays', 7, J.SCHOLAR, 230000, ['electric', 'anatomy'], { health: 0.94 }, 'A photograph of the inside of a living person.', { tag: 'med', alt: J.SERVICE });
S('bloodbank', 'Blood Transfusion', 7, J.SERVICE, 220000, ['anaesthesia', 'refrigeration'], { recover: 1.3 }, 'Typed, stored and kept cold: blood waits for whoever needs it.', { tag: 'med' });
S('publichealth', 'Public Health Service', 7, J.SERVICE, 240000, ['epidemiology', 'welfare'], { contagion: 0.55, infant: 0.85 }, 'Inspectors, nurses in every district, and a record of every case.', { tag: 'med', alt: J.SCHOLAR });
S('pharma', 'Pharmaceuticals', 8, J.SCHOLAR, 750000, ['antibiotics', 'plastics'], { health: 0.86, plague: 0.6 }, 'Medicines made by the ton, to the milligram.', { tag: 'med', alt: J.CRAFT });
S('transplants', 'Organ Transplants', 8, J.SERVICE, 820000, ['bloodbank', 'computers'], { health: 0.92 }, 'A stranger’s heart keeps someone else alive.', { tag: 'med', alt: J.SCHOLAR });
S('rapidvaccines', 'Rapid Vaccines', 9, J.SCHOLAR, 2100000, ['genetics', 'internet'], { plague: 0.4, contagion: 0.65 }, 'A new disease is read in a day and answered in a month.', { tag: 'med' });
S('nanomed', 'Nanomedicine', 10, J.SCHOLAR, 5000000, ['nanotech', 'pharma'], { health: 0.75, recover: 1.4 }, 'Machines smaller than a cell, sent in to repair it.', { tag: 'med', alt: J.SERVICE });
// Food: getting more from the land, and keeping it longer.
S('fermenting', 'Fermenting & Pickling', 1, J.FORAGE, 1900, ['pottery'], { spoil: 0.9 }, 'Sour, salty and safe through the winter.', { tag: 'farm' });
S('terracing', 'Terrace Farming', 2, J.FARM, 5200, ['irrigation', 'masonry'], { farm: 1.05, fields: 0.5 }, 'A hillside cut into steps, each one a level little field.', { tag: 'farm', alt: J.BUILD });
S('threefield', 'Three-Field System', 4, J.FARM, 19000, ['rotation'], { farm: 1.1 }, 'One field for winter grain, one for spring, one resting.', { tag: 'farm' });
S('seeddrill', 'The Seed Drill', 5, J.FARM, 42000, ['breeding'], { farm: 1.1, fields: 0.5 }, 'Seed sown in rows at the right depth, not scattered for the birds.', { tag: 'farm', alt: J.CRAFT });
S('enclosure', 'Enclosure', 5, J.FARM, 38000, ['seeddrill', 'law'], { farm: 1.08, happy: -2 }, 'Hedges round the old common land: more food, fewer smallholders.', { tag: 'farm', alt: J.TRADE });
S('reaper', 'Mechanical Reaper', 6, J.FARM, 100000, ['steel', 'seeddrill'], { farm: 1.18, fields: 1.5 }, 'One horse and one driver cut what twenty scythes did.', { tag: 'farm', alt: J.CRAFT });
S('guano', 'Guano & Nitrates', 6, J.TRADE, 95000, ['seeddrill', 'navigation'], { farm: 1.12 }, 'Ships full of bird droppings, and harvests nobody had seen before.', { tag: 'farm', alt: J.SAILOR });
S('pasteurise', 'Pasteurisation', 6, J.SCHOLAR, 100000, ['sanitation', 'dairy'], { spoil: 0.8, infant: 0.92 }, 'Heat it, just enough, and the milk stops killing children.', { tag: 'farm', alt: J.HERD });
S('tractor', 'Tractors', 7, J.FARM, 230000, ['combustion', 'reaper'], { farm: 1.3, fields: 3 }, 'The horse retires. One family farms a whole valley.', { tag: 'farm', alt: J.CRAFT });
S('coldchain', 'The Cold Chain', 7, J.TRADE, 220000, ['refrigeration', 'electric'], { spoil: 0.5 }, 'Cold from the field to the kitchen: food crosses the world fresh.', { tag: 'farm', alt: J.SAILOR });
S('pesticides', 'Pesticides', 7, J.SCHOLAR, 230000, ['fertilizer', 'combustion'], { farm: 1.15 }, 'The locusts lose. Nobody yet asks what else does.', { tag: 'farm', alt: J.FARM });
S('aquaculture', 'Fish Farming', 7, J.FISH, 220000, ['refrigeration', 'fishing'], { fish: 1.4 }, 'Pens in the bay, fed every day, harvested like wheat.', { tag: 'farm' });
S('hydroponics', 'Hydroponics', 8, J.GARDEN, 700000, ['greenrev', 'electric'], { farm: 1.15, urban: 800 }, 'Roots in water, light from lamps, no soil at all.', { tag: 'farm', alt: J.SCHOLAR });
S('labmeat', 'Cultured Meat', 9, J.SCHOLAR, 2100000, ['biotech'], { herd: 1.5, farm: 1.1 }, 'Steak from a vat, and the pastures start to empty.', { tag: 'farm', alt: J.HERD });
S('precisionag', 'Precision Farming', 9, J.FARM, 2200000, ['satellites', 'robotics'], { farm: 1.25, deplete: 0.6 }, 'Every square of every field watered, fed and watched from orbit.', { tag: 'farm', alt: J.SCHOLAR });
// More food, from the first shellfish to drought-proof seed. famine: how much a hungry town can find in the wild. slaughter: how much of the herd it can eat in a bad year.
// reserve: how big the stores it aims to keep. relief: how much a state can buy and give out to the hungry.
const warmWet = t => W.temp[t.i] > 0.6 && W.moist[t.i] > 0.45;
S('shellfish', 'Shellfish Gathering', 0, J.FORAGE, 1200, [], { fish: 1.08, famine: 1.2 }, 'Mussels, cockles and oysters: food at every low tide, and it never runs off.', { tag: 'farm', cond: t => t.near.coast > 0, condText: 'Lives on a coast' });
S('acorns', 'Leaching Acorns', 0, J.FORAGE, 1500, [], { forage: 1.08, famine: 1.3 }, 'Bitter nuts soaked in running water become flour for the lean months.', { tag: 'farm' });
S('firestick', 'Fire-Stick Farming', 0, J.HUNT, 1700, [], { hunt: 1.08, forage: 1.06 }, 'Burn the old grass on purpose, and fresh shoots bring the game back.', { tag: 'nature' });
S('pemmican', 'Pemmican & Jerky', 0, J.HUNT, 1600, ['smoking'], { spoil: 0.9, slaughter: 1.3 }, 'Dried meat pounded with fat: a winter in a leather bag.', { tag: 'farm' });
S('faminefoods', 'Famine Lore', 1, J.FORAGE, 2200, [], { famine: 1.5 }, 'The grandmothers remember which roots and barks kept everyone alive the last time.', { tag: 'farm', alt: J.SERVICE });
S('legumes', 'Beans & Lentils', 1, J.FARM, 2600, ['agriculture'], { farm: 1.06, deplete: 0.85 }, 'A crop that feeds the soil while it feeds you.', { tag: 'farm' });
S('querns', 'Querns & Grindstones', 1, J.FARM, 2300, ['agriculture'], { farm: 1.05, spoil: 0.95 }, 'Grain ground fine goes further and keeps longer.', { tag: 'farm', alt: J.CRAFT });
S('poultry', 'Poultry', 1, J.HERD, 2300, ['husbandry'], { herd: 1.1, famine: 1.1 }, 'Every yard has hens, and every hen lays.', { tag: 'farm' });
S('beekeeping', 'Beekeeping', 1, J.FORAGE, 2400, [], { forage: 1.05, happy: 2 }, 'Honey without the stings, more or less.', { tag: 'farm' });
S('rootcellars', 'Root Cellars', 1, J.BUILD, 2300, ['agriculture'], { spoil: 0.85, reserve: 1.2 }, 'Cool, dark and dry: turnips in spring that went in at harvest.', { tag: 'farm', alt: J.FARM });
S('fishdrying', 'Drying Racks', 1, J.FISH, 2000, ['fishing'], { fish: 1.08, spoil: 0.92 }, 'Split, salted and hung in the wind, the catch lasts all year.', { tag: 'sea' });
S('paddies', 'Wet-Rice Paddies', 2, J.FARM, 5800, ['irrigation'], { farm: 1.15, fields: 0.5 }, 'Flooded terraces grow more food on less land than anything else.', { tag: 'farm', cond: warmWet, condText: 'A warm, wet country' });
S('threesisters', 'Three Sisters Planting', 2, J.FARM, 5200, ['agriculture', 'legumes'], { farm: 1.08, deplete: 0.8 }, 'Maize to climb, beans to feed the soil, squash to keep the weeds down.', { tag: 'farm' });
S('fishponds', 'Fish Ponds', 2, J.FISH, 5000, ['irrigation'], { fish: 1.12 }, 'Carp in a pond by the house: fish without a boat.', { tag: 'farm', alt: J.FARM });
S('templegranary', 'Temple Granaries', 2, J.SERVICE, 5500, ['granary', 'priests'], { reserve: 1.3, relief: 0.5 }, 'The gods keep a seventh of every harvest, and give it back in the bad years.', { tag: 'farm', alt: J.FARM });
S('shaduf', 'Shadoofs & Water Wheels', 2, J.FARM, 5600, ['irrigation', 'wheel'], { farm: 1.06, drought: 0.85 }, 'Water lifted bucket by bucket onto fields the river never reaches.', { tag: 'farm', alt: J.BUILD });
S('grafting', 'Grafting', 3, J.GARDEN, 11000, ['orchards'], { farm: 1.05 }, 'A good apple tree, copied branch by branch for ever.', { tag: 'farm' });
S('dovecotes', 'Dovecotes', 3, J.HERD, 10000, ['masonry'], { herd: 1.05, famine: 1.1 }, 'A tower full of pigeons: meat in winter and dung for the fields.', { tag: 'farm', alt: J.BUILD });
S('grainfleet', 'Grain Fleets', 3, J.TRADE, 13000, ['ships', 'currency'], { cargo: 1.05, relief: 0.5 }, 'Whole fleets carry grain to feed the capital, and the capital stays loyal.', { tag: 'trade', alt: J.SAILOR });
S('veterinary', 'Animal Healing', 3, J.HERD, 11000, ['medicine', 'husbandry'], { herd: 1.12 }, 'A sick cow is worth a doctor too.', { tag: 'farm', alt: J.SERVICE });
S('champarice', 'Fast-Ripening Rice', 4, J.FARM, 20000, ['paddies'], { farm: 1.12, drought: 0.9 }, 'A rice that ripens in sixty days: two harvests a year, or one before the drought.', { tag: 'farm' });
S('drainage', 'Field Drainage', 4, J.FARM, 22000, ['ironplough'], { farm: 1.06, fields: 0.5 }, 'Ditches and buried tiles turn wet ground into the best land there is.', { tag: 'farm', alt: J.BUILD });
S('poorrelief', 'Poor Relief', 4, J.SERVICE, 18000, ['theology', 'taxation'], { relief: 1 }, 'The parish feeds its own: bread for those who cannot work.', { tag: 'law' });
S('cropexchange', 'The Crop Exchange', 5, J.FARM, 48000, ['navigation', 'breeding'], { farm: 1.12, famine: 1.3, drought: 0.9 }, 'Maize, potatoes, beans and squash cross the oceans. Famine has a harder time finding anyone.', { tag: 'farm', alt: J.TRADE });
S('turnips', 'Turnips & Clover', 5, J.FARM, 44000, ['rotation', 'breeding'], { farm: 1.1, herd: 1.15, deplete: 0.8 }, 'Fodder in winter means more beasts, more dung and better grain.', { tag: 'farm', alt: J.HERD });
S('agsociety', 'Agricultural Societies', 5, J.SCHOLAR, 46000, ['printing', 'breeding'], { farm: 1.05, research: 1.03 }, 'Gentlemen farmers compare notes, and the best ideas reach every parish.', { tag: 'farm' });
S('potatoes', 'Potato Fields', 5, J.FARM, 45000, ['cropexchange'], { farm: 1.1, famine: 1.2 }, 'Three times the food from the same ground, and it hides underground from armies.', { tag: 'farm' });
S('steamplough', 'Steam Ploughing', 6, J.FARM, 110000, ['steam', 'reaper'], { farm: 1.1, fields: 1.5 }, 'Two engines and a cable drag a plough across a field in an afternoon.', { tag: 'farm', alt: J.CRAFT });
S('grainelevator', 'Grain Elevators', 6, J.TRADE, 100000, ['railway', 'steam'], { spoil: 0.85, reserve: 1.3, cargo: 1.05 }, 'Grain poured in by the trainload, kept dry and moved by steam.', { tag: 'farm', alt: J.BUILD });
S('soupkitchens', 'Soup Kitchens', 6, J.SERVICE, 95000, ['factory'], { relief: 1 }, 'A ladle and a queue: nobody in the city has to starve.', { tag: 'law' });
S('grainexchange', 'Grain Exchanges', 6, J.TRADE, 105000, ['telegraph', 'corporations'], { trade: 1.05, relief: 0.3 }, 'Prices wired across the world: grain goes where it is short.', { tag: 'trade' });
S('hybridseed', 'Hybrid Seed', 7, J.SCHOLAR, 260000, ['breeding', 'electric'], { farm: 1.15 }, 'Two parent lines crossed every year for a harvest neither could give.', { tag: 'farm', alt: J.FARM });
S('nutrition', 'Nutrition Science', 7, J.SCHOLAR, 220000, ['vaccines'], { health: 0.95, infant: 0.95, famine: 1.2 }, 'Vitamins, calories and what a child really needs.', { tag: 'med', alt: J.SERVICE });
S('foodaid', 'Food Aid', 7, J.SERVICE, 250000, ['welfare', 'containers'], { relief: 1.5 }, 'Ships of grain to wherever the harvest failed.', { tag: 'law', alt: J.TRADE });
S('dripirrigation', 'Drip Irrigation', 8, J.FARM, 720000, ['plastics', 'computers'], { farm: 1.1, drought: 0.6 }, 'Every plant gets its own drop of water, and not a drop more.', { tag: 'farm', alt: J.SCHOLAR });
S('earlywarning', 'Famine Early Warning', 8, J.SCHOLAR, 760000, ['satellites'], { reserve: 1.5, relief: 0.5 }, 'The harvest failure is seen from orbit months before anyone goes hungry.', { tag: 'farm' });
S('droughtcrops', 'Drought-Proof Crops', 9, J.SCHOLAR, 2100000, ['biotech'], { drought: 0.6, famine: 1.3 }, 'Wheat that shrugs off a dry year.', { tag: 'farm', alt: J.FARM });
// Getting about, the early and middle steps.
S('sledges', 'Sledges & Travois', 0, J.HUNT, 1300, [], { cargo: 1.06 }, 'Two poles and a skin: the load drags itself behind you.', { tag: 'trade' });
S('builtroads', 'Built Roads', 3, J.BUILD, 11000, ['paved', 'engineering'], { admin: 15, speed: 1.03 }, 'Graded, drained and cambered: a road that is still there after the rains.', { tag: 'build', alt: J.SOLDIER });
S('couriers', 'Courier Posts', 3, J.TRADE, 9500, ['riding', 'writing'], { admin: 12, spread: 1.1 }, 'Fresh horses every day’s ride, and a letter crosses the realm in a week.', { tag: 'law', alt: J.HERD });
S('turnpikes', 'Turnpikes', 5, J.TRADE, 38000, ['builtroads', 'banking'], { cargo: 1.08, trade: 1.05 }, 'Pay at the gate, and the road is kept good enough to be worth it.', { tag: 'trade', alt: J.BUILD });
S('macadam', 'Macadam Roads', 6, J.BUILD, 95000, ['turnpikes', 'steam'], { speed: 1.05, cargo: 1.1 }, 'Broken stone rolled hard: a surface fit for anything with wheels.', { tag: 'build' });
S('freightyards', 'Freight Yards', 6, J.TRADE, 100000, ['railway'], { cargo: 1.15 }, 'Sidings, cranes and timetables: goods change trains, not hands.', { tag: 'trade', alt: J.BUILD });
S('lorries', 'Lorries', 7, J.CRAFT, 220000, ['cars'], { cargo: 1.2 }, 'Goods go door to door, not station to station.', { tag: 'machine', alt: J.TRADE });
S('airlines', 'Airlines', 7, J.TRADE, 260000, ['flight', 'radio'], { spread: 1.2, trade: 1.1 }, 'Strangers from the far side of the world arrive by lunch.', { tag: 'trade', alt: J.SERVICE });
S('jetliners', 'Jet Airliners', 8, J.CRAFT, 760000, ['airlines', 'computers'], { spread: 1.2, trade: 1.1, admin: 30 }, 'Everyone can afford to fly, and nowhere is far.', { tag: 'machine', alt: J.TRADE });
// The modern world: talking at a distance, chips in everything, tourists, games, and new ways to fight.
S('telephone', 'Telephones', 6, J.SCHOLAR, 140000, ['telegraph'], { admin: 20, spread: 1.2 }, 'A voice down a wire, and no need to know Morse.', { tag: 'elec', alt: J.SERVICE });
S('globalgames', 'International Games', 7, J.SERVICE, 200000, ['railway', 'radio'], { happy: 3 }, 'Every four years the realms send their fastest and strongest, and fight with stopwatches instead.', { tag: 'lore', alt: J.SOLDIER });
S('worldassembly', 'World Assembly', 7, J.SCHOLAR, 240000, ['telegraph', 'suffrage'], { order: 2 }, 'One hall, every flag, and the hope that talking lasts longer than fighting.', { tag: 'law', alt: J.SERVICE });
S('supermarkets', 'Supermarkets', 7, J.TRADE, 220000, ['refrigeration', 'cars'], { spoil: 0.85, trade: 1.05 }, 'A trolley, a car park, and food from five continents on one shelf.', { tag: 'trade', alt: J.FARM });
S('assaultrifle', 'Assault Rifles', 7, J.CRAFT, 260000, ['machinegun', 'plastics'], {}, 'Light enough to carry all day, fast enough to fire like a machine gun.', { tag: 'war', alt: J.SOLDIER, mil: 1 });
S('helicopters', 'Helicopters', 7, J.CRAFT, 280000, ['flight', 'massprod'], { recover: 1.15 }, 'It lands anywhere: the wounded reach a surgeon in minutes, and gunships hang over the battle.', { tag: 'machine', alt: J.SOLDIER, mil: 1 });
S('transistors', 'Microchips', 8, J.SCHOLAR, 750000, ['computers'], { research: 1.15, craft: 1.1 }, 'A whole room of valves on a fingernail of silicon.', { tag: 'elec', alt: J.CRAFT });
S('jetfighters', 'Jet Fighters', 8, J.SOLDIER, 760000, ['bomber', 'computers'], {}, 'Faster than sound: bombers no longer get through unchallenged.', { tag: 'war', alt: J.SCHOLAR, mil: 1 });
S('rocketarty', 'Rocket Artillery', 8, J.SOLDIER, 720000, ['artillery', 'rockets'], {}, 'A truck that fires forty rockets in twenty seconds, then drives away.', { tag: 'war', alt: J.CRAFT, mil: 1 });
S('mobilephones', 'Mobile Phones', 8, J.SCHOLAR, 800000, ['telephone', 'transistors'], { spread: 1.3, admin: 20, trade: 1.05 }, 'Everyone carries a telephone, and nobody is ever out of reach again.', { tag: 'elec' });
S('gps', 'Satellite Navigation', 8, J.SCHOLAR, 820000, ['satellites', 'transistors'], { seaRange: 1.2, speed: 1.03, cargo: 1.05 }, 'A little blue dot says exactly where you are, anywhere on the planet.', { tag: 'sky', alt: J.SAILOR });
S('videogames', 'Video Games', 8, J.CRAFT, 700000, ['transistors', 'television'], { happy: 5 }, 'Whole worlds on a screen, and children who won’t come in for dinner because they’re already in.', { tag: 'elec', alt: J.SCHOLAR });
S('masstourism', 'Mass Tourism', 8, J.TRADE, 760000, ['jetliners'], { trade: 1.06, happy: 2 }, 'Two weeks on a beach a thousand miles away. Cathedrals and ruins start paying their way.', { tag: 'trade', alt: J.SERVICE });
S('creditcards', 'Credit Cards', 8, J.TRADE, 700000, ['fiatmoney', 'computers'], { trade: 1.08 }, 'Buy now, pay later. A lot later.', { tag: 'trade' });
S('recycling', 'Recycling', 8, J.SERVICE, 650000, ['plastics', 'sanitation'], { craft: 1.05 }, 'Yesterday’s rubbish is tomorrow’s raw material.', { tag: 'craft' });
S('socialmedia', 'Social Media', 9, J.SCHOLAR, 2000000, ['mobilephones', 'internet'], { spread: 1.5, happy: -2, order: -3 }, 'Everyone has a voice, and everyone uses it at once.', { tag: 'elec' });
S('ecommerce', 'Online Shopping', 9, J.TRADE, 2000000, ['internet', 'creditcards'], { trade: 1.12, cargo: 1.08 }, 'Click, and a van brings it tomorrow.', { tag: 'trade', alt: J.SCHOLAR });
S('cyberwar', 'Cyber Warfare', 9, J.SCHOLAR, 2200000, ['internet', 'transistors'], {}, 'The lights go out in a city a thousand miles away, and nobody fired a shot.', { tag: 'war', alt: J.SOLDIER, mil: 1 });
S('combatdrones', 'Combat Drones', 9, J.SOLDIER, 2200000, ['robotics', 'gps'], {}, 'The pilot goes home for dinner; the aircraft stays up all week.', { tag: 'war', alt: J.SCHOLAR, mil: 1 });
S('ceramicarmour', 'Ceramic Plates', 9, J.CRAFT, 2000000, ['kevlar', 'robotics'], { defend: 1.05 }, 'Plates that shatter so the soldier doesn’t.', { tag: 'war', alt: J.SOLDIER, mil: 1 });
S('batteries', 'Lithium Batteries', 9, J.CRAFT, 2000000, ['renewables', 'transistors'], { urban: 800 }, 'Sunshine at midnight, stored in a box.', { tag: 'energy', alt: J.SCHOLAR });
genInventions();  // ten thousand more, crossed from the families in techgen.js; after every hand-written one so old saves keep their indexes
// Traits and needs push research by kind of work, so each invention belongs to a kind.
const TECH_TAGS = { hides: 'warm', weaving: 'warm', bow: 'war', gunpowder: 'war', copper: 'metal', bronze: 'metal', iron: 'metal', blast: 'metal', steel: 'metal', deepmine: 'metal', herbs: 'med', medicine: 'med', sanitation: 'med', vaccines: 'med', antibiotics: 'med', calendar: 'sky', compass: 'sky', optics: 'sky', navigation: 'sea', rockets: 'sky', spaceflight: 'sky', math: 'math', computers: 'math', internet: 'math', steam: 'machine', factory: 'machine', railway: 'machine', massprod: 'machine', watermill: 'machine', windmill: 'machine', cars: 'machine', flight: 'machine', combustion: 'machine', electric: 'elec', telegraph: 'elec', writing: 'lore', paper: 'lore', printing: 'lore', philosophy: 'lore', university: 'lore', science: 'lore', law: 'law', engineering: 'build', masonry: 'build', mudbrick: 'build', paved: 'build', currency: 'trade', banking: 'trade', ships: 'sea', sailing: 'sea', rafts: 'sea', fishing: 'sea', plough: 'farm', agriculture: 'farm', husbandry: 'farm', irrigation: 'farm', granary: 'farm', rotation: 'farm', breeding: 'farm', fertilizer: 'farm', greenrev: 'farm', riding: 'war' };
const DOM_TAG = { [J.FORAGE]: 'nature', [J.HUNT]: 'nature', [J.FISH]: 'sea', [J.FARM]: 'farm', [J.HERD]: 'farm', [J.WOOD]: 'build', [J.STONE]: 'build', [J.CLAY]: 'craft', [J.MINE]: 'metal', [J.BUILD]: 'build', [J.CRAFT]: 'craft', [J.TRADE]: 'trade', [J.SCHOLAR]: 'lore', [J.SOLDIER]: 'war', [J.SERVICE]: 'med', [J.SAILOR]: 'sea', [J.GARDEN]: 'farm' };
const TAG_NAME = { nature: 'the wild', farm: 'farming', warm: 'keeping warm', war: 'war', metal: 'metalwork', med: 'healing', sky: 'the sky', sea: 'the sea', math: 'number', machine: 'machines', elec: 'electricity', lore: 'learning', law: 'government', build: 'building', urban: 'city life', trade: 'trade', craft: 'crafts', energy: 'fuel and power' };
const TAGS = Object.keys(TAG_NAME), TAG_IX = {}; TAGS.forEach((k, i) => { TAG_IX[k] = i; });
TECHS.forEach(T => { if (!T.tag) T.tag = TECH_TAGS[T.id] || DOM_TAG[T.dom] || 'lore'; T.tagI = TAG_IX[T.tag]; });

const TECH_IX = {}; TECHS.forEach((T, i) => { T.ix = i; TECH_IX[T.id] = i; });
// Older inventions that turn out to change how people travel.
TECHS[TECH_IX.wheel].fx.trans = 2; TECHS[TECH_IX.trams].fx.trans = 4; TECHS[TECH_IX.cars].fx.trans = 5; TECHS[TECH_IX.navigation].fx.sail = 2;
TECHS[TECH_IX.evs].req.push('batteries'); TECHS[TECH_IX.drones].req.push('gps');
TECHS[TECH_IX.nuclear].cond = t =>t.near.uranium > 0 || t.stock[R.URANIUM] > 0; TECHS[TECH_IX.nuclear].condText = 'Uranium, mined or traded';
TECHS.forEach(T => { T.reqIx = (T.req || []).map(r => { if (TECH_IX[r] === undefined) throw new Error('bad tech req ' + r); return TECH_IX[r]; }); });
const NT = TECHS.length;

// ---- The wider town. Each building does something of its own: fx, urban (people it lets live close together), happy, order, yield, fort. ----
const NN = t => tn(t);
const At = (a, per) => t => NN(t) >= a ? 1 + (per ? Math.floor(NN(t) / per) : 0) : 0;
const OneAt = a => t => NN(t) >= a ? 1 : 0;
const Crowded = (id, a) => t => (NN(t) >= a && t.crowd > 0.72) ? (t.count[id] || 0) + (t.count['q_' + id] ? 0 : 1) : 0;
const WarNear = (a, yrs) => t => (NN(t) >= a && t.warYear > W.tick / TPY - yrs) ? 1 : 0;
const C = (w, s, b, g, c, m) => { const o = {}; if (w) o[R.WOOD] = w; if (s) o[R.STONE] = s; if (b) o[R.BRICK] = b; if (g) o[R.GOODS] = g; if (c) o[R.CLOTH] = c; if (m) o[R.STEEL] = m; return o; };
Object.assign(BLD, {
  shrine: { name: 'Shrine', size: 1, tech: 'burial', cost: C(3), work: 50, happy: 3, want: OneAt(8), about: 'A small holy place: a little more contentment.' },
  well: { name: 'Well', size: 1, tech: 'wells', cost: C(3), work: 40, urban: 25, fx: { health: 0.985 }, want: At(16, 220), about: 'Clean water close by lets more people live here.' },
  storehouse: { name: 'Storehouse', size: 1, tech: 'storehouses', cost: C(6), work: 60, store: 120, want: At(20, 150), about: 'Extra room for goods.' },
  huntlodge: { name: 'Hunting lodge', size: 1, tech: 'snares', cost: C(5), work: 50, fx: { hunt: 1.2 }, want: t => t.herds.length && NN(t) >= 10 && !t.mod.tier ? 1 : 0, about: 'Better hunting.' },
  smokehouse: { name: 'Smokehouse', size: 1, tech: 'smoking', cost: C(5), work: 50, smoke: 1, fx: { spoil: 0.88 }, want: OneAt(14), about: 'Less food spoils.' },
  wharf: { name: 'Fishing wharf', size: 1, tech: 'rafts', cost: C(8), work: 70, place: 'shore', port: 1, fx: { fish: 1.15 }, want: t => (t.sFish.length && NN(t) >= 10) ? 1 + Math.floor(NN(t) / 200) : 0, about: 'Launches fishing boats and small craft.' },
  watchtower: { name: 'Watchtower', size: 1, tech: 'palisade', cost: C(8), work: 80, fx: { defend: 1.08 }, want: WarNear(15, 90), about: 'Warning of raiders. Better defence.' },
  bakery: { name: 'Bakery', size: 1, tech: 'baking', cost: C(6), work: 70, smoke: 1, fx: { spoil: 0.92, health: 0.99 }, want: At(30, 250), about: 'Bread keeps. People stay healthier.' },
  brewery: { name: 'Brewery', size: 1, tech: 'brewing', cost: C(8), work: 90, craft: 1, happy: 3, want: t => NN(t) >= 40 && t.stock[R.FOOD] > NN(t) * 2 ? 1 : 0, about: 'Turns spare grain into drink and goods.' },
  orchard: { name: 'Orchard', size: 2, tech: 'orchards', cost: C(3), work: 90, yield: { [R.FOOD]: 14 }, want: t => NN(t) >= 25 ? 1 + Math.floor(NN(t) / 200) : 0, about: 'Fruit every year with little work.' },
  dairy: { name: 'Dairy barn', size: 2, tech: 'dairy', cost: C(8), work: 90, fx: { herd: 1.25 }, want: t => t.tameHerd && NN(t) >= 18 ? 1 : 0, about: 'More food from the herd.' },
  tannery: { name: 'Tannery', size: 1, tech: 'tanning', cost: C(7), work: 80, craft: 1, want: t => t.tameHerd && NN(t) >= 25 ? 1 : 0, about: 'Makes leather and cloth goods.' },
  dyeworks: { name: 'Dye works', size: 1, tech: 'dyes', cost: C(8), work: 80, fx: { trade: 1.08 }, want: OneAt(70), about: 'Coloured cloth widens trade.' },
  carpenter: { name: 'Carpenter', size: 1, tech: 'carpentry', cost: C(6), work: 60, fx: { build: 1.1 }, want: OneAt(35), about: 'Faster building.' },
  charcoalpit: { name: 'Charcoal clamp', size: 1, tech: 'charcoal', cost: C(4), work: 40, smoke: 1, fx: { craft: 1.05 }, want: OneAt(50), about: 'Hotter fires for workshops.' },
  councilhut: { name: 'Council lodge', size: 2, tech: 'oralaw', cost: C(10), work: 110, order: 4, want: OneAt(30), about: 'Elders settle quarrels: more order.' },
  armoury: { name: 'Armoury', size: 1, tech: 'warband', cost: C(8, 2), altCost: C(12), work: 100, craft: 1, forge: 1, smoke: 1, want: t => NN(t) >= 28 ? 1 + Math.floor(NN(t) / 300) : 0, about: 'Forges weapons and armour from the town’s own metal and wood.' },
  fort: { name: 'Hill fort', size: 2, tech: 'palisade', cost: C(14), work: 180, fort: 40, fx: { defend: 1.15 }, want: WarNear(40, 120), about: 'Earth and timber stronghold. Attackers must wear it down.' },
  stable: { name: 'Stables', size: 2, tech: 'riding', cost: C(12), work: 120, cavalry: 1, fx: { cargo: 1.08 }, want: t => NN(t) >= 60 && t.tameHerd ? 1 : 0, about: 'Lets the town field mounted soldiers.' },
  cistern: { name: 'Cistern', size: 1, tech: 'cisterns', cost: C(2, 8), altCost: C(2, 0, 8), work: 110, urban: 70, fx: { drought: 0.9 }, want: Crowded('cistern', 40), about: 'Stored water for a crowded town.' },
  glassworks: { name: 'Glassworks', size: 1, tech: 'glass', cost: C(8, 0, 4), work: 120, craft: 1, smoke: 1, want: OneAt(70), about: 'Luxury goods from clay and fire.' },
  weighhouse: { name: 'Weigh house', size: 1, tech: 'scales', cost: C(6, 0, 3), work: 90, fx: { trade: 1.08 }, order: 1, want: OneAt(60), about: 'Fair measures: wider trade.' },
  caravanserai: { name: 'Caravanserai', size: 3, tech: 'caravans', cost: C(16, 0, 12), altCost: C(26, 8), work: 260, fx: { trade: 1.2, cargo: 1.1 }, store: 120, want: At(80, 900), about: 'Walled inn for caravans. Trade routes reach much further.' },
  observatory: { name: 'Observatory', size: 1, tech: 'astronomy', cost: C(4, 8), altCost: C(4, 0, 10), work: 170, study: 3, fx: { seaRange: 1.08 }, want: OneAt(90), about: 'Sky-watchers: seats for scholars, longer sea range.' },
  lighthouse: { name: 'Lighthouse', size: 1, tech: 'mapmaking', cost: C(3, 14), altCost: C(3, 0, 16), work: 200, place: 'shore', fx: { seaRange: 1.2 }, wreck: 0.5, want: t => t.count.dock ? 1 : 0, about: 'Fewer shipwrecks, longer sea routes.' },
  shipyard: { name: 'Shipyard', size: 2, tech: 'sailing', cost: C(20, 0, 0, 0, 2), altCost: C(24), work: 220, place: 'shore', port: 2, yard: 2, want: t => (t.count.dock && NN(t) >= 60) ? 1 + Math.floor(NN(t) / 1400) : 0, about: 'Lays keels for larger merchant ships and warships.' },
  merchantport: { name: 'Merchant port', size: 3, tech: 'ships', cost: C(36, 12, 0, 4), altCost: C(50, 0, 0, 4), work: 420, place: 'shore', port: 3, yard: 2, store: 400, fx: { trade: 1.2 }, want: t => (t.count.dock && NN(t) >= 130) ? 1 + Math.floor(NN(t) / 2500) : 0, about: 'Quays and cranes: more and bigger trading ships.' },
  navalbase: { name: 'Military port', size: 3, tech: 'wargalley', cost: C(36, 16), altCost: C(46, 0, 12), work: 420, place: 'shore', port: 2, navy: 1, fx: { defend: 1.06 }, want: t => (t.count.dock && NN(t) >= 90 && t.polity.towns >= 2 && (t.warYear > W.tick / TPY - 150 || t.polity.nodes.includes('mar3'))) ? 1 : 0, about: 'Builds and bases the realm’s warships.' },
  forum: { name: 'Forum', size: 2, tech: 'taxation', cost: C(4, 16), altCost: C(4, 0, 18), work: 210, fx: { trade: 1.08 }, order: 3, want: At(90, 1000), about: 'Public square of law and business.' },
  mint: { name: 'Mint', size: 1, tech: 'currency', cost: C(4, 8), altCost: C(4, 0, 10), work: 130, fx: { trade: 1.12 }, want: t => NN(t) >= 80 && (t.near.gold || t.stock[R.GOLD] > 2) ? 1 : 0, about: 'Strikes coin from gold.' },
  infirmary: { name: 'Infirmary', size: 1, tech: 'surgery', cost: C(4, 0, 8), altCost: C(4, 8), work: 120, service: 1, fx: { health: 0.96 }, want: At(70, 500), about: 'Care for the sick and wounded.' },
  aqueduct: { name: 'Aqueduct', size: 3, tech: 'aqueduct', cost: C(4, 40), altCost: C(4, 0, 44), work: 520, urban: 200, fx: { health: 0.97 }, want: Crowded('aqueduct', 90), about: 'A river in the sky. Big jump in how many can live here.' },
  bathhouse: { name: 'Bathhouse', size: 2, tech: 'baths', cost: C(6, 18), altCost: C(6, 0, 18), work: 220, service: 1, happy: 4, fx: { plague: 0.9 }, want: At(120, 900), about: 'Hot water: happier people, less disease.' },
  amphitheatre: { name: 'Amphitheatre', size: 3, tech: 'citizenship', cost: C(4, 36), work: 440, happy: 9, want: At(170, 2500), about: 'Games and plays calm a big city.' },
  library: { name: 'Library', size: 2, tech: 'paper', cost: C(6, 12, 6), altCost: C(6, 0, 18), work: 280, study: 5, fx: { research: 1.12, keep: 1 }, want: At(100, 1000), about: 'Knowledge piles up here and doesn’t get lost.' },
  guildhall: { name: 'Guildhall', size: 2, tech: 'guilds', cost: C(10, 8, 4), work: 240, craft: 1, fx: { craft: 1.12 }, want: At(120, 800), about: 'Masters train apprentices. Better crafts.' },
  monastery: { name: 'Monastery', size: 2, tech: 'theology', cost: C(6, 18), work: 300, study: 3, service: 1, happy: 3, place: 'far', fx: { keep: 1 }, yield: { [R.FOOD]: 10 }, want: OneAt(80), about: 'Copies books, keeps gardens, sits outside town.' },
  castle: { name: 'Castle', size: 3, tech: 'castles', cost: C(8, 70), work: 800, fort: 120, fx: { defend: 1.25 }, order: 4, want: t => NN(t) >= 90 && (t.polity.capital === t || t.warYear > W.tick / TPY - 150) ? 1 : 0, about: 'A stone keep. Sieges take far longer.' },
  barbican: { name: 'Fortified gatehouse', size: 1, tech: 'fortification', cost: C(4, 14), work: 170, fort: 25, want: t => t.walls && NN(t) >= 80 ? 1 : 0, about: 'Hardens the town walls.' },
  archery: { name: 'Archery butts', size: 2, tech: 'longbow', cost: C(8), work: 90, rangedSkill: 1, want: WarNear(70, 200), about: 'Archers from this town shoot straighter.' },
  siegeyard: { name: 'Siege yard', size: 2, tech: 'ram', cost: C(16, 0, 0, 0, 0, 1), altCost: C(20), work: 160, engines: 1, want: t => NN(t) >= 90 && t.warYear > W.tick / TPY - 120 ? 1 : 0, about: 'Armies from here bring more siege engines.' },
  cathedral: { name: 'Great cathedral', size: 3, tech: 'theology', cost: C(12, 80, 0, 6), work: 1100, happy: 14, order: 2, service: 2, want: At(220, 3000), about: 'Generations of stonework. A huge calming presence.' },
  courthouse: { name: 'Courthouse', size: 2, tech: 'law', cost: C(6, 12, 6), altCost: C(6, 0, 18), work: 200, order: 8, want: At(90, 900), about: 'Disputes settled in public. Much less crime.' },
  watchhouse: { name: 'Watch house', size: 1, tech: 'townwatch', cost: C(6, 4), work: 90, order: 4, service: 1, want: At(70, 500), about: 'Keeps the streets calm.' },
  fireward: { name: 'Fire watch', size: 1, tech: 'firewardens', cost: C(6, 4), work: 90, service: 1, fx: { fire: 0.7 }, want: At(110, 700), about: 'Fewer great fires.' },
  almshouse: { name: 'Almshouse', size: 1, tech: 'theology', cost: C(8, 4), work: 100, happy: 3, fx: { infant: 0.96 }, want: At(150, 800), about: 'Care for the poor.' },
  warehouse: { name: 'Warehouse', size: 2, tech: 'chartered', cost: C(16, 0, 8), work: 170, store: 700, want: At(120, 700), about: 'Huge storage.' },
  brickworks: { name: 'Brickworks', size: 2, tech: 'masonry', cost: C(10, 8), work: 170, craft: 2, smoke: 2, want: t => NN(t) >= 100 && t.sClay.length ? 1 + Math.floor(NN(t) / 900) : 0, about: 'Brick by the thousand.' },
  foundry: { name: 'Foundry', size: 2, tech: 'pumps', cost: C(12, 0, 16), work: 260, craft: 2, smoke: 2, want: t => NN(t) >= 110 && (t.stock[R.IRON] > 4 || t.mines.length) ? 1 + Math.floor(NN(t) / 900) : 0, about: 'Pours iron and steel in bulk.' },
  printshop: { name: 'Printing house', size: 1, tech: 'printing', cost: C(8, 0, 6), work: 150, study: 2, fx: { research: 1.1, spread: 1.2 }, want: At(100, 700), about: 'Books spread ideas faster.' },
  theatre: { name: 'Playhouse', size: 2, tech: 'humanism', cost: C(14, 0, 8), work: 220, happy: 7, want: At(150, 1500), about: 'Entertainment for the crowd.' },
  exchange: { name: 'Stock exchange', size: 2, tech: 'stockmarket', cost: C(8, 12, 14, 4), work: 360, fx: { trade: 1.15 }, want: OneAt(280), about: 'Capital flows here.' },
  bank: { name: 'Counting house', size: 1, tech: 'accounts', cost: C(6, 6, 6), work: 150, fx: { trade: 1.08 }, want: At(110, 1000), about: 'Credit for merchants.' },
  canal: { name: 'Canal basin', size: 2, tech: 'canals', cost: C(8, 24), work: 330, fx: { cargo: 1.12 }, place: 'river', store: 150, want: t => t.near.river > 0 && NN(t) >= 130 ? 1 : 0, about: 'Barges carry far more.' },
  starfort: { name: 'Star fort', size: 3, tech: 'starforts', cost: C(10, 50, 40), work: 800, fort: 220, fx: { defend: 1.25 }, want: t => NN(t) >= 180 && t.warYear > W.tick / TPY - 200 ? 1 : 0, about: 'Angled bastions that shrug off cannon.' },
  gasworks: { name: 'Gasworks', size: 2, tech: 'gaslight', cost: C(0, 0, 24, 0, 0, 4), work: 300, urban: 300, smoke: 2, fx: { research: 1.03 }, want: Crowded('gasworks', 200), about: 'Light and heat piped across town.' },
  textile: { name: 'Textile mill', size: 2, tech: 'factory', cost: C(0, 0, 26, 0, 0, 4), work: 300, craft: 2, smoke: 2, want: At(160, 1000), about: 'Cloth by the mile.' },
  steelworks: { name: 'Steelworks', size: 3, tech: 'steel', cost: C(0, 0, 50, 0, 0, 14), work: 650, craft: 3, smoke: 3, want: t => NN(t) >= 280 && t.stock[R.IRON] > 8 ? 1 + Math.floor(NN(t) / 3000) : 0, about: 'Mass steel from ore and coal.' },
  sewers: { name: 'Sewage works', size: 2, tech: 'sewerworks', cost: C(0, 10, 40), work: 500, urban: 1400, fx: { health: 0.9 }, want: Crowded('sewers', 300), about: 'Takes the waste of a whole city away.' },
  tram: { name: 'Tram depot', size: 2, tech: 'trams', cost: C(0, 0, 24, 0, 0, 12), work: 380, urban: 1400, fx: { speed: 1.06 }, want: Crowded('tram', 450), about: 'People can live further from work.' },
  tenements: { name: 'Workers’ quarter', size: 3, tech: 'urbanhousing', cost: C(10, 0, 50), work: 620, urban: 900, want: Crowded('tenements', 400), about: 'Planned streets of cheap housing.' },
  school: { name: 'School', size: 2, tech: 'schools', cost: C(6, 0, 16), work: 220, study: 4, service: 1, fx: { research: 1.08 }, want: At(150, 900), about: 'Every child learns. Invention speeds up.' },
  union: { name: 'Union hall', size: 1, tech: 'unions', cost: C(4, 0, 12), work: 140, happy: 5, order: 2, want: t => (t.count.factory || t.count.textile) ? 1 : 0, about: 'Workers organise. Fewer riots.' },
  parliament: { name: 'Parliament', size: 3, tech: 'constitution', cost: C(10, 50, 30, 10), work: 900, order: 10, happy: 4, fx: { admin: 20 }, want: t => t.polity.capital === t && GOV[t.polity.gov].vote && NN(t) >= 120 ? 1 : 0, about: 'Seat of an elected government.' },
  embassy: { name: 'Embassy', size: 1, tech: 'telegraph', cost: C(4, 8, 8, 4), work: 180, envoy: 1, want: t => t.polity.capital === t ? 1 : 0, about: 'Other realms warm to this one faster.' },
  museum: { name: 'Museum', size: 2, tech: 'encyclopedia', cost: C(4, 22, 10), work: 340, happy: 5, study: 2, want: At(280, 3000), about: 'The past on display.' },
  fort2: { name: 'Coastal battery', size: 1, tech: 'artillery', cost: C(0, 0, 14, 0, 0, 8), work: 220, place: 'shore', fort: 60, want: t => t.count.navalbase && t.warYear > W.tick / TPY - 150 ? 1 : 0, about: 'Big guns over the harbour.' },
  armsfactory: { name: 'Arms factory', size: 3, tech: 'rifle', cost: C(0, 0, 40, 0, 0, 16), work: 600, craft: 2, forge: 3, smoke: 2, want: t => NN(t) >= 240 && (t.warYear > W.tick / TPY - 80 || t.polity.nodes.includes('con3')) ? 1 : 0, about: 'Weapons on a production line.' },
  metro: { name: 'Metro station', size: 2, tech: 'metro', cost: C(0, 16, 40, 0, 0, 30), work: 800, urban: 5000, fx: { speed: 1.1 }, want: Crowded('metro', 1000), about: 'Trains under the streets. Huge density jump.' },
  watertower: { name: 'Water tower', size: 1, tech: 'waterplant', cost: C(0, 0, 8, 0, 0, 8), work: 220, urban: 1500, want: Crowded('watertower', 700), about: 'Pressure for high floors.' },
  waterplant: { name: 'Water treatment plant', size: 3, tech: 'waterplant', cost: C(0, 10, 44, 0, 0, 22), work: 800, urban: 4000, fx: { health: 0.9, plague: 0.8 }, want: Crowded('waterplant', 1400), about: 'Clean water for millions.' },
  towerblock: { name: 'Office tower', size: 2, tech: 'skyscrapers', cost: C(0, 0, 30, 6, 0, 40), work: 800, urban: 2500, fx: { trade: 1.12 }, want: Crowded('towerblock', 900), about: 'Downtown stacks up rather than out.' },
  highway: { name: 'Highway interchange', size: 3, tech: 'highways', cost: C(0, 20, 30, 0, 0, 16), work: 600, urban: 1700, place: 'far', fx: { cargo: 1.1 }, want: Crowded('highway', 800), about: 'Suburbs and trucks.' },
  stadium: { name: 'Stadium', size: 3, tech: 'television', cost: C(0, 0, 50, 8, 0, 20), work: 800, happy: 16, want: At(700, 6000), about: 'A city’s pride, and a lot of contentment.' },
  mall: { name: 'Shopping centre', size: 3, tech: 'multinationals', cost: C(0, 0, 40, 10, 0, 16), work: 600, happy: 8, fx: { trade: 1.08 }, want: At(800, 5000), about: 'Everything under one roof.' },
  cinema: { name: 'Picture house', size: 1, tech: 'radio', cost: C(0, 0, 10, 2), work: 130, happy: 4, want: At(300, 2000), about: 'A cheap night out.' },
  radiomast: { name: 'Radio mast', size: 1, tech: 'radio', cost: C(0, 0, 4, 0, 0, 6), work: 130, fx: { spread: 1.2 }, morale: 4, want: OneAt(200), about: 'News and propaganda.' },
  police: { name: 'Police station', size: 1, tech: 'welfare', cost: C(0, 0, 12, 0, 0, 2), work: 150, order: 12, service: 1, want: At(300, 1500), about: 'Modern policing.' },
  firestation: { name: 'Fire station', size: 1, tech: 'massprod', cost: C(0, 0, 10, 0, 0, 4), work: 150, service: 1, fx: { fire: 0.4 }, want: At(350, 2500), about: 'Great fires almost stop.' },
  clinic: { name: 'Clinic', size: 1, tech: 'antibiotics', cost: C(0, 0, 10, 2), work: 130, service: 1, fx: { health: 0.96, infant: 0.94 }, want: At(250, 1200), about: 'Everyday medicine.' },
  plasticsplant: { name: 'Chemical plant', size: 2, tech: 'plastics', cost: C(0, 0, 24, 0, 0, 16), work: 460, craft: 2, smoke: 3, want: t => NN(t) >= 300 && t.stock[R.OIL] > 3 ? 1 : 0, about: 'Oil into goods.' },
  refinery: { name: 'Oil refinery', size: 3, tech: 'combustion', cost: C(0, 0, 26, 0, 0, 34), work: 680, craft: 2, smoke: 3, want: t => NN(t) >= 260 && (t.stock[R.OIL] > 6 || t.near.oil) ? 1 : 0, about: 'Cracks crude oil.' },
  tankworks: { name: 'Tank plant', size: 3, tech: 'tanks', cost: C(0, 0, 36, 0, 0, 34), work: 800, craft: 2, forge: 5, tanks: 1, smoke: 3, want: t => NN(t) >= 450 && t.warYear > W.tick / TPY - 100 ? 1 : 0, about: 'Builds tanks.' },
  airfield: { name: 'Airfield', size: 2, tech: 'flight', cost: C(0, 0, 10, 0, 0, 8), work: 260, place: 'far', want: t => NN(t) >= 120 && !t.count.airport && !t.count.q_airport ? 1 : 0, about: 'A paved strip, a hangar and a windsock. Small planes to towns nearby.' },
  airbase: { name: 'Air base', size: 3, tech: 'bomber', cost: C(0, 0, 40, 0, 0, 40), work: 800, place: 'far', airbase: 1, want: t => NN(t) >= 450 && t.warYear > W.tick / TPY - 100 ? 1 : 0, about: 'Bombers fly from here during sieges.' },
  containerport: { name: 'Container port', size: 3, tech: 'containers', cost: C(0, 20, 40, 0, 0, 36), work: 800, place: 'shore', port: 4, yard: 3, store: 1200, fx: { trade: 1.25, cargo: 1.1 }, want: t => t.count.merchantport && NN(t) >= 600 ? 1 : 0, about: 'Launches the largest ships afloat.' },
  nuclear: { name: 'Nuclear power plant', size: 3, tech: 'nuclear', cost: C(0, 20, 60, 0, 0, 50), work: 1200, urban: 2600, service: 2, want: Crowded('nuclear', 2000), about: 'Power for a metropolis.' },
  windfarm: { name: 'Wind farm', size: 3, tech: 'renewables', cost: C(0, 0, 10, 0, 0, 24), work: 400, place: 'far', urban: 1400, want: Crowded('windfarm', 1200), about: 'Clean power on the edge of town.' },
  solarfarm: { name: 'Solar farm', size: 3, tech: 'renewables', cost: C(0, 0, 10, 6, 0, 18), work: 400, place: 'far', urban: 1600, want: Crowded('solarfarm', 1400), about: 'Fields of glass.' },
  fusionplant: { name: 'Fusion plant', size: 3, tech: 'fusion', cost: C(0, 20, 60, 20, 0, 80), work: 1600, urban: 9000, service: 3, want: Crowded('fusionplant', 3000), about: 'Limitless power.' },
  verticalfarm: { name: 'Vertical farm', size: 2, tech: 'verticalfarm', cost: C(0, 0, 20, 6, 0, 30), work: 620, yield: { [R.FOOD]: 240 }, urban: 500, want: t => NN(t) >= 800 && t.stock[R.FOOD] < NN(t) * 5 ? (t.count.verticalfarm || 0) + 1 : 0, about: 'Grows food in the middle of the city.' },
  datacentre: { name: 'Data centre', size: 2, tech: 'computers', cost: C(0, 0, 24, 8, 0, 18), work: 500, study: 16, fx: { research: 1.15 }, want: At(400, 4000), about: 'Humming halls of thought.' },
  robotworks: { name: 'Robot works', size: 2, tech: 'robotics', cost: C(0, 0, 24, 8, 0, 30), work: 620, craft: 3, want: At(600, 4000), about: 'Tools and goods with hardly any workers.' },
  missilesilo: { name: 'Missile silo', size: 1, tech: 'missile', cost: C(0, 10, 0, 0, 0, 34), work: 500, place: 'far', silo: 1, fort: 100, want: t => t.polity.capital === t && t.warYear > W.tick / TPY - 100 ? 1 : 0, about: 'A very long reach.' },
  smartgrid: { name: 'Smart-city hub', size: 2, tech: 'smartcity', cost: C(0, 0, 24, 14, 0, 26), work: 800, urban: 6000, order: 6, want: Crowded('smartgrid', 2500), about: 'The city runs itself.' },
});
// The big compounds: most of these take a whole block, and each does something nothing else does.
const HorseNear = t => t.near.horse > 0 || (t.tameHerd && HERD_TYPES[t.tameHerd.type].horse);
const WarLately = yrs => t => t.warYear > W.tick / TPY - yrs;
Object.assign(BLD, {
  drillyard: { name: 'Drill yard', size: 3, tech: 'warband', cost: C(10), work: 140, morale: 3, fx: { attack: 1.04 }, want: t => NN(t) >= 60 && WarLately(120)(t) ? 1 : 0, about: 'Recruits learn to keep formation. Soldiers from here start out braver.' },
  warcollege: { name: 'War college', size: 4, tech: 'legions', cost: C(16, 50, 20), altCost: C(16, 0, 70), work: 700, morale: 6, fx: { attack: 1.08 }, want: t => NN(t) >= 260 && (t.polity.capital === t || WarLately(60)(t)) ? 1 : 0, about: 'Officers study old campaigns. Armies march out better led and better drilled.' },
  supplydepot: { name: 'Supply depot', size: 2, tech: 'wheel', cost: C(14), work: 130, store: 300, want: t => NN(t) >= 70 && WarLately(80)(t) ? 1 : 0, about: 'Stores for the army: bigger baggage trains and more arrows and shot for every soldier.' },
  fieldhospital: { name: 'Field hospital', size: 2, tech: 'surgery', cost: C(10, 0, 10), altCost: C(18), work: 170, service: 1, fx: { health: 0.99 }, want: t => NN(t) >= 90 && WarLately(90)(t) ? 1 : 0, about: 'More wounded live, and less fever gets into the camps.' },
  gunfoundry: { name: 'Gun foundry', size: 3, tech: 'cannon', cost: C(10, 0, 40, 0, 0, 8), work: 620, craft: 1, forge: 2, smoke: 3, want: t => NN(t) >= 180 && WarLately(120)(t) ? 1 : 0, about: 'Casts barrels. Armies from here bring far more guns.' },
  studfarm: { name: 'Stud farm', size: 3, tech: 'riding', cost: C(18), work: 190, cavalry: 1, fx: { herd: 1.1 }, want: t => NN(t) >= 90 && HorseNear(t) ? 1 : 0, about: 'Breeds warhorses. Many more soldiers ride to war.' },
  citadel: { name: 'Citadel', size: 4, tech: 'fortification', cost: C(16, 110), work: 1100, fort: 180, order: 4, fx: { defend: 1.2 }, want: t => NN(t) >= 200 && (t.polity.capital === t || WarLately(120)(t)) ? 1 : 0, about: 'A fortress inside the town. The last place to fall.' },
  bunker: { name: 'Bunker line', size: 2, tech: 'trenches', cost: C(0, 16, 12, 0, 0, 6), work: 260, fort: 70, fx: { defend: 1.08 }, want: t => NN(t) >= 200 && WarLately(60)(t) ? 1 + Math.floor(NN(t) / 2000) : 0, about: 'Concrete and sandbags round the approaches.' },
  munitions: { name: 'Munitions works', size: 4, tech: 'massprod', cost: C(0, 0, 60, 0, 0, 36), work: 900, craft: 2, forge: 6, smoke: 3, want: t => NN(t) >= 500 && WarLately(60)(t) ? 1 : 0, about: 'Shells and rifles by the trainload.' },
  radar: { name: 'Radar station', size: 2, tech: 'bomber', cost: C(0, 0, 16, 6, 0, 12), work: 360, fx: { defend: 1.04 }, want: t => NN(t) >= 300 && t.polity.capital === t ? 1 : 0, about: 'Sees the bombers coming, and sends fighters up to meet them.' },
  prison: { name: 'Prison', size: 2, tech: 'law', cost: C(6, 18), altCost: C(6, 0, 22), work: 240, order: 7, want: At(180, 1800), about: 'High walls and few windows. Less crime, for a price.' },
  treenursery: { name: 'Tree nursery', size: 2, tech: 'replanting', cost: C(6), work: 80, want: t => NN(t) >= 50 && t.sTree.length < NN(t) * 0.6 ? 1 : 0, about: 'Rows of seedlings. Planters work half as fast again.' },
  greenhouse: { name: 'Greenhouse', size: 2, tech: 'seedbank', cost: C(8, 0, 4, 2), work: 170, yield: { [R.FOOD]: 18 }, want: t => NN(t) >= 120 && knows(t, 'glass') ? 1 + Math.floor(NN(t) / 600) : 0, about: 'Fruit in any season. Every plot in town does a little better.' },
  botanic: { name: 'Botanic garden', size: 3, tech: 'encyclopedia', cost: C(8, 12, 6), work: 300, happy: 6, study: 2, fx: { farm: 1.03, health: 0.99 }, want: OneAt(220), about: 'Plants from everywhere, kept and studied.' },
  menagerie: { name: 'Royal menagerie', size: 3, tech: 'caravans', cost: C(16, 14), work: 280, happy: 7, want: t => NN(t) >= 200 && t.polity.capital === t ? 1 : 0, about: 'Beasts from far away, and crowds to see them.' },
  stockyard: { name: 'Stockyard', size: 3, tech: 'breeding', cost: C(14), work: 150, fx: { herd: 1.25 }, want: t => NN(t) >= 110 && t.tameHerd ? 1 : 0, about: 'Pens and fences by the acre.' },
  shambles: { name: 'The shambles', size: 2, tech: 'tanning', cost: C(10), work: 110, fx: { hunt: 1.15, herd: 1.08, spoil: 0.96 }, want: t => NN(t) >= 70 && (t.tameHerd || t.herds.length) ? 1 : 0, about: 'Butchers’ row. Every kill goes further.' },
  fishmarket: { name: 'Fish market', size: 2, tech: 'fishing', cost: C(10), work: 110, place: 'shore', fx: { fish: 1.2, spoil: 0.97 }, want: t => NN(t) >= 80 && t.sFish.length ? 1 : 0, about: 'Boats sell straight onto the quay.' },
  cannery: { name: 'Cannery', size: 2, tech: 'factory', cost: C(0, 0, 18, 0, 0, 8), work: 300, smoke: 1, fx: { spoil: 0.7 }, want: OneAt(280), about: 'Food in tins lasts for years.' },
  hanginggardens: { name: 'Hanging gardens', size: 4, tech: 'aqueduct', cost: C(16, 80, 20, 8), work: 1400, happy: 16, fx: { health: 0.98 }, want: t => NN(t) >= 500 && t.polity.capital === t ? 1 : 0, about: 'Terraces of trees, watered from above. A wonder people cross the world to see.' },
  bazaar: { name: 'Grand bazaar', size: 3, tech: 'currency', cost: C(26, 0, 18, 4), work: 380, store: 240, fx: { trade: 1.16 }, want: At(170, 1400), about: 'A covered city of stalls.' },
  hippodrome: { name: 'Hippodrome', size: 4, tech: 'citizenship', cost: C(14, 70), altCost: C(14, 0, 80), work: 1000, happy: 15, want: At(420, 3000), about: 'Chariots, factions and a hundred thousand voices.' },
  templecomplex: { name: 'Temple precinct', size: 4, tech: 'theology', cost: C(10, 90, 0, 8), work: 1200, happy: 11, order: 4, service: 3, want: At(420, 3000), about: 'Courts within courts. The clergy run half the town from here.' },
  greatlibrary: { name: 'Great library', size: 3, tech: 'paper', cost: C(10, 36, 10), work: 620, study: 12, fx: { research: 1.14, keep: 1, spread: 1.1 }, want: OneAt(300), about: 'Every scroll anyone could buy, borrow or steal.' },
  royalpalace: { name: 'Palace compound', size: 4, tech: 'feudalism', cost: C(20, 90, 0, 16), altCost: C(20, 0, 100, 16), work: 1300, order: 10, happy: 5, fort: 40, fx: { admin: 25 }, want: t => NN(t) >= 300 && t.polity.capital === t ? 1 : 0, about: 'A whole quarter given over to the court.' },
  campus: { name: 'University campus', size: 4, tech: 'university', cost: C(10, 50, 50), work: 1100, study: 32, fx: { research: 1.1 }, want: At(600, 4000), about: 'Lecture halls, labs and thousands of students.' },
  grandstation: { name: 'Grand terminus', size: 4, tech: 'railway', cost: C(0, 20, 50, 4, 0, 24), work: 1000, urban: 2000, fx: { speed: 1.05, cargo: 1.1 }, want: Crowded('grandstation', 800), about: 'Every line in the country ends under this roof.' },
  citypark: { name: 'City park', size: 3, tech: 'sanitation', cost: C(4, 6), work: 200, happy: 8, urban: 300, fx: { health: 0.98 }, want: At(300, 1800), about: 'Lungs for the city: lawns, trees and a lake.' },
  conference: { name: 'Exhibition hall', size: 3, tech: 'multinationals', cost: C(0, 0, 36, 10, 0, 18), work: 620, happy: 4, fx: { trade: 1.1, spread: 1.1 }, want: OneAt(800), about: 'Trade fairs from all over the world.' },
  trainyard: { name: 'Marshalling yard', size: 3, tech: 'railway', cost: C(8, 10, 8, 0, 0, 14), work: 420, fx: { cargo: 1.14 }, place: 'far', want: OneAt(400), about: 'Wagons sorted and sent on, day and night.' },
  medcentre: { name: 'Medical centre', size: 3, tech: 'antibiotics', cost: C(0, 0, 40, 8, 0, 14), work: 680, service: 4, urban: 900, fx: { health: 0.9, infant: 0.9 }, want: At(600, 4000), about: 'Every specialist in one place.' },
  bigdam: { name: 'Hydro dam', size: 3, tech: 'electric', cost: C(0, 60, 40, 0, 0, 20), work: 900, place: 'river', urban: 1200, fx: { farm: 1.05, drought: 0.85 }, want: t => t.near.river > 0 && NN(t) >= 400 ? 1 : 0, about: 'Holds back a river: power, and water through any drought.' },
  coachinn: { name: 'Coaching inn', size: 2, tech: 'stagecoach', cost: C(16, 6), work: 200, fx: { trade: 1.05, spread: 1.05 }, want: At(100, 900), about: 'Fresh horses and a bed: the road network’s stopping place.' },
  busdepot: { name: 'Bus depot', size: 2, tech: 'motorbus', cost: C(0, 0, 18, 0, 0, 10), work: 280, urban: 900, want: Crowded('busdepot', 500), about: 'A fleet of buses, and people who no longer need to live close in.' },
  fuelstation: { name: 'Fuel depot', size: 2, tech: 'cars', cost: C(0, 0, 10, 0, 0, 12), work: 220, store: 200, want: At(400, 3000), about: 'Keeps the cars moving, as long as there’s oil.' },
  hsrstation: { name: 'High-speed station', size: 3, tech: 'hsr', cost: C(0, 10, 40, 8, 0, 40), work: 800, urban: 2500, fx: { speed: 1.05 }, want: Crowded('hsrstation', 1200), about: 'Sleek platforms, and a city an hour away instead of a day.' },
  desalplant: { name: 'Desalination plant', size: 3, tech: 'desalination', cost: C(0, 0, 30, 10, 0, 40), work: 900, place: 'shore', urban: 3000, fx: { drought: 0.8 }, want: t => NN(t) >= 800 && !t.near.fresh ? 1 : Crowded('desalplant', 2000)(t), about: 'Turns the sea into drinking water.' },
  carbonscrub: { name: 'Carbon scrubber', size: 3, tech: 'carboncapture', cost: C(0, 0, 30, 14, 0, 30), work: 800, place: 'far', want: t => W.clim.co2 > 0.04 && NN(t) >= 500 ? 1 + Math.floor(NN(t) / 4000) : 0, about: 'Vast fans pulling the old smoke out of the air. The glaciers may come back.' },
  quantumlab: { name: 'Quantum institute', size: 3, tech: 'quantum', cost: C(0, 0, 40, 20, 0, 40), work: 1100, study: 40, fx: { research: 1.15 }, want: At(900, 6000), about: 'Very cold rooms, very strange machines.' },
  genecentre: { name: 'Gene clinic', size: 2, tech: 'longevity', cost: C(0, 0, 24, 14, 0, 16), work: 700, service: 3, fx: { health: 0.85, infant: 0.85 }, want: At(800, 5000), about: 'Illness is fixed before it starts.' },
  skyfarm: { name: 'Sky farm', size: 3, tech: 'skyfarms', cost: C(0, 0, 30, 14, 0, 50), work: 1200, yield: { [R.FOOD]: 900 }, urban: 1500, want: t => NN(t) >= 1500 && t.stock[R.FOOD] < NN(t) * 5 ? (t.count.skyfarm || 0) + 1 : 0, about: 'A whole county of fields, stacked.' },
  fusiongrid: { name: 'Grid core', size: 3, tech: 'fusionnet', cost: C(0, 20, 50, 30, 0, 80), work: 1800, urban: 14000, want: Crowded('fusiongrid', 4000), about: 'Enough power for anything anyone can think of.' },
  orbitalport: { name: 'Elevator anchor', size: 4, tech: 'spaceelevator', cost: C(0, 40, 80, 50, 0, 160), work: 3000, fx: { cargo: 1.4, trade: 1.3 }, want: t => NN(t) >= 2000 && t.polity.capital === t ? 1 : 0, about: 'The foot of a cable that goes all the way up.' },
  lunarcontrol: { name: 'Lunar mission centre', size: 3, tech: 'lunar', cost: C(0, 20, 50, 30, 0, 70), work: 1800, study: 30, want: t => NN(t) >= 1500 && t.polity.capital === t ? 1 : 0, about: 'Calls home from the Moon come in here.' },
  marsport: { name: 'Mars departure yard', size: 5, tech: 'mars', cost: C(0, 40, 80, 60, 0, 200), work: 4000, place: 'far', study: 40, fx: { research: 1.1 }, want: t => NN(t) >= 2500 && t.polity.capital === t ? 1 : 0, about: 'Ships leave for another world on a fixed timetable.' },
  dysoncontrol: { name: 'Swarm control', size: 4, tech: 'dyson', cost: C(0, 40, 80, 90, 0, 200), work: 4000, urban: 40000, want: t => NN(t) >= 3000 && t.polity.capital === t ? 1 : 0, about: 'Steering a billion mirrors round the sun.' },
  starshipyard: { name: 'Starship yard', size: 5, tech: 'starship', cost: C(0, 60, 100, 120, 0, 300), work: 6000, place: 'far', want: t => NN(t) >= 3000 && t.polity.capital === t ? 1 : 0, about: 'Everything anyone has ever built, led to this.' },
  spaceport: { name: 'Spaceport', size: 5, tech: 'spaceflight', cost: C(0, 40, 60, 20, 0, 120), work: 2600, place: 'far', study: 20, fx: { research: 1.2 }, want: t => NN(t) >= 1000 && t.polity.capital === t ? 1 : 0, about: 'A city of gantries and fuel tanks, pointed at the sky.' },
});
// Healthcare. care: how many people a building can look after; how much good that does depends on what medicine the town knows (t.medQ).
const SickNear = t => W.towns.some(o => o.sick > 0 && o !== t && Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < 60);
Object.assign(BLD, {
  healer: { name: 'Healer’s hut', size: 1, tech: 'herbs', cost: C(3), work: 40, service: 1, care: 60, want: t => NN(t) >= 25 && !t.nomad ? Math.max(0, 1 + Math.floor(NN(t) / 260) - (t.count.infirmary || 0) - (t.count.hospital || 0) * 2) : 0, about: 'Someone who knows which leaf to chew, and sits with the dying.' },
  apothecary: { name: 'Apothecary', size: 1, tech: 'apothecary', cost: C(4, 0, 4, 2), altCost: C(6, 4), work: 90, service: 1, care: 120, fx: { health: 0.99 }, want: At(90, 600), about: 'Jars of remedies, weighed out properly.' },
  quarantine: { name: 'Quarantine station', size: 2, tech: 'quarantine', cost: C(10, 12), work: 200, care: 40, fx: { contagion: 0.65 }, want: t => NN(t) >= 140 && (t.portLv || t.partners.length >= 3) ? 1 : 0, about: 'Ships and strangers wait out their forty days here, away from the town.' },
  vaccinehall: { name: 'Vaccination hall', size: 1, tech: 'vaccines', cost: C(0, 4, 10, 4), work: 120, service: 1, care: 400, fx: { plague: 0.85, infant: 0.95 }, want: At(150, 1500), about: 'Queues of children and a nurse with a needle.' },
  teachhosp: { name: 'Teaching hospital', size: 3, tech: 'anatomy', cost: C(10, 30, 30, 10), altCost: C(20, 50), work: 700, service: 4, study: 3, care: 2500, fx: { health: 0.97 }, want: At(500, 4000), about: 'Patients, students and the people who teach them, in one place.' },
  pharmaworks: { name: 'Pharmaceutical works', size: 2, tech: 'pharma', cost: C(0, 0, 30, 10, 0, 16), work: 600, smoke: 1, fx: { health: 0.96, plague: 0.85 }, want: OneAt(700), about: 'Medicines by the ton.' },
  healthoffice: { name: 'Public health office', size: 1, tech: 'publichealth', cost: C(0, 0, 12, 4), work: 140, service: 2, care: 300, fx: { contagion: 0.8, infant: 0.95 }, want: t => NN(t) >= 300 || (NN(t) >= 120 && SickNear(t)) ? 1 : 0, about: 'Inspectors, records and district nurses.' },
});
// Food buildings: small ones every village can have, big ones for cities that must never go hungry.
Object.assign(BLD, {
  rootcellar: { name: 'Root cellar', size: 1, tech: 'rootcellars', cost: C(3), work: 40, store: 60, fx: { spoil: 0.95 }, want: At(20, 200), about: 'Cool storage dug into the ground.' },
  apiary: { name: 'Apiary', size: 1, tech: 'beekeeping', cost: C(2), work: 30, yield: { [R.FOOD]: 6 }, want: At(30, 400), about: 'Hives: honey and wax.' },
  henhouse: { name: 'Hen house', size: 1, tech: 'poultry', cost: C(3), work: 30, yield: { [R.FOOD]: 8 }, want: At(25, 250), about: 'Eggs every day.' },
  fishpond: { name: 'Fish pond', size: 2, tech: 'fishponds', cost: C(4), work: 80, yield: { [R.FOOD]: 24 }, want: t => NN(t) >= 60 ? 1 + Math.floor(NN(t) / 400) : 0, about: 'Carp raised by the house.' },
  dovecote: { name: 'Dovecote', size: 1, tech: 'dovecotes', cost: C(2, 4), work: 70, yield: { [R.FOOD]: 8 }, want: At(80, 600), about: 'Pigeons by the hundred.' },
  noria: { name: 'Water wheel', size: 1, tech: 'shaduf', cost: C(6), work: 70, fx: { farm: 1.04, drought: 0.9 }, want: t => t.near.river > 0 && NN(t) >= 60 ? 1 : 0, about: 'Lifts river water onto the fields.' },
  publicgranary: { name: 'Public granary', size: 2, tech: 'templegranary', cost: C(8, 6), altCost: C(8, 0, 6), work: 180, store: 400, fx: { reserve: 1.1 }, want: At(120, 1500), about: 'A store for the bad years, kept by the state.' },
  marketgarden: { name: 'Market gardens', size: 2, tech: 'grafting', cost: C(4), work: 90, yield: { [R.FOOD]: 20 }, want: At(150, 900), about: 'Vegetables for the city on its doorstep.' },
  showground: { name: 'Show ground', size: 3, tech: 'agsociety', cost: C(12), work: 160, happy: 3, fx: { farm: 1.03 }, want: OneAt(250), about: 'Prize bulls and new ploughs: farmers learn from each other.' },
  soupkitchen: { name: 'Soup kitchen', size: 1, tech: 'soupkitchens', cost: C(4, 0, 6), work: 100, service: 1, fx: { relief: 0.5 }, want: t => NN(t) >= 200 ? 1 + Math.floor(NN(t) / 3000) : 0, about: 'Hot food for anyone who queues.' },
  elevator: { name: 'Grain elevator', size: 2, tech: 'grainelevator', cost: C(4, 0, 12, 0, 0, 8), work: 300, store: 1500, fx: { spoil: 0.95 }, want: At(300, 3000), about: 'A tower of grain, filled from the trains.' },
  aiddepot: { name: 'Food aid depot', size: 2, tech: 'foodaid', cost: C(0, 0, 16, 2, 0, 8), work: 300, store: 800, fx: { relief: 1 }, want: OneAt(500), about: 'Stores to send wherever the harvest fails.' },
});
// The modern town. tourist: how many visitors a building draws once people fly on holiday. fighters / drones / helis: what the realm can put in the air.
const BiggestHere = t => t.polity.capital === t || !W.towns.some(o => o.polity === t.polity && o !== t && tn(o) > tn(t));
Object.assign(BLD, {
  phoneexchange: { name: 'Telephone exchange', size: 1, tech: 'telephone', cost: C(0, 0, 8, 0, 0, 2), work: 140, fx: { spread: 1.08 }, want: At(150, 2500), about: 'Rows of operators plugging the town into itself.' },
  celltower: { name: 'Phone mast', size: 1, tech: 'mobilephones', cost: C(0, 0, 2, 2, 0, 6), work: 120, fx: { spread: 1.1 }, want: At(120, 1500), about: 'Everyone in reach, wherever they are.' },
  supermarket: { name: 'Supermarket', size: 2, tech: 'supermarkets', cost: C(0, 0, 14, 4, 0, 6), work: 260, store: 300, happy: 2, fx: { spoil: 0.92 }, want: At(300, 2000), about: 'Aisles of cheap food, kept cold.' },
  filmstudio: { name: 'Film studio', size: 3, tech: 'television', cost: C(0, 0, 30, 10, 0, 10), work: 600, happy: 5, tourist: 1, fx: { spread: 1.1 }, want: OneAt(1200), about: 'Sound stages and back lots: the whole world watches what’s made here.' },
  chipfab: { name: 'Chip foundry', size: 3, tech: 'transistors', cost: C(0, 0, 30, 14, 0, 30), work: 900, craft: 3, study: 6, fx: { research: 1.08 }, want: At(900, 7000), about: 'Clean rooms, bunny suits and billions of transistors a day.' },
  carplant: { name: 'Car plant', size: 4, tech: 'cars', cost: C(0, 0, 40, 4, 0, 40), work: 900, craft: 3, forge: 2, smoke: 3, want: t => NN(t) >= 600 && (t.stock[R.STEEL] > 10 || t.count.steelworks) ? 1 : 0, about: 'A car rolls off the line every minute.' },
  heliport: { name: 'Helipad & air ambulance', size: 2, tech: 'helicopters', cost: C(0, 0, 10, 0, 0, 12), work: 300, service: 1, care: 300, helis: 1, want: At(700, 6000), about: 'The badly hurt reach a surgeon in minutes. In war, gunships fly from here.' },
  fighterbase: { name: 'Fighter wing', size: 3, tech: 'jetfighters', cost: C(0, 0, 30, 6, 0, 36), work: 800, place: 'far', fighters: 1, fx: { defend: 1.04 }, want: t => NN(t) >= 500 && (BiggestHere(t) || WarLately(80)(t)) ? 1 : 0, about: 'Jets on five minutes’ notice. Enemy bombers are shot down far more often.' },
  dronebase: { name: 'Drone hangar', size: 2, tech: 'combatdrones', cost: C(0, 0, 14, 14, 0, 20), work: 500, drones: 1, want: t => NN(t) >= 400 && (BiggestHere(t) || WarLately(60)(t)) ? 1 : 0, about: 'Armed drones watch and strike the enemy round the clock, and are hard to shoot down.' },
  cybercmd: { name: 'Cyber command', size: 2, tech: 'cyberwar', cost: C(0, 0, 20, 20, 0, 10), work: 600, study: 4, want: t => NN(t) >= 500 && BiggestHere(t) ? 1 : 0, about: 'In war, hackers from here black out enemy cities and empty their banks.' },
  recyclecentre: { name: 'Recycling centre', size: 2, tech: 'recycling', cost: C(0, 0, 12, 0, 0, 10), work: 300, fx: { craft: 1.04 }, want: At(500, 4000), about: 'Bottles, cans and paper go back into the factories.' },
  ecentre: { name: 'Fulfilment centre', size: 4, tech: 'ecommerce', cost: C(0, 0, 40, 10, 0, 30), work: 900, place: 'far', store: 2500, fx: { trade: 1.08, cargo: 1.08 }, want: OneAt(1000), about: 'A warehouse the size of a town, and vans leaving all night.' },
  techcampus: { name: 'Tech campus', size: 4, tech: 'internet', cost: C(0, 0, 40, 30, 0, 30), work: 1400, study: 30, fx: { research: 1.1, trade: 1.06 }, want: OneAt(1500), about: 'Glass offices, free lunches, and the next big thing.' },
  gigafactory: { name: 'Battery gigafactory', size: 4, tech: 'batteries', cost: C(0, 0, 40, 20, 0, 50), work: 1400, craft: 3, urban: 1500, want: OneAt(1500), about: 'Batteries by the million: the grid stores the sun.' },
  evcharging: { name: 'Charging hub', size: 1, tech: 'evs', cost: C(0, 0, 2, 4, 0, 6), work: 120, urban: 200, want: At(800, 3000), about: 'Rows of electric cars, topping up.' },
  esports: { name: 'Games arena', size: 3, tech: 'videogames', cost: C(0, 0, 30, 14, 0, 16), work: 600, happy: 8, tourist: 1, want: At(1000, 8000), about: 'Fifty thousand people watching other people play.' },
  resort: { name: 'Hotel quarter', size: 3, tech: 'masstourism', cost: C(0, 0, 30, 10, 0, 16), work: 600, tourist: 2, fx: { trade: 1.05 }, want: t => NN(t) >= 500 && (t.near.coast > 2 || t.count.hanginggardens || t.count.cathedral || t.count.templecomplex || t.count.monument) ? 1 + Math.floor(NN(t) / 8000) : 0, about: 'Hotels, cafés and souvenir shops. Visitors bring money from abroad.' },
  themepark: { name: 'Theme park', size: 4, tech: 'masstourism', cost: C(0, 0, 30, 20, 0, 20), work: 1000, place: 'far', happy: 12, tourist: 3, want: OneAt(1600), about: 'Roller coasters and queues. Families fly in from other realms.' },
  gamesvillage: { name: 'Games stadium', size: 4, tech: 'globalgames', cost: C(0, 10, 50, 10, 0, 30), work: 1200, happy: 10, tourist: 2, want: t => t.gamesY > year() - 12 ? 1 : 0, about: 'Built for the International Games, and kept as a monument to them.' },
  assemblyhall: { name: 'World Assembly hall', size: 3, tech: 'worldassembly', cost: C(0, 30, 40, 10, 0, 20), work: 1000, order: 4, envoy: 1, tourist: 1, want: t => W.assembly && W.assembly.town === t.id ? 1 : 0, about: 'Delegates of every member realm meet here. Wars between members end sooner.' },
});
// Existing buildings gain jobs in the new model.
BLD.hospital.tech = 'hospitals'; BLD.hospital.care = 900; BLD.infirmary.care = 250; BLD.clinic.care = 600; BLD.medcentre.care = 6000; BLD.genecentre.care = 9000; BLD.fieldhospital.care = 100; BLD.almshouse.care = 80;
BLD.hospital.urban = 300; BLD.powerplant.urban = 900; BLD.dock.port = 2; BLD.dock.yard = 1; BLD.market.urban = 40; BLD.granary.urban = 30; BLD.barracks.fort = 15;
BLD.station.urban = 400; BLD.plaza.urban = 30; BLD.temple.happy = 5; BLD.palace.order = 8; BLD.palace.happy = 4; BLD.palace.fort = 20; BLD.monument.happy = 8; BLD.factory.forge = 2; BLD.smithy.forge = 1;
const MORE_ORDER = ['shrine', 'well', 'wharf', 'storehouse', 'councilhut', 'huntlodge', 'smokehouse', 'armoury', 'carpenter', 'bakery', 'orchard', 'dairy', 'tannery', 'cistern', 'watchtower', 'fort', 'stable', 'brewery', 'charcoalpit', 'dyeworks', 'weighhouse', 'forum', 'infirmary', 'courthouse', 'shipyard', 'navalbase', 'siegeyard', 'mint', 'glassworks', 'caravanserai', 'observatory', 'lighthouse', 'merchantport', 'aqueduct', 'bathhouse', 'library', 'guildhall', 'monastery', 'watchhouse', 'almshouse', 'fireward', 'barbican', 'archery', 'castle', 'brickworks', 'amphitheatre', 'cathedral', 'bank', 'warehouse', 'foundry', 'printshop', 'theatre', 'exchange', 'canal', 'starfort', 'gasworks', 'textile', 'tenements', 'sewers', 'tram', 'school', 'steelworks', 'union', 'embassy', 'parliament', 'museum', 'fort2', 'armsfactory', 'metro', 'watertower', 'waterplant', 'towerblock', 'highway', 'clinic', 'police', 'firestation', 'cinema', 'radiomast', 'stadium', 'refinery', 'plasticsplant', 'mall', 'tankworks', 'airbase', 'containerport', 'nuclear', 'windfarm', 'solarfarm', 'datacentre', 'robotworks', 'verticalfarm', 'missilesilo', 'smartgrid', 'fusionplant'];
MORE_ORDER.push('treenursery', 'shambles', 'stockyard', 'fishmarket', 'drillyard', 'supplydepot', 'studfarm', 'fieldhospital', 'prison', 'bazaar', 'greatlibrary', 'menagerie', 'greenhouse', 'citypark', 'citadel', 'gunfoundry', 'warcollege', 'botanic', 'royalpalace', 'hippodrome', 'templecomplex', 'hanginggardens', 'campus', 'cannery', 'trainyard', 'grandstation', 'bunker', 'munitions', 'medcentre', 'bigdam', 'radar', 'conference', 'spaceport', 'coachinn', 'fuelstation', 'busdepot', 'hsrstation', 'desalplant', 'carbonscrub', 'quantumlab', 'genecentre', 'skyfarm', 'fusiongrid', 'lunarcontrol', 'orbitalport', 'marsport', 'dysoncontrol', 'starshipyard');
MORE_ORDER.push('healer', 'apothecary', 'quarantine', 'vaccinehall', 'teachhosp', 'pharmaworks', 'healthoffice');
MORE_ORDER.push('rootcellar', 'apiary', 'henhouse', 'fishpond', 'dovecote', 'noria', 'publicgranary', 'marketgarden', 'showground', 'soupkitchen', 'elevator', 'aiddepot');
MORE_ORDER.push('airfield');
MORE_ORDER.push('phoneexchange','celltower', 'supermarket', 'filmstudio', 'chipfab', 'carplant', 'heliport', 'fighterbase', 'dronebase', 'cybercmd', 'recyclecentre', 'ecentre', 'techcampus', 'gigafactory', 'evcharging', 'esports', 'resort', 'themepark', 'gamesvillage', 'assemblyhall');
BLD.monument.tourist = 2; BLD.hanginggardens.tourist = 3; BLD.cathedral.tourist = 1; BLD.templecomplex.tourist = 1; BLD.museum.tourist = 1; BLD.stadium.tourist = 0.5; BLD.menagerie.tourist = 0.5; BLD.botanic.tourist = 0.5;
const TOURIST_BLDS = Object.keys(BLD).filter(k => BLD[k].tourist);
BUILD_ORDER.push(...MORE_ORDER);
const URBAN_ORDER = MORE_ORDER.filter(k => BLD[k].urban);
const BLD_FX = Object.keys(BLD).filter(k => BLD[k].fx || BLD[k].urban || BLD[k].happy || BLD[k].order || BLD[k].fort || BLD[k].morale);
const BLD_YIELD = Object.keys(BLD).filter(k => BLD[k].yield);
const CARE_BLDS = Object.keys(BLD).filter(k => BLD[k].care);
// Five long lines of invention, shown side by side: healing, food, getting about, modern life and war.
const BRANCHES = [
  { id: 'med', name: 'Medicine', col: '#a7d48a', about: 'Fewer die young, fewer die of sickness, fewer catch it at all.', ids: ['herbs', 'midwifery', 'bonesetting', 'surgery', 'medicine', 'baths', 'apothecary', 'infirmaries', 'quarantine', 'hospitals', 'inoculation', 'anatomy', 'microscope', 'sanitation', 'epidemiology', 'anaesthesia', 'nursing', 'vaccines', 'antibiotics', 'xrays', 'bloodbank', 'publichealth', 'pharma', 'genetics', 'transplants', 'rapidvaccines', 'nanomed', 'longevity', 'sweatlodge', 'woundmoss', 'willowbark', 'delousing', 'trepanning', 'herbgarden', 'dentistry', 'medpapyri', 'fieldhospital', 'soap', 'acupuncture', 'clinical', 'hippocratic', 'barbersurgeons', 'leprosaria', 'pharmacopoeia', 'quinine', 'circulation', 'thermometer', 'forceps', 'scurvy', 'lyingin', 'botanic', 'redcross', 'antiseptics', 'sandfilters', 'ambulance', 'aspirin', 'celltheory', 'stethoscope', 'insulin', 'poliovax', 'ecg', 'chlorination', 'dna', 'penicillinplants', 'smallpoxend', 'oralrehydration', 'chemotherapy', 'ultrasound', 'jointrep', 'ctscan', 'pacemakers', 'mri', 'genomeseq', 'crispr', 'keyhole', 'telemedicine', 'mrna', 'robotsurgery', 'genetherapy', 'neuroprosthetics', 'organprinting', 'universalvax', 'spacemedicine', 'senolytics', 'ageless', 'radiationshield', 'coldsleep'] },
  { id: 'food', name: 'Food', col: '#e6c170', about: 'More from every field, and food that keeps.', ids: ['smoking', 'cooking', 'shellfish', 'acorns', 'firestick', 'pemmican', 'fermenting', 'faminefoods', 'legumes', 'querns', 'poultry', 'beekeeping', 'rootcellars', 'fishdrying', 'paddies', 'threesisters', 'fishponds', 'templegranary', 'shaduf', 'grafting', 'dovecotes', 'grainfleet', 'veterinary', 'champarice', 'drainage', 'poorrelief', 'cropexchange', 'turnips', 'agsociety', 'potatoes', 'steamplough', 'grainelevator', 'soupkitchens', 'grainexchange', 'hybridseed', 'nutrition', 'foodaid', 'dripirrigation', 'earlywarning', 'droughtcrops', 'agriculture', 'granary', 'kitchengarden', 'orchards', 'baking', 'manure', 'irrigation', 'plough', 'terracing', 'dikes', 'horsecollar', 'ironplough', 'rotation', 'threefield', 'seedbank', 'breeding', 'seeddrill', 'enclosure', 'plantation', 'reaper', 'guano', 'pasteurise', 'refrigeration', 'fertilizer', 'tractor', 'coldchain', 'pesticides', 'aquaculture', 'greenrev', 'hydroponics', 'verticalfarm', 'biotech', 'labmeat', 'precisionag', 'skyfarms'] },
  { id: 'trans', name: 'Transport', col: '#9fb9ee', about: 'Each step changes how fast people and goods move, and which roads they pick.', ids: ['sledges', 'packanimals', 'wheel', 'riding', 'bridges', 'caravans', 'paved', 'builtroads', 'couriers', 'carriages', 'stagecoach', 'turnpikes', 'canals', 'railway', 'macadam', 'freightyards', 'bicycle', 'trams', 'cars', 'motorbus', 'lorries', 'electricrail', 'highways', 'airlines', 'jetliners', 'hsr', 'evs', 'drones', 'autopilot', 'maglev', 'hyperloop', 'airtaxi', 'rafts', 'reedboats', 'plankboats', 'outrigger', 'donkeys', 'saltroads', 'sailing', 'barges', 'camels', 'keels', 'ships', 'harbours', 'lateen', 'merchgalley', 'monsoon', 'silkroad', 'sternrudder', 'junks', 'caravels', 'carrack', 'cogs', 'bridges2', 'locks', 'navigation', 'chronometer', 'fluyt', 'railways0', 'drydocks', 'steamship', 'screw', 'shipcanal', 'ironhull', 'clipper', 'paddle', 'ironbridges', 'suspension', 'combustion', 'pneumatic', 'diesel', 'flight', 'tankers', 'containers', 'metro', 'roro', 'hovercraft', 'supertankers', 'tunnelboring', 'autocargo', 'reusable', 'autologistics', 'spaceplanes', 'orbitalfreight', 'spaceelevator', 'ioncargo', 'nuclearthermal', 'fusiondrive', 'lightsails', 'starship'] },
  { id: 'modern', name: 'Modern life', col: '#d6a6e8', about: 'Print and post, talking at a distance, chips in everything, and a world that meets, plays and holidays together.', ids: ['telegraph', 'telephone', 'radio', 'globalgames', 'worldassembly', 'television', 'supermarkets', 'computers', 'transistors', 'creditcards', 'videogames', 'masstourism', 'recycling', 'mobilephones', 'satellites', 'gps', 'internet', 'socialmedia', 'ecommerce', 'batteries', 'thinkingmachines', 'mobilenet', 'quantum', 'agi', 'neurallink', 'printing', 'movabletype', 'postoffice', 'newspapers', 'encyclopedia', 'streetlamps', 'watermains', 'coffeehouses', 'gaslight', 'photography', 'schools', 'publiclibraries', 'postagestamps', 'lifts', 'typewriter', 'sewingmachine', 'departmentstores', 'parks', 'electric', 'lightbulb', 'phonograph', 'cinema', 'appliances', 'centralheating', 'airconditioning', 'skyscrapers', 'suburbs', 'traffic', 'advertising', 'plastics', 'vacuumtube', 'powergrid', 'integrated', 'led', 'transistorradio', 'microwave', 'satellitetv', 'personalpc', 'email', 'worldwideweb', 'searchengines', 'barcodes', 'atms', 'fibreoptics', 'software', 'commsats', 'smartphones', 'wiki', 'cloud', 'opensource', 'machinelearning', 'mobilepay', 'printing3d', 'translationsoftware', 'aitutors', 'quantumnet', 'wirelesspower', 'digitaltwins', 'printedhouses', 'translationimplants', 'oceancities', 'interplanetnet', 'spacehabitats', 'interstellarcomms', 'postscarcity'] },
  { id: 'mwar', name: 'Modern war', col: '#e08a7a', about: 'From the first guns to the drone: each step changes who wins battles.', ids: ['rifle', 'artillery', 'trenches', 'machinegun', 'assaultrifle', 'tanks', 'bomber', 'helicopters', 'submarines', 'kevlar', 'carriers', 'nuclear', 'missile', 'jetfighters', 'rocketarty', 'cyberwar', 'combatdrones', 'ceramicarmour', 'railguns', 'exosuits', 'energyweapons', 'gunpowder', 'firelances', 'bombards', 'grenades', 'gunsmith', 'standingarmy', 'volleyfire', 'starforts', 'mortars', 'musket', 'cannon', 'militarymaps', 'dragoons', 'bayonet', 'uniforms', 'galleon', 'frigates', 'navalacad', 'shipofline', 'navalmines', 'torpedoes', 'militaryrail', 'breechloader', 'massconscription', 'generalstaff', 'smokeless', 'gatling', 'ironclad', 'blitzkrieg', 'dreadnought', 'destroyer', 'fighters', 'paratroopers', 'bunkers', 'gasmasks', 'bazooka', 'antiair', 'radar', 'sonar', 'cryptography', 'operations', 'satrecon', 'nightvision', 'deterrence', 'stealth', 'reactive', 'cruisemissile', 'smartbombs', 'nuclearnavy', 'missiledefence', 'hypersonic', 'droneships', 'swarms', 'lasersdefence', 'orbitaldefence', 'kinetic', 'relativistic'] },
];
// Within an age, a step comes after any step in its own line that it needs.
for (const Bq of BRANCHES) {
  Bq.ids = Bq.ids.filter(id => TECH_IX[id] !== undefined);
  const inB = new Set(Bq.ids), rk = {}, T = id => TECHS[TECH_IX[id]];
  const rank = id => rk[id] !== undefined ? rk[id] : (rk[id] = Math.max(0, ...(T(id).req || []).filter(r => inB.has(r) && T(r).era === T(id).era).map(r => rank(r) + 1)));
  Bq.ids.sort((a, b) => T(a).era - T(b).era || rank(a) - rank(b) || T(a).diff - T(b).diff);
}
Object.assign(RECIPES, {
  tannery: [{ in: { [R.WOOD]: 1 }, out: { [R.CLOTH]: 3 }, tech: 'tanning' }],
  brewery: [{ in: { [R.FOOD]: 4, [R.WOOD]: 1 }, out: { [R.GOODS]: 3 }, tech: 'brewing' }],
  glassworks: [{ in: { [R.CLAY]: 2, [R.WOOD]: 2 }, out: { [R.GOODS]: 5 }, tech: 'glass' }],
  guildhall: [{ in: { [R.WOOD]: 2, [R.CLAY]: 1 }, out: { [R.GOODS]: 6 }, tech: 'guilds' }, { in: { [R.BRONZE]: 1, [R.WOOD]: 1 }, out: { [R.TOOLS]: 3 }, tech: 'guilds' }],
  brickworks: [{ in: { [R.CLAY]: 3, [R.COAL]: 1 }, out: { [R.BRICK]: 12 }, tech: 'gaslight' }, { in: { [R.CLAY]: 3, [R.WOOD]: 2 }, out: { [R.BRICK]: 8 }, tech: 'masonry' }],
  textile: [{ in: { [R.COAL]: 1 }, out: { [R.CLOTH]: 12 }, tech: 'factory' }],
  foundry: [{ in: { [R.IRON]: 2, [R.COAL]: 1 }, out: { [R.STEEL]: 5 }, tech: 'blast' }, { in: { [R.IRON]: 3, [R.WOOD]: 3 }, out: { [R.STEEL]: 4 }, tech: 'iron' }],
  steelworks: [{ in: { [R.IRON]: 4, [R.COAL]: 2 }, out: { [R.STEEL]: 16 }, tech: 'steel' }],
  refinery: [{ in: { [R.OIL]: 2 }, out: { [R.GOODS]: 10, [R.TOOLS]: 4 }, tech: 'plastics' }, { in: { [R.OIL]: 2 }, out: { [R.GOODS]: 6 }, tech: 'combustion' }],
  plasticsplant: [{ in: { [R.OIL]: 1 }, out: { [R.GOODS]: 14 }, tech: 'plastics' }],
  robotworks: [{ in: { [R.STEEL]: 2 }, out: { [R.TOOLS]: 22, [R.GOODS]: 14 }, tech: 'robotics' }],
  carplant: [{ in: { [R.STEEL]: 3, [R.OIL]: 1 }, out: { [R.GOODS]: 18, [R.TOOLS]: 6 }, tech: 'massprod' }, { in: { [R.STEEL]: 3 }, out: { [R.GOODS]: 12, [R.TOOLS]: 4 }, tech: 'cars' }],
  chipfab: [{ in: { [R.GOODS]: 1, [R.STONE]: 1 }, out: { [R.GOODS]: 12, [R.TOOLS]: 4 }, tech: 'transistors' }],
  gigafactory: [{ in: { [R.STEEL]: 2 }, out: { [R.GOODS]: 14 }, tech: 'batteries' }],
  recyclecentre: [{ in: { [R.GOODS]: 1 }, out: { [R.STEEL]: 2, [R.GOODS]: 2 }, tech: 'recycling' }],
});

// ---- Arms. Every weapon has to be forged from a town's own stock before anyone can carry it. ----
// role: melee, pole (long, stops horses), ranged, or mounted (only riders). pierce: how much armour it ignores. ammo: shots carried. bayo: what a gun does up close.
const WEAPONS = [
  { id: 'club', name: 'Wooden club', role: 'melee', dmg: 7, rng: 1.5, cd: 6, pierce: 0.15, cost: {}, kind: 0 },
  { id: 'spear', name: 'Stone spear', role: 'pole', tech: 'stonetools', dmg: 10, rng: 2.2, cd: 6, horse: 1.8, cost: { [R.WOOD]: 0.5 }, kind: 0 },
  { id: 'sling', name: 'Sling', role: 'ranged', tech: 'warband', dmg: 6, rng: 6, cd: 7, pierce: 0.2, ammo: 30, cost: { [R.CLOTH]: 0.1 }, kind: 1 },
  { id: 'bow', name: 'Hunting bow', role: 'ranged', tech: 'bow', dmg: 8, rng: 7, cd: 8, ammo: 24, cost: { [R.WOOD]: 1 }, kind: 1 },
  { id: 'javelin', name: 'Javelins', role: 'ranged', tech: 'spearcraft', dmg: 13, rng: 4, cd: 10, pierce: 0.2, ammo: 8, cost: { [R.WOOD]: 1 }, kind: 1 },
  { id: 'axe', name: 'Copper axe', role: 'melee', tech: 'copper', dmg: 13, rng: 1.5, cd: 6, pierce: 0.2, cost: { [R.BRONZE]: 0.5, [R.WOOD]: 0.3 }, kind: 0 },
  { id: 'cbow', name: 'Composite bow', role: 'ranged', tech: 'compbow', dmg: 11, rng: 9, cd: 7, ammo: 24, cost: { [R.WOOD]: 1.5, [R.BRONZE]: 0.2 }, kind: 1 },
  { id: 'bsword', name: 'Bronze sword', role: 'melee', tech: 'bronze', dmg: 17, rng: 1.5, cd: 5, cost: { [R.BRONZE]: 1 }, kind: 0 },
  { id: 'pike', name: 'Bronze-tipped pike', role: 'pole', tech: 'phalanx', dmg: 15, rng: 2.8, cd: 6, horse: 2.4, cost: { [R.BRONZE]: 0.4, [R.WOOD]: 1 }, kind: 0 },
  { id: 'sabre', name: 'Cavalry sword', role: 'mounted', tech: 'cavalry', dmg: 24, rng: 1.6, cd: 5, cost: { [R.STEEL]: 1 }, kind: 0 },
  { id: 'isword', name: 'Iron sword', role: 'melee', tech: 'iron', dmg: 22, rng: 1.5, cd: 5, cost: { [R.STEEL]: 1 }, kind: 0 },
  { id: 'lbow', name: 'Longbow', role: 'ranged', tech: 'longbow', dmg: 14, rng: 11, cd: 7, pierce: 0.15, ammo: 24, cost: { [R.WOOD]: 2 }, kind: 1 },
  { id: 'xbow', name: 'Crossbow', role: 'ranged', tech: 'crossbow', dmg: 20, rng: 10, cd: 11, pierce: 0.5, ammo: 20, cost: { [R.STEEL]: 0.5, [R.WOOD]: 1 }, kind: 1 },
  { id: 'halberd', name: 'Halberd', role: 'pole', tech: 'feudalism', dmg: 26, rng: 2.3, cd: 6, pierce: 0.35, horse: 2.2, cost: { [R.STEEL]: 1, [R.WOOD]: 0.5 }, kind: 0 },
  { id: 'lance', name: 'Couched lance', role: 'mounted', tech: 'knights', dmg: 36, rng: 2.2, cd: 7, pierce: 0.45, cost: { [R.STEEL]: 0.6, [R.WOOD]: 1 }, kind: 0 },
  { id: 'ssword', name: 'Steel longsword', role: 'melee', tech: 'plate', dmg: 28, rng: 1.5, cd: 5, pierce: 0.1, cost: { [R.STEEL]: 1.5 }, kind: 0 },
  { id: 'musket', name: 'Matchlock musket', role: 'ranged', tech: 'musket', dmg: 38, rng: 9, cd: 18, pierce: 0.8, ammo: 18, bayo: 8, damp: 0.35, cost: { [R.STEEL]: 1, [R.WOOD]: 0.5, [R.COAL]: 0.3 }, kind: 2 },
  { id: 'flint', name: 'Flintlock & bayonet', role: 'ranged', tech: 'bayonet', dmg: 40, rng: 10, cd: 14, pierce: 0.8, ammo: 22, bayo: 18, damp: 0.25, cost: { [R.STEEL]: 1.2, [R.WOOD]: 0.5, [R.COAL]: 0.3 }, kind: 2 },
  { id: 'rifle', name: 'Rifle', role: 'ranged', tech: 'rifle', dmg: 46, rng: 15, cd: 9, pierce: 0.9, ammo: 40, bayo: 16, cost: { [R.STEEL]: 1.5, [R.COAL]: 0.3 }, kind: 2 },
  { id: 'mg', name: 'Automatic rifle', role: 'ranged', tech: 'machinegun', dmg: 30, rng: 15, cd: 3, pierce: 0.9, ammo: 120, bayo: 12, cost: { [R.STEEL]: 2, [R.COAL]: 0.5 }, kind: 2 },
  { id: 'assault', name: 'Assault rifle', role: 'ranged', tech: 'assaultrifle', dmg: 36, rng: 15, cd: 3, pierce: 0.95, ammo: 150, bayo: 14, cost: { [R.STEEL]: 1.5, [R.GOODS]: 0.5, [R.COAL]: 0.3 }, kind: 2 },
  { id: 'smart', name: 'Guided rifle', role: 'ranged', tech: 'missile', dmg: 60, rng: 20, cd: 4, pierce: 1, ammo: 100, bayo: 14, cost: { [R.STEEL]: 2, [R.OIL]: 0.5, [R.GOODS]: 1 }, kind: 2 },
  { id: 'railgun', name: 'Railgun', role: 'ranged', tech: 'railguns', dmg: 95, rng: 24, cd: 5, pierce: 1, ammo: 160, bayo: 18, cost: { [R.STEEL]: 3, [R.GOODS]: 3 }, kind: 2 },
  { id: 'laser', name: 'Energy rifle', role: 'ranged', tech: 'energyweapons', dmg: 80, rng: 28, cd: 2, pierce: 1, ammo: 500, bayo: 20, cost: { [R.STEEL]: 2, [R.GOODS]: 5 }, kind: 2 },
];
const WEAPON_IX = {}; WEAPONS.forEach((w, k) => { WEAPON_IX[w.id] = k; });
const ARMORS = [
  { id: 'none', name: 'No armour', prot: 0, cost: {}, col: null },
  { id: 'hide', name: 'Hide jerkin', tech: 'hides', prot: 0.1, cost: { [R.WOOD]: 0.3 }, col: '#8d6a43' },
  { id: 'bronze', name: 'Bronze cuirass', tech: 'bronzearmor', prot: 0.25, cost: { [R.BRONZE]: 1 }, col: '#b88a45' },
  { id: 'mail', name: 'Mail shirt', tech: 'chainmail', prot: 0.36, cost: { [R.STEEL]: 1 }, col: '#8b949c' },
  { id: 'plate', name: 'Plate armour', tech: 'plate', prot: 0.52, cost: { [R.STEEL]: 2 }, col: '#c5ccd3' },
  { id: 'uniform', name: 'Uniform & steel helmet', tech: 'rifle', prot: 0.24, cost: { [R.CLOTH]: 1, [R.STEEL]: 0.3 }, col: null },
  { id: 'kevlar', name: 'Body armour', tech: 'kevlar', prot: 0.5, cost: { [R.GOODS]: 1, [R.STEEL]: 0.5 }, col: '#3a4148' },
  { id: 'ceramic', name: 'Ceramic plate carrier', tech: 'ceramicarmour', prot: 0.6, cost: { [R.GOODS]: 2, [R.STEEL]: 0.5 }, col: '#6d6a52' },
  { id: 'exo', name: 'Powered armour', tech: 'exosuits', prot: 0.72, cost: { [R.GOODS]: 3, [R.STEEL]: 2 }, col: '#c7d2da' },
];
// A fielded engine costs materials at the muster. kind: ram (walks up to a gate), tower (lets men over a wall), gun (throws things from a distance).
// pow: damage to walls per shot. splash: hurt done to people where it lands. rng: reach in tiles. cd: ticks between shots.
const SIEGE = [
  { id: 'ram', name: 'Battering ram', kind: 'ram', tech: 'ram', pow: 6, splash: 0, rng: 1.5, cd: 26, hp: 90, cost: { [R.WOOD]: 8 } },
  { id: 'tower', name: 'Siege tower', kind: 'tower', tech: 'engineering', pow: 0, splash: 0, rng: 1, cd: 40, hp: 120, cost: { [R.WOOD]: 16 } },
  { id: 'catapult', name: 'Catapult', kind: 'gun', tech: 'catapult', pow: 5, splash: 22, rng: 18, cd: 70, hp: 50, cost: { [R.WOOD]: 12, [R.STEEL]: 1 } },
  { id: 'trebuchet', name: 'Trebuchet', kind: 'gun', tech: 'trebuchet', pow: 11, splash: 28, rng: 24, cd: 90, hp: 60, cost: { [R.WOOD]: 18, [R.STEEL]: 1 } },
  { id: 'cannon', name: 'Cannon', kind: 'gun', tech: 'cannon', pow: 16, splash: 40, rng: 22, cd: 60, hp: 70, cost: { [R.STEEL]: 6, [R.COAL]: 2 } },
  { id: 'artillery', name: 'Field gun', kind: 'gun', tech: 'artillery', pow: 30, splash: 75, rng: 38, cd: 34, hp: 80, cost: { [R.STEEL]: 10, [R.COAL]: 2 } },
  { id: 'rocketarty', name: 'Rocket launcher', kind: 'gun', tech: 'rocketarty', pow: 34, splash: 120, rng: 55, cd: 70, salvo: 6, hp: 90, cost: { [R.STEEL]: 14, [R.OIL]: 3, [R.GOODS]: 2 } },
];
// Ships only come from a port that can lay the keel: `port` on a building must be at least the ship's `port`.
// sea: 1 hugs the coast, 2 can cross open ocean. draft: 1 fits rivers and barge canals, 2 needs a ship canal, 3 fits only the widest. tough: lower survives storms better.
const MERCHANTMEN = [
  { id: 'reedboat', name: 'Reed boat', tech: 'weaving', port: 1, sea: 1, draft: 1, tough: 2.2, cap: 10, men: 6, spd: 0.3, hp: 15, cost: { [R.WOOD]: 3, [R.CLOTH]: 1 } },
  { id: 'dugout', name: 'Dugout', tech: 'rafts', port: 1, sea: 1, draft: 1, tough: 2, cap: 8, men: 8, spd: 0.34, hp: 20, cost: { [R.WOOD]: 6 } },
  { id: 'outrigger', name: 'Voyaging canoe', tech: 'outrigger', port: 1, sea: 2, draft: 1, tough: 1.7, cap: 14, men: 16, spd: 0.5, hp: 30, cost: { [R.WOOD]: 10, [R.CLOTH]: 1 } },
  { id: 'rbarge', name: 'River barge', tech: 'barges', port: 1, sea: 1, draft: 1, tough: 2.5, cap: 40, men: 10, spd: 0.26, hp: 30, cost: { [R.WOOD]: 12 } },
  { id: 'barque', name: 'Sailing barque', tech: 'sailing', port: 2, sea: 1, draft: 1, tough: 1.5, cap: 22, men: 16, spd: 0.42, hp: 40, cost: { [R.WOOD]: 14, [R.CLOTH]: 2 } },
  { id: 'knarr', name: 'Knarr', tech: 'clinker', port: 2, sea: 2, draft: 1, tough: 1.1, cap: 34, men: 22, spd: 0.46, hp: 55, cost: { [R.WOOD]: 20, [R.CLOTH]: 3 } },
  { id: 'merchgalley', name: 'Merchant galley', tech: 'merchgalley', port: 2, sea: 1, draft: 1, tough: 1.3, cap: 45, men: 60, spd: 0.55, hp: 60, cost: { [R.WOOD]: 22, [R.CLOTH]: 2 } },
  { id: 'dhow', name: 'Dhow', tech: 'lateen', port: 2, sea: 2, draft: 1, tough: 1.1, cap: 40, men: 20, spd: 0.62, hp: 50, cost: { [R.WOOD]: 18, [R.CLOTH]: 3 } },
  { id: 'grainship', name: 'Grain ship', tech: 'grainfleet', port: 2, sea: 2, draft: 2, tough: 1, cap: 130, men: 30, spd: 0.4, hp: 90, cost: { [R.WOOD]: 40, [R.CLOTH]: 6 }, ck: 'grain', hauls: [R.FOOD] },
  { id: 'cog', name: 'Trading cog', tech: 'ships', port: 2, sea: 1, draft: 2, tough: 1, cap: 55, men: 30, spd: 0.48, hp: 70, cost: { [R.WOOD]: 28, [R.CLOTH]: 4 } },
  { id: 'junk', name: 'Ocean junk', tech: 'junks', port: 2, sea: 2, draft: 2, tough: 0.8, cap: 140, men: 40, spd: 0.5, hp: 120, cost: { [R.WOOD]: 48, [R.CLOTH]: 8 } },
  { id: 'caravel', name: 'Caravel', tech: 'caravels', port: 2, sea: 2, draft: 2, tough: 1, cap: 70, men: 36, spd: 0.62, hp: 80, cost: { [R.WOOD]: 32, [R.CLOTH]: 6 } },
  { id: 'carrack', name: 'Carrack', tech: 'carrack', port: 2, sea: 2, draft: 2, tough: 0.8, cap: 100, men: 45, spd: 0.54, hp: 110, cost: { [R.WOOD]: 40, [R.CLOTH]: 6, [R.TOOLS]: 2 } },
  { id: 'fluyt', name: 'Fluyt', tech: 'drydocks', port: 2, sea: 2, draft: 2, tough: 0.8, cap: 150, men: 14, spd: 0.55, hp: 110, cost: { [R.WOOD]: 44, [R.CLOTH]: 8 } },
  { id: 'indiaman', name: 'Armed merchantman', tech: 'galleon', port: 3, sea: 2, draft: 2, tough: 0.7, cap: 170, men: 70, spd: 0.6, hp: 170, cost: { [R.WOOD]: 56, [R.CLOTH]: 10, [R.STEEL]: 4 } },
  { id: 'clipper', name: 'Clipper', tech: 'clipper', port: 3, sea: 2, draft: 2, tough: 0.8, cap: 150, men: 40, spd: 0.95, hp: 120, cost: { [R.WOOD]: 50, [R.CLOTH]: 14, [R.STEEL]: 4 } },
  { id: 'paddlesteamer', name: 'Paddle steamer', tech: 'paddle', port: 2, sea: 1, draft: 1, tough: 0.9, cap: 90, men: 40, spd: 0.72, hp: 120, cost: { [R.STEEL]: 14, [R.COAL]: 4 }, ck: 'pass', burn: R.COAL },
  { id: 'steamer', name: 'Steamer', tech: 'steamship', port: 3, sea: 2, draft: 2, tough: 0.45, cap: 320, men: 120, spd: 0.9, hp: 260, cost: { [R.STEEL]: 24, [R.COAL]: 6 }, ck: 'gen', burn: R.COAL },
  { id: 'reefer', name: 'Refrigerated ship', tech: 'refrigeration', port: 3, sea: 2, draft: 2, tough: 0.5, cap: 260, men: 50, spd: 0.85, hp: 240, cost: { [R.STEEL]: 30, [R.COAL]: 6, [R.GOODS]: 2 }, ck: 'reefer', hauls: [R.FOOD], burn: R.COAL },
  { id: 'coaster', name: 'Motor coaster', tech: 'combustion', port: 2, sea: 1, draft: 1, tough: 0.7, cap: 150, men: 8, spd: 0.8, hp: 150, cost: { [R.STEEL]: 16, [R.OIL]: 3 }, burn: R.OIL },
  { id: 'tanker', name: 'Oil tanker', tech: 'tankers', port: 3, sea: 2, draft: 3, tough: 0.4, cap: 700, men: 60, spd: 0.85, hp: 380, cost: { [R.STEEL]: 44, [R.OIL]: 4 }, ck: 'oil', hauls: [R.OIL], burn: R.OIL },
  { id: 'freighter', name: 'Container ship', tech: 'containers', port: 4, sea: 2, draft: 3, tough: 0.3, cap: 900, men: 240, spd: 1.15, hp: 400, cost: { [R.STEEL]: 50, [R.OIL]: 6 }, ck: 'box', burn: R.OIL },
  { id: 'hovercraft', name: 'Hovercraft ferry', tech: 'hovercraft', port: 2, sea: 1, draft: 1, tough: 1.2, cap: 30, men: 250, spd: 1.6, hp: 120, cost: { [R.STEEL]: 20, [R.OIL]: 4, [R.GOODS]: 4 }, ck: 'pass', burn: R.OIL },
  { id: 'roroship', name: 'Ro-ro car carrier', tech: 'roro', port: 4, sea: 2, draft: 3, tough: 0.35, cap: 800, men: 25, spd: 1.0, hp: 420, cost: { [R.STEEL]: 60, [R.OIL]: 8, [R.GOODS]: 6 }, ck: 'car', hauls: [R.GOODS, R.TOOLS, R.STEEL], burn: R.OIL, len: 64 },
  { id: 'autocargo', name: 'Autonomous freighter', tech: 'autocargo', port: 4, sea: 2, draft: 3, tough: 0.2, cap: 1500, men: 300, spd: 1.3, hp: 500, cost: { [R.STEEL]: 70, [R.GOODS]: 10 }, ck: 'box', burn: R.OIL },
  { id: 'rotorship', name: 'Rotor-sail freighter', tech: 'rotorsails', port: 4, sea: 2, draft: 3, tough: 0.25, cap: 1200, men: 20, spd: 1.0, hp: 520, cost: { [R.STEEL]: 80, [R.GOODS]: 14 }, ck: 'box', burn: R.OIL, burnMul: 0.4 },
  // Bulk hulls: huge and slow, built only by big deep-water ports and sent on long runs between them. bulk: never an ordinary trader.
  // hauls: the only cargo it carries. len: hull length in art pixels (the others are 48).
  { id: 'bulker', name: 'Bulk carrier', tech: 'screw', port: 3, sea: 2, draft: 3, tough: 0.4, cap: 1100, men: 30, spd: 0.46, hp: 440, cost: { [R.STEEL]: 60, [R.COAL]: 10 }, bulk: 1, len: 76, hauls: [R.FOOD, R.COAL, R.IRON, R.STONE, R.SALT, R.WOOD], ck: 'bulk', burn: R.COAL },
  { id: 'collier', name: 'Steam collier', tech: 'steamship', port: 3, sea: 2, draft: 2, tough: 0.5, cap: 500, men: 24, spd: 0.55, hp: 300, cost: { [R.STEEL]: 36, [R.COAL]: 8 }, bulk: 1, cls: 3, len: 60, hauls: [R.COAL, R.IRON, R.STONE, R.WOOD], ck: 'coal', burn: R.COAL },
  { id: 'supertanker', name: 'Supertanker', tech: 'tankers', port: 3, sea: 2, draft: 3, tough: 0.3, cap: 1800, men: 30, spd: 0.5, hp: 560, cost: { [R.STEEL]: 90, [R.OIL]: 12 }, bulk: 1, len: 88, hauls: [R.OIL], ck: 'oil', burn: R.OIL },
  { id: 'gascarrier', name: 'Gas carrier', tech: 'supertankers', port: 4, sea: 2, draft: 3, tough: 0.3, cap: 1500, men: 25, spd: 0.75, hp: 600, cost: { [R.STEEL]: 110, [R.OIL]: 14, [R.GOODS]: 8 }, bulk: 1, len: 84, hauls: [R.OIL], ck: 'oil', burn: R.OIL },
  { id: 'megabox', name: 'Ultra-large container ship', tech: 'containers', port: 4, sea: 2, draft: 3, tough: 0.25, cap: 2600, men: 40, spd: 0.68, hp: 640, cost: { [R.STEEL]: 120, [R.OIL]: 14, [R.GOODS]: 6 }, bulk: 1, len: 96, hauls: [R.GOODS, R.TOOLS, R.CLOTH, R.STEEL, R.BRICK], ck: 'box', burn: R.OIL },
  { id: 'orecarrier', name: 'Very large ore carrier', tech: 'autocargo', port: 4, sea: 2, draft: 3, tough: 0.2, cap: 3200, men: 20, spd: 0.48, hp: 700, cost: { [R.STEEL]: 140, [R.GOODS]: 10 }, bulk: 1, len: 92, hauls: [R.IRON, R.COAL, R.COPPER, R.FOOD, R.STONE], ck: 'ore', burn: R.OIL },
];
// role: line fights fleets, raid lands and burns, escort hunts submarines (asw), sub sinks merchants unseen, carrier strikes inland, missile hits from far away. bomb: can shell a town.
const WARSHIPS = [
  { id: 'galley', name: 'War galley', tech: 'wargalley', role: 'line', sea: 1, draft: 1, men: 30, spd: 0.52, hp: 80, atk: 9, rng: 3, cost: { [R.WOOD]: 24, [R.BRONZE]: 2 } },
  { id: 'longship', name: 'Longship', tech: 'longships', role: 'raid', sea: 1, draft: 1, men: 40, spd: 0.7, hp: 70, atk: 7, rng: 2, cost: { [R.WOOD]: 22, [R.STEEL]: 1 } },
  { id: 'trireme', name: 'Trireme', tech: 'triremes', role: 'line', sea: 1, draft: 1, men: 50, spd: 0.68, hp: 120, atk: 16, rng: 2, cost: { [R.WOOD]: 34, [R.BRONZE]: 4 } },
  { id: 'frigate', name: 'Frigate', tech: 'frigates', role: 'escort', asw: 0, sea: 2, draft: 2, men: 50, spd: 0.82, hp: 170, atk: 22, rng: 7, cost: { [R.WOOD]: 46, [R.CLOTH]: 8, [R.STEEL]: 6 } },
  { id: 'manowar', name: 'Man-of-war', tech: 'galleon', role: 'line', bomb: 1, sea: 2, draft: 2, men: 60, spd: 0.6, hp: 240, atk: 30, rng: 9, cost: { [R.WOOD]: 60, [R.CLOTH]: 8, [R.STEEL]: 8 } },
  { id: 'shipline', name: 'Ship of the line', tech: 'shipofline', role: 'line', bomb: 1, sea: 2, draft: 2, men: 90, spd: 0.58, hp: 380, atk: 48, rng: 10, cost: { [R.WOOD]: 90, [R.CLOTH]: 12, [R.STEEL]: 14 } },
  { id: 'ironclad', name: 'Ironclad', tech: 'ironclad', role: 'line', bomb: 1, sea: 2, draft: 2, men: 80, spd: 0.74, hp: 560, atk: 70, rng: 13, cost: { [R.STEEL]: 40, [R.COAL]: 8 } },
  { id: 'dreadnought', name: 'Battleship', tech: 'dreadnought', role: 'line', bomb: 1, sea: 2, draft: 3, men: 160, spd: 0.92, hp: 1300, atk: 190, rng: 20, cost: { [R.STEEL]: 120, [R.COAL]: 14 } },
  { id: 'destroyer', name: 'Destroyer', tech: 'destroyer', role: 'escort', asw: 1, sea: 2, draft: 2, men: 110, spd: 1.2, hp: 800, atk: 160, rng: 18, cost: { [R.STEEL]: 70, [R.OIL]: 10 } },
  { id: 'submarine', name: 'Submarine', tech: 'submarines', role: 'sub', sea: 2, draft: 2, men: 60, spd: 0.8, hp: 300, atk: 170, rng: 7, cost: { [R.STEEL]: 50, [R.OIL]: 6 } },
  { id: 'carrier', name: 'Aircraft carrier', tech: 'carriers', role: 'carrier', sea: 2, draft: 3, men: 300, spd: 1.0, hp: 1500, atk: 60, rng: 8, cost: { [R.STEEL]: 170, [R.OIL]: 26, [R.GOODS]: 8 } },
  { id: 'cruiser', name: 'Missile cruiser', tech: 'cruisemissile', role: 'missile', asw: 1, bomb: 1, sea: 2, draft: 3, men: 200, spd: 1.2, hp: 1100, atk: 260, rng: 32, cost: { [R.STEEL]: 130, [R.OIL]: 18, [R.GOODS]: 14 } },
  { id: 'nuclearsub', name: 'Nuclear submarine', tech: 'nuclearnavy', role: 'sub', sea: 2, draft: 3, men: 100, spd: 1.2, hp: 700, atk: 340, rng: 12, cost: { [R.STEEL]: 110, [R.URANIUM]: 2, [R.GOODS]: 12 } },
  { id: 'droneship', name: 'Drone ship', tech: 'droneships', role: 'carrier', asw: 1, sea: 2, draft: 3, men: 40, spd: 1.5, hp: 1000, atk: 200, rng: 24, cost: { [R.STEEL]: 110, [R.GOODS]: 30 } },
];
[WEAPONS, ARMORS, SIEGE, MERCHANTMEN, WARSHIPS].forEach(L => L.forEach((g, k) => { g.ix = k; g.techI = g.tech ? TECH_IX[g.tech] : -1; }));
const bestOf = (list, t) => { let b = -1; for (let k = 0; k < list.length; k++) if (list[k].techI < 0 || t.tech[list[k].techI]) b = k; return b; };

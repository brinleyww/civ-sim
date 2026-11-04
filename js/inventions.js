'use strict';
// Hundreds more side inventions, from bone awls to starships. Loaded after tech.js and before content.js, which resolves the reqs.
(() => {
  const DOM = { FO: J.FORAGE, HU: J.HUNT, FI: J.FISH, FA: J.FARM, HE: J.HERD, WO: J.WOOD, ST: J.STONE, CL: J.CLAY, MI: J.MINE, BU: J.BUILD, CR: J.CRAFT, TR: J.TRADE, SC: J.SCHOLAR, SO: J.SOLDIER, SE: J.SERVICE, SA: J.SAILOR, GA: J.GARDEN };
  const COND = {
    coast: [t => t.near.coast > 0, 'Lives on a coast'],
    river: [t => t.near.river > 0, 'Lives on a river'],
    water: [t => t.near.water > 0, 'Lives by water'],
    snow: [t => W.temp[t.i] < 0.55, 'Lives where it snows'],
  };
  // Cost range per age, matched to the side inventions already in content.js, and the rounding for each.
  const DIFF = [[1000, 2400], [1800, 3600], [4000, 7500], [9000, 15000], [14000, 28000], [32000, 52000], [88000, 150000], [200000, 320000], [650000, 950000], [2000000, 2400000], [5000000, 5600000], [9500000, 12000000], [16000000, 22000000], [28000000, 40000000]];
  const STEP = [100, 100, 100, 500, 500, 1000, 5000, 5000, 10000, 100000, 100000, 100000, 1000000, 1000000];
  const TAG_OK = 'nature farm warm war metal med sky sea math machine elec lore law build urban trade craft energy'.split(' ');
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

  // era|DOM[/ALT]|tag[!=military]|id|Name|reqs|fx key (- for none)|description[|cond]
  const LIST = `
# Old Stone Age
0|HU|craft|awls|Bone Awls|hides|cold|A sharpened splinter of bone punches neat holes for every stitch.
0|HU/SE|warm|eyedneedle|Eyed Needles|awls|cold|A hole in the bone: the thread follows the point, and clothes start to fit.
0|ST|craft|handaxe|Hand Axes|stonetools|wood|A teardrop of flint, shaped on both faces, that chops, digs and butchers.
0|ST|craft|levallois|Prepared Cores|handaxe|craft|Shape the stone first, then strike off a blade exactly the size you wanted.
0|ST/HU|craft|microliths|Microliths|levallois|hunt|Tiny flint teeth set in a shaft make a barbed point that can be mended.
0|HU/WO|craft|hafting|Hafted Tools|handaxe,cordage|wood|A stone head bound to a wooden handle swings with twice the force.
0|HU|nature|spearthrower|Spear-Throwers|spearcraft|hunt|A hooked stick adds a second elbow, and the spear flies twice as far.
0|HU|nature|bolas|Bolas|cordage|hunt|Stones tied on cords tangle the legs of anything that runs.
0|FI|sea|fishhooks|Bone Fish Hooks|fishing|fish|A barbed curve of bone, and the fish cannot spit it out.
0|FI/HU|sea|harpoons|Barbed Harpoons|fishing,spearcraft|fish|A toggling point that turns inside the seal and holds.
0|FI|sea|fishnets|Knotted Nets|fishing,cordage|fish|One cast brings in what a day of hooks would.
0|FI/FO|sea|fishtraps|Basket Fish Traps|baskets,fishing|fish|A woven cone in the stream: fish swim in and can’t find the way out.
0|FO|nature|digsticks|Digging Sticks|gathering|forage|A pointed, fire-hardened pole prises up roots too deep for fingers.
0|FO|nature|grindslabs|Grinding Slabs|stonetools,gathering|forage|Seeds crushed on a flat stone become a paste that can be cooked.
0|FO|nature|nutcracking|Nut-Cracking Stones|stonetools|forage|An anvil stone and a hammer stone open the richest food in the forest.
0|FO|nature|wildgrain|Wild Grain Harvest|grindslabs,baskets|forage|Whole stands of wild grass are stripped of seed in a week.
0|FO/HU|nature|seasonround|Seasonal Rounds|gathering|famine|The band knows where to be in every month of the year.
0|HU|nature|drives|Game Drives|tracking|hunt|Stone lines and shouting funnel a whole herd over a cliff.
0|HU|nature|pitfalls|Pit Traps|snares|hunt|A covered pit on the game trail, and a mammoth that can’t climb out.
0|HU|nature|decoys|Decoys & Calls|tracking|hunt|A stuffed head and a good bellow bring the stag within range.
0|HU/FO|nature|poisondarts|Poisoned Points|herbs,bow|hunt|A smear of the right sap, and the wounded animal does not run far.
0|HU|warm|furcloaks|Fur Cloaks|hides|cold|Pelts with the fur turned inward keep out the worst of the wind.
0|HU/SE|warm|fitted|Fitted Parkas|eyedneedle,furcloaks|cold|Hooded, sleeved and sewn tight: people can live on the edge of the ice.
0|FO|warm|firepits|Banked Fires|fire|cold|Ash heaped over embers keeps a fire alive until morning.
0|FO|warm|firedrill|Fire Drills|fire|cold|Fire made anywhere, not only carried from the last camp.
0|FO|warm|strikealight|Flint & Pyrite|firedrill,stonetools|-|A spark from struck stone lights the tinder in a heartbeat.
0|BU/FO|build|windbreaks|Windbreaks|thatching|cold|A wall of brush on the weather side makes a camp liveable.
0|BU|build|pithouses|Pit Houses|thatching,digsticks|cold|Dug half into the earth and roofed with turf, warm through the frost.
0|BU/HU|build|mammothhuts|Bone Huts|pithouses,drives|cold|Where there are no trees, the bones of the hunt hold up the roof.|snow
0|FO|lore|ochre|Ochre Pigments|fire|happy|Red earth roasted and ground marks bodies, graves and walls.
0|FO/HU|lore|cavepaint|Cave Painting|ochre|happy|Herds run across the rock by firelight, and the young learn what to hunt.
0|FO/TR|trade|beads|Shell Beads|cordage|trade|Pierced shells on a cord: the first thing worth carrying a long way just to give away.
0|FO|lore|flutes|Bone Flutes|awls|happy|Holes in a hollow bird bone, and a tune that outlives the player.
0|FO/SE|lore|storytelling|Storytelling|burial|research|Long tales by the fire carry what the grandparents learned.
0|FO|lore|figurines|Carved Figurines|burial,handaxe|happy|Small round mothers of ivory and stone, carried from camp to camp.
0|FO|math|lunartally|Moon Counts|tally|research|Notches for every night of the moon: the first calendar is a bone.
0|FO/TR|trade|gifting|Gift Exchange|beads|trade|A gift binds two bands; a gift returned makes them allies.
0|FO/SE|med|woundmoss|Moss Dressings|herbs|recover|Moss packed into a wound soaks up the blood and keeps it clean.
0|FO/SE|med|sweatlodge|Sweat Lodges|fire,thatching|health|Hot stones, water and a closed tent drive out aches and chills.
0|HU|war!|stoneclubs|War Clubs|hafting|attack|A stone lashed in a heavy handle: the first weapon made only for people.
0|HU|war!|shields0|Hide Shields|hides,hafting|defend|Stretched rawhide on a frame turns a thrown spear.
0|FI|sea|paddles|Paddles|rafts|seaRange|A blade on a pole moves a boat where the current won’t.
0|FI|sea|reedboats|Reed Bundle Boats|cordage,fishing|fish|Bundles of reeds lashed tight float a fisher out past the shallows.
0|FO|nature|honeyhunt|Honey Hunting|fire,gathering|forage|Smoke at the hive, a long climb, and the sweetest food there is.
0|FO|farm|nutcaches|Nut Caches|acorns|store|Pits of nuts buried in autumn and dug up in the hungry spring.
0|HU/TR|nature|skinbags|Skin Water Bags|hides|drought|A sealed hide holds a day’s water, and dry country becomes crossable.
0|FO|lore|signals|Smoke Signals|fire|spread|A column of smoke tells the next valley the herds are coming.
# New Stone Age
1|FA|farm|sickles|Flint Sickles|agriculture,microliths|farm|Flint teeth in a curved haft: the harvest comes in before the grain shatters.
1|FA|farm|hoes|Stone Hoes|agriculture,hafting|farm|A blade set crosswise breaks the ground for planting.
1|FA|farm|threshing|Threshing Floors|sickles|farm|Beaten earth, a flail and the wind to carry the chaff away.
1|FA/FO|farm|winnowing|Winnowing Baskets|threshing,baskets|spoil|Tossed grain falls clean while the husks blow off.
1|FA|farm|emmer|Emmer & Einkorn|agriculture|farm|The first wheats, chosen for ears that hold their seed until the sickle comes.
1|FA|farm|barley|Barley Fields|emmer|farm|Hardier than wheat, good for bread and better for beer.
1|FA|farm|millet|Millet|agriculture|drought|A small grain that ripens fast on dry ground.
1|GA|farm|squash|Gourds & Squash|kitchengarden|famine|Vines that sprawl over the midden and give a fruit that keeps, and a bowl.
1|FA/WO|farm|slashburn|Slash-and-Burn Plots|agriculture,firestick|farm|Burn a patch of forest, plant in the ash, move on when it tires.
1|GA|farm|figs|Fig Cuttings|orchards|farm|A branch pushed into the ground grows into a fruiting tree.
1|GA|farm|datepalms|Date Palms|orchards|famine|Palms pollinated by hand give a sugar that keeps for years.
1|HE|farm|sheep|Sheep & Goats|husbandry|herd|Small, hardy and happy on hills nobody can plough.
1|HE|farm|cattle|Cattle|husbandry|herd|Wild aurochs bred small and patient enough to live beside.
1|HE|farm|pigs|Pigs|husbandry|herd|They eat the scraps, root up the weeds, and are always worth it in winter.
1|HE|farm|transhumance|Transhumance|sheep|herd|Up to the high meadows in summer, down to the valley before the snow.
1|HE/CR|warm|woolsheep|Woolly Sheep|sheep,weaving|cold|Bred for fleece instead of hair: the coat grows back every year.
1|HE|farm|cheese|Cheese Making|dairy,pottery|spoil|Milk curdled, pressed and salted keeps for a year.
1|HE|farm|butter|Butter & Ghee|dairy|famine|Milk fat churned or boiled down stores the summer’s plenty.
1|HE/FA|farm|fodder|Hay Making|husbandry,sickles|herd|Grass cut and dried in summer feeds the herd through winter.
1|HE/BU|farm|corrals|Corrals|husbandry,palisade|herd|A ring of stakes keeps the herd in and the wolves out.
1|CL|craft|coilpots|Coiled Pots|pottery|store|Ropes of clay wound up into a jar as tall as a child.
1|CL/WO|craft|pitkilns|Pit Kilns|pottery,charcoal|craft|Pots buried in fuel and fired together come out harder, and fewer crack.
1|CL|craft|slips|Burnished Slips|coilpots|trade|A coat of fine clay polished with a pebble makes a pot that shines.
1|CL/TR|math|tokens|Clay Tokens|pottery,tally|trade|Little clay cones and spheres stand for sheep and jars of oil.
1|CR/WO|craft|polishedaxe|Polished Stone Axes|handaxe,grindslabs|wood|Ground smooth, a stone axe fells an oak without shattering.
1|CR|craft|drilling|Bow Drills|bow,stonetools|craft|A bowstring spins a shaft fast enough to bore through stone.
1|CR/HE|craft|spindle|Drop Spindles|cordage,weaving|craft|A whorl on a stick spins thread while you walk.
1|CR|warm|loom|Warp-Weighted Looms|weaving,spindle|cold|Clay weights pull the threads tight, and cloth grows a hand’s width a day.
1|CR/HE|warm|feltmaking|Felt|sheep|cold|Wool soaked, rolled and trampled into a mat warmer than any weave.
1|CR|metal|nativecopper|Cold-Hammered Copper|stonetools,beads|trade|Lumps of pure copper beaten into beads and awls without any fire.
1|CR/BU|build|lime|Lime Plaster|fire,stonetools|build|Burnt limestone and water set into a smooth, hard white floor.
1|WO|build|adzes|Adzes|polishedaxe|wood|A blade turned crosswise shapes planks and hollows out boats.
1|WO/BU|build|wattle|Wattle & Daub|thatching,carpentry|build|Woven hazel plastered with mud and dung: a wall in a day.
1|BU|urban|longhouses|Longhouses|wattle|urban|Whole families of families under one long roof.
1|BU|build|stilthouses|Stilt Houses|carpentry|urban|Houses raised over the lake shore stay dry and safe.|water
1|ST|lore|megaliths|Standing Stones|burial,lunartally|happy|Huge stones dragged into rings that catch the midwinter sun.
1|ST/SE|lore|dolmens|Chamber Tombs|megaliths|order|A house of stone for the ancestors, and a claim on the land around it.
1|BU/SO|war!|ditches|Ditch & Bank|palisade,digsticks|defend|A ditch outside the palisade, its spoil heaped into a bank.
1|BU|urban|villages|Nucleated Villages|longhouses,wells|urban|Houses drawn in round a common yard, a well and a shrine.
1|FI|sea|fishsalting|Salted Fish|fishdrying,saltworks|spoil|Packed in salt in a pot, the catch goes inland and lasts the winter.
1|FI|sea|seines|Seine Nets|fishnets|fish|A long net walked round the shoal from two boats.
1|FI/WO|sea|plankboats|Sewn-Plank Boats|adzes,rafts|seaRange|Planks stitched together with rope and caulked with moss.
1|TR|trade|obsidian|Obsidian Trade|barter|trade|Volcanic glass passes hand to hand for hundreds of miles.
1|TR/HE|trade|saltroads|Salt Roads|saltworks,packanimals|trade|Every path inland is first worn by people carrying salt.
1|TR/CR|trade|seals|Stamp Seals|tokens|trade|A carved stone pressed in clay says whose jar this is.
1|SE|law|elders|Councils of Elders|oralaw|order|The grey heads meet under the tree, and their word holds.
1|SE/TR|law|bridewealth|Marriage Alliances|oralaw,gifting|order|A daughter sent to the next village makes cousins of rivals.
1|SE/FA|farm|feasting|Feasting|brewing,baking|happy|A great feast pays back the harvest helpers and ties the village together.
1|SE|lore|ancestor|Ancestor Cults|burial,dolmens|happy|The dead are fed, asked and remembered, and they watch over the fields.
1|SE|med|trepanning|Trepanation|bonesetting,drilling|recover|A round hole in the skull, and somehow most of them live.
1|SE|med|delousing|Fine Combs|herbs,awls|health|Bone combs and smoke chase the lice out of the bedding.
1|FO/SE|med|willowbark|Willow Bark|herbs|health|Chewed bark that takes the edge off a fever.
1|SO/HU|war!|slings|Slings|cordage,warband|attack|A pouch, two cords, and a stone that flies further than an arrow.
1|SO/CR|war!|maces|Stone Maceheads|warband,drilling|attack|A ball of stone bored through and set on a haft.
1|SO|war!|ambush|Raiding Tactics|warband|attack|Strike at dawn, take the cattle, and be gone before anyone wakes.
1|HE/TR|trade|donkeys|Donkeys|husbandry|cargo|Sure-footed and stubborn, they carry a family’s goods across the desert.
1|FA/GA|farm|fencing|Hedges & Fences|corrals,kitchengarden|farm|A hedge keeps the goats out of the beans.
1|CR/HE|craft|leatherwork|Leatherwork|tanning,awls|craft|Belts, bags, buckets and shoes from the same hide.
# Bronze Age
2|CR|metal|lostwax|Lost-Wax Casting|copper|craft|A wax model, a clay coat, molten bronze: any shape you can carve.
2|CR|metal|moulds|Stone Moulds|copper|craft|Axe heads poured by the dozen from one carved mould.
2|CR|metal|bellows|Bellows|copper,tanning|craft|A goatskin bag pumps air into the furnace, and the fire roars.
2|CR/CL|metal|crucibles|Crucibles|copper,pitkilns|craft|A clay cup that survives the heat of melting metal.
2|MI|metal|firesetting|Fire-Setting|copper|mine|Heat the rock face, throw on water, and it cracks off in slabs.
2|MI|metal|tinmining|Tin Streaming|bronze|mine|Black pebbles washed out of stream gravel, worth more than the land.
2|MI/TR|metal|goldpanning|Gold Panning|copper|trade|A shallow dish swirled in the river leaves a glitter behind.
2|CR|metal|goldsmith|Goldsmithing|goldpanning,lostwax|trade|Fine wire, beaten leaf and granules soldered on like dust.
2|CR/MI|metal|silvercupel|Cupellation|goldsmith|trade|Lead melted on bone ash leaves pure silver behind.
2|CR|metal|arsenical|Arsenical Bronze|copper|attack|A pinch of the right ore makes copper hard enough to hold an edge.
2|CL/CR|craft|potterswheel|Potter’s Wheel|pottery,wheel|craft|A spinning table turns out a perfect pot in moments.
2|CR|craft|faience|Faience|glass|trade|Glazed blue beads that look like turquoise and cost far less.
2|CL|craft|glazes|Glazed Pottery|faience,potterswheel|spoil|A glassy skin seals the pot against oil and wine.
2|CR/FI|trade|purpledye|Shellfish Purple|dyes|trade|Ten thousand crushed sea snails, and cloth fit for a king.
2|CR/GA|warm|linen|Linen|flaxfields,loom|cold|Retted, beaten and spun flax: cool, strong and washable.
2|CR/GA|warm|cottoncloth|Cotton Cloth|flaxfields|cold|Soft bolls spun into the lightest cloth there is.
2|CR/GA|farm|oliveoil|Olive Presses|orchards,querns|farm|A beam and a stone squeeze out oil for lamps, food and trade.
2|GA/TR|farm|winepress|Wine Presses|vineyards|trade|Grapes trodden and pressed, and sealed jars of wine travel the sea.
2|SC|lore|cuneiform|Cuneiform|writing|research|Wedges pressed in clay: a grain receipt can be read a lifetime later.
2|SC/CR|lore|papyrus|Papyrus|writing|research|Reed pith pressed into sheets: a scroll is lighter than a clay library.|river
2|SC|lore|scribeschool|Scribal Schools|cuneiform|research|Boys copy proverbs for years and come out able to run a temple.
2|SC/TR|lore|alphabet|The Alphabet|writing,seals|spread|Twenty-odd signs for sounds, and anyone can learn to write.
2|SC|lore|libraries0|Tablet Archives|scribeschool|research|Rooms of tablets, catalogued by shelf.
2|SC/SE|lore|epics|Written Epics|writing,storytelling|happy|The old hero tales fixed in writing and recited at every feast.
2|SC|math|base60|Counting in Sixties|math|research|Thirds and quarters come out even, and the hour is born.
2|SC/FA|math|geometry0|Land Surveying|math,taxation|admin|Rope stretchers redraw the fields after every flood.
2|SC/TR|math|abacus|Counting Boards|math|trade|Pebbles on lines: sums done faster than words.
2|SC|sky|sundials|Shadow Clocks|calendar|research|A stick’s shadow marks the hours of the working day.
2|SC|sky|waterclock|Water Clocks|sundials,pottery|research|A dripping bowl counts the hours of the night.
2|SC|sky|eclipses|Eclipse Records|astronomy,writing|research|Generations of records, and the sky’s next trick is foretold.
2|SC/SE|med|medpapyri|Medical Texts|writing,herbgarden|health|Cases, signs and cures copied out for the next physician.
2|SE|med|dentistry|Dentistry|surgery|health|Bow drills, beeswax fillings and a great deal of shouting.
2|SE|lore|embalming|Embalming|burial,saltworks|happy|Salt, resin and linen keep the honoured dead for ever.
2|SE|law|census0|Censuses|writing,taxation|admin|Every household counted, every head taxed.
2|SE/BU|law|corvee|Corvée Labour|kingship|build|Each family owes the king a season of work on his canals.
2|SE/SC|law|bureaucracy0|Scribal Bureaucracy|scribeschool,taxation|admin|An office for everything, and a tablet for every decision.
2|SE|law|courts0|Courts of Judges|law|order|Disputes go before judges, not feuds.
2|SE/TR|law|contracts|Written Contracts|law,seals|trade|Witnessed, sealed and kept in a jar: a promise that can be proven.
2|SE/FA|farm|templecities|Temple Estates|priests,granary|store|The temple owns fields, flocks and workshops, and feeds its servants.
2|BU|build|corbelling|Corbelled Vaults|masonry|build|Each stone overhangs the last until the gap closes.
2|BU/ST|build|pyramids|Pyramids|masonry,corvee|happy|A mountain built by hand, and a whole country organised to do it.
2|BU/ST|build|ramps|Ramps & Levers|masonry|build|Earth ramps and wooden levers lift stones no crowd could carry.
2|BU|build|plumbline|Plumb Lines & Levels|masonry,math|build|A weight on a string and a set square keep the walls true.
2|BU/SO|war!|citywalls|City Walls|masonry,ditches|defend|A ring of brick ten metres high, with gates that close at night.
2|BU|urban|gridstreets|Grid Streets|plumbline,villages|urban|Streets laid out square, and a city that can grow block by block.
2|BU/CL|urban|terracotta|Clay Drainpipes|pitkilns,cisterns|health|Fitted clay pipes carry the waste out under the street.
2|FA|farm|seederplough|Seeder Ploughs|plough,calendar|farm|A funnel on the plough drops seed into the furrow as it is cut.
2|FA|farm|basin|Basin Irrigation|irrigation,dikes|drought|Flood water held in earth basins soaks the fields for a whole season.|river
2|HE/TR|trade|camels|Camels|husbandry,caravans|cargo|They carry a load across the desert and live on thorns.
2|HE|farm|horsebreeding|Horse Breeding|riding|herd|Studs, bloodlines and foals sold for a fortune.
2|HE/TR|trade|mules|Mules|donkeys,horsebreeding|cargo|A donkey’s patience, a horse’s strength, and a load nobody else could carry.
2|GA/CR|trade|silk|Sericulture|weaving,orchards|trade|Mulberry leaves, patient hands and a thread finer than anything else.
2|HU/HE|nature|falconry|Falconry|huntdogs,riding|hunt|A hawk on the fist brings down what no arrow could reach.
2|FI/TR|sea|pearls|Pearl Diving|fishing,beads|trade|Divers hold their breath and come up with a fortune in an oyster.|coast
2|SA/WO|sea|keels|Keels & Ribs|plankboats,carpentry|seaRange|A spine and ribs with planks fixed to them: a hull that holds its shape.
2|SA|sea|lighthouses0|Beacon Fires|ships,signals|seaRange|A fire on the headland brings the ships home at night.
2|SA/BU|sea|harbours|Harbour Moles|masonry,ships|cargo|A stone arm in the sea makes still water for unloading.|coast
2|TR|trade|merchanthouse|Merchant Houses|caravans,contracts|trade|Families with agents in five cities and letters between them.
2|TR|trade|silverweight|Silver by Weight|scales,silvercupel|trade|Rings and scraps of silver weighed out for every purchase.
2|TR/FA|trade|interest|Interest-Bearing Loans|accounts0,contracts|trade|Lend a measure of barley in spring, and get back more at harvest.
2|SO/CR|war!|socket|Socketed Spearheads|bronze|attack|A cast bronze socket fits the shaft and doesn’t split it.
2|SO/CR|war!|khopesh|Sickle Swords|bronze,lostwax|attack|A curved bronze blade that hooks a shield aside.
2|CR/SO|war!|helmets|Bronze Helmets|bronzearmor|defend|A cap of bronze over a padded lining.
2|SO|war!|siegeladders|Siege Ladders|citywalls|attack|Long ladders, many at once, and the wall cannot be everywhere.
2|SO/SE|war!|standingguard|Royal Guards|kingship,phalanx|defend|A king’s own picked men, fed and armed at the palace.
# Iron Age
3|CR/MI|metal|bloomery|Bloomeries|iron|mine|A clay shaft furnace yields a spongy bloom of iron to hammer clean.
3|CR|metal|quenching|Quenching & Tempering|bloomery|craft|Plunge the hot blade in water, then warm it gently: hard, and not brittle.
3|CR|metal!|wootz|Crucible Steel|quenching,crucibles|attack|Sealed crucibles make a steel with a watered pattern and a wicked edge.
3|CR|metal!|pattern|Pattern Welding|quenching|attack|Twisted rods of iron and steel forged into one blade.
3|CR/HE|craft|ironshears|Iron Shears|iron,woolsheep|herd|Spring shears clip a fleece off in one piece.
3|CR/WO|metal|ironaxe|Iron Axes|iron,adzes|wood|Cheap iron axes clear forests that bronze never could.
3|CR/BU|metal|nails|Wrought Nails|iron,carpentry|build|Hand-forged nails by the barrel, and joinery gets quick.
3|CR/WO|craft|lathes|Pole Lathes|drilling,carpentry|craft|A cord round the work and a springy pole: bowls and chair legs turned true.
3|CR|craft|glassblowing|Glassblowing|glass|trade|A breath down a pipe makes a cup in a minute, and glass becomes cheap.
3|CR/TR|trade|coinage|Struck Coinage|currency,silverweight|trade|Weights of metal stamped with a ruler’s face: no need for scales.
3|CR/BU|craft|mosaics|Mosaics|masonry,glazes|happy|Thousands of coloured stones make floors that last for millennia.
3|CR|med|soap|Soap|oliveoil,lime|health|Fat boiled with ash lye, and dirty hands become clean ones.
3|CR/SC|lore|parchment|Parchment|tanning,writing|research|Scraped and stretched skin that lasts far longer than reed.
3|SC/CR|lore|codex|The Codex|parchment|research|Pages bound at one edge: any passage found without unrolling a scroll.
3|SC|lore|libraries|Great Libraries|libraries0,philosophy|research|Every book that can be bought, borrowed or copied, under one roof.
3|SC/SE|law|rhetoric|Rhetoric|philosophy|order|Persuading a crowd becomes a subject you can be taught.
3|SC|math|logic|Formal Logic|philosophy,math|research|Rules for arguing from what is known to what must follow.
3|SC/BU|math|geometry|Geometry|math,geometry0|build|Proofs about lines and circles, and buildings that stand.
3|SC/TR|math|zero|Place Value & Zero|base60,math|trade|A sign for nothing makes every sum shorter.
3|SC|sky|armillary|Armillary Spheres|astronomy,geometry|seaRange|Rings of bronze model the turning heavens.
3|SC|sky|eratosthenes|Measuring the Earth|geometry,sundials|seaRange|Two shadows in two cities, and the world’s girth is known.
3|SC/CR|sky|antikythera|Geared Calculators|armillary,lathes|research|Bronze gears in a box predict eclipses years ahead.
3|SC/FA|machine|screwpump|Archimedes’ Screw|geometry,irrigation|farm|A helix in a tube lifts water as you turn the handle.
3|SC/BU|machine|pulleys|Compound Pulleys|ramps,cordage|build|One person on a rope, and a ship rolls up the beach.
3|BU|machine|treadwheel|Treadwheel Cranes|pulleys,engineering|build|Two people walking inside a wheel lift a column into place.
3|SC/CR|machine|gears|Gears|lathes,watermill|craft|Toothed wheels turn power round a corner.
3|SC/CR|machine|herons|Temple Automata|gears|happy|Doors that open by themselves and statues that pour wine.
3|BU/ST|build|arches|True Arches|masonry,geometry|build|Wedge-shaped stones lock each other in place, and the span widens.
3|BU|build|domes|Domes|arches,concrete|happy|A hemisphere of concrete wider than any beam could reach.
3|BU/CL|build|rooftiles|Roof Tiles|pitkilns,mudbrick|fire|Fired clay roofs that don’t catch a spark.
3|BU|urban|insulae|Insulae|concrete,gridstreets|urban|Five storeys of cheap rooms stacked over a row of shops.
3|BU/SE|urban|forum|Forums|gridstreets,courts0|order|A paved square where the law, the market and the gossip all meet.
3|BU|urban|amphitheatre|Amphitheatres|arches|happy|Tens of thousands watch the games together.
3|SE|lore|theatre|Theatre|epics|happy|Masks, a chorus and a hillside of seats.
3|BU/SA|sea|lighthouse|Lighthouses|masonry,lighthouses0|seaRange|A stone tower with a fire on top, seen a day’s sail out.
3|BU/FA|farm|qanats|Qanats|engineering,wells|drought|Tunnels carry water from the hills to the desert by gravity alone.
3|BU/SE|urban|sewers0|Vaulted Sewers|terracotta,arches|health|A great vaulted drain carries the city’s filth to the river.
3|BU|law|milestones|Milestones|paved|admin|A stone every thousand paces says how far it is to the capital.
3|SE/SC|law|republic|Republics|citizenship,courts0|order|Magistrates elected for a year, and then held to account.
3|SE|law|democracy0|Assemblies|citizenship|happy|Every citizen gets a voice, a vote and a pebble.
3|SE/SC|law|civillaw|Civil Law|law,contracts|order|Written rules for property, inheritance and debt.
3|SE/SO|law|provinces|Provinces & Governors|kingship,couriers|admin|A conquered land run by a governor who answers to the throne.
3|SE/SC|law|examinations|Civil Service Exams|bureaucracy0,philosophy|admin|Officials chosen by merit on paper, not by birth.
3|SE|med|hippocratic|The Physician’s Oath|medicine|health|First, do no harm: medicine gets a conscience.
3|SE/SC|med|clinical|Case Histories|medicine,medpapyri|health|Physicians note the course of each illness, day by day.
3|SE|med|acupuncture|Acupuncture|medicine|-|Fine needles along the body’s channels, a craft passed from teacher to student.
3|SE/SO|med|fieldhospital|Army Surgeons|legions,surgery|recover|Every legion marches with men trained to bind wounds.
3|FA|farm|mouldboard|Mouldboard Ploughs|ironplough|farm|A curved board turns the sod right over and buries the weeds.
3|FA/CR|farm|winnowfan|Winnowing Fans|winnowing,gears|farm|A cranked fan blows the chaff away without waiting for the wind.
3|HE/CR|farm|horseshoes|Horseshoes|iron,horsebreeding|speed|Iron nailed to the hoof, and horses go on stony roads without going lame.
3|HE/CR|farm|saddles|Saddles|riding,leatherwork|speed|A wooden tree under leather spreads the rider’s weight.
3|FI|sea|garum|Fish Sauce|fishsalting|spoil|Fish fermented in salt makes a sauce that keeps for years and flavours everything.
3|FI|sea|oysterbeds|Oyster Beds|fishponds,shellfish|fish|Oysters raised on poles in the lagoon.|coast
3|SA/TR|sea|merchgalley|Round Ships|keels,ships|cargo|Broad, deep merchant hulls built to carry a thousand jars.
3|SA/CL|trade|amphorae|Amphorae|potterswheel,ships|cargo|Pointed jars that stack in the hold and carry oil and wine across seas.
3|SA/SC|sea|periplus|Coastal Pilots|mapmaking,ships|seaRange|Written sailing directions: harbours, headlands and the days between.
3|SA|sea|monsoon|Monsoon Sailing|periplus,astronomy|seaRange|Out on one season’s wind, home on the next.
3|TR|trade|silkroad|The Silk Road|caravans,silk|trade|A chain of oases and middlemen links one end of the world to the other.
3|TR|trade|moneychanger|Money Changers|coinage,abacus|trade|A table in the market where any coin becomes any other.
3|TR/SA|trade|maritimeloans|Sea Loans|interest,ships|cargo|Money lent on a voyage, repaid only if the ship comes home.
3|TR/BU|trade|warehouses|Warehouses|storehouses,harbours|store|Rows of locked stores by the quay, rented by the season.
3|SO/CR|war!|gladius|Short Swords|iron,legions|attack|A short stabbing blade made for fighting in a packed line.
3|SO/CR|war!|scutum|Tower Shields|legions|defend|A curved shield tall enough to hide behind, and to lock into a wall.
3|SO/BU|war!|militarycamps|Fortified Camps|legions,fortification|defend|Every night a ditch, a bank and a palisade before anyone sleeps.
3|SO/HE|war!|warelephants|War Elephants|cavalry|attack|A charging tower of flesh that horses refuse to face.
3|SO/CR|war!|ballista|Bolt Throwers|catapult|attack|A giant crossbow on a stand that pins a man to a tree.
3|SO/SC|war!|strategy|Military Treatises|legions,writing|attack|The art of war written down, and read by the next general.
# Middle Ages
4|SC|math|algebra|Algebra|zero,logic|research|Unknowns given names, and whole families of problems solved at once.
4|SC/TR|math|arabicnum|Hindu-Arabic Numerals|zero,paper|trade|Ten signs and a zero, and merchants give up the counting board.
4|SC|math|trigonometry|Trigonometry|geometry,armillary|seaRange|Tables of sines measure what can’t be reached.
4|SC/SA|sky|astrolabe|Astrolabes|armillary,trigonometry|seaRange|A brass disc that tells the hour, the latitude and the height of a tower.
4|SC|sky|observatory|Observatories|astrolabe|research|Great walls and quadrants measure every star, year after year.
4|SC|lore|madrasa|Colleges|libraries,theology|research|Endowed houses of study, with lodging for poor scholars.
4|SC|lore|translation|Houses of Translation|libraries,paper|research|Books from every old tongue poured into one language.
4|SC|lore|scholastic|Scholasticism|university,logic|research|Every question set out, argued both ways and resolved.
4|SC/CR|lore|eyeglasses|Eyeglasses|optics,glassblowing|research|Two lenses on the nose, and old scholars read for another twenty years.
4|CR/SC|lore|woodblock|Woodblock Printing|paper,seals|spread|A whole page carved backwards in a board, and a thousand copies of a prayer.
4|CR/SC|lore|movabletype|Movable Type|woodblock|spread|Single characters set in a frame, printed, and used again.
4|CR|craft|papermill|Paper Mills|paper,watermill|research|Hammers driven by the river beat rags into pulp all day.
4|CR/HE|craft|spinningwheel|Spinning Wheels|spindle,gears|craft|A wheel turned by hand spins thread three times as fast.
4|CR|craft|horizloom|Treadle Looms|loom|craft|Foot pedals lift the threads, and the weaver’s hands are free for the shuttle.
4|CR|craft|fulling|Fulling Mills|watermill,feltmaking|craft|River-driven hammers pound wool cloth thick and tight.
4|CR/TR|craft|drawloom|Draw Looms|horizloom,silk|trade|A child perched on top lifts threads to a pattern: damask and brocade.
4|CL/CR|craft|porcelain|Porcelain|glazes|trade|White clay fired so hot it rings like a bell, and the whole world wants it.
4|CR|craft|stainedglass|Stained Glass|glassblowing,theology|happy|Light falls through saints in red and blue.
4|CR/MI|metal|triphammer|Trip Hammers|watermill,bloomery|craft|A cam on the water wheel lifts a great hammer and drops it all day.
4|CR|metal|castiron|Cast Iron|bloomery,bellows|build|Iron hot enough to pour: pots, ploughshares and temple bells.
4|MI|metal|drainadits|Drainage Adits|firesetting,pulleys|mine|A tunnel driven in from the valley drains the mine above it.
4|MI|metal|windlass|Windlasses|pulleys|mine|A cranked drum hauls the ore buckets up the shaft.
4|MI|trade|saltmines|Salt Mines|saltworks,windlass|spoil|Whole halls of rock salt carved out underground.
4|MI/WO|energy|coalpits|Sea Coal|charcoal,windlass|wood|Black stone that burns, dug from the cliffs when the woods run short.
4|BU/ST|build|gothic|Pointed Arches|arches|build|A pointed arch pushes down, not out, and the walls can be glass.
4|BU|build|buttresses|Flying Buttresses|gothic|happy|Stone props outside the walls let a cathedral reach for the sky.
4|BU/SE|build|cathedrals|Cathedrals|buttresses,stainedglass|happy|Three generations of masons build one church.
4|WO/BU|build|timberframe|Timber Framing|nails,carpentry|build|Oak frames pegged together and filled with brick or daub.
4|BU|warm|chimneys|Chimneys|rooftiles,masonry|cold|Smoke goes up a flue, and every room can have its own fire.
4|BU/SE|law|townhall|Town Halls|forum,guilds|order|The council meets under its own roof, with the charter in a chest.
4|SE/TR|law|charters|Town Charters|guilds,feudalism|order|A lord’s seal frees a town to run its own markets and courts.
4|SE|urban|almshouses|Almshouses|poorrelief|happy|A row of cottages for the old, paid for by a guild.
4|BU|build|bridges2|Stone Bridges|arches,bridges|cargo|Arch after arch across the wide river, and a toll at the middle.
4|BU|urban|fountains|Public Fountains|aqueduct|health|Water piped to the square for anyone with a bucket.
4|FA|farm|heavyplough|Heavy Wheeled Ploughs|mouldboard,horsecollar|farm|Eight oxen and a wheeled plough open up the wet northern clays.
4|FA/BU|farm|polders|Polders|dikes,windmill|farm|Land pumped out of the sea and kept dry by windmills.|coast
4|FA/HE|farm|harrows|Harrows|horsecollar|farm|A frame of teeth dragged by a horse breaks the clods behind the plough.
4|FA/HE|farm|scythes|Scythes|iron,fodder|herd|A long blade and a long swing, and the hay comes in fast.
4|GA/FA|farm|chinampas|Floating Gardens|dikes,kitchengarden|farm|Rafts of mud and reeds in the lake, rich enough for seven harvests a year.|water
4|FA/TR|farm|sugarcane|Sugar Refining|irrigation,pitkilns|trade|Cane juice boiled and crystallised: a sweetness that travels.
4|GA|farm|tea|Tea Gardens|kitchengarden,porcelain|happy|Leaves on a hillside, picked and dried, and a cup that keeps the scholar awake.
4|HE/TR|trade|wooltrade|The Wool Trade|woolsheep,chartered|trade|Fleeces shipped by the bale make whole kingdoms rich.
4|FA/SC|farm|monasteries|Monasteries|theology,granary|farm|Monks who pray, copy books and farm better than anyone.
4|FI|sea|herring|Herring Fisheries|seines,fishsalting|fish|Fleets follow the shoals, and barrels of herring feed half a continent.|coast
4|FI|sea|stockfish|Stockfish|fishdrying|famine|Cod dried on racks in the cold wind keeps for years.
4|FI/SA|sea|whaling0|Shore Whaling|harpoons,plankboats|fish|Boats row out from the beach whenever a spout is seen.|coast
4|SA/SC|sea|portolan|Portolan Charts|mapmaking,compass|seaRange|Coasts drawn true and criss-crossed with compass lines.
4|SA/TR|sea|cogs|Cogs|keels,sternrudder|cargo|Tall, flat-bottomed and roomy: the carts of the northern seas.
4|SA/TR|sea|junks|Junks|sternrudder,keels|cargo|Battened sails and a hold the size of a house.
4|SA/CR|sea|bulkheads|Watertight Bulkheads|junks|seaRange|A hull split into sealed rooms doesn’t sink from one hole.
4|TR|trade|billsexchange|Bills of Exchange|banking,contracts|trade|A letter written in one city turns into coin in another.
4|TR|trade|fairs|Trade Fairs|barter,charters|trade|Merchants from every land meet in the same town every year.
4|TR/SA|trade|hanse|Merchant Leagues|fairs,cogs|cargo|Trading towns band together, share warehouses and fight the pirates.
4|TR|trade|commenda|Partnerships|interest,banking|trade|One puts in the money, one makes the voyage, and they share the profit.
4|TR|trade|pawnshops|Pawnshops|interest|trade|Leave your coat, take a loan, and buy it back after harvest.
4|SE/SC|law|commonlaw|Common Law|courts0,feudalism|order|Judges follow judges, and precedent becomes law.
4|SE|law|juries|Juries|commonlaw|order|Twelve neighbours decide the case instead of the ordeal.
4|SE/SO|law|magnacarta|Great Charters|commonlaw,castles|order|The barons make the king put his promises in writing.
4|SE/TR|law|parliaments|Parliaments|magnacarta,townhall|admin|Lords and townsmen summoned to grant the king his taxes.
4|SE/SO|law|heraldry|Heraldry|knights|-|A painted shield says who is under the helmet.
4|SE/TR|law|notaries|Notaries|contracts,paper|trade|Sworn officers who write and witness every deal.
4|SE/SC|law|landsurvey|Great Surveys|census0,feudalism|admin|Every manor, plough and pig written down in one book.
4|SE/SC|med|pharmacopoeia|Pharmacopoeias|apothecary,translation|health|One trusted list of drugs, doses and how to make them.
4|SE|med|leprosaria|Leper Houses|infirmaries|contagion|The sick kept apart outside the walls, and fed by the town.
4|SE/CR|med|barbersurgeons|Barber-Surgeons|surgery,guilds|recover|A guild that shaves beards, pulls teeth and sets bones.
4|CR/SC|med|distillation|Distillation|glassblowing,brewing|health|An alembic parts spirit from water: medicine, perfume and strong drink.
4|SO/HE|war!|lances|Couched Lances|knights|attack|Rider, horse and lance hit as one.
4|SO|war!|pikes|Pike Squares|phalanx,iron|defend|A hedge of long pikes, and the knights’ charge breaks on it.
4|SO/CR|war!|firelances|Fire Lances|gunpowder|attack|A tube of powder on a spear spits flame and shot.
4|SO/CR|war!|bombards|Bombards|firelances,castiron|attack|Huge iron tubes that hurl stone balls at castle walls.
4|CR/SO|war!|brigandine|Coats of Plates|chainmail,leatherwork|defend|Iron plates riveted inside a cloth coat.
4|BU/SO|war!|concentric|Concentric Castles|castles|defend|Wall within wall, so every breach finds another.
4|SO/SE|war!|militaryorders|Military Orders|knights,monasteries|attack|Monks who fight, with castles and banks of their own.
# Renaissance
5|SC/CR|lore|perspective|Linear Perspective|geometry,humanism|happy|A vanishing point, and paintings open like windows.
5|CR/SC|lore|oilpaint|Oil Painting|perspective,oliveoil|happy|Linseed oil and pigment: colour that glows and dries slowly enough to perfect.
5|SC/TR|lore|newspapers|Newspapers|printing,couriers|spread|News of ships, wars and prices printed every week.
5|SE/TR|law|postoffice|Public Post|couriers,printing|admin|Anyone can send a letter for a fixed price.
5|SC|lore|learnedsoc|Learned Societies|science|research|Members meet every week, show their experiments and publish the results.
5|SC|lore|journals|Scientific Journals|learnedsoc|research|Results in print for anyone to check and argue with.
5|SC/GA|med|botanic|Botanic Gardens|herbgarden,science|health|Living collections of plants from every continent, labelled and studied.
5|SC/GA|farm|taxonomy|Naming of Species|botanic|farm|Every plant and beast given two Latin names and a place in the tree.
5|SC/SE|lore|grammar|Grammar Schools|printing,humanism|research|Latin, rhetoric and arithmetic for any boy whose parents can pay.
5|SC|math|logarithms|Logarithms|algebra,printing|research|Multiplication turned into addition with a book of tables.
5|SC/BU|math|sliderule|Slide Rules|logarithms|build|Two sliding scales do a sum to three figures in a second.
5|SC|math|calculus|Calculus|logarithms,science|research|The mathematics of change: orbits, flows and falling bodies.
5|SC/TR|math|probability|Probability|algebra,insurance|trade|The mathematics of dice becomes the mathematics of risk.
5|SC/CR|math|calcmachine|Calculating Machines|gears,logarithms|research|Brass wheels that carry the tens all by themselves.
5|SC/CR|sky|telescope|Telescopes|optics,eyeglasses|seaRange|Two lenses in a tube: moons round other worlds, and ships on the horizon.
5|SC|sky|heliocentric|The Sun at the Centre|telescope,observatory|research|The Earth goes round, and the old certainties go with it.
5|SC|sky|gravity|Universal Gravitation|calculus,heliocentric|research|One law for the falling apple and the orbiting Moon.
5|SC/SA|sky|lunardist|Nautical Almanacs|telescope,astrolabe|seaRange|Tables of the Moon against the stars give a ship its position.
5|CR/SC|machine|pendulum|Pendulum Clocks|clocks,science|craft|A swinging weight keeps time to a few seconds a day.
5|SC/CR|med|thermometer|Thermometers|glassblowing,science|health|A column of liquid gives heat a number.
5|SC|sky|barometer|Barometers|thermometer|seaRange|Mercury in a tube falls before the storm comes.
5|SC/MI|machine|vacuum|Air Pumps|barometer,pumps|research|Pump the air out of a glass globe, and the candle inside dies.
5|SC/CR|craft|chemistry|Chemistry|distillation,science|craft|Alchemy without the gold: elements, weights and reactions.
5|CR|craft|knitting|Knitting Frames|spinningwheel|craft|A frame of hooked needles knits stockings ten times faster than hands.
5|CR/TR|craft|mirrors|Glass Mirrors|glassblowing|trade|Tin and mercury behind clear glass: your own face, sharp and true.
5|CR|machine|clockwork|Spring Clockwork|clocks,quenching|craft|A coiled steel spring makes clocks small enough to carry.
5|CR/WO|craft|cabinetmaking|Cabinetmaking|timberframe,lathes|trade|Veneered, dovetailed and polished: furniture becomes a luxury trade.
5|CR/MI|metal|tinplate|Tinplate|tinmining,triphammer|spoil|Iron sheet dipped in tin, which won’t rust and can be soldered tight.
5|CR/SO|war!|gunsmith|Gunsmiths|musket,guilds|attack|Locks, barrels and stocks made to fit by a master.
5|CR|metal|rollingmill|Rolling Mills|triphammer,castiron|build|Hot iron squeezed between rollers into sheet and bar.
5|CR|metal|slittingmill|Slitting Mills|rollingmill|build|Iron bar sliced into rods for the nail makers by the ton.
5|CR/MI|metal|brass|Brass|crucibles,coinage|trade|Copper and zinc ore cooked together into a bright yellow metal.
5|CR/MI|metal|reverberatory|Reverberatory Furnaces|castiron,coalpits|craft|The flame plays over the metal, so coal can melt it without fouling it.
5|MI/WO|machine|railways0|Wagonways|windlass|mine|Wooden rails and a horse, and ten times the coal hauled out of the pit.
5|MI|metal|mineventilation|Mine Ventilation|deepmine|mine|Furnaces and shafts pull fresh air through the deepest galleries.
5|MI/SO|metal|blastingpowder|Blasting Powder|gunpowder,deepmine|mine|Powder packed in a drilled hole splits the rock face.
5|SE/CR|urban|fireengines|Fire Engines|pumps,firewardens|fire|A hand pump on wheels throws water over the rooftops.
5|SE/BU|urban|streetlamps|Street Lamps|streets,glassblowing|order|Oil lamps hung on every corner, and the night watch has an easier time.
5|BU|urban|squares|Planned Squares|perspective,streets|urban|Terraces round a garden square, built all at once to one design.
5|BU/SE|urban|buildingcodes|Building Codes|firewardens,printing|fire|After the great fire: brick walls, wide streets and no more thatch.
5|BU/SE|urban|watermains|Water Mains|pumps,fountains|urban|Elm pipes under the street bring river water to every house that pays.
5|BU|build|piledriver|Pile Drivers|treadwheel,canals|build|A weight dropped again and again drives oak piles into the mud.
5|FA/HE|farm|watermeadow|Water Meadows|drainage,dikes|herd|Fields flooded in early spring grow grass weeks ahead of the rest.
5|FA|farm|maize|Maize Fields|cropexchange|farm|A grain from across the ocean that yields twice what wheat does on the same ground.
5|GA/TR|farm|coffee|Coffee|cropexchange|happy|Roasted beans, and a drink that keeps the whole city talking.
5|FA|farm|marling|Liming & Marling|lime,manure|deplete|Chalk and clay spread on sour soil sweeten it for a generation.
5|HE|farm|merino|Merino Sheep|woolsheep,breeding|herd|A fleece so fine that exporting the sheep was once a hanging offence.
5|HE/SC|farm|studbooks|Studbooks|horsebreeding,printing|herd|Every foal’s parents written down, and bloodlines bred on purpose.
5|FI/SA|sea|whaling|Deep-Water Whaling|whaling0,navigation|fish|Ships stay out for years and come home full of oil.|coast
5|FI/SA|sea|codfisheries|Ocean Cod Banks|navigation,stockfish|fish|Ships cross the ocean just to fish the shallow banks on the far side.|coast
5|SA/TR|sea|fluyt|Fluyts|cogs,navigation|cargo|A cheap, roomy hull that needs half the crew of anything else.
5|SA/CR|sea|copperhull|Copper Sheathing|frigates,brass|seaRange|Copper on the hull keeps the shipworm out and the speed up.
5|SA|sea|logline|Log & Line|navigation|seaRange|A knotted line and a sandglass tell the ship’s speed.
5|SA/BU|sea|drydocks|Dry Docks|locks|cargo|Gates shut, water pumped out, and a ship’s bottom is mended in a week.
5|SA/SO|sea!|navalacad|Naval Academies|navigation,frigates|attack|Officers learn gunnery, navigation and signals before they see a battle.
5|TR/SA|trade|tradingposts|Trading Posts|navigation,chartered|trade|A fort and a warehouse on a far shore.
5|TR|trade|coffeehouses|Coffee Houses|coffee,newspapers|trade|Merchants, insurers and gossips at the same table.
5|TR/SE|trade|lottery|State Lotteries|publicdebt|admin|A ticket for a fortune; the state keeps the rest.
5|TR/SE|trade|mercantilism|Mercantilism|chartered,absolutism|trade|Sell abroad more than you buy, and keep the gold at home.
5|CR/TR|trade|mintreform|Milled Coinage|coinage,rollingmill|trade|Machine-struck coins with ridged edges that nobody can clip.
5|SE/TR|law|diplomacy|Resident Ambassadors|humanism,couriers|order|Permanent envoys at foreign courts, writing home every week.
5|SC/SE|law|intllaw|Law of Nations|diplomacy,enlighten|order|Rules for war, peace and the sea that every crown is expected to keep.
5|SO/SE|war!|standingarmy|Standing Armies|absolutism,musket|defend|Soldiers kept in barracks in peacetime, paid by the crown.
5|SC/SE|law|billrights|Bills of Rights|constitution|happy|Free speech, and no punishment without trial, written down.
5|SC/SE|law|separation|Separation of Powers|billrights,enlighten|order|Those who make the law, judge it and enforce it are kept apart.
5|SE|med|lyingin|Lying-In Hospitals|hospitals,midwifery|infant|Wards for childbirth, with trained midwives and clean linen.
5|SC|med|circulation|Circulation of the Blood|anatomy|health|The heart is a pump, and the blood goes round.
5|SE/SA|med|scurvy|Citrus Against Scurvy|navigation,clinical|health|A lime a day, and the crew comes home alive.
5|SE/TR|med|quinine|Cinchona Bark|cropexchange,apothecary|health|A bitter bark from the mountains that breaks the fever.
5|SE/CR|med|forceps|Obstetric Forceps|lyingin|infant|Curved steel blades bring a stuck baby out alive.
5|SO|war!|volleyfire|Volley Fire|musket|attack|Rank after rank fires in turn: a wall of lead that never pauses.
5|SO/CR|war!|grenades|Grenades|gunpowder,castiron|attack|A hollow iron ball, a fuse and a strong arm.
5|SO/CR|war!|mortars|Mortars|cannon|attack|Short, fat guns that drop shells over the wall.
5|SO/HE|war!|dragoons|Dragoons|musket,cavalry|attack|Soldiers who ride to the fight and shoot on foot.
5|SO/SC|war!|militarymaps|Military Surveys|trigonometry,starforts|attack|Every hill and ford mapped before the army marches.
5|SO/CR|war!|uniforms|Uniforms|standingarmy|-|Every regiment in one colour, so friend can tell friend in the smoke.
# Industrial Age
6|CR|machine|flyingshuttle|Flying Shuttle|horizloom|craft|A sprung shuttle flies across the loom, and one weaver does the work of two.
6|CR|machine|spinningjenny|Spinning Jenny|spinningwheel,flyingshuttle|craft|One wheel turns eight spindles, then eighty.
6|CR|machine|waterframe|Water Frames|spinningjenny,watermill|craft|Rollers driven by the river spin thread strong enough for the warp.
6|CR|machine|mule|Spinning Mules|waterframe|craft|Fine, strong thread by the mile from a single machine.
6|CR|machine|powerloom|Power Looms|mule,steam|craft|Steam weaves the cloth, and the handloom weavers go hungry.
6|CR/SC|machine|jacquard|Punched-Card Looms|drawloom,powerloom|craft|Cards with holes in them tell the loom its pattern.
6|CR/GA|machine|cottongin|Cotton Gins|cottoncloth,gears|craft|Toothed rollers pull the seeds out of cotton fifty times faster than hands.
6|CR/SC|machine|machinetools|Machine Tools|lathes,steam|craft|Screw-cutting lathes and planers make the parts for every other machine.
6|CR|machine|interchangeable|Interchangeable Parts|machinetools,gunsmith|craft|Every lock fits every musket, and nobody needs a smith to mend one.
6|CR|machine|sewingmachine|Sewing Machines|interchangeable,eyedneedle|craft|A needle with the eye at the point, and a shirt in an hour.
6|CR/SE|machine|typewriter|Typewriters|interchangeable|admin|Clean, fast letters from every office.
6|CR/MI|machine|steamhammer|Steam Hammers|steam,triphammer|build|A hammer that can crack an egg or forge a ship’s shaft.
6|CR/MI|metal|puddling|Puddling Furnaces|reverberatory,blast|build|Stirred molten pig iron becomes wrought iron by the ton.
6|CR/MI|metal|hotblast|Hot Blast Stoves|blast|craft|Preheated air halves the coal a furnace eats.
6|CR/SC|metal|bessemer|Bessemer Converters|hotblast,steel|build|Air blown through molten iron: steel in twenty minutes instead of days.
6|CR|metal|openhearth|Open-Hearth Steel|bessemer|build|Slow, controllable steel from scrap and pig iron.
6|CR/SC|craft|vulcanised|Vulcanised Rubber|chemistry,cropexchange|craft|Rubber cooked with sulphur stays tough in the heat and the cold.
6|CR|urban|matches|Safety Matches|chemistry|fire|A flame on demand that only strikes on the box.
6|SC/CR|lore|photography|Photography|chemistry,telescope|happy|Light writes its own picture on a silvered plate.
6|CR/BU|build|portland|Portland Cement|concrete,steam|build|Burnt clay and chalk ground fine: concrete stronger than the ancients’.
6|CR/BU|build|plateglass|Plate Glass|mirrors,steam|build|Huge flat panes rolled and polished: shop windows and glasshouses.
6|CR/SC|craft|synthdyes|Aniline Dyes|chemistry,gaslight|trade|Mauve from coal tar, and colour gets cheap.
6|SC|lore|periodic|The Periodic Table|chemistry,journals|research|Every element in its row, with gaps left for the ones still unfound.
6|SC|lore|evolution|Evolution by Selection|taxonomy,breeding|research|Life changes slowly, by who lives long enough to breed.
6|SC/MI|metal|geology|Geology|science,deepmine|mine|Rock layers read like pages, and the ore’s place in them predicted.
6|SC/CR|machine|thermodynamics|Thermodynamics|steam,calculus|craft|Heat, work, and why no engine can ever be perfect.
6|SC|elec|electromagnetism|Electromagnetism|science,vacuum|research|A current moves a needle; a moving magnet makes a current.
6|SC/SE|math|statistics|Statistics|probability,census0|admin|Numbers about people, gathered, averaged and argued over.
6|SE/SC|lore|publiclibraries|Public Libraries|schools,newspapers|research|Free books for anyone with a ticket.
6|SC/CR|lore|polytechnic|Technical Schools|schools,machinetools|research|Engineers trained in drawing offices, not apprenticeships.
6|SC/FA|sky|meteorology|Weather Forecasts|barometer,telegraph|farm|Readings wired in from a hundred stations, and tomorrow’s storm is on the map.
6|SC/SE|med|stethoscope|Stethoscopes|circulation,clinical|health|A wooden tube to the chest, and the sound of the sick lung.
6|SE/SC|med|antiseptics|Antiseptic Surgery|anaesthesia,sanitation|recover|Carbolic spray and boiled instruments, and wounds stop rotting.
6|SC|med|celltheory|Cell Theory|microscope|health|Every living thing is built of cells, and every cell comes from another.
6|SC/CR|med|aspirin|Aspirin|chemistry,willowbark|health|The old willow cure, made pure in a factory.
6|SE|med|ambulance|Ambulances|nursing,fieldhospital|recover|Wagons with springs and stretchers bring the wounded in fast.
6|SE|med|redcross|Red Cross|nursing,intllaw|recover|Neutral medics, under a sign both armies are meant to respect.
6|BU/SE|med|sandfilters|Sand Filters|watermains,sanitation|contagion|River water trickled through sand comes out clear and safe.
6|BU/CR|build|ironbridges|Iron Bridges|castiron,bridges2|cargo|Cast iron ribs span a gorge in one leap.
6|BU|build|suspension|Suspension Bridges|ironbridges,steel|cargo|A road hung from chains across a mile of water.
6|BU/MI|build|tunnelling|Tunnelling Shields|piledriver,steam|build|A moving iron shield lets diggers tunnel under a river.
6|BU/CR|urban|lifts|Safety Lifts|steam,steel|urban|A brake catches the car if the rope snaps, and buildings can go higher.
6|BU/SE|urban|parks|Public Parks|urbanhousing,squares|happy|Green land kept open so the factory workers can breathe.
6|TR/BU|urban|buildsoc|Building Societies|urbanhousing,insurance|urban|Workers pool their savings to buy houses one at a time.
6|SE|law|police|Police Forces|townwatch,factory|order|Uniformed constables walking a beat, not soldiers in the street.
6|SE|urban|firebrigades|Fire Brigades|fireengines,steam|fire|Paid crews with steam pumps and horses, on call all night.
6|FA/CR|farm|threshingmachine|Threshing Machines|steam,winnowfan|farm|A steam engine and a drum thresh a whole harvest in a week.
6|FA/CR|farm|steelplough|Steel Ploughs|steel,heavyplough|farm|A polished steel blade scours clean through prairie sod.
6|HE/CR|farm|barbedfence|Barbed-Wire Fencing|steel,fencing|herd|Cheap wire fences in the open range in a single season.
6|SC/FA|farm|superphosphate|Superphosphate|chemistry,guano|deplete|Bones and rock dissolved in acid: the first factory fertiliser.
6|HE/CR|farm|creamsep|Cream Separators|dairy,machinetools|herd|A spinning bowl splits cream from milk in seconds.
6|HE/TR|farm|cattledrive|Cattle Drives|cattle,railway|herd|Riders walk the herd a thousand miles to the railhead.
6|FI/SA|sea|steamtrawl|Steam Trawlers|steamship,seines|fish|A steam winch hauls a net no sail could ever drag.|coast
6|FI/CR|sea|fishcanneries|Fish Canneries|tinplate,refrigeration|spoil|Sardines and salmon sealed in tins by the million.
6|SA/TR|sea|paddle|Paddle Steamers|steam,barges|cargo|Wheels churn the river, and boats go upstream as easily as down.|river
6|SA/CR|sea|ironhull|Iron Hulls|steamship,puddling|cargo|Iron doesn’t rot, and it can be built longer than any oak.
6|SA/SC|sea|lighthouselens|Lighthouse Lenses|lighthouse,optics,gaslight|seaRange|Rings of glass prisms throw a beam twenty miles out to sea.
6|SA/SE|sea|lifeboats|Lifeboat Service|insurance,steamship|recover|Volunteers row out into any storm to save a wreck’s crew.
6|TR|trade|limitedliability|Limited Liability|corporations|trade|You can lose only what you put in, so everyone puts something in.
6|TR/BU|trade|departmentstores|Department Stores|plateglass,railway|trade|Fixed prices, every good under one roof, and window shopping.
6|TR/SC|trade|goldstandard|The Gold Standard|centralbank|trade|Every note can be swapped for a fixed weight of gold.
6|TR/SE|trade|savingsbanks|Savings Banks|banking,factory|reserve|A penny a week, kept safe and earning interest.
6|TR/CR|trade|cooperatives|Co-operatives|unions|happy|The workers own the shop and share its profits.
6|SC/TR|lore|patents|Patent Law|constitution,machinetools|research|Publish your invention, and you own it for twenty years.
6|SE/TR|lore|postagestamps|Postage Stamps|postoffice,railway|spread|A penny stamp sends a letter anywhere in the country.
6|SE/SC|law|civilservice|Civil Service|examinations,statistics|admin|Permanent officials who stay when the government changes.
6|SE|law|secretballot|Secret Ballot|suffrage|order|A sealed box, and nobody can buy or bully your vote.
6|SE/CR|law|childlabour|Factory Acts|unions,factory|happy|Children out of the mills and into school.
6|SE/SC|law|abolition|Abolition|enlighten,billrights|happy|Owning people is outlawed.
6|SO/SE|war!|massconscription|Mass Conscription|nationalism,railway|attack|Every young man drilled, and whole nations march to war.
6|SO/CR|war!|breechloader|Breech-Loading Rifles|rifle,interchangeable|attack|Load lying down, and fire five times a minute.
6|SO/CR|war!|gatling|Gatling Guns|breechloader|attack|A crank turns six barrels, and a handful of men hold a valley.
6|SO/SC|war!|smokeless|Smokeless Powder|chemistry,rifle|attack|Gun cotton fires further and leaves no cloud to give you away.
6|SO/TR|war!|militaryrail|Military Railways|railway,standingarmy|attack|Whole armies moved to the frontier in a few days.
6|SO/SA|war!|navalmines|Naval Mines|dynamite,ironclad|defend|A floating charge closes a harbour without a single ship.
6|SO/SA|war!|torpedoes|Torpedoes|navalmines,screw|attack|A mine that drives itself under the water at its target.
6|SO/SC|war!|generalstaff|General Staffs|militarymaps,telegraph|attack|Officers whose whole job is planning the next war.
# Modern Age
7|SC/CR|elec|lightbulb|Light Bulbs|electric,vacuum|fire|A glowing filament in a glass globe, and no more candles.
7|SC/CR|elec|dynamo|Dynamos|electromagnetism,steam|craft|Spin a coil inside a magnet, and electricity flows by the megawatt.
7|SC|elec|accurrent|Alternating Current|dynamo,electric|urban|Transformers step the voltage up for the long wire and down for the house.
7|BU/SC|energy|hydroelectric|Hydroelectric Dams|accurrent,portland|urban|A wall of concrete across the valley, and the river lights a city.|river
7|CR/SC|elec|electricmotor|Electric Motors|dynamo|craft|A small, clean motor at every machine instead of one shaft for the whole factory.
7|SC/SE|elec|phonograph|Phonographs|telephone|happy|A needle on a wax cylinder plays a voice back.
7|SE/CR|elec|cinema|Cinema|photography,lightbulb|happy|Pictures that move, in the dark, for a few pennies.
7|SC/CR|elec|vacuumtube|Thermionic Valves|lightbulb,electromagnetism|research|A glowing valve that amplifies the faintest signal.
7|SC/SO|elec!|radar|Radar|vacuumtube,radio|defend|Radio echoes find aircraft long before anyone hears them.
7|CR/SE|elec|appliances|Household Appliances|electricmotor,accurrent|happy|Washing machines and vacuum cleaners give back whole days of the week.
7|SC|lore|relativity|Relativity|electromagnetism,gravity|research|Space and time bend, and mass is frozen energy.
7|SC|lore|quantummech|Quantum Mechanics|relativity,periodic|research|The very small doesn’t behave like anything else.
7|SC/FA|farm|heredity|Heredity|evolution,celltheory|farm|Pea plants reveal that traits come in units, passed down by rule.
7|SC|med|dna|The Double Helix|heredity,xrays|health|Two strands, four letters, and the secret of how life copies itself.
7|SC/SE|med|psychology|Psychology|science,statistics|happy|The mind becomes something to measure and to treat.
7|SC/TR|math|nataccounts|National Accounts|statistics,centralbank|admin|A country’s whole output added up into one number.
7|SC/SA|math|operations|Operations Research|statistics,radar|cargo|Mathematicians tell the convoys how big to be, and the losses fall.
7|SC/SO|math!|cryptography|Codebreaking|vacuumtube,calcmachine|defend|Rotor machines scramble messages, and other machines unscramble them.
7|SC/SE|math|punchcards|Punched-Card Tabulators|jacquard,statistics|admin|A census counted by machine in a year instead of ten.
7|CR/MI|metal|aluminium|Aluminium|electric,chemistry|build|Electricity pulls a light, rustless metal out of clay.
7|CR/SC|metal|stainless|Stainless Steel|openhearth,chemistry|health|Chromium in the melt, and steel that never rusts.
7|CR/SC|craft|nylon|Nylon|plastics|craft|A fibre spun from coal tar, stronger than silk.
7|BU/CR|build|reinforced|Reinforced Concrete|portland,steel|build|Steel rods cast inside concrete, and it can carry anything.
7|CR|metal|welding|Arc Welding|electric,steel|build|Steel joined with an electric spark, and no rivets needed.
7|CR|machine|bearings|Ball Bearings|machinetools,openhearth|craft|Hardened steel balls take the friction out of every wheel.
7|CR|machine|pneumatic|Pneumatic Tyres|vulcanised,bicycle|speed|A cushion of air in rubber, and roads stop shaking you apart.
7|CR/SC|energy|refinery|Oil Refining|combustion,distillation|craft|Crude oil boiled and split into petrol, diesel and tar.
7|MI|energy|oildrilling|Rotary Drilling|combustion,geology|mine|A spinning bit drives a well a mile down.
7|MI/SC|metal|flotation|Froth Flotation|chemistry,geology|mine|Bubbles carry the ore up and leave the rock behind.
7|MI|metal|openpit|Open-Pit Mines|dynamite,combustion|mine|Strip off the hill, and dig out the whole mountain.
7|BU/SC|energy|powergrid|National Grid|accurrent|urban|Pylons march across the country, and every town shares one supply.
7|BU/CR|urban|prefab|Prefabricated Housing|massprod,reinforced|urban|Houses built in a factory and bolted together on site.
7|CR/BU|urban|airconditioning|Air Conditioning|electricmotor,refrigeration|health|Cool, dry air indoors, and hot cities fill up.
7|BU/CR|warm|centralheating|Central Heating|steam,watermains|cold|One boiler, radiators in every room, and winter stops mattering indoors.
7|SE/BU|urban|zoning|Zoning Laws|buildingcodes,skyscrapers|health|Factories here, houses there, and the smoke kept downwind.
7|BU|urban|suburbs|Suburbs|trams,cars|urban|Little houses with gardens, an hour’s ride from work.
7|SE/BU|urban|traffic|Traffic Lights|cars,lightbulb|speed|Red, amber, green, and junctions stop being a free-for-all.
7|BU/GA|urban|newtowns|Garden Cities|parks,zoning|happy|Planned towns ringed with green belts and allotments.
7|FA/CR|farm|combine|Combine Harvesters|tractor,threshingmachine|farm|One machine reaps, threshes and cleans as it drives.
7|HE/SC|farm|artificialinsem|Artificial Insemination|heredity,veterinary|herd|One prize bull sires ten thousand calves.
7|FA|farm|cropdusting|Crop Dusting|pesticides,flight|farm|A biplane sprays a whole county in a day.
7|FA/SC|farm|soilsurvey|Soil Conservation|marling,statistics|deplete|Contour ploughing and windbreaks after the dust storms.
7|FA/CR|farm|frozenfood|Frozen Food|coldchain|spoil|Quick-frozen peas taste fresh in midwinter.
7|HE|farm|broilers|Broiler Sheds|poultry,electric|herd|Chickens raised under lights by the thousand, ready in weeks.
7|FI/SC|sea|fishfinder|Echo Sounders|sonar,deeptrawl|fish|Echoes show the shoal under the boat.|coast
7|FI/SA|sea|factoryships|Factory Ships|deeptrawl,frozenfood|fish|Catch, gut and freeze at sea, and stay out for months.|coast
7|SA/CR|machine|diesel|Diesel Engines|combustion,thermodynamics|cargo|Squeeze the air hot enough and the fuel lights itself: cheaper, tougher engines.
7|SA/SC|sea|gyrocompass|Gyrocompasses|electricmotor,compass|seaRange|A spinning wheel that points true north through any steel hull.
7|SA/SC|sea|wireless|Ship’s Wireless|radio,steamship|recover|A sinking ship can call for help across a hundred miles of sea.
7|TR|trade|advertising|Advertising|newspapers,radio|trade|Billboards, jingles and a want you didn’t know you had.
7|TR|trade|chainstores|Chain Stores|departmentstores,lorries|trade|The same shop, at the same prices, in every town.
7|TR/SE|law|pensions|Pensions|savingsbanks,insurance|happy|Pay in while you work, and live on it when you can’t.
7|SE/TR|law|antitrust|Competition Law|corporations,civilservice|trade|Monopolies broken up, and prices fall.
7|SC/SE|law|planning|Economic Planning|nataccounts|reserve|Governments spend in the slump and save in the boom, or try to.
7|SE/CR|law|eighthour|The Eight-Hour Day|unions,childlabour|happy|Eight hours’ work, eight hours’ rest, eight hours for what we will.
7|SE|law|socialinsurance|Social Insurance|welfare,statistics|health|Sickness and unemployment insured by law.
7|SE|law|passports|Passports|civilservice,photography|admin|A booklet with your face in it, checked at every border.
7|SE/SC|law|humanrights|Declaration of Human Rights|worldassembly,billrights|happy|Rights every person has, wherever they were born.
7|SC/SE|med|insulin|Insulin|antiseptics,chemistry|health|A hormone from cattle keeps diabetics alive for decades.
7|SC/CR|med|penicillinplants|Deep-Tank Fermentation|antibiotics|plague|Mould grown in vast steel tanks, and penicillin for every soldier.
7|SC/SE|med|poliovax|Polio Vaccine|vaccines,celltheory|infant|A few drops on a sugar lump end the summer fear of paralysis.
7|SC/SE|med|ecg|Electrocardiographs|electric,stethoscope|health|The heart’s electricity drawn as a line.
7|SE/BU|med|chlorination|Chlorinated Water|sandfilters,chemistry|contagion|A dose of chlorine in the reservoir, and typhoid ends.
7|CR/SO|war!|gasmasks|Gas Masks|chemistry,trenches|defend|Charcoal filters and rubber faces against the poison clouds.
7|SO/CR|war!|fighters|Fighter Aircraft|flight,machinegun|attack|Guns timed to fire between the propeller blades.
7|SO|war!|paratroopers|Paratroopers|flight,nylon|attack|Soldiers drop out of the sky behind the lines.
7|SO|war!|blitzkrieg|Combined Arms|tanks,radio|attack|Tanks, aircraft and infantry talking by radio and moving together.
7|SO/CR|war!|antiair|Anti-Aircraft Guns|artillery,radar|defend|Flak bursts in the sky over every city.
7|SO/BU|war!|bunkers|Concrete Bunkers|reinforced,trenches|defend|Metres of reinforced concrete under a hill.
7|SO/CR|war!|bazooka|Shoulder Rockets|tanks,chemistry|attack|One soldier with a tube can now kill a tank.
# Space Age
8|SC/CR|elec|transistorradio|Transistor Radios|transistors,radio|spread|A radio in your pocket that runs for weeks on one battery.
8|SC/CR|elec|integrated|Integrated Circuits|transistors|research|A whole circuit printed on one chip.
8|SC/CR|elec|microprocessor|Microprocessors|integrated,computers|research|A computer’s brain on a single sliver of silicon.
8|SC/TR|elec|personalpc|Personal Computers|microprocessor|research|A computer on every desk and in every home.
8|SC/CR|elec|lasers|Lasers|quantummech|craft|A beam of light so pure it cuts steel and reads discs.
8|SC/CR|elec|fibreoptics|Fibre Optics|lasers,plateglass|spread|Light down a hair of glass carries a million phone calls.
8|SC/CR|elec|led|LEDs|transistors|urban|Light from a chip that sips power and lasts for decades.
8|SC/CR|energy|solarcells|Solar Cells|transistors,quantummech|urban|Sunlight turned straight into current by a slab of silicon.
8|CR/BU|energy|windturbines|Wind Turbines|windmill,electricmotor|urban|Three blades on a tower, turning in rows along the ridge.
8|SC/SE|elec|satellitetv|Satellite Television|satellites,television|happy|A dish on the roof, and five hundred channels.
8|SC|math|software|Programming Languages|computers|research|Instructions written in words instead of switches.
8|SC/SE|math|databases|Databases|software,punchcards|admin|Every record in one place, searchable in a second.
8|TR/SC|math|barcodes|Barcodes|lasers,databases|trade|Stripes on every packet, read by a beam at the till.
8|SC|math|arpanet|Packet Networks|software,telephone|spread|Messages chopped into pieces that find their own way home.
8|SC/SE|math|email|Email|arpanet|admin|A letter that arrives before you finish typing the next.
8|SC|math|worldwideweb|The World Wide Web|internet,personalpc|spread|Pages linked to pages, and anyone can publish to the world.
8|SC|math|searchengines|Search Engines|worldwideweb,databases|research|Ask a box anything, and it finds the page.
8|SC/TR|math|encryption|Public-Key Encryption|software,cryptography|trade|Anyone can lock a message that only you can open.
8|SC/CR|math|cad|Computer-Aided Design|personalpc|build|Drawing boards give way to screens, and every part is drawn to the micron.
8|SC/FA|sky|weathersats|Weather Satellites|satellites,meteorology|farm|Hurricanes tracked from orbit days before they land.
8|SC|sky|probes|Space Probes|rockets,integrated|research|Robots photograph every planet and send the pictures home.
8|SC|sky|spacetelescope|Space Telescopes|probes,telescope|research|Above the air, the universe is suddenly sharp.
8|SC/TR|sky|commsats|Communication Satellites|satellites|spread|A relay in the sky, and a phone call crosses the ocean live.
8|SC/SE|med|ultrasound|Ultrasound|sonar,ecg|infant|Sound waves show the baby before it is born.
8|SC/SE|med|ctscan|CT Scanners|xrays,personalpc|health|X-rays from every angle, assembled by computer into slices of the body.
8|SC/SE|med|mri|MRI Scanners|ctscan|health|Magnets and radio waves map the soft tissue without harm.
8|SC/SE|med|pill|The Contraceptive Pill|pharma|happy|A daily pill, and families are planned.
8|SC/SE|med|chemotherapy|Chemotherapy|pharma|health|Poisons dosed carefully enough to kill the tumour first.
8|SE/SC|med|oralrehydration|Oral Rehydration|nutrition,publichealth|infant|Salt, sugar and clean water save millions of children from diarrhoea.
8|SE/SC|med|smallpoxend|Smallpox Eradication|publichealth,vaccines|contagion|Ring vaccination chases the last case into history.
8|SC/CR|med|pacemakers|Pacemakers|transistors,ecg|health|A ticking box under the skin keeps the heart in step.
8|SE/CR|med|jointrep|Joint Replacements|plastics,stainless|recover|A steel ball and a plastic socket, and the grandparents walk again.
8|CR/SC|machine|nc|Numerical Control|machinetools,computers|craft|Machine tools follow instructions on tape, and every part is identical.
8|CR/SC|craft|composites|Carbon Fibre|plastics,aluminium|build|Threads of carbon set in resin: lighter than aluminium, stiffer than steel.
8|CR/MI|metal|titanium|Titanium|aluminium|build|A metal as strong as steel and half the weight, for jets and hip joints.
8|CR|elec|microwave|Microwave Ovens|radar,appliances|happy|A radar valve in a box heats dinner in two minutes.
8|CR|craft|floatglass|Float Glass|plateglass|build|Molten glass poured onto molten tin cools perfectly flat.
8|MI/SA|energy|offshore|Offshore Oil Rigs|oildrilling,welding|mine|Steel islands drilling in the open sea.
8|SC/BU|energy|nuclearplants|Nuclear Power Stations|nuclear|urban|Reactors on the coast, humming day and night.
8|MI/SC|metal|rareearths|Rare-Earth Refining|flotation,integrated|craft|Obscure metals with long names turn out to be in every magnet and screen.
8|BU/CR|urban|curtainwall|Curtain-Wall Towers|skyscrapers,floatglass|urban|Glass skins hung on steel frames, whole cities of mirror.
8|BU/MI|build|tunnelboring|Tunnel Boring Machines|tunnelling,electricmotor|build|A rotating head chews through rock and lines the tunnel as it goes.
8|BU/SE|urban|pedestrian|Pedestrian Streets|highways,zoning|happy|Town centres given back to people on foot.
8|BU/SC|build|seismic|Earthquake Engineering|reinforced,computers|build|Buildings on rubber bearings sway, and stand.
8|GA/SC|farm|tissueculture|Tissue Culture|dna,hybridseed|farm|A thousand identical plants from a single leaf.
8|FA/CR|farm|centrepivot|Centre-Pivot Irrigation|electricmotor,irrigation|drought|A sprinkler arm a quarter-mile long walks in a circle, and the desert turns green.
8|FA/SC|farm|weedkillers|Selective Weedkillers|pesticides|farm|A spray that kills the weeds and leaves the wheat.
8|HE/FA|farm|feedlots|Feedlots|broilers,combine|herd|Cattle fattened on grain in vast yards.
8|FI/SE|sea|fishquotas|Fishing Quotas|fishfinder,worldassembly|fish|Catches capped by law before the last shoal is gone.
8|SA/CR|sea|hovercraft|Hovercraft|diesel,aluminium|speed|A cushion of air carries it over sea, sand and ice alike.
8|SA/TR|sea|supertankers|Supertankers|tankers,welding|cargo|Ships a quarter of a mile long, carrying a sea of oil.
8|SA/TR|sea|roro|Roll-On Ferries|containers,lorries|cargo|Lorries drive straight on at one port and off at the next.
8|TR/SC|trade|atms|Cash Machines|databases,creditcards|trade|Money from a hole in the wall, day or night.
8|TR|trade|franchise|Franchises|chainstores|trade|The same burger under the same sign, in ten thousand towns.
8|TR/SA|trade|freezones|Free-Trade Zones|containers,multinationals|trade|Ports where goods come and go without duty.
8|TR/SC|trade|electronictrading|Electronic Trading|databases,stockmarket|trade|Shares change hands by computer in a fraction of a second.
8|SE/SO|law|unpeacekeeping|Peacekeepers|worldassembly,helicopters|order|Blue helmets stand between the two sides.
8|SE|law|civilrights|Civil Rights|humanrights,television|happy|Marches, courts and cameras end the laws that divided people.
8|SE/SC|law|environmental|Environmental Protection|soilsurvey,worldassembly|health|Clean-air laws, and the rivers come back to life.
8|SO/SC|war!|deterrence|Nuclear Deterrence|nuclear,missile|defend|Nobody can win, so nobody starts.
8|SO/CR|war!|stealth|Stealth Aircraft|jetfighters,composites|attack|Angled black panels slip past the radar.
8|SO/SC|war!|nightvision|Night Vision|transistors|attack|Green ghosts in the dark, and the night belongs to whoever has the goggles.
8|SO/SC|war!|smartbombs|Laser-Guided Bombs|lasers,missile|attack|A spot of light on the target, and the bomb follows it down.
8|SO/SC|war!|satrecon|Spy Satellites|satellites|defend|A camera in orbit reads the number plates at a parade.
8|CR/SO|war!|reactive|Reactive Armour|tanks,composites|defend|Bricks of explosive on a tank blow the incoming shell apart.
# Information Age
9|SC/TR|elec|smartphones|Smartphones|mobilephones,worldwideweb|spread|The whole internet in a pocket, with a camera attached.
9|SC|math|cloud|Cloud Computing|worldwideweb,databases|research|Nobody owns a server any more; computing comes out of the wall like water.
9|SC|math|machinelearning|Machine Learning|cloud,thinkingmachines|research|Programs that learn from examples instead of rules.
9|SC|math|opensource|Open-Source Software|software,worldwideweb|research|Code anyone can read, fix and share.
9|TR/SC|trade|blockchain|Distributed Ledgers|encryption,digitalmoney|trade|A record of every payment that nobody can quietly rewrite.
9|SC|lore|wiki|Online Encyclopedias|worldwideweb,encyclopedia|spread|Written by everyone, corrected by everyone, read by everyone.
9|SC/TR|lore|translationsoftware|Machine Translation|machinelearning|trade|Any language, read in your own.
9|SC|med|genomeseq|Genome Sequencing|genetics,integrated|health|A whole human genome read for the price of a dinner.
9|SC|med|crispr|CRISPR Editing|genomeseq|health|A bacterial trick turned into scissors for any gene.
9|SC|med|mrna|mRNA Vaccines|genomeseq,pharma|plague|The body is sent the recipe and makes its own vaccine.
9|SE/SC|med|keyhole|Keyhole Surgery|fibreoptics,transplants|recover|A camera and tools through a slit, and the patient goes home tomorrow.
9|SE/CR|med|robotsurgery|Surgical Robots|keyhole,robotics|recover|Steady steel hands guided from a console.
9|SE/SC|med|telemedicine|Telemedicine|smartphones,publichealth|health|A doctor’s visit through a screen, in the remotest village.
9|CR/SC|energy|solidbattery|Solid-State Batteries|batteries|urban|No liquid to leak or burn, and twice the charge.
9|SC/BU|energy|smartgrid|Smart Grids|powergrid,cloud|urban|Every fridge and car talks to the grid and draws power when it’s cheap.
9|SC/CR|energy|perovskite|Perovskite Solar|solarcells|urban|Cheap crystals painted onto glass harvest the sun.
9|CR/SC|craft|printing3d|3D Printing|cad,lasers|craft|Objects built layer by layer straight from a drawing.
9|SC/CR|craft|graphene|Graphene|composites,nanotech|build|A sheet of carbon one atom thick, stronger than anything.
9|CR/SC|machine|cobots|Collaborative Robots|robotics,machinelearning|craft|Robots that work beside people instead of behind cages.
9|SC/FA|farm|geneedited|Gene-Edited Crops|crispr,biotech|farm|A single letter changed, and the wheat shrugs off blight.
9|FA/SC|farm|agridrones|Farm Drones|drones,precisionag|farm|Little aircraft spot every sick plant and spray only that one.
9|SC/HE|farm|plantmeat|Plant-Based Meat|biotech|herd|Burgers grown from peas that bleed like beef.
9|TR/SC|trade|mobilepay|Mobile Payments|smartphones,digitalmoney|trade|Pay with a tap of the phone, even at a market stall.
9|TR/CR|trade|autowarehouse|Automated Warehouses|ecommerce,cobots|store|Robots shuffle the shelves to the pickers, day and night.
9|SE/SC|law|egov|E-Government|cloud,civilservice|admin|Taxes, licences and votes, all done online.
9|SC/SA|sky|reusable|Reusable Rockets|rockets,composites|cargo|The booster lands itself on its tail, and flies again next week.
9|SA/SC|sea|rotorsails|Rotor Sails|supertankers,windturbines|cargo|Spinning cylinders on deck, and freighters use the wind again.
9|SO/SC|war!|hypersonic|Hypersonic Missiles|missile,composites|attack|Five times the speed of sound, and too fast to stop.
9|SO/SC|war!|missiledefence|Missile Defence|satrecon,missile|defend|Interceptors that hit a bullet with a bullet.
# Fusion Age
10|SC|elec|rtsc|Room-Temperature Superconductors|quantum,graphene|craft|Wires with no resistance at all, in an ordinary room.
10|SC/CR|elec|wirelesspower|Wireless Power|rtsc,smartgrid|urban|Devices charge from the air in any room.
10|SC/BU|energy|compactfusion|Compact Fusion Reactors|fusion,rtsc|urban|A fusion plant the size of a lorry, for every town.
10|BU/SC|energy|gridstorage|Grid-Scale Storage|solidbattery,smartgrid|urban|Whole hillsides of batteries smooth out the wind.
10|SC|math|quantumnet|Quantum Internet|quantum,fibreoptics|spread|Entangled links that nobody can tap.
10|SC/BU|math|digitaltwins|Digital Twins|machinelearning,quantum|build|Every bridge and city simulated live, and mended before it breaks.
10|SC/SE|lore|aitutors|AI Tutors|agi,smartphones|research|Every child has a patient, tireless private teacher.
10|SC/SE|med|organprinting|Printed Organs|printing3d,crispr|health|A new kidney printed from the patient’s own cells.
10|SC/SE|med|genetherapy|Gene Therapy Cures|crispr,nanomed|infant|Inherited diseases edited out before they start.
10|SC/SE|med|neuroprosthetics|Neural Prosthetics|robotsurgery,machinelearning|recover|Artificial limbs moved by thought alone.
10|SC/SE|med|universalvax|Universal Vaccines|mrna,agi|plague|One shot against every strain of flu that ever was.
10|SC/HE|farm|precisionferment|Precision Fermentation|labmeat,geneedited|herd|Milk, eggs and gelatine brewed by microbes in steel tanks.
10|SC/FA|farm|photosynthesis|Improved Photosynthesis|geneedited|farm|Crops rebuilt to waste less sunlight, and the yield jumps by a third.
10|FA/CR|farm|robotfarm|Robot Farmhands|agridrones,cobots|farm|Small machines weed, prune and pick around the clock.
10|BU/SC|build|selfhealing|Self-Healing Concrete|nanotech,reinforced|build|Bacteria in the mix seal every crack as it opens.
10|BU/CR|urban|printedhouses|Printed Houses|printing3d,selfhealing|urban|A gantry prints the walls of a house in a day.
10|TR/SC|trade|autologistics|Autonomous Logistics|autopilot,autowarehouse|cargo|Lorries, ships and warehouses run themselves from end to end.
10|SE/SC|law|ubi|Universal Basic Income|agi,egov|happy|Everyone gets enough to live on, whatever they do.
10|SE/SC|law|liquiddemocracy|Liquid Democracy|egov,blockchain|order|Vote on anything, or hand your vote to someone you trust.
10|SO/SC|war!|lasersdefence|Laser Defences|lasers,compactfusion|defend|Beams that burn drones and shells out of the sky.
10|SO/SC|war!|swarms|Drone Swarms|combatdrones,agi|attack|Thousands of cheap machines fight as one mind.
10|BU/SA|urban|seasteads|Seasteads|offshore,compactfusion|urban|Floating towns moored on the open ocean.|coast
# Orbital Age
11|BU/SC|sky|orbitalyards|Orbital Shipyards|orbital,printing3d|cargo|Hulls too big to launch, built where there is no gravity to fight.
11|MI/SC|sky|lunarmining|Lunar Mining|lunar|mine|Moon dust melted down for oxygen, metal and glass.
11|SC|sky|spaceplanes|Spaceplanes|orbital,hypersonic|speed|Take off from a runway, reach orbit, and land for lunch.
11|CR/SC|sky|zerogfactories|Zero-G Factories|orbitalyards,nanotech|craft|Perfect crystals and fibres that only grow where nothing weighs anything.
11|GA/SC|farm|spaceagri|Orbital Farms|orbital,skyfarms|farm|Wheat grown under unfiltered sunlight in spinning drums.
11|SC/SE|med|spacemedicine|Space Medicine|orbital,longevity|health|Bones and muscles kept strong through years without weight.
11|SC/SE|med|senolytics|Senolytics|longevity,genetherapy|health|Drugs that clear out worn-out cells, and old bodies act younger.
11|SC/CR|craft|synbio|Synthetic Biology|crispr,agi|craft|Microbes written from scratch to brew fuel, drugs and fabric.
11|SC/FA|energy|weathercontrol|Weather Control|climateeng,orbital|drought|Rain made where it is needed, and storms steered out to sea.
11|SC/TR|lore|translationimplants|Universal Translators|neurallink,translationsoftware|trade|Every language understood in your ear, as it is spoken.
11|SC/BU|energy|beamedpower|Beamed Power Stations|orbitalsolar,wirelesspower|urban|Microwave beams from orbit land on fields of antennas.
11|SC/MI|energy|heliumthree|Helium-3 Fusion|lunarmining,compactfusion|urban|Moon dust fuels reactors that leave nothing radioactive behind.
11|TR/SC|trade|orbitalfreight|Orbital Freight|spaceelevator,autologistics|cargo|Cargo pods ride the cable every day, like a goods train to the sky.
11|SE/SC|law|spacelaw|Space Law|orbital,worldassembly|order|Who owns a crater? Treaties settle it before anyone shoots.
11|SO/SC|war!|orbitaldefence|Orbital Defence Platforms|energyweapons|defend|Stations that watch every launch on the planet.
11|BU/SA|urban|oceancities|Ocean-Floor Cities|seasteads,selfhealing|urban|Domes on the continental shelf, lit day and night.
11|SC/MI|sky|asteroidsurvey|Asteroid Surveys|orbital,spacetelescope|mine|Every rock near the planet catalogued for metal, water and danger.
# Interplanetary Age
12|SC|sky|nuclearthermal|Nuclear Thermal Rockets|spaceplanes,nuclearplants|speed|A reactor heats hydrogen, and Mars is three months away.
12|BU/SC|sky|marsdomes|Martian Domes|mars,printedhouses|urban|Glass and red-soil shelters where children grow up under a pink sky.
12|SA/TR|sky|ioncargo|Solar-Sail Freighters|asteroidmine,orbitalfreight|cargo|Mirrors as big as cities tack slowly between the planets, for free.
12|MI/SC|sky|icemining|Comet Ice Mining|asteroidmine|drought|Water by the cubic mile, pulled in from the dark.
12|SC/SA|sky|cyclers|Interplanetary Cyclers|nuclearthermal,spacehabitats|speed|Ships on endless loops between worlds; travellers just hop aboard.
12|GA/SC|farm|marsfarms|Martian Farms|marsdomes,spaceagri|farm|Potatoes in washed red soil under grow-lamps.
12|SC/SE|med|radiationshield|Radiation Resistance|genetherapy,spacemedicine|health|Genes borrowed from the hardiest animals let people live under hard sunlight.
12|SC|math|interplanetnet|Interplanetary Internet|quantumnet,mars|spread|Messages queued across twenty light-minutes and delivered when the planets line up.
12|BU/SC|machine|swarmconstruction|Construction Swarms|zerogfactories,swarms|build|Millions of small machines assemble anything, anywhere.
12|SE/SC|law|solarfederation|Solar Federation|spacelaw,mars|order|One parliament for three worlds.
12|TR/SA|trade|interplanettrade|Interplanetary Trade|ioncargo,mars|trade|Metals sunward, food and goods outward, on a timetable of orbits.
12|SO/SC|war!|kinetic|Kinetic Bombardment|orbitaldefence,asteroidmine|attack|A metal rod dropped from orbit hits like a bomb.
12|BU/SC|urban|oneill|O’Neill Cylinders|spacehabitats,zerogfactories|urban|Miles-long spinning cylinders with fields, rivers and clouds inside.
12|CR/SC|craft|assemblers|Molecular Assemblers|nanotech,synbio|craft|Machines that build anything from atoms, including more of themselves.
12|SC/SE|med|ageless|Ageless Bodies|senolytics,organprinting|health|Ageing treated like any other disease, and mostly cured.
# Stellar Age
13|SC|sky|fusiondrive|Fusion Torch Drives|heliumthree,nuclearthermal|speed|A continuous fusion flame pushes ships across the system in weeks.
13|SC|sky|lightsails|Laser Lightsails|beamedpower,ioncargo|speed|Huge lasers push wafer-thin probes to a fifth of the speed of light.
13|BU/SC|urban|generationships|Generation Ships|oneill,fusiondrive|urban|A village sealed inside a world-ship, for a voyage longer than a life.
13|SC/SE|med|coldsleep|Suspended Animation|ageless,radiationshield|health|Bodies cooled and held still for decades of travel.
13|SC|math|interstellarcomms|Interstellar Messaging|lightsails,interplanetnet|spread|Laser beams carry news between the stars, years late but word for word.
13|SC/BU|energy|stellarengineering|Stellar Engineering|dyson|urban|Stars nudged, mined and tended like gardens.
13|SC|math|matrioshka|Matrioshka Brains|dyson,mindupload|research|Shells of computers around a star, thinking with all its light.
13|SC/SA|sky|starmaps|Galactic Charts|lightsails,spacetelescope|seaRange|Every star within fifty light-years visited by a probe and mapped.
13|SC/GA|farm|seedships|Seed Ships|lightsails,synbio|farm|Frozen seeds and gene libraries sent ahead to make a far world ready.
13|SE/SC|law|starcharter|Stellar Charter|solarfederation,interstellarcomms|order|Laws for colonies that will never be able to ask home for permission.
13|BU/SC|build|orbitalrings|Orbital Rings|spaceelevator,assemblers|cargo|A ring of steel round the whole planet, with lifts down to every city.
13|SO/SC|war!|relativistic|Relativistic Weapons|antimatter,lightsails|attack|A pebble at nearly the speed of light, and nothing can stop it.
13|SC/CR|energy|antimatterfactories|Antimatter Factories|antimatter,stellarengineering|craft|Sunlight turned into fuel a gram at a time.
`;

  const mine = [];
  for (const raw of LIST.split('\n')) {
    const line = raw.trim();
    if (!line || line[0] === '#') continue;
    const f = line.split('|');
    if (f.length < 8 || f.length > 9) throw new Error('bad invention line: ' + line);
    const [eraS, domS, tagS, id, name, reqS, fxKey, desc, condS] = f;
    const [d1, d2] = domS.split('/');
    const mil = tagS.endsWith('!'), tag = mil ? tagS.slice(0, -1) : tagS;
    if (DOM[d1] === undefined || (d2 && DOM[d2] === undefined)) throw new Error('bad invention dom: ' + id);
    if (!TAG_OK.includes(tag)) throw new Error('bad invention tag: ' + id);
    const T = { id, name, era: +eraS, dom: DOM[d1], diff: 0, req: reqS ? reqS.split(',') : [], fx: {}, desc, side: 1, tag, _fx: fxKey === '-' ? null : fxKey };
    if (d2) T.alt = DOM[d2];
    if (mil) T.mil = 1;
    if (condS) { if (!COND[condS]) throw new Error('bad invention cond: ' + id); T.cond = COND[condS][0]; T.condText = COND[condS][1]; }
    mine.push(T);
  }

  // Cost: somewhere in the age's range, nearer the top when it builds on something from the same age.
  const eraOf = {};
  for (const T of TECHS) eraOf[T.id] = T.era;
  for (const T of mine) eraOf[T.id] = T.era;
  for (const T of mine) {
    const same = T.req.some(r => eraOf[r] === T.era);
    const h = hash(T.id), [lo, hi] = DIFF[T.era], s = STEP[T.era];
    const f = same ? 0.35 + 0.65 * h : 0.75 * h;
    T.diff = Math.round((lo + (hi - lo) * f) / s) * s;
  }

  // Effects multiply across everything a town knows, so share out a small total between every invention here that uses each key:
  // all the good ones together are worth +20%, all the 'less of it' ones together ×0.88. Additive ones are kept small each.
  const GOOD = 'farm forage hunt fish herd wood mine build craft trade cargo speed seaRange store research spread defend attack recover famine reserve'.split(' ');
  const LOW = 'health infant plague spoil deplete cold drought contagion fire'.split(' ');
  const ADD = { happy: 0.3, order: 0.3, admin: 3 };
  const count = {};
  for (const T of mine) if (T._fx) count[T._fx] = (count[T._fx] || 0) + 1;
  const r4 = v => Math.round(v * 10000) / 10000;
  for (const T of mine) {
    const k = T._fx; delete T._fx;
    if (!k) continue;
    if (GOOD.includes(k)) T.fx[k] = r4(Math.pow(1.2, 1 / count[k]));
    else if (LOW.includes(k)) T.fx[k] = r4(Math.pow(0.88, 1 / count[k]));
    else if (ADD[k]) T.fx[k] = ADD[k];
    else if (k === 'urban') T.fx[k] = Math.min(40, 10 + T.era * 3);
    else throw new Error('bad invention fx: ' + T.id + ' ' + k);
  }
  for (const T of mine) TECHS.push(T);
})();

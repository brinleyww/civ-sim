'use strict';
// Ten thousand more side inventions, crossed at load from families of real things and the ways each was improved.
// content.js calls genInventions() after every hand-written invention, so these are appended and old saves keep their indexes.
// A family is a cross (items x, variants v) or written-out ladders (l). Each item's steps form a ladder, each step needing the last.
//  x: 'Name[;cond[;anchor[;era]]]'  ('*' in front keeps the capitals in {x}; anchor may be 'a+b'; era is the item's own age when rel:1)
//  v: 'era|Name with {X}|desc with {x}[^another way to say it][|cond]'  (with rel:1 era is an offset from the item's age, 'off>min' to keep it no earlier than min;
//     without rel an item's era skips the variants before it)
//  l: '[anchor][;cond]>era Name[=desc]/era Name/...', described from the frames in s, which use {N} and {n}
//  d: dom[/alt] as in inventions.js, tag ('!' for military), fx: one or two keys, a: the hand-written invention it grows from, c: cond
const GEN_FAMILIES = [
// ---- fields, herds and food ----
{ k: 'grain', d: 'FA/GA', tag: 'farm', fx: 'farm famine', a: 'agriculture',
  x: ['Emmer;;emmer', 'Einkorn', 'Durum Wheat', 'Spelt', 'Bread Wheat', 'Barley;;barley', 'Rye', 'Oats', 'Rice;water;paddies', 'Maize;;maize', 'Sorghum;warm', 'Pearl Millet;warm;millet', 'Foxtail Millet;;millet', 'Teff;warm', 'Buckwheat', 'Quinoa'],
  v: ['1|Landrace {X}|Each valley keeps seed from its best {x}, and grows a kind all its own.^Seed from the best {x} is kept back, so every village’s crop is a little different.',
    '2|Irrigated {X}|Channels bring water to the {x} just as the ear is forming.',
    '2|Selected {X} Seed|Only the fattest heads of {x} are saved for sowing, and the crop fattens year by year.',
    '3|Upland {X}|A tough {x} for the hills that ripens before the autumn frosts.',
    '3|Drought-Hardy {X}|Deep roots and a short season: {x} that comes through the dry years.^A {x} that wilts in a dry spring but does not die.',
    '4|Early {X}|A quick-ripening {x} that leaves time for a second crop.',
    '5|Improved {X}|Farmers’ societies swap seed and the best {x} spreads across the country.',
    '6|Pedigree {X}|Bred from one plant and kept true: {x} that yields the same every year.',
    '7|Hybrid {X}|Two pure lines crossed, and the {x} grows with a vigour neither parent had.',
    '7|Dwarf {X}|Short stiff straw holds up a heavy head of {x} without lodging.',
    '8|Blight-Resistant {X}|A {x} bred to shrug off the rusts and moulds that once took whole harvests.',
    '9|Gene-Edited {X}|One letter changed in the {x} genome, and the crop needs half the water.',
    '10|Perennial {X}|A {x} that comes back every year without sowing, its roots holding the soil.',
    '11|Orbital {X}|A short, fast {x} for station farms, grown under lamps in low gravity.',
    '12|Martian {X}|{X} that grows under domes in thin light and salty soil.'] },
{ k: 'roots', d: 'FA/GA', tag: 'farm', fx: 'farm famine', a: 'legumes',
  x: ['Potatoes;;potatoes', 'Sweet Potatoes;warm;agriculture', 'Cassava;warm;agriculture', 'Yams;warm;agriculture', 'Taro;warm;agriculture', 'Lentils', 'Chickpeas', 'Peas', 'Broad Beans', 'Soybeans', 'Groundnuts;warm', 'Common Beans'],
  v: ['1|Garden {X}|Cuttings and seed of the best {x} are planted close by the house.', '2|Ridge-Grown {X}|{X} on raised ridges drain well and rot less.',
    '3|Rotation {X}|{X} sown after grain put strength back into the tired field.^A year of {x} between two of grain, and the soil recovers.',
    '4|Field {X}|{X} move out of the garden and into whole fields.', '5|Selected {X}|Growers name their best {x} and sell the seed on.',
    '6|Clamp-Stored {X}|{X} heaped under straw and earth keep through the winter.', '7|Hybrid {X}|Crossed lines of {x} that crop far heavier than either parent.',
    '8|Virus-Free {X}|Clean {x} stock raised from tissue culture, free of the diseases saved seed piles up.',
    '9|Gene-Edited {X}|{X} edited to resist the pests that once needed spraying every week.',
    '10|Vertical-Farm {X}|{X} grown in stacked trays under coloured light, close to the city.', '12|Dome-Grown {X}|{X} in Martian soil, washed free of its poisons.'] },
{ k: 'orch', d: 'GA/FA', tag: 'farm', fx: 'farm forage', a: 'orchards',
  x: ['Olive;warm;oliveoil', 'Date Palm;warm;datepalms', 'Fig;warm;figs', 'Vine;;vineyards', 'Apple', 'Pear', 'Plum', 'Cherry', 'Citrus;warm', 'Mango;warm', 'Banana;warm', 'Coconut;warm', 'Cacao;warm', 'Coffee;warm;coffee', 'Tea;;tea', 'Almond;warm', 'Walnut', 'Pomegranate;warm'],
  v: ['1|{X} Groves|The best wild {x} trees are cleared around and tended like kin.', '2|Grafted {X} Stock|A cutting from a good {x} tree bound onto a hardy root: the fruit comes true.',
    '3|{X} Pruning|Cut back hard in winter, the {x} bears more and lives longer.^A knife in the dead season, and the {x} crops twice as well.',
    '4|Terraced {X} Slopes|Stone terraces hold {x} trees on hillsides too steep to plough.', '5|Named {X} Varieties|Nurserymen list their {x} kinds by name, and buyers know what they will get.',
    '6|{X} Nurseries|Young {x} trees raised by the thousand and sold to growers.', '6|{X} Spraying|Copper and lime washed over the {x} keeps the moulds off.',
    '7|Dwarfing {X} Rootstock|A small {x} tree, picked from the ground, cropping in its third year.', '8|High-Density {X}|{X} trees planted in hedges and trained on wires.',
    '9|Gene-Edited {X}|A {x} edited against the blight that once killed whole regions’ trees.', '10|{X} Picking Robots|Soft hands and good eyes pick the {x} crop at night.'] },
{ k: 'fibre', d: 'FA/CR', tag: 'farm', fx: 'craft farm', a: 'agriculture', rel: 1,
  x: ['Flax;;flaxfields;2', 'Hemp;;weaving;1', 'Cotton;warm;cottoncloth;2', 'Jute;warm;weaving;3', 'Sisal;warm;weaving;5', 'Ramie;;weaving;2', 'Sugar Cane;warm;sugarcane;4', 'Sugar Beet;;agriculture;5', 'Indigo;warm;dyes;2', 'Madder;;dyes;2', 'Tobacco;warm;agriculture;5', 'Rubber;warm;agriculture;6', 'Oil Palm;warm;agriculture;5', 'Rapeseed;;agriculture;4', 'Sunflower;;agriculture;5', 'Saffron;warm;dyes;3'],
  v: ['0|{X} Fields|Whole fields of {x}, grown for the trade and not the table.', '1|Selected {X}|Seed kept from the best {x} gives longer fibre and a richer crop.',
    '2|Plantation {X}|{X} on great estates, worked to a strict calendar.', '3|Improved {X}|Botanic gardens send out a better {x}, and growers fight over it.',
    '4|Machine-Harvested {X}|A machine strips the {x} in a day where a gang took a month.', '5|High-Yield {X}|{X} bred for a crop half again as heavy.',
    '6|Gene-Edited {X}|{X} edited to need less water and no spray.', '7|Engineered {X}|{X} grown to order in tanks and fields, its product chosen in the genome.'] },
{ k: 'veg', d: 'GA', tag: 'farm', fx: 'farm', a: 'kitchengarden', rel: 1,
  x: ['Onions;;kitchengarden;1', 'Garlic;;kitchengarden;1', 'Cabbages;;kitchengarden;2', 'Carrots;;kitchengarden;3', 'Lettuces;;kitchengarden;2', 'Cucumbers;;kitchengarden;2', 'Melons;warm;kitchengarden;2', 'Pumpkins;;kitchengarden;1', 'Tomatoes;;kitchengarden;5', 'Peppers;;kitchengarden;5', 'Aubergines;warm;kitchengarden;4', 'Spinach;;kitchengarden;4', 'Leeks;;kitchengarden;2', 'Radishes;;kitchengarden;2', 'Beetroot;;kitchengarden;3', 'Asparagus;;kitchengarden;3'],
  v: ['0|Garden {X}|{X} grown in beds by the door, watered by hand.', '1|Raised-Bed {X}|{X} in deep beds of dug earth and ash, safe from the wet.',
    '2|Manured {X} Beds|Dung and kitchen waste dug in, and the {x} double in size.^Rotted dung under the {x}, and a crop that feeds the street.',
    '3|Forced {X}|{X} brought on early under straw, pots and frames.', '4|Market-Garden {X}|{X} grown by the cartload on the edge of town for the city’s tables.',
    '5|Greenhouse {X}|{X} under glass all year, whatever the weather outside.', '6|Hybrid {X}|Hybrid {x} seed, bought fresh each year, crops even and heavy.',
    '7|Hydroponic {X}|{X} rooted in water and nutrients, with no soil at all.', '8|Gene-Edited {X}|{X} edited to keep a week longer on the shelf.'] },
{ k: 'breed', d: 'HE', tag: 'farm', fx: 'herd', a: 'husbandry',
  x: ['Cattle;;cattle', 'Sheep;;sheep', 'Goats', 'Pigs;;pigs', 'Horses;;horsebreeding', 'Donkeys;;donkeys', 'Camels;warm;camels', 'Water Buffalo;warm', 'Yaks;snow', 'Llamas', 'Alpacas', 'Reindeer;snow', 'Chickens;;poultry', 'Ducks;;poultry', 'Geese;;poultry', 'Turkeys;;poultry'],
  v: ['1|Village {X}|{X} that know their owners and come home at dusk.', '2|{X} Culling|The weak and the wild are eaten first, and the herd of {x} grows gentler.',
    '3|Winter-Fed {X}|Hay and fodder put by, and the {x} live through to spring.', '4|Hill {X}|A hardy breed of {x} for high, wet and windy ground.',
    '5|{X} Herd Books|Every good {x} written down with its sire and dam.', '6|Pedigree {X}|{X} of a named breed, shown at fairs and sold for a fortune.',
    '7|Performance-Tested {X}|{X} weighed and measured, and only the best bred from.', '8|Embryo-Transfer {X}|One prize mother of {x} gives a dozen calves a year through others.',
    '9|Genomic {X}|{X} chosen from a blood sample, years before they prove themselves.', '10|Gene-Edited {X}|{X} edited against the fevers that once swept the herds.'] },
{ k: 'keep', d: 'FO/SE', tag: 'nature', fx: 'spoil famine', a: 'smoking',
  x: ['Fish;;fishdrying', 'Meat', 'Fruit;;orchards', 'Vegetables;;kitchengarden', 'Berries', 'Mushrooms', 'Game', 'Shellfish;coast;shellfish'],
  v: ['0|Sun-Dried {X}|{X} laid out on racks in the sun and wind until it will keep.', '1|Salted {X}|{X} packed in salt, and it keeps until spring.',
    '2|Pickled {X}|{X} sunk in brine and vinegar, sharp and safe for a year.', '3|Potted {X}|{X} sealed under fat in a clay pot.',
    '5|Bottled {X}|{X} boiled in sealed bottles, a summer kept for winter.', '6|Canned {X}|{X} in tin cans that keep for years and travel anywhere.',
    '7|Frozen {X}|{X} frozen hard at once, and tasting fresh months later.', '8|Freeze-Dried {X}|{X} dried in a vacuum, light enough to carry up a mountain.',
    '9|Modified-Atmosphere {X}|{X} packed under the right gas, and it stays fresh for weeks.', '10|Nano-Coated {X}|An edible skin a few molecules thick keeps {x} from going off.',
    '11|Space-Ration {X}|{X} made for orbit: crumb-free, shelf-stable and still worth eating.'] },
{ k: 'bake', d: 'FA/SE', tag: 'farm', fx: 'happy famine', a: 'baking',
  s: ['{N}: a little more to look forward to at the end of the day.', 'With {n}, the plain food of the town gets better.', '{N} spread from one kitchen to the whole country.'],
  l: ['baking>1 Flatbread=Dough slapped on a hot stone, the bread of every early village./2 Leavened Bread=A little old dough in the new, and the loaf rises./3 Bakers’ Ovens/4 Rye Loaves/5 White Wheaten Bread/6 Roller-Milled Flour/7 Sliced Bread/8 Plant Bakeries=Dough in, wrapped loaves out, ten thousand an hour./10 Printed Bread',
    'brewing>1 Grain Beer/2 Malting Floors/4 Hopped Beer=Hops make beer bitter, and the beer keeps for months./5 Porter/6 Lager/7 Pasteurised Beer/8 Craft Brewing/10 Precision-Fermented Beer',
    'winepress>2 Palm Wine/3 Amphora Wine/4 Monastery Vineyards/5 Fortified Wine/6 Sparkling Wine/7 Wine Cooperatives/8 Stainless-Steel Vats',
    'cheese>1 Curd Cheese/2 Brined Cheese/3 Hard Cheese/4 Cave-Aged Cheese/5 Blue Cheese/6 Cheese Factories/7 Processed Cheese/9 Animal-Free Cheese',
    'sugarcane>4 Sugar Loaves/5 Refined Sugar/5 Chocolate Drinks/6 Beet Sugar Mills/6 Confectionery/7 Chocolate Bars/8 Artificial Sweeteners/9 Sugar-Free Sweets',
    'cooking>0 Stone Boiling=Hot stones dropped in a hide of water bring it to the boil./1 Clay-Pot Stews/2 Spice Blends/3 Cookery Books/4 Pasta/5 Haute Cuisine/6 Restaurants/7 Pressure Cookers/8 Microwave Meals/9 Meal Kits/10 Synthesised Flavours'] },
{ k: 'soil', d: 'FA', tag: 'farm', fx: 'farm deplete', a: 'agriculture',
  x: ['Clay Soils', 'Sandy Soils', 'Peat Bogs;water', 'Loess', 'Red Earths;warm', 'Saline Land', 'Marshland;water', 'Hill Slopes', 'Desert Margins;warm', 'Floodplains;river'],
  v: ['2|Manured {X}|Dung carried out by the basket, and {x} that grew little now feed a village.', '3|Marled {X}|Lime-rich clay dug from pits and spread on {x} sweetens them.',
    '4|Ditched {X}|Ditches cut round every field drain the wet out of {x}.', '5|Limed {X}|Burnt lime spread on {x}, and clover grows where only rushes did.',
    '6|Tile-Drained {X}|Clay pipes laid under {x} carry the water away for good.', '7|Surveyed {X}|Every field of {x} is sampled and mapped for what it lacks.',
    '8|Contoured {X}|Ploughing {x} along the slope, not down it, keeps the soil from washing away.', '9|Sensor-Mapped {X}|Probes in {x} tell the tractor what each square yard needs.',
    '10|Restored {X}|Worn-out {x} brought back to life with fungi, worms and patience.'] },
{ k: 'irrig', d: 'FA/BU', tag: 'farm', fx: 'drought farm', a: 'irrigation',
  s: ['{N} bring water where the rain does not.', 'With {n}, a dry year is no longer a hungry one.', '{N}: more fields watered, and fewer arguments about it.'],
  l: ['irrigation>1 Check Dams/2 Furrow Irrigation/2 Canal Head Gates/3 Noria Wheels=A great wheel of pots lifts the river into the fields, turned by the river itself./3 Karez Tunnels/4 Water Courts=Elders meet each week to settle who gets the water and when./5 Tank Reservoirs/6 Wind Pumps/7 Tube Wells/7 Sprinkler Lines/8 Lined Canals/9 Soil-Moisture Sensors/10 Atmospheric Water Harvesting',
    'wells>1 Dew Ponds/2 Step Wells/3 Well Sweeps/4 Bucket Chains/5 Lined Wells/6 Artesian Wells/7 Motor Pumps/8 Aquifer Mapping/9 Managed Aquifer Recharge'] },
{ k: 'fish', d: 'FI/SA', tag: 'sea', fx: 'fish', a: 'fishing',
  x: ['Herring;coast;herring', 'Cod;coast', 'Tuna;coast', 'Salmon;water', 'Sardine;coast', 'Mackerel;coast', 'Anchovy;coast', 'Eel;water', 'Oyster;coast;oysterbeds', 'Mussel;coast', 'Shrimp;coast', 'Crab;coast', 'Lobster;coast', 'Squid;coast', 'Carp;water;fishponds', 'Trout;water'],
  v: ['1|{X} Grounds|The best {x} grounds are learned and handed down, rock by rock and season by season.', '2|{X} Boats|Boats built for the {x}, with the right nets and the right crew.',
    '3|{X} Curing|{X} gutted, salted and packed on the shore before it can spoil.', '4|{X} Fleets|Whole fleets follow the {x} up the coast as the season turns.',
    '5|{X} Markets|A market day just for {x}, with buyers from three counties.', '6|Steam {X} Fleets|Steam boats go after the {x} in any wind and far from home.',
    '7|{X} Surveys|Scientists count the {x} at sea and say how many may be taken.', '8|{X} Quotas|Each boat may land only so much {x}, and the stocks come back.',
    '9|Farmed {X}|{X} raised in pens and ponds, fed and harvested like any other stock.', '10|Sea-Ranched {X}|Young {x} released by the million and gathered when grown.'] },
// ---- the Stone Ages ----
{ k: 'lith', d: 'ST/HU', tag: 'craft', fx: 'craft hunt', a: 'stonetools',
  x: ['Flint', 'Chert', 'Obsidian', 'Quartzite', 'Basalt', 'Jasper', 'Chalcedony', 'Rhyolite', 'Hornfels', 'Greenstone', 'Quartz', 'Agate'],
  v: ['0|{X} Choppers|A river cobble of {x} with a few flakes knocked off one end.', '0|{X} Flakes|Sharp {x} flakes, struck off a core and used as they fall.',
    '0|{X} Scrapers|A thick-edged {x} tool for scraping hides clean.^A rounded {x} edge that cleans a hide without cutting it.', '0|{X} Burins|A chisel-tipped {x} tool that grooves bone and antler.',
    '0|{X} Blades|Long, parallel-sided {x} blades struck from a prepared core.', '0|{X} Points|Leaf-shaped {x} points, thinned on both faces, for spears and darts.',
    '0|{X} Knives|A backed {x} blade that sits safely in the hand.', '0|{X} Arrowheads|Small, notched {x} heads that fly true and break off in the wound.',
    '1|Polished {X} Axes|A {x} axe ground smooth on sandstone, that fells oaks and lasts a lifetime.', '1|{X} Sickle Teeth|Little {x} teeth set in a wooden haft to reap grain.'] },
{ k: 'wild', d: 'FO', tag: 'nature', fx: 'forage', a: 'gathering',
  x: ['Hazelnuts', 'Pine Nuts', 'Wild Rice;water', 'Cattail Roots;water', 'Wild Onions', 'Bilberries', 'Cloudberries;snow', 'Wild Figs;warm', 'Baobab Fruit;warm', 'Mongongo Nuts;warm', 'Sago;warm', 'Seaweed;coast', 'Water Chestnuts;water', 'Wild Yams;warm', 'Camas Bulbs', 'Chestnuts', 'Wild Mushrooms', 'Birch Sap'],
  v: ['0|{X} Gathering|The band knows the {x} grounds and when to be there.^Children learn where the {x} are long before they learn to hunt.', '0|{X} Caches|{X} hidden in pits and hollows against the hungry months.',
    '0|{X} Lore|Which {x} are safe, which are sweet, and which will kill you.', '1|Tended {X}|The best stands of {x} are weeded, burnt round and guarded.'] },
{ k: 'game', d: 'HU', tag: 'nature', fx: 'hunt', a: 'tracking',
  x: ['Mammoth;snow', 'Bison', 'Red Deer', 'Wild Boar', 'Aurochs', 'Wild Horse;horse', 'Gazelle;warm', 'Ibex', 'Seal;coast', 'Wildfowl', 'Hare', 'Elk', 'Mouflon', 'Ostrich;warm'],
  v: ['0|{X} Tracking|Prints, dung and broken twigs tell where the {x} went and how long ago.', '0|{X} Ambushes|Hunters wait downwind at the {x}’s drinking place.',
    '0|{X} Butchery|Every part of a {x} has a use, and a way to cut it.', '0|{X} Hides|{X} skins are scraped, stretched and worked into something to wear.',
    '1|{X} Hunting Grounds|Each family has its own {x} grounds, and its own rules for taking them.'] },
{ k: 'camp', d: 'FO/HU', tag: 'warm', fx: 'cold', a: 'fire',
  s: ['{N}: one more thing that makes a camp a home.', 'With {n}, the band lives a little warmer and safer.', '{N} pass from hand to hand and band to band.'],
  l: ['fire>0 Fire Carrying=Embers carried in a horn of moss, so no camp starts cold./0 Ember Pots/0 Tinder Fungus/0 Fire Ploughs/0 Hearth Stones/0 Fire-Hardened Points/0 Torches/0 Controlled Burns=Grass burnt off in spring brings fresh green shoots and the game that eats them.',
    'hides>0 Scraped Hides/0 Brain Tanning/0 Smoked Hides/0 Sinew Thread/0 Rawhide Lashing/0 Hide Tents/0 Fur Boots/0 Mittens',
    'windbreaks>0 Rock Shelters/0 Brush Huts/0 Lean-Tos/0 Skin Tents/0 Bark Shelters/0 Raised Sleeping Platforms',
    'windbreaks;snow>0 Snow Houses=Blocks of packed snow cut and spiralled into a dome warmer than any tent./0 Snow Goggles/0 Ice Fishing Holes/0 Seal-Oil Lamps'] },
{ k: 'rite', d: 'SC/CR', tag: 'lore', fx: 'happy', a: 'storytelling',
  s: ['{N}: the band knows who it is, and why.', '{N} bind the band together through the hard seasons.', 'The young learn {n} from the old, and add a little of their own.'],
  l: ['cavepaint>0 Hand Stencils/0 Charcoal Drawings/0 Engraved Bone/0 Painted Pebbles/0 Rock Engravings/0 Body Paint/0 Carved Ivory',
    'beads>0 Shell Beads/0 Tooth Pendants/0 Eggshell Beads/0 Amber Beads/0 Feather Headdresses/0 Tattooing',
    'flutes>0 Bone Whistles/0 Bullroarers/0 Hide Drums/0 Rattles/0 Mouth Bows/0 Dance Circles',
    'storytelling>0 Star Lore/0 Animal Lore/0 Genealogies/0 Song Lines=Songs that are also maps: sing the verses and you walk the way./0 Riddles/0 Origin Tales',
    'burial>0 Grave Goods/0 Ochre Burials/0 Ancestor Skulls/0 Mourning Songs'] },
{ k: 'heal', d: 'SE/FO', tag: 'med', fx: 'health', a: 'herbs',
  s: ['{N}: fewer people die of things that should not kill them.', 'A little more healing: {n}.', 'The healer’s bag gets heavier: {n}.'],
  l: ['herbs>0 Poultices/0 Chewing Sticks/0 Insect Repellents/0 Splints/0 Purges/0 Cauterising Wounds/0 Birthing Herbs/1 Herbal Steam Baths/1 Medicinal Honey',
    'trepanning>1 Bloodletting/2 Wound Stitching/2 Medicinal Clay/3 Herbals/3 Cupping/4 Theriac/4 Urine Charts/5 Field Dressings/5 Quinine Bark'] },
{ k: 'neo', d: 'FO/BU', tag: 'build', fx: 'build store', a: 'agriculture',
  s: ['{N}: village life gets a little easier.', 'The first farmers learn {n}, and pass them on.', '{N} spread from village to village with the seed corn.'],
  l: ['pottery>1 Cord-Marked Ware/1 Incised Ware/1 Painted Ware/1 Burnished Ware/1 Storage Jars/1 Cooking Pots/1 Clay Lamps/1 Clay Spindle Whorls/1 Loom Weights',
    'villages>1 Pit Granaries/1 Clay Ovens/1 Plastered Floors/1 House Platforms/1 Village Streets/1 Middens/1 Drystone Walls/1 Field Boundaries/1 Hurdle Fences',
    'polishedaxe>1 Antler Picks/1 Flint Mines=Shafts sunk through chalk to the best black flint, worked with antler picks./1 Bow Drills/1 Stone Adzes/1 Mattocks/1 Bone Combs/1 Pestles and Mortars/1 Dugout Canoes/1 Hide Boats',
    'megaliths>1 Henges/1 Passage Graves/1 Cursus Monuments/1 Menhirs/1 Stone Circles/1 Causewayed Camps/1 Figurine Shrines',
    'husbandry>1 Milking/1 Wool Plucking/1 Ox Yokes/1 Pannage=Pigs turned into the autumn woods to fatten on acorns./1 Branding/1 Lambing Folds/1 Hay Meadows',
    'weaving>1 Bast Fibre/1 Nettle Cloth/1 Twined Cloth/1 Bark Cloth/1 Woven Sandals/1 Fish-Bone Needles',
    'elders>1 Clan Totems/1 Marriage Exchange/1 Seasonal Fairs/1 Village Councils/1 Blood Feuds/1 Hostage Exchange'] },
{ k: 'house', d: 'BU/WO', tag: 'build', fx: 'build cold', a: 'villages', rel: 1,
  x: ['Turf;;villages;1', 'Wattle;;wattle;1', 'Mudbrick;;mudbrick;1', 'Fieldstone;;villages;1', 'Rammed Earth;;mudbrick;2', 'Fired Brick;;masonry;2', 'Ashlar;;masonry;3', 'Timber-Framed;;timberframe;4', 'Brick-and-Tile;;rooftiles;5', 'Iron-Framed;;ironbridges;6', 'Steel-Framed;;skyscrapers;7', 'Concrete Block;;prefab;7', 'Glass-and-Steel;;curtainwall;8', 'Cross-Laminated Timber;;composites;9', 'Printed Earth;;printedhouses;10', 'Regolith;;lunar;11'],
  v: ['0|{X} Houses|Homes of {x}, built the way the old builders taught.^The ordinary house of the age, in {x}.', '1|Two-Storey {X} Houses|A second floor of {x} houses doubles the room on the same plot.',
    '0|{X} Courtyard Houses|{X} rooms round a shaded court that stays cool all day.|warm', '1|Insulated {X} Houses|Thick {x} walls and small windows hold the heat through long winters.|snow',
    '1|Raised {X} Houses|{X} houses on stilts and plinths, above the floods.|river', '1|Storm-Proof {X} Houses|Low, braced {x} houses that ride out the gales off the sea.|coast',
    '2|{X} Row Houses|{X} houses built in terraces, sharing every wall.', '1|{X} Halls|A great {x} hall where the whole village can meet.'] },
// ---- tools, arms and metals ----
{ k: 'tool', d: 'CR/WO', tag: 'craft', fx: 'craft wood', a: 'stonetools',
  x: ['Axes', 'Adzes', 'Chisels', 'Saws;;;2', 'Drills', 'Hammers', 'Knives', 'Sickles;;;1', 'Hoes;;;1', 'Spades;;;2', 'Awls', 'Planes;;;3', 'Files;;;2', 'Tongs;;;2', 'Needles;;;2', 'Wedges', 'Gouges;;;2', 'Shears;;;3'],
  v: ['0|Flint {X}|{X} of knapped flint, sharp as glass and as easily broken.', '2|Copper {X}|Soft copper {x} that bend, but can be beaten straight again.',
    '2|Bronze {X}|Cast bronze {x}, hard enough to hold an edge for a season.', '3|Iron {X}|Iron {x}: cheap enough for every household, if you keep them oiled.',
    '3|Steeled {X}|A strip of steel forge-welded along the edge of iron {x}.', '4|Crucible-Steel {X}|{X} of steel melted in clay pots, even all the way through.',
    '6|Machine-Made {X}|{X} stamped out by the thousand, every one the same.^Factory {x}, cheap, identical and sold in every town.', '7|Alloy-Steel {X}|{X} of chrome-vanadium steel that last for decades.',
    '8|Carbide-Tipped {X}|{X} edged with tungsten carbide, which cuts steel like wood.', '9|Diamond-Coated {X}|A film of grown diamond on the {x}, and they barely wear at all.'] },
{ k: 'arms', d: 'SO/CR', tag: 'war!', fx: 'attack defend', a: 'spearcraft',
  x: ['Spears', 'Daggers', 'Swords;;;2', 'Battle-Axes', 'Maces;;;1', 'Javelins', 'Halberds;;;4', 'Helmets;;;2', 'Shields;;;2', 'Breastplates;;;2', 'Greaves;;;2', 'Lances;;;3', 'Sabres;;;5'],
  v: ['0|Flint {X}|{X} of flint, deadly once and then broken.', '2|Copper {X}|Copper {x}: bright, heavy and soon blunt.', '2|Bronze {X}|Bronze {x}, cast in moulds and sharpened on stone.',
    '3|Iron {X}|Iron {x}, so cheap that every man in the levy can have them.', '4|Steel {X}|Steel {x}, quenched and tempered, that bend and spring back.',
    '4|Damascus {X}|{X} of patterned steel, watered like silk, prized by kings.', '5|Tempered {X}|{X} hardened and drawn back to just the right colour.', '6|Machine-Forged {X}|{X} forged under steam hammers for a national army.'] },
{ k: 'guns', d: 'SO/CR', tag: 'war!', fx: 'attack', a: 'musket',
  x: ['Pistols', 'Carbines', 'Rifles', 'Fowling Pieces', 'Blunderbusses', 'Hunting Guns'],
  v: ['4|Matchlock {X}|A smouldering cord dips into the pan and the {x} fires, mostly.', '5|Wheellock {X}|A spinning steel wheel throws sparks into the pan: {x} that need no match.',
    '5|Flintlock {X}|Flint on steel, and the {x} fire in rain that would drown a match.', '6|Percussion {X}|A copper cap that fires when struck: {x} that hardly ever misfire.',
    '6|Breech-Loading {X}|{X} loaded from behind, lying down, five times a minute.', '7|Bolt-Action {X}|A turn and a pull: {x} with five rounds in the box.',
    '7|Semi-Automatic {X}|{X} that reload themselves with every shot.', '8|Automatic {X}|{X} that fire as long as the trigger is held.', '9|Polymer-Framed {X}|Light {x} of plastic and steel that don’t rust.', '10|Smart {X}|{X} that fire only for their owner and count every round.'] },
{ k: 'gunnery', d: 'SO/CR', tag: 'war!', fx: 'attack defend', a: 'cannon',
  x: ['Field Guns', 'Siege Guns', 'Naval Guns;coast', 'Coastal Guns;coast', 'Howitzers;;;5', 'Mountain Guns;;;5', 'Anti-Tank Guns;;;7'],
  v: ['4|Bronze-Cast {X}|{X} cast in bronze like church bells, heavy but safe.', '5|Iron-Cast {X}|Cast-iron {x}: cheap, many, and now and then they burst.',
    '6|Rifled {X}|Spiralled grooves spin the shell, and the {x} hit what they aim at.', '6|Breech-Loading {X}|{X} loaded from the back, fired again before the smoke clears.',
    '7|Quick-Firing {X}|{X} with recoil brakes, firing twenty rounds a minute.', '8|Self-Propelled {X}|{X} on tracks, that fire and move before the reply arrives.',
    '9|Computer-Laid {X}|{X} aimed by a computer from a satellite fix.', '10|Electromagnetic {X}|{X} that throw their shot with magnets instead of powder.'] },
{ k: 'smelt', d: 'MI/CR', tag: 'metal', fx: 'mine craft', a: 'copper', rel: 1,
  x: ['Copper;copper;copper;2', 'Tin;tin;tinmining;2', 'Lead;;copper;2', 'Silver;;silvercupel;2', 'Gold;gold;goldpanning;2', 'Iron;iron;iron;3', 'Mercury;;moulds;4', 'Zinc;;brass;5',
    'Nickel;;chemistry;6', 'Platinum;;chemistry;6', 'Cobalt;;chemistry;6', 'Tungsten;;electric;7', 'Chromium;;stainless;7', 'Aluminium;;aluminium;7', 'Magnesium;;electric;7', 'Uranium;uranium;nuclear;7', 'Titanium;;titanium;8', 'Rare-Earth;;rareearths;8', 'Lithium;;batteries;9'],
  v: ['0|{X} Prospecting|Prospectors learn the rocks, plants and stains that mean {x} below.', '0|{X} Ore Dressing|{X} ore crushed, washed and sorted before it goes near a fire.',
    '1|{X} Smelting|Hotter furnaces and better fluxes win more {x} from every load of ore.', '1|{X} Refining|Impure {x} remelted and skimmed until it comes out bright.',
    '2|{X} Assaying|A pinch of ore in a crucible tells how much {x} the whole seam holds.', '3|{X} Works|{X} smelted on a grand scale, the smoke visible for miles.',
    '4>6|Electrolytic {X}|A current through the bath lays down {x} of almost perfect purity.', '5>6|{X} Leaching|{X} washed out of poor ore with acid and caught again.',
    '6>7|{X} Recycling|Old {x} melted down: cheaper than digging and kinder to the hills.', '7>9|Bio-Leached {X}|Bacteria eat the rock and leave the {x} behind.',
    '10>12|Asteroid {X}|{X} cut from a metal asteroid, purer than any mine on Earth.', '11>13|Zero-G {X} Refining|{X} refined in orbit, with no crucible to taint it.'] },
{ k: 'alloy', d: 'CR/MI', tag: 'metal', fx: 'craft', a: 'bronze', rel: 1,
  x: ['Arsenical Bronze;;arsenical;2', 'Tin Bronze;;bronze;2', 'Electrum;;goldsmith;2', 'Pewter;;bronze;3', 'Wrought Iron;;bloomery;3', 'Crucible Steel;;wootz;3', 'Bell Metal;;bronze;4', 'Cast Iron;;castiron;4', 'Brass;;brass;5', 'Gunmetal;;cannon;5', 'Shear Steel;;blast;5',
    'Bessemer Steel;;bessemer;6', 'Nickel Steel;;openhearth;6', 'Manganese Steel;;openhearth;6', 'Chrome Steel;;stainless;7', 'Duralumin;;aluminium;7', 'Invar;;stainless;7', 'Monel;;stainless;7', 'Superalloy;;titanium;8', 'Titanium Alloy;;titanium;8',
    'Shape-Memory Alloy;;composites;8', 'Metallic Glass;;nanotech;9', 'High-Entropy Alloy;;nanotech;9', 'Programmable Alloy;;selfhealing;10'],
  v: ['0|{X} Making|The recipe for {x}, its metals weighed out and melted together.^Smiths learn to make {x}, and to keep the recipe in the family.', '0|{X} Ingots|{X} cast in standard bars, so a buyer knows what he is getting.',
    '1|{X} Wire|{X} drawn through ever-smaller holes into wire.', '1|{X} Plate|{X} beaten or rolled into broad, even sheets.',
    '2|Heat-Treated {X}|Heated and cooled just so, {x} comes out harder and tougher.', '3>6|Graded {X}|{X} tested and sold to a published standard.',
    '4>7|Powdered {X}|{X} pressed from powder and sintered into shapes no mould could make.', '5>8|Recycled {X}|Scrap {x} sorted by alloy and melted back to new.'] },
{ k: 'ware', d: 'CL', tag: 'craft', fx: 'craft', a: 'pottery', rel: 1,
  x: ['Earthenware;;pottery;1', 'Terracotta;;terracotta;2', 'Faience;;faience;2', 'Stoneware;;potterswheel;3', 'Celadon;;glazes;4', 'Porcelain;;porcelain;4', 'Lustreware;;glazes;4', 'Raku;;glazes;4', 'Majolica;;glazes;5', 'Delftware;;glazes;5', 'Creamware;;glazes;5',
    'Refractory Brick;;reverberatory;5', 'Bone China;;porcelain;6', 'Ironstone China;;porcelain;6', 'Technical Ceramics;;composites;8', 'Bioceramics;;jointrep;8'],
  v: ['0|{X} Kilns|A kiln built for {x}, fired to just the heat it needs.', '0|{X} Glazes|A glaze that fits {x}, and does not craze or run.', '1|Painted {X}|{X} painted with brush and slip before the last firing.',
    '1|Moulded {X}|{X} pressed in moulds, a dozen alike in an hour.', '2>6|Transfer-Printed {X}|A pattern inked on paper and pressed onto {x}.', '2>6|Slip-Cast {X}|Liquid clay poured into plaster moulds: thin, even {x}.',
    '3>7|Tunnel-Kiln {X}|{X} rides through a long kiln on cars, firing day and night.', '4>8|Engineered {X}|{X} made to a formula, tested and graded.'] },
{ k: 'glass', d: 'CR/CL', tag: 'craft', fx: 'craft', a: 'glass', rel: 1,
  x: ['Soda Glass;;glass;2', 'Potash Glass;;glass;4', 'Cristallo;;glassblowing;4', 'Lead Crystal;;glassblowing;5', 'Crown Glass;;glassblowing;5', 'Flint Glass;;optics;5', 'Cylinder Glass;;glassblowing;6', 'Optical Glass;;optics;6',
    'Borosilicate Glass;;plateglass;6', 'Safety Glass;;plateglass;7', 'Fibreglass;;plastics;7', 'Toughened Glass;;floatglass;8', 'Smart Glass;;led;9', 'Photonic Glass;;fibreoptics;9'],
  v: ['0|{X} Melting|The right sand, ash and heat for {x}.', '0|{X} Blowing|A gather of {x} on a pipe, blown and turned into shape.^{X} blown into bottles, beakers and lamps.', '1|Coloured {X}|Metal oxides stirred into {x}: cobalt blue, copper green, gold red.',
    '1|Annealed {X}|{X} cooled slowly overnight, so it doesn’t shatter on the first cold day.', '2|Ground {X}|{X} ground and polished flat and true.', '3>6|Machine-Made {X}|{X} drawn and pressed by machine, by the mile.', '4>8|Coated {X}|A film a few atoms thick changes how {x} handles light and heat.'] },
{ k: 'cloth', d: 'CR/SE', tag: 'warm', fx: 'craft cold', a: 'weaving', rel: 1,
  x: ['Linen;;linen;2', 'Wool;;woolsheep;1', 'Cotton;;cottoncloth;2', 'Silk;;silk;2', 'Hemp Cloth;;weaving;1', 'Felt;;feltmaking;1', 'Mohair;;weaving;3', 'Cashmere;;weaving;4', 'Velvet;;drawloom;4', 'Lace;;knitting;5', 'Calico;;cottoncloth;5',
    'Rayon;;synthdyes;7', 'Nylon Cloth;;nylon;7', 'Polyester;;plastics;7', 'Aramid Cloth;;kevlar;8', 'Spider Silk;;biotech;9', 'Smart Fabric;;nanotech;10'],
  v: ['0|{X} Spinning|Fibre for {x} drawn and twisted into an even thread.', '0|{X} Weaving|{X} woven tight and even, in widths a tailor can use.', '1|Fine {X}|{X} so fine a length of it passes through a ring.',
    '1|Patterned {X}|{X} woven with stripes, checks and figures.', '2|Printed {X}|Carved blocks print colour onto plain {x}.', '3>6|Machine-Spun {X}|Thread for {x} spun by machine, a hundred spindles at once.',
    '4>6|Mill-Woven {X}|{X} woven in mills by the mile, and cheap enough for anyone.', '5>7|Easy-Care {X}|{X} that washes and dries without shrinking or creasing.', '6>9|Recycled {X}|Old {x} shredded, re-spun and woven again.'] },
{ k: 'dye', d: 'CR', tag: 'craft', fx: 'craft trade', a: 'dyes', rel: 1,
  x: ['Ochre Red;;ochre;0', 'Woad Blue;;dyes;1', 'Indigo Blue;;dyes;2', 'Madder Red;;dyes;2', 'Kermes Crimson;;dyes;2', 'Saffron Yellow;;dyes;2', 'Murex Purple;;purpledye;2', 'Weld Yellow;;dyes;3', 'Logwood Black;;dyes;5',
    'Cochineal Scarlet;;dyes;5', 'Prussian Blue;;chemistry;5', 'Mauveine;;synthdyes;6', 'Alizarin Red;;synthdyes;6', 'Aniline Black;;synthdyes;6', 'Azo Yellow;;synthdyes;7', 'Reactive Dye;;synthdyes;8', 'Structural Colour;;nanotech;10'],
  v: ['0|{X} Dyeing|Cloth dyed in {x}, and its wearer seen from across the market.', '0|{X} Mordants|Alum and iron fix {x} into the fibre so it does not wash out.',
    '1|Fast {X}|{X} that keeps its colour through sun, rain and a hundred washes.', '2|{X} Printing|{X} printed in patterns with blocks and resist pastes.', '3>6|Factory {X}|{X} made by the ton, the same shade in every batch.'] },
{ k: 'dig', d: 'MI', tag: 'metal', fx: 'mine', a: 'firesetting',
  x: ['Copper Ore;copper;;2', 'Tin Ore;tin;;2', 'Iron Ore;iron;iron;3', 'Coal;coal;coalpits;4', 'Salt;salt;saltworks;1', 'Sulphur;sulfur;;3', 'Gold;gold;goldpanning;2', 'Gem;gems;;2', 'Lead Ore;;;2', 'Silver Ore;;silvercupel;2', 'Flint;;stonetools;1', 'Limestone;;lime;1'],
  v: ['1|{X} Pits|Shallow pits dug where the {x} shows at the surface.', '2|{X} Adits|A level tunnel driven into the hillside follows the {x}.', '3|{X} Shafts|Shafts sunk deep and timbered, with windlasses to lift the {x}.',
    '4|Drained {X} Workings|Drainage tunnels let the {x} miners go below the water.', '5|Blasted {X} Seams|Black powder in drilled holes brings down a week of {x} at once.',
    '6|Steam-Pumped {X} Mines|Steam pumps keep the deep {x} workings dry.', '7|Mechanised {X} Mining|Cutting machines and conveyors take over the {x} face.',
    '8|Open-Cast {X}|Whole hills of {x} taken away by giant shovels.', '9|Automated {X} Mines|Driverless trucks haul {x} around the clock.', '10|Robotic {X} Mining|Robots follow the {x} where no person could work.'] },
// ---- machines, ships and ways ----
{ k: 'mill', d: 'CR/BU', tag: 'machine', fx: 'craft build', a: 'wheel',
  x: ['Grain Mills;;;2', 'Sawmills;;;3', 'Fulling Mills;;;4', 'Paper Mills;;;4', 'Oil Mills;;;3', 'Pumps;;;3', 'Forge Hammers;;;4', 'Bellows;;;2', 'Looms;;;6', 'Lathes;;;3', 'Cranes;;;3', 'Hoists;;;3', 'Grindstones;;;3', 'Ore Crushers;;;4', 'Threshers;;;5', 'Spinning Frames;;;6', 'Sugar Mills;;;4', 'Rolling Mills;;;5', 'Wire Mills;;;5'],
  v: ['2|Horse-Gin {X}|A horse walking in a circle all day turns the {x}.', '3|Water-Powered {X}|A wheel in the race drives the {x} day and night.^The stream does the work of twenty men at the {x}.',
    '4|Wind-Powered {X}|Sails on a tower turn the {x} whenever the wind blows.', '6|Steam {X}|A steam engine drives the {x}, far from any river.',
    '7|Electric {X}|A motor on every {x}, switched on with a lever.', '7|Diesel {X}|{X} driven by a diesel where the wires don’t reach.',
    '8|Automated {X}|The {x} run themselves; one person watches a dozen.', '9|Robotic {X}|Robots load, run and mend the {x}.', '10|Self-Maintaining {X}|{X} that order their own spare parts before anything breaks.'] },
{ k: 'engine', d: 'CR/SC', tag: 'machine', fx: 'craft', a: 'pumps',
  s: ['{N}: more power from less fuel.', '{N} squeeze a little more work out of every engine.', 'With {n}, the machines run longer and break down less.'],
  l: ['pumps>5 Atmospheric Engines/6 Separate Condensers/6 Rotative Engines/6 High-Pressure Engines/6 Compound Engines/6 Corliss Valves/7 Triple-Expansion Engines/7 Steam Turbines/7 Uniflow Engines/8 Supercritical Boilers',
    'combustion>6 Gas Engines/6 Four-Stroke Engines/7 Two-Stroke Engines/7 Carburettors/7 Spark Plugs/7 Diesel Injection/7 Superchargers/8 Turbochargers/8 Rotary Engines/8 Fuel Injection/9 Hybrid Drives/9 Common-Rail Diesels',
    'electricmotor>7 DC Motors/7 Induction Motors/7 Synchronous Motors/8 Servo Motors/8 Stepper Motors/9 Brushless Motors/9 Linear Motors/10 Superconducting Motors',
    'hydroelectric>7 Pelton Wheels/7 Francis Turbines/7 Kaplan Turbines/8 Pumped Storage/9 Bulb Turbines/10 Fish-Friendly Turbines',
    'flight>7 Gas Turbines/8 Turbojets/8 Turbofans/8 Turboprops/8 Afterburners/9 Geared Turbofans/10 Open Rotors/10 Electric Fans'] },
{ k: 'hull', d: 'SA/WO', tag: 'sea', fx: 'trade fish', a: 'ships', c: 'coast',
  x: ['Fishing Boats', 'Coasters', 'Ferries;water', 'Merchantmen', 'Whalers', 'River Barges;river', 'Lighters', 'Pilot Boats;;;5', 'Packet Ships;;;5', 'Survey Ships;;;5', 'Tugs;;;6', 'Dredgers;water;;6', 'Icebreakers;snow;;6', 'Cable Ships;;;6'],
  v: ['2|Plank-Built {X}|{X} of sewn and pegged planks, light and quick to build.', '3|Clinker-Built {X}|Overlapping planks riveted together make strong, flexible {x}.',
    '4|Carvel-Built {X}|Planks laid edge to edge on a frame: bigger {x} than clinker allows.', '5|Copper-Sheathed {X}|Copper on the bottom keeps worm and weed off the {x}.',
    '6|Iron-Hulled {X}|{X} of riveted iron plate that never rot.', '6|Steam {X}|{X} with paddles or a screw, keeping time whatever the wind.',
    '7|Steel {X}|Welded steel {x}, lighter and stronger than iron.', '7|Diesel {X}|{X} driven by diesels, half the crew of steam.',
    '8|Gas-Turbine {X}|Fast {x} driven by jet engines geared to the screws.', '9|Electric {X}|Battery {x}, charged at the quay and silent at sea.',
    '10|Autonomous {X}|{X} with no crew aboard, watched from an office ashore.', '11|Fusion-Powered {X}|{X} that refuel once a decade.'] },
{ k: 'rig', d: 'SA', tag: 'sea', fx: 'trade fish', a: 'sailing',
  s: ['{N}: ships handle better and sail closer to the wind.', 'With {n}, a passage takes days less.', '{N} spread from port to port with the sailors who learned them.'],
  l: ['sailing>1 Square Sails/2 Brailed Sails/3 Spritsails/3 Lug Sails/4 Junk Rigs/4 Topsails/5 Gaff Rigs/5 Staysails/5 Fore-and-Aft Schooners/6 Barques/6 Full-Rigged Ships/6 Steel Masts/7 Bermuda Rigs/9 Wing Sails/9 Kite Sails/10 Rotor Ships',
    'sailing>2 Sounding Lines/2 Star Steering/3 Pilot Books/4 Lodestones/4 Traverse Boards/5 Backstaffs/5 Octants/5 Sextants/6 Tide Tables/6 Buoyage/7 Radio Direction-Finding/7 Echo Sounders/8 Radar Plotting/8 Loran/9 Electronic Charts/10 Autonomous Navigation',
    'harbours;coast>2 Stone Moles/3 Breakwaters/3 Slipways/4 Quay Cranes/5 Wet Docks/6 Graving Docks/6 Swing Bridges/7 Floating Docks/8 Container Cranes/9 Automated Terminals'] },
{ k: 'way', d: 'BU', tag: 'build', fx: 'build trade', a: 'wheel',
  s: ['{N}: the journey is shorter, safer and cheaper.', 'With {n}, goods and people move further for less.', '{N} join up places that never used to meet.'],
  l: ['wheel>1 Trackways/1 Corduroy Roads/2 Causeways/2 Hollow Ways/3 Cambered Roads/3 Road Stations/4 Packhorse Trails/5 Turnpike Trusts/6 Telford Roads/6 Tarred Roads/7 Asphalt Roads/7 Road Signs/8 Motorway Interchanges/8 Cat’s Eyes/9 Smart Motorways/10 Self-Repairing Roads',
    'bridges>2 Log Bridges/2 Clapper Bridges/3 Stone Arch Bridges/3 Pontoon Bridges/4 Pointed-Arch Bridges/5 Timber Truss Bridges/6 Cast-Iron Bridges/6 Chain Bridges/6 Tubular Bridges/7 Cantilever Bridges/7 Steel Arch Bridges/7 Bascule Bridges/8 Cable-Stayed Bridges/8 Box-Girder Bridges/9 Composite Bridges/10 Printed Steel Bridges',
    'canals>3 Contour Canals/3 Flash Locks/4 Pound Locks/5 Canal Aqueducts/5 Staircase Locks/6 Inclined Planes/6 Boat Lifts/7 Ship Lifts/8 Super-Locks/9 Water-Saving Locks',
    'engineering>3 Rock-Cut Tunnels/3 Counter-Driven Tunnels/5 Canal Tunnels/6 Tunnelling Shields/6 Railway Tunnels/6 Compressed-Air Drills/7 Immersed-Tube Tunnels/8 Sprayed-Concrete Linings/9 Deep Bored Tunnels/10 Vacuum Tunnels',
    'railways0>5 Wooden Wagonways/5 Plateways/6 Edge Rails/6 Fishplates/6 Points and Crossings/6 Railway Signals/7 Steel Rails/7 Block Signalling/8 Continuous Welded Rail/8 Centralised Traffic Control/9 Slab Track/10 Maglev Guideways'] },
{ k: 'veh', d: 'CR/TR', tag: 'machine', fx: 'trade', a: 'wheel',
  x: ['Carts;;;1', 'Wagons;;;1', 'Carriages;;;4', 'Coaches;;;4', 'Drays;;;4', 'Mail Coaches;;;5', 'Fire Engines;;;5', 'Hearses;;;5', 'Ambulances;;;6', 'Buses;;;6', 'Vans;;;7', 'Taxis;;;7'],
  v: ['1|Solid-Wheeled {X}|{X} on wheels cut from a single plank, slow and loud.', '2|Spoke-Wheeled {X}|Light spoked wheels make the {x} quicker and easier to pull.',
    '4|Pivot-Axle {X}|A turning front axle lets the {x} take a corner.', '5|Sprung {X}|Springs under the {x} take the worst out of the ruts.',
    '6|Steam {X}|{X} driven by a little steam engine, puffing and slow.', '7|Motor {X}|Petrol-engined {x}, faster than any horse.', '8|Diesel {X}|Diesel {x} that run all day on a tank.',
    '9|Electric {X}|Quiet electric {x}, charged overnight.', '10|Driverless {X}|{X} that drive themselves and never get lost.'] },
{ k: 'inst', d: 'SC/CR', tag: 'machine', fx: 'research craft', a: 'scales',
  s: ['{N}: something can be measured that could only be guessed at before.', 'With {n}, the work gets more exact.', '{N} go into every workshop and laboratory.'],
  l: ['clocks>4 Verge Escapements/4 Striking Clocks/5 Spring-Driven Clocks/5 Pocket Watches/5 Anchor Escapements/6 Railway Time/7 Electric Clocks/7 Quartz Clocks/8 Atomic Clocks/9 Optical Lattice Clocks/10 Nuclear Clocks',
    'optics>4 Reading Stones/5 Compound Microscopes/5 Achromatic Lenses/6 Camera Lenses/6 Oil-Immersion Lenses/7 Electron Microscopes/8 Zoom Lenses/9 Adaptive Optics/10 Metalenses',
    'scales>2 Balance Beams/3 Steelyards/4 Assay Balances/5 Spring Balances/6 Platform Scales/7 Weighbridges/8 Electronic Scales/9 Microbalances',
    'thermometer>5 Hygrometers/5 Anemometers/6 Seismographs/6 Galvanometers/7 Oscilloscopes/7 Geiger Counters/8 Spectrometers/8 Mass Spectrometers/9 Gravimeters/10 Quantum Sensors'] },
{ k: 'trade', d: 'CR/TR', tag: 'craft', fx: 'craft trade', a: 'carpentry', rel: 1,
  x: ['Furniture;;carpentry;1', 'Barrels;;carpentry;3', 'Shoes;;leatherwork;1', 'Saddles;;saddles;3', 'Rope;;cordage;0', 'Candles;;beekeeping;2', 'Soap;;soap;3', 'Brushes;;carpentry;2', 'Buttons;;carpentry;4', 'Locks;;iron;3', 'Umbrellas;;weaving;5',
    'Toys;;carpentry;1', 'Jewellery;;goldsmith;2', 'Mirrors;;mirrors;5', 'Combs;;carpentry;1', 'Bells;;bronze;2', 'Tents;;hides;0', 'Lamps;;pottery;1', 'Hats;;feltmaking;2', 'Gloves;;leatherwork;2'],
  v: ['0|{X} Making|{X} made at home, each family to its own pattern.^Someone in every village who knows how {x} are made.', '1|{X} Workshops|Workshops where nothing but {x} are made, and made well.',
    '2>4|{X} Guilds|The {x} makers form a guild, with prices, rules and apprentices.', '3>5|Fine {X}|{X} for the rich, signed by their maker.',
    '4>6|{X} Factories|{X} made by machine in great sheds, cheap enough for all.', '5>7|Mass-Produced {X}|{X} off a moving line, a million identical a year.',
    '6>8|Designer {X}|{X} drawn by designers and sold on the name.', '7>9|Printed {X}|{X} printed to order from a file, in an hour.', '8>10|Robot-Made {X}|{X} made start to finish by robots that never tire.'] },
// ---- healing and learning ----
{ k: 'cure', d: 'SE/SC', tag: 'med', fx: 'health contagion', a: 'herbs',
  x: ['Fever', 'Dysentery', 'Cholera;;;3', 'Smallpox', 'Measles', 'Malaria;warm', 'Tuberculosis', 'Plague;;;3', 'Leprosy', 'Scurvy;;;4', 'Rickets;;;5', 'Diabetes;;;5', 'Heart Disease;;;5', 'Cancer;;;4', 'Typhus;;;4',
    'Typhoid;;;5', 'Polio;;;6', 'Influenza;;;5', 'Childbed Fever;;;4', 'Yellow Fever;warm;;5', 'Sleeping Sickness;warm;;6', 'Asthma;;;5', 'Dementia;;;6', 'Stroke;;;5', 'Gout;;;3'],
  v: ['1|{X} Remedies|Healers learn what eases {x}, and what only seems to.', '3|{X} Case Notes|A physician writes down every case of {x}, and patterns start to show.',
    '4|{X} Wards|The sick with {x} are nursed apart, in rooms of their own.', '6|{X} Statistics|Counting who gets {x}, and where, points to the cause.^A map of {x} cases, street by street, shows what the theories missed.',
    '6|{X} Research|Laboratories set out to find what {x} really is.', '7|{X} Clinics|Clinics just for {x}, free to anyone who walks in.',
    '8|{X} Screening|{X} caught early in whole populations, while it can still be treated.', '8|{X} Drug Trials|New treatments for {x} tested against old ones, blind and fair.',
    '9|{X} Genomics|The genes behind {x} read and mapped.', '10|{X} Gene Therapy|A corrected gene delivered to the cells, and {x} stops.', '10|{X} Nanotherapy|Machines smaller than a cell go after {x} one cell at a time.',
    '11|{X} Eradication|The last case of {x} anywhere, and the disease is history.'] },
{ k: 'organ', d: 'SE/SC', tag: 'med', fx: 'health recover', a: 'surgery',
  x: ['Eye', 'Ear', 'Jaw', 'Skull', 'Heart;;;5', 'Lung;;;5', 'Kidney;;;5', 'Liver;;;5', 'Skin', 'Hand', 'Spine;;;5', 'Bowel;;;5', 'Hip;;;5', 'Knee;;;5', 'Blood Vessel;;;5', 'Bladder'],
  v: ['3|{X} Surgery|Surgeons learn to open, mend and close the {x}, quickly and with a steady hand.', '5|{X} Anatomy|Dissection shows how the {x} is really made.',
    '6|Antiseptic {X} Surgery|Carbolic and boiled instruments, and {x} patients stop dying of the cure.', '6|Anaesthetised {X} Surgery|The patient sleeps through the {x} operation, and the surgeon can take his time.',
    '7|{X} X-Rays|Pictures of the {x} from inside, before a single cut.', '8|{X} Transplants|A {x} from a donor, and the body persuaded to keep it.',
    '8|Artificial {X}|A man-made {x} of metal and plastic that does the work.', '9|Keyhole {X} Surgery|The {x} mended through a cut the width of a pencil.',
    '9|Robotic {X} Surgery|A robot’s steady hands, a surgeon’s eyes, and the {x} heals in days.', '10|Printed {X} Tissue|{X} tissue printed from the patient’s own cells.', '11|Regrown {X}|A whole new {x}, grown on the body’s own instructions.'] },
{ k: 'drug', d: 'SE/SC', tag: 'med', fx: 'health', a: 'herbs',
  s: ['{N}: one more thing the healer can do.', 'With {n}, illnesses that killed now only hurt.', '{N} go into the medicine chest of every doctor.'],
  l: ['herbs>1 Opium Poppy/2 Ephedra/3 Henbane/4 Theriac Salts/5 Ipecac/5 Foxglove/6 Morphine/6 Chloral/7 Barbiturates/7 Sulfa Drugs/7 Cortisone/8 Beta Blockers/8 Statins/8 Antivirals/9 Monoclonal Antibodies/9 Checkpoint Inhibitors/10 Programmable Drugs/11 Microbiome Therapies',
    'midwifery>1 Birthing Stools/3 Wet Nurses/4 Midwives’ Licences/5 Obstetric Forceps/6 Clean Births/7 Maternity Clinics/7 Incubators/8 Neonatal Intensive Care/9 Fetal Surgery'] },
{ k: 'learn', d: 'SC', tag: 'lore', fx: 'research spread', a: 'writing', rel: 1,
  x: ['Law;;law;2', 'Medicine;;medicine;3', 'Theology;;priests;2', 'Astronomy;;astronomy;2', 'Mathematics;;math;2', 'Engineering;;engineering;3', 'Agriculture;;agsociety;5', 'Navigation;;navigation;5', 'Architecture;;masonry;3',
    'Music;;flutes;3', 'History;;writing;3', 'Languages;;translation;4', 'Chemistry;;chemistry;5', 'Botany;;botanic;5', 'Economics;;banking;5', 'Geology;;geology;6', 'Psychology;;psychology;7', 'Computing;;computers;7', 'Genetics;;genetics;8', 'Ecology;;environmental;8'],
  v: ['0|{X} Texts|The first written works on {x}, copied and kept.', '1|{X} Schools|Masters take pupils in {x}, and the knowledge outlives them.',
    '2>4|{X} Colleges|A college of {x}, with its own rules, rooms and library.', '3>5|{X} Chairs|A paid professor of {x}, and a lecture anyone may attend.',
    '3>5|{X} Journals|{X} published monthly, and argued about everywhere.', '4>6|{X} Degrees|A degree in {x}, examined and recognised everywhere.',
    '4>6|{X} Laboratories|{X} studied by experiment, not only by argument.', '5>7|{X} Faculties|Whole faculties of {x}, training a thousand a year.',
    '6>9|Online {X} Courses|The best lectures in {x}, free to anyone with a screen.', '7>10|AI {X} Tutors|A patient tutor in {x} for every learner, day and night.', '8>11|Orbital {X} Institutes|{X} taught and studied on the stations.'] },
{ k: 'health', d: 'SE/BU', tag: 'med', fx: 'plague health', a: 'sanitation',
  x: ['Water Supply;;wells;2', 'Sewers;;drains;3', 'Food Inspection;;scales;4', 'Housing Inspection;;buildingcodes;5', 'Street Cleaning;;streets;4', 'Refuse Collection;;streets;4', 'Burial Grounds;;burial;2', 'Bathhouses;;baths;3',
    'Fever Hospitals;;hospitals;5', 'Child Welfare;;midwifery;6', 'School Meals;;schools;7', 'Occupational Health;;factory;7', 'Air Quality;;environmental;8'],
  v: ['0|Town {X}|The town takes charge of its {x}, and appoints someone to answer for it.', '1|Inspected {X}|Officers with powers check the {x} and close what is foul.',
    '2>6|Regulated {X}|By law, {x} must meet a standard written down.', '3>7|Municipal {X}|{X} paid for out of the rates, and open to all.',
    '4>8|Monitored {X}|{X} watched by instruments, and alarms when it slips.', '5>9|Data-Led {X}|{X} planned from real-time numbers, street by street.'] },
// ---- number, sky and matter ----
{ k: 'maths', d: 'SC', tag: 'math', fx: 'research', a: 'math',
  s: ['{N}: a result that later work is built on.', 'Scholars argue over {n}, and then use it everywhere.', '{N}, worked out on slates and paper, and copied far and wide.', 'With {n}, problems that were hopeless become routine.'],
  l: ['math>2 Unit Fractions/2 Square Roots/3 Euclid’s Algorithm/3 Sieve of Eratosthenes/3 Perfect Numbers/4 Decimal Fractions/4 Chinese Remainder Theorem/5 Fermat’s Little Theorem/5 Pell’s Equation/6 Quadratic Reciprocity/6 Prime Number Theorem/7 Modular Forms/8 Public-Key Number Theory/9 Proof of Fermat’s Last Theorem',
    'geometry0>2 Rope-Stretcher Geometry/3 Pythagoras’ Theorem/3 Conic Sections/3 Spherical Geometry/4 Geometric Tilings/5 Projective Geometry/5 Analytic Geometry/6 Non-Euclidean Geometry/6 Differential Geometry/7 Riemannian Manifolds/8 Fractal Geometry/9 Computational Geometry',
    'algebra>4 Quadratic Formula/5 Cubic Equations/5 Symbolic Notation/5 Complex Numbers/6 Group Theory/6 Matrices/6 Quaternions/7 Abstract Algebra/7 Linear Algebra/8 Category Theory/9 Computer Algebra',
    'calculus>5 Infinite Series/5 Taylor Series/6 Differential Equations/6 Fourier Series/6 Complex Analysis/6 Rigorous Limits/7 Set Theory/7 Measure Theory/7 Functional Analysis/8 Chaos Theory/9 Numerical Relativity',
    'probability>5 Expected Value/5 Law of Large Numbers/6 Normal Distribution/6 Least Squares/6 Bayesian Inference/7 Correlation/7 Significance Testing/7 Sampling Theory/8 Monte Carlo Methods/8 Game Theory/9 Statistical Learning',
    'logic>3 Stoic Logic/4 Obligations Logic/5 Calculus Ratiocinator/6 Boolean Algebra/7 Predicate Logic/7 Incompleteness Theorems/7 Computability/8 Formal Languages/8 Complexity Theory/9 Proof Assistants/10 Machine-Checked Mathematics',
    'calculus>6 Graph Theory/6 Knot Theory/7 Topology/7 Homology/8 Algebraic Topology/9 Topological Data Analysis/10 Higher Category Theory',
    'computers>7 Analysis of Algorithms/7 Information Theory/8 Cryptographic Hashes/8 Error-Correcting Codes/8 Linear Programming/9 Compressed Sensing/9 Quantum Algorithms/10 Post-Quantum Cryptography/11 Machine Conjecture/12 Proof Mining at Scale',
    'operations>7 Queueing Theory/7 Control Theory/8 Cybernetics/8 Convex Optimisation/9 Network Science/10 Complex Adaptive Systems'] },
{ k: 'sky', d: 'SC', tag: 'sky', fx: 'research', a: 'calendar',
  s: ['{N}: the sky makes a little more sense.', 'Watchers of the night publish {n}, and the heavens get bigger.', '{N} change what people think the world is.'],
  l: ['calendar>2 Star Calendars/2 Planet Watching/3 Precession/3 Star Catalogues/4 Astronomical Tables/5 Kepler’s Laws/5 Moons of Jupiter/5 Transit of Venus/6 Stellar Parallax/6 Neptune Predicted/6 Stellar Spectra/7 Expanding Universe/7 Radio Astronomy/8 Quasars/8 Pulsars/8 Cosmic Microwave Background/9 Exoplanets/9 Dark Energy/9 Gravitational Waves/10 Exomoon Surveys/11 Far-Side Radio Telescopes/12 Solar-Lens Telescopes/13 Interstellar Probes',
    'lunartally>0 Moon Phases/1 Solstice Markers/1 Rising Points/2 Eclipse Cycles/3 Saros Tables/4 Equatorial Mountings/5 Reflecting Telescopes/6 Astrophotography/7 Variable Stars/8 X-Ray Astronomy/9 Space Interferometers/10 Neutrino Telescopes/11 Lunar Observatories/12 Kuiper Belt Surveys/13 Stellar Cartography'] },
{ k: 'phys', d: 'SC', tag: 'math', fx: 'research craft', a: 'math',
  s: ['{N}: nature turns out to obey a rule nobody had guessed.', 'The experiment is repeated, and {n} holds.', '{N} reach the workshops a generation after the lecture halls.'],
  l: ['math>3 Law of the Lever/3 Buoyancy/4 Impetus/5 Free Fall/5 Inertia/5 Laws of Motion/6 Conservation of Energy/6 Fluid Dynamics/7 Aerodynamics/7 Rocket Equation/8 Orbital Mechanics/9 Space Weather Physics',
    'optics>4 Law of Refraction/5 Wave Theory of Light/6 Polarisation/6 Interference/7 Photoelectric Effect/8 Holography/8 Nonlinear Optics/9 Optical Tweezers/10 Metamaterial Cloaking',
    'electromagnetism>5 Static Electricity/5 Leyden Jars/6 Voltaic Piles/6 Ohm’s Law/6 Induction/6 Maxwell’s Equations/7 Electrons/7 Superconductivity/8 Semiconductor Physics/9 Spintronics/10 Room-Temperature Superconductors',
    'thermodynamics>6 Carnot Cycle/6 Entropy/6 Kinetic Theory/7 Statistical Mechanics/7 Absolute Zero/8 Laser Cooling/9 Bose-Einstein Condensates/10 Quantum Thermodynamics',
    'relativity>7 Radioactivity/7 Atomic Nucleus/7 The Neutron/7 Nuclear Fission/8 Quarks/8 Standard Model/9 Higgs Boson/10 Quantum Gravity Tests/11 Dark Matter Detection/12 Unified Field Theory/13 Vacuum Engineering',
    'quantummech>7 Uncertainty Principle/7 Antimatter Predicted/8 Quantum Electrodynamics/8 Tunnelling Microscopes/9 Entanglement Tests/9 Quantum Teleportation/10 Topological Qubits/11 Quantum Memory/12 Macroscopic Superposition'] },
{ k: 'chem', d: 'SC/CR', tag: 'craft', fx: 'craft research', a: 'chemistry', rel: 1,
  x: ['Alum;;dyes;2', 'Saltpetre;;gunpowder;4', 'Sulphuric Acid;;chemistry;5', 'Nitric Acid;;chemistry;5', 'Soda Ash;;chemistry;5', 'Potash;;chemistry;5', 'Hydrochloric Acid;;chemistry;6', 'Bleach;;chemistry;6', 'Ammonia;;chemistry;6',
    'Chlorine;;chemistry;6', 'Caustic Soda;;chemistry;6', 'Phosphoric Acid;;chemistry;6', 'Benzene;;synthdyes;6', 'Ethylene;;refinery;7', 'Methanol;;refinery;7', 'Urea;;fertilizer;7', 'Hydrogen Peroxide;;chemistry;7', 'Titanium Dioxide;;titanium;8', 'Silicones;;plastics;8', 'Lithium Carbonate;;batteries;9'],
  v: ['0|{X} Preparation|Chemists learn to make {x} pure and on purpose.', '1|{X} Works|{X} made by the ton in works by the river.', '2|Continuous {X} Plants|{X} flows out of the plant day and night instead of by the batch.',
    '2|Catalytic {X}|A catalyst makes {x} at half the heat and pressure.', '3|High-Purity {X}|{X} clean to a few parts in a million, for the most exacting work.', '4|Green {X}|{X} made with clean power and no waste stream.', '5|Electrosynthesised {X}|{X} built straight from air, water and electricity.'] },
{ k: 'earth', d: 'SC', tag: 'nature', fx: 'research drought', a: 'mapmaking',
  s: ['{N}: the land, sea and air are a little better understood.', 'With {n}, the weather and the ground hold fewer surprises.', '{N} are taught in every school within a generation.'],
  l: ['mapmaking>2 Itinerary Maps/3 World Maps/4 Portolan Coasts/5 Triangulation/5 Contour Lines/6 Geological Maps/6 Ordnance Surveys/7 Aerial Survey/8 Satellite Mapping/9 Lidar Mapping/10 Live Planetary Twins',
    'meteorology>6 Weather Charts/6 Storm Warnings/7 Weather Balloons/7 Air Masses/8 Numerical Forecasting/8 Weather Radar/9 Ensemble Forecasts/10 Hyperlocal Forecasts',
    'geology>6 Stratigraphy/6 Ice Ages/7 Continental Drift/8 Plate Tectonics/8 Seafloor Spreading/9 Earthquake Early Warning/10 Volcano Forecasting',
    'evolution>6 Fossil Record/7 Population Genetics/8 Molecular Clocks/8 Ecosystems Ecology/9 Biodiversity Surveys/10 De-Extinction'] },
// end of families
];

function genInventions() {
  const DOM = { FO: J.FORAGE, HU: J.HUNT, FI: J.FISH, FA: J.FARM, HE: J.HERD, WO: J.WOOD, ST: J.STONE, CL: J.CLAY, MI: J.MINE, BU: J.BUILD, CR: J.CRAFT, TR: J.TRADE, SC: J.SCHOLAR, SO: J.SOLDIER, SE: J.SERVICE, SA: J.SAILOR, GA: J.GARDEN };
  const ore = (k, n) => [t => t.near[k] > 0 || t.stock[R[k.toUpperCase()]] > 0, n + ', mined or traded'];
  const COND = {
    coast: [t => t.near.coast > 0, 'Lives on a coast'], river: [t => t.near.river > 0, 'Lives on a river'], water: [t => t.near.water > 0, 'Lives by water'],
    snow: [t => W.temp[t.i] < 0.55, 'Lives where it snows'], warm: [t => W.temp[t.i] > 0.62, 'Lives where it is warm'], horse: [t => t.near.horse > 0, 'Wild horses nearby'],
    copper: ore('copper', 'Copper'), tin: ore('tin', 'Tin'), iron: ore('iron', 'Iron'), coal: ore('coal', 'Coal'), oil: ore('oil', 'Oil'), gold: ore('gold', 'Gold'),
    salt: ore('salt', 'Salt'), sulfur: ore('sulfur', 'Sulphur'), gems: ore('gems', 'Gems'), uranium: ore('uranium', 'Uranium'),
  };
  // the same cost ranges as inventions.js
  const DIFF = [[1000, 2400], [1800, 3600], [4000, 7500], [9000, 15000], [14000, 28000], [32000, 52000], [88000, 150000], [200000, 320000], [650000, 950000], [2000000, 2400000], [5000000, 5600000], [9500000, 12000000], [16000000, 22000000], [28000000, 40000000]];
  const STEP = [100, 100, 100, 500, 500, 1000, 5000, 5000, 10000, 100000, 100000, 100000, 1000000, 1000000];
  const TAG_OK = 'nature farm warm war metal med sky sea math machine elec lore law build urban trade craft energy'.split(' ');
  // What all of them together may do to a town that knew every one: multipliers above 1 are good, below 1 are 'less of it'; happy/order add.
  // Never cargo, speed or seaRange: those compound into ship and plane capacity.
  const CAP = { farm: 1.25, forage: 1.25, hunt: 1.25, fish: 1.25, herd: 1.25, wood: 1.25, mine: 1.25, build: 1.25, craft: 1.25, trade: 1.2, store: 1.2, research: 1.15, spread: 1.15, defend: 1.2, attack: 1.2, recover: 1.2, famine: 1.2, reserve: 1.15,
    health: 0.82, infant: 0.85, plague: 0.82, spoil: 0.82, deplete: 0.85, cold: 0.82, drought: 0.85, contagion: 0.85, fire: 0.85 };
  const ADD = { happy: 4, order: 5 }, PER_FAM = 1.08;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const fill = (s, X, x) => s.split('{X}').join(X).split('{x}').join(x);
  const eraOf = {}, names = new Set();
  for (const T of TECHS) { eraOf[T.id] = T.era; names.add(T.name.toLowerCase()); }
  const mine = [], famsOf = {};
  for (const F of GEN_FAMILIES) {
    const [d1, d2] = F.d.split('/'), mil = F.tag.endsWith('!'), tag = mil ? F.tag.slice(0, -1) : F.tag, keys = F.fx ? F.fx.split(' ') : [];
    if (DOM[d1] === undefined || (d2 && DOM[d2] === undefined) || !TAG_OK.includes(tag)) throw new Error('bad gen family: ' + F.k);
    for (const k of keys) { if (!CAP[k] && !ADD[k]) throw new Error('bad gen fx: ' + F.k + ' ' + k); (famsOf[k] = famsOf[k] || new Set()).add(F.k); }
    // every ladder as a list of steps
    const ladders = [];
    if (F.l) F.l.forEach((L, li) => {
      const gt = L.indexOf('>'), head = L.slice(0, gt).split(';'), cond = head[1] || F.c || '';
      const steps = L.slice(gt + 1).split('/').map((s, si) => {
        const sp = s.indexOf(' '), [name, ds] = s.slice(sp + 1).split('='), id = 'g_' + F.k + li + '_' + si;
        const desc = ds || fill(F.s[Math.floor(hash(id) * F.s.length)], '', '').split('{N}').join(name).split('{n}').join(name.toLowerCase());
        return { id, era: +s.slice(0, sp), name, desc, cond };
      });
      ladders.push({ anchor: head[0] || F.a, steps });
    });
    else F.x.forEach((it, li) => {
      const [raw, ic, ia, ie] = it.split(';'), X = raw.replace('*', ''), x = raw[0] === '*' ? X : X.toLowerCase(), base = F.rel ? +ie : 0;
      const steps = [];
      F.v.forEach((v, si) => {
        const [e, n, d, vc] = v.split('|'), [eo, emin] = e.split('>'), era = Math.max(base + +eo, +(emin || 0));
        if (era > 13 || (!F.rel && ie && era < +ie)) return;
        const id = 'g_' + F.k + li + '_' + si, alts = d.split('^');
        steps.push({ id, era, name: fill(n, X, x), desc: fill(alts[Math.floor(hash(id) * alts.length)], X, x), cond: vc || ic || F.c || '' });
      });
      ladders.push({ anchor: ia || F.a, steps });
    });
    // each step needs the last one it could have learned in the same ladder (same place or none), the first needs the anchor;
    // about one in seven also needs a step from a ladder made earlier in the family
    const made = [];
    for (const L of ladders) {
      const got = [];
      L.steps.forEach((s, si) => {
        if (names.has(s.name.toLowerCase())) return;
        let prev = null;
        for (let q = got.length - 1; q >= 0; q--) if (!got[q].ck || got[q].ck === s.cond) { prev = got[q]; break; }
        const req = prev ? [prev.id] : L.anchor.split('+');
        for (const r of req) if (eraOf[r] === undefined) throw new Error('bad gen req: ' + s.id + ' ' + r);
        let era = s.era;
        for (const r of req) if (eraOf[r] > era) era = eraOf[r];
        if (made.length && hash(s.id + 'x') < 0.15) {
          const o = made[Math.floor(hash(s.id + 'y') * made.length)];
          for (let q = o.length - 1; q >= 0; q--) if (o[q].era <= era && (!o[q].ck || o[q].ck === s.cond)) { if (!req.includes(o[q].id)) req.push(o[q].id); break; }
        }
        const T = { id: s.id, name: s.name, era, dom: DOM[d1], diff: 0, req, fx: {}, desc: s.desc, side: 1, tag };
        if (d2) T.alt = DOM[d2];
        if (mil) T.mil = 1;
        if (s.cond) { const c = COND[s.cond]; if (!c) throw new Error('bad gen cond: ' + s.id + ' ' + s.cond); T.cond = c[0]; T.condText = c[1]; }
        // cost: somewhere in the age's range, a little higher further up the ladder
        const [lo, hi] = DIFF[era], st = STEP[era], f = Math.min(1, 0.15 + 0.55 * hash(s.id) + 0.3 * si / Math.max(1, L.steps.length - 1));
        T.diff = Math.round((lo + (hi - lo) * f) / st) * st;
        T._k = keys.length && hash(s.id + 'f') >= 0.18 ? keys[Math.floor(hash(s.id + 'k') * keys.length)] : null;
        eraOf[s.id] = era; names.add(s.name.toLowerCase());
        const g = { id: s.id, era, ck: s.cond };
        got.push(g); mine.push(T);
      });
      made.push(got);
    }
  }
  // share each key's budget out evenly: a little per family that uses it, never past the cap
  const count = {};
  for (const T of mine) if (T._k) count[T._k] = (count[T._k] || 0) + 1;
  const val = {};
  for (const k in count) {
    const nf = famsOf[k].size;
    if (ADD[k]) val[k] = Math.round(ADD[k] / count[k] * 1e5) / 1e5;
    else if (CAP[k] > 1) val[k] = Math.round(Math.pow(Math.min(CAP[k], Math.pow(PER_FAM, nf)), 1 / count[k]) * 1e6) / 1e6;
    else val[k] = Math.round(Math.pow(Math.max(CAP[k], Math.pow(1 / PER_FAM, nf)), 1 / count[k]) * 1e6) / 1e6;
  }
  for (const T of mine) { if (T._k) T.fx[T._k] = val[T._k]; delete T._k; TECHS.push(T); }
  return mine.length;
}

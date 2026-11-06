'use strict';
// Regional gear: what peoples who live in the cold, the desert, the jungle, the mountains, the steppe and on the sea coast work out
// for fighting and travelling there. Same format as GEN_FAMILIES in techgen.js; cl is the home climate (climate.js) that each family
// belongs to, and climate.js swaps the placeholder cond for one that only towns living in that climate (or realms holding it) pass.
GEN_FAMILIES.push(
// ---- the cold ----
{ k: 'dcold', d: 'CR/SO', tag: 'warm!', fx: 'cold recover', a: 'hides', c: 'snow', cl: 0,
  s: ['{N}: a host from the cold country keeps its fingers and toes through the winter.', 'With {n}, the winter road kills fewer of the men who march it.', '{N}, learned the hard way, one frozen winter after another.'],
  l: ['hides>0 Fur Parkas=A hooded coat of fur, worn hair inwards, that a hunter can sleep out in./1 Felt Boots=Boots of thick pressed wool that the frost cannot get through./2 Fur-Lined Hoods/3 Sheepskin Greatcoats/4 Quilted Winter Coats/5 Fur Greatcoats=A long coat with a fur collar and lining: the sentry lives to the end of his watch./6 Winter Greatcoats/7 Padded Winter Uniforms/8 Arctic Parkas/9 Heated Field Suits/10 Smart-Fibre Arctic Kit',
    'fire>0 Snow Shelters=A hollow dug in a drift, roofed with blocks: warmer inside than any tent./1 Winter Lodges/2 Winter Camps/3 Winter Quarters=The host settles in for the cold months in huts it builds itself, and comes out in spring still a host./4 Heated Barrack Huts/5 Stove Tents/6 Dugout Winter Lines/7 Heated Dugouts/8 Insulated Field Shelters/9 Arctic Field Modules',
    'medicine>3 Frostbite Lore=Rub the frozen hand with snow and it dies; warm it slowly and it may be saved./4 Goose-Grease Salves/5 Frost Surgeons/6 Winter Field Kitchens=Hot soup brought up to the line keeps men alive where cold bread would not./7 Hot-Ration Tins/8 Cold-Injury Medicine/9 Field Rewarming Units'] },
{ k: 'dcoldw', d: 'SO/CR', tag: 'war!', fx: 'defend attack', a: 'snowshoes', c: 'snow', cl: 0,
  s: ['{N}: the cold country fights best in its own winter.', 'An invader who meets {n} in the snow learns why the locals wait for January.', '{N}, and the snow becomes an ally.'],
  l: ['snowshoes>0 Hunting Skis=Long boards under the feet, and the hunter outruns the elk in deep snow./1 War Skis/2 Ski Scouts/4 Ski Couriers/5 Ski Troops=Riflemen on skis who come out of the forest, strike and are gone before the column can turn./6 Ski Battalions/7 Ski Patrols/8 Arctic Rangers/9 Arctic Commandos',
    'sledges>0 Dog Sledges/1 Reindeer Sledges/2 Baggage Sledges=The army’s food goes on runners in winter, and moves faster than it ever did on wheels./3 Horse Sleighs/4 Sledge Trains/5 Winter Supply Sledges/6 Ski Ambulances/7 Motorised Sledges/8 Oversnow Carriers/9 Tracked Snow Vehicles/10 Autonomous Snow Haulers',
    'gunpowder>4 Waxed Powder Flasks/5 Winter Lock Grease=A thin grease that does not freeze, and the lock still sparks at thirty below./6 Cold-Weather Gun Oil/7 Winterised Machine Guns/8 Arctic Lubricants/9 Cold-Start Engines',
    'weaving>2 White Winter Cloaks/5 Snow Smocks/6 Snow Camouflage=White over everything, and a whole company vanishes into a snowfield./7 Winter Camouflage Nets/8 White-Washed Armour/9 Thermal-Masking Snow Suits'] },
// ---- the desert ----
{ k: 'ddes', d: 'SO/HE', tag: 'war!', fx: 'recover attack', a: 'camels', c: 'warm', cl: 2,
  s: ['{N}: the desert peoples cross what kills everyone else.', 'With {n}, a host can live a week from the nearest well.', '{N}, and the sand becomes a road for those who know it.'],
  l: ['camels>2 Pack Camel Trains=A string of camels carries the army’s water and grain where no cart can go./3 War-Camel Saddles/4 Camel Lancers/5 Camel Corps=Riflemen mounted on camels, who can ride three days without water and fight at the end of it./6 Camel Gun Batteries/7 Desert Motor Patrols/8 Long-Range Desert Groups/9 Desert Strike Vehicles',
    'wells>1 Water Skins=Goatskins sewn tight and carried full: a day’s water for every man./2 Campaign Water Skins/3 Well Lore of the Sands/4 Cisterns on Campaign=Every halt on the road has a cistern dug and filled ahead of the host./5 Water Caravans/6 Water Carts/7 Water Tankers/8 Desert Water Purifiers/9 Solar Stills',
    'weaving>1 Desert Robes=Loose, long and pale: robes that keep the sun off and the cool in./3 Sand Veils/4 Layered Desert Robes/6 Sun Helmets/7 Khaki Drill/8 Desert Camouflage/9 Cooling Vests',
    'mapmaking>2 Star-Steered Marches=Across open sand the host marches by night, steering by the stars./3 Oasis Charts/4 Desert Guides/6 Desert Survey Maps/7 Sun Compasses/8 Desert Navigation Sets',
    'medicine>3 Heatstroke Lore/4 Salt Rations/5 Desert Field Surgeons/8 Oral Rehydration Salts/9 Heat-Casualty Wards'] },
// ---- the jungle ----
{ k: 'djun', d: 'SO/HU', tag: 'war!', fx: 'defend attack', a: 'bow', c: 'warm', cl: 3,
  s: ['{N}: the forest folk fight where an outsider cannot see ten yards.', 'With {n}, the jungle hides its own and swallows strangers.', '{N}, worked out on trails no map shows.'],
  l: ['bow>0 Blowpipes=A long hollow cane and a dart tipped with poison, silent at forty paces./1 Poison Darts/2 Jungle Ambushes/3 Jungle Trails/4 Bush Scouts/6 Jungle Drill=Troops taught to move, see and shoot in close cover, and to keep their heads when they cannot see the enemy./7 Jungle Warfare Schools/8 Jungle Patrols/9 Jungle Long-Range Patrols',
    'iron>3 Bush Knives/4 Jungle Cutlasses/5 Machetes=A long heavy blade that clears a path, builds a shelter and serves as a weapon at need./6 Trail-Cutting Parties/7 Jungle Pioneers/8 Jungle Engineer Teams',
    'rafts>1 Dugout War Canoes/2 River Raiders/4 Jungle River Flotillas/6 River Gunboats/7 Riverine Patrols/8 Swamp Hovercraft'] },
{ k: 'djunh', d: 'SE/SO', tag: 'med!', fx: 'health recover', a: 'herbs', c: 'warm', cl: 3,
  s: ['{N}: the fevers of the wet forest kill fewer of the men who march into it.', 'With {n}, a host survives the jungle long enough to fight in it.', '{N}, and the sick lists grow shorter.'],
  l: ['herbs>0 Fever Barks/1 Insect Smokes=Green wood on the fire at dusk, and the biting things keep their distance./2 Fever Lore/3 Bark Infusions/4 Fever Camps on High Ground',
    'quinine>5 Quinine on Campaign=A daily dose of bitter bark in the soldiers’ gin, and the fever lists halve./6 Mosquito Nets/7 Antimalarial Tablets/8 Insect Repellents/9 Malaria Prophylaxis Kits',
    'weaving>1 Woven Hammocks=Slung between two trees, off the wet ground and away from the crawling things./2 Raised Sleeping Platforms/3 Jungle Hammocks/6 Jungle Boots/7 Jungle Greens/8 Jungle Hammock Shelters/9 Quick-Drying Jungle Kit'] },
// ---- the mountains ----
{ k: 'dmtn', d: 'SO/ST', tag: 'war!', fx: 'defend recover', a: 'tracking', cl: 5,
  s: ['{N}: the highlanders hold their passes against anyone.', 'With {n}, the mountain fights for the people who live on it.', '{N}, learned on slopes where a misstep is the last one.'],
  l: ['tracking>0 Goat Paths=The herders know every ledge a goat can use, and so can a raider./1 Mountain Scouts/2 Hill Fighters/3 Mountain Slingers/4 Highland Levies/5 Mountain Companies/6 Mountain Troops=Light infantry raised in the hills, who climb all day and still shoot straight./7 Mountain Divisions/8 Alpine Commandos/9 High-Altitude Warfare',
    'mules>2 Mule Trains=Sure-footed mules carry the army over passes no cart can climb./3 Pack Saddles/4 Mountain Supply Trains/6 Aerial Ropeways/8 Mountain Helicopter Supply',
    'gunpowder>4 Mountain Guns/5 Mule-Packed Cannon/6 Pack Artillery=Guns that come apart into mule-loads, and go back together on a ridge in minutes./7 Mountain Howitzers/8 Light Mountain Mortars',
    'hides>0 Hide Climbing Lines/2 Climbing Staffs/3 Iron Crampons/4 Pitons=Iron spikes hammered into the rock: a rope can be fixed where there is no ledge at all./5 Hobnailed Boots/6 Ice Axes/7 Mountain Climbing Kit/8 Nylon Climbing Ropes/9 Lightweight Alpine Gear',
    'medicine>3 Mountain Sickness Lore/4 Coca-Leaf Rations/5 Altitude Acclimatisation=A host that climbs slowly, and rests a day at every height, arrives able to fight./7 High-Altitude Rations/8 Field Oxygen Bottles/9 Altitude Medicine',
    'masonry>2 Pass Watchtowers/3 Mountain Strongholds/4 Pass Fortresses/6 Mountain Redoubts/7 Rock-Cut Bunkers/8 Fortified Mountain Tunnels'] },
// ---- the steppe ----
{ k: 'dstep', d: 'HE/SO', tag: 'war!', fx: 'attack recover', a: 'riding', cl: 4,
  s: ['{N}: the grass peoples ride rings round anyone on foot.', 'With {n}, the open plain belongs to the riders who grew up on it.', '{N}, passed from father to son in the saddle.'],
  l: ['riding>2 Steppe Horse Archers=Riders who shoot at the gallop, forwards, sideways and back over the horse’s tail./3 Horn-and-Sinew Bows/3 Archers’ Thumb Rings/4 Steppe War Saddles/5 Stirrup Archery/6 Steppe Lancers/7 Steppe Machine-Gun Carts/8 Steppe Motor Rifles/9 Open-Plain Armour Tactics',
    'horsebreeding>2 Remounts=Every rider leads three or four spare horses, and changes to a fresh one at need./3 Spare-Horse Strings/4 Remount Herds/5 Remount Depots/6 Steppe Stud Herds/7 Cavalry Remount Service',
    'husbandry>1 Mare’s-Milk Rations/2 Dried Curd Rations=Curd dried hard in the sun: a rider’s food for a month, carried in the saddlebag./3 Felt War Tents/4 Yurt Camps/5 Moving Camps/6 Steppe Supply Herds',
    'tracking>0 Grass-Fire Tactics/1 Steppe Scouts/2 Feigned Flight/3 Encircling Hunts=The great hunt that rings a whole plain with riders, and drills a host for war./4 Hunting-Ring Drill/5 Steppe Outriders/7 Deep Cavalry Raids/8 Mechanised Steppe Columns',
    'mapmaking>2 Arrow Messengers/3 Steppe Relay Posts/4 Relay Riders=Fresh horses at every post, and a message crosses the grassland in days, not weeks./5 Smoke-Signal Chains/6 Steppe Telegraph Posts'] },
// ---- the sea coast ----
{ k: 'dsea', d: 'SA/SO', tag: 'sea!', fx: 'attack recover', a: 'rafts', c: 'coast', cl: 6,
  s: ['{N}: the sea peoples come ashore ready to fight.', 'With {n}, a landing is a battle the coast folk know how to win.', '{N}, learned on a hundred beaches.'],
  l: ['rafts>0 Beach Raids=Boats run up on the shingle at dawn, and the raiders are among the huts before anyone wakes./1 Sea Raiders/2 Shore Landings/3 Ship-Borne Infantry/4 Sea Soldiers/5 Marines=Soldiers who live aboard, fight from the rigging and are first onto the beach./6 Marine Regiments/7 Amphibious Brigades/8 Marine Commandos/9 Expeditionary Marines',
    'ships>2 Beaching Galleys/3 Horse Transports/4 Landing Boats/5 Flat-Bottomed Landing Boats/6 Steam Landing Barges/7 Landing Craft=Boxes with an engine and a ramp: run onto the beach, drop the front, and the men are ashore dry./8 Amphibious Tractors/9 Hovercraft Landings/10 Tilt-Rotor Assault',
    'navigation>5 Tide Tables for Landings/6 Beach Surveys=Boats sent in by night to sound the shore and mark the sandbars, before the fleet comes./7 Combined Operations/8 Amphibious Doctrine/9 Littoral Warfare',
    'fishing>0 Surf Craft/1 Seamanship Drill/2 Ship-to-Shore Signals/4 Boarding Parties/6 Shore Bombardment Drill/8 Naval Gunfire Support'] }
);

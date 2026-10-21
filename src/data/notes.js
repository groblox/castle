// Notes for the side panel. Paragraph markup:
//   {@sourceId}  -> numbered citation to SOURCES
//   [[conj]]     -> "conjecture" badge (where evidence is thin or the scene invents)
// Each entry: { terms, body: [paragraphs], also: [{type, id}] }

export const ABOUT = {
  title: 'Aberwen Castle, c. 1290',
  terms: 'A fictional castle, after Harlech, Conwy and Beaumaris',
  body: [
    'Aberwen is invented, but built to the pattern of the castles Edward I raised in North Wales after the war of 1282–3. Its high inner curtain has round corner towers and a great twin-towered gatehouse, wrapped in a lower outer curtain to make a concentric plan {@taylorKW} {@wikiHarlech}. Beaumaris, the most regular of these plans, was only begun in 1295; its layout is borrowed here {@wikiBeaumaris}.',
    'The castle is cut through the gate passage, the well and the great hall. Cut stone is shown in section fill, with rubble in the core and bedrock below. The courtyard walls of the north range and services are cut down to sill height so their rooms can be seen.',
    'The scene is a morning in late autumn, before dinner, which was eaten in the late morning {@woolgarHousehold}. Fires are lit, bread is baking, the brew is on, stores are arriving by cart, and ale and bread are going through to the hall.',
    'Where the evidence is thin, or the scene has had to invent, the notes say so with a [[conj]] mark. The real Edwardian castles survive as ruins, and their kitchens and stores mostly as footings, so the fittings and arrangement inside are reconstructions from household records, comparable buildings and later practice.',
  ],
};

export const ROOM_NOTES = {
  kitchen: {
    terms: 'Latin coquina; Anglo-Norman quisine',
    body: [
      'The great kitchen stands against the north curtain, as Conwy\'s kitchen does on the north side of its outer ward {@gatehouseConwy}. Its two fireplaces are built into the thickness of the curtain, with flues rising to chimneys on the wall-walk, and a louvre in the roof carries off the rest of the smoke and heat. The fireplace and louvre arrangement is [[conj]].',
      'One hearth is for roasting. Joints turn on a spit before the fire, supported on stands (cob-irons), with a dripping pan beneath {@brears} {@drippingPan} {@cobiron}. The other is for boiling. A great cauldron hangs from a pot-bar over the fire for pottage and boiled meat, and a three-legged posnet stands at its edge.',
      'The cook works at the dressing board, where dishes were made ready (dressed) before going to the hall. Pottage herbs (worts), onions and leeks, eggs, a joint of beef and the mortar for grinding sauces show the range of a morning\'s work {@woolgarFood}. There are no New World foods: no potatoes, maize, tomatoes or turkeys.',
      'Water comes from the well in pails to the stone trough. Fuel is stacked by the door: wood and faggots were bought in vast quantities {@brears}.',
    ],
    also: [{ type: 'mech', id: 'spit' }, { type: 'person', id: 'cook' }, { type: 'person', id: 'scullion' }, { type: 'person', id: 'spitBoy' }],
  },
  bakehouse: {
    terms: 'Latin pistrina',
    body: [
      'Bread was the staple of the household, and a castle needed its own bakehouse. Conwy has a bakehouse tower with a domed oven behind its ground-floor fireplace {@gatehouseConwy}. Here the oven is a beehive dome on a solid base, cut in half to show its interior.',
      'Dough was mixed and left to rise in the kneading trough and shaped on the moulding board. Meal could be sifted to finer flour in a bolting hutch. Bread came in grades, from fine white for the high table to coarse loaves for the household {@woolgarFood}.',
      'The oven is fired with faggots of brushwood, stacked here, which burn inside the dome itself. The bread then bakes in the stored heat {@faggotOven}.',
    ],
    also: [{ type: 'mech', id: 'oven' }, { type: 'person', id: 'baker' }],
  },
  brewhouse: {
    terms: 'Latin bracinum',
    body: [
      'Ale was the household\'s everyday drink. Without hops it soured within days, so it had to be brewed often {@bennett}. Hopped beer reached England only in the fifteenth century, so there are no hops here.',
      'Walter of Bibbesworth, writing in the mid-thirteenth century, describes the sequence {@bibbesworth}. Grain is steeped, then spread to sprout on an upper floor (the loft here) and dried in a kiln to make malt, which is ground. The malt is mashed with hot water in the mash tun, and the wort is drawn off into the underback. It is cooled in shallow coolers and set to work with barm (yeast) in the working vats.',
      'The water is heated in a great metal vessel, the lead, set over a furnace. The furnace, lead and vessel arrangement follows later brewhouse practice and is [[conj]].',
    ],
    also: [{ type: 'person', id: 'brewer' }],
  },
  granary: {
    terms: 'Store-house; Latin granarium',
    body: [
      'Harlech\'s inner ward had a granary among its buildings {@wikiHarlech}. Here a store-house with a grain loft stands in the north range, beside the gatehouse. Its position, and the raised loft to keep grain dry, are [[conj]].',
      'Wheat for bread, barley and oats for malt, salt and other dry stores are brought up by cart, checked in by a clerk with a notched tally, and written into the accounts {@clanchy} {@woolgarAccounts}. Edward\'s Welsh castles were also supplied by sea, Harlech famously from Ireland during the siege of 1294–95 {@wikiHarlech}.',
      'The gatehouse is hidden while you look in here, because the store-house lies directly behind it.',
    ],
    also: [{ type: 'person', id: 'clerk' }, { type: 'person', id: 'carter' }, { type: 'person', id: 'rat' }],
  },
  larder: {
    terms: 'Anglo-Norman lardier, from lard (bacon)',
    body: [
      'The larder held meat and fish, much of it salted for keeping. Its name comes from lard, bacon fat. Flitches of bacon and hams hang from the beams, salted beef and pork sit in powdering tubs under brine or a weighted lid, and pork joints lie in the salting trough in a bed of salt {@brears}.',
      'Fresh meat came in on the hoof or as carcasses. A dressed sheep hangs from a gambrel by the block where it will be cut into joints. Mallard and a hare hang to age, and loops of puddings, sausages of blood or offal with oatmeal and suet, hang beside the bacon {@woolgarFood}. Crocks of salted butter and rendered fat stand on the shelves. The exact stock on any one morning is [[conj]].',
      'The Church\'s many fish days (Fridays, Lent and other fasts) were met with barrelled herring and dried stockfish {@woolgarFood}. In a royal household the larder had its own serjeant, the larderer {@ordinance1318}.',
      'The rats are black rats; the brown rat did not reach Britain until the eighteenth century {@rats}.',
    ],
    also: [{ type: 'person', id: 'rat' }, { type: 'person', id: 'cat' }],
  },
  pantry: {
    terms: 'Anglo-Norman paneterie, from pain (bread)',
    body: [
      'The pantler kept the bread, the salt, the trenchers and the table linen {@brears} {@woolgarHousehold}. Loaves of different qualities wait on the shelves. Trenchers, thick slices of stale bread used as plates, are cut at the table, and the napery chest holds cloths and towels.',
      'Pantry and buttery stand side by side at the lower end of the hall, entered from the screens passage. This is the standard arrangement of a medieval hall {@brears}. The chamber over them is [[conj]].',
      'Where cheese was kept varied between households; it is shown here on a pantry shelf [[conj]].',
    ],
    also: [{ type: 'person', id: 'pantler' }],
  },
  buttery: {
    terms: 'Anglo-Norman boterie, from bouteille (bottle) or but (cask)',
    body: [
      'The butler kept the ale and wine and the vessels to serve them. The word comes from the cask, not from butter {@brears}. Casks of ale lie on stillages along the wall, with a pipe of wine at the back. Jugs stand ready on the cupboard, a word that at first meant just that: a board for cups.',
      'Ale was drawn as needed through a wooden spigot and faucet {@med}. In a royal household the office was split between a chief butler, who bought the wine, and household butlers {@ordinance1318}.',
      'Many of the jugs in Welsh and English castles were glazed wares, some of them imported from south-west France along with the Gascon wine. The colours here are [[conj]].',
    ],
    also: [{ type: 'mech', id: 'tap' }, { type: 'person', id: 'butler' }],
  },
  undercroft: {
    terms: 'Undercroft; cellar',
    body: [
      'Beneath the timber floor of the hall lies a storage cellar, partly cut into the rock. Conwy has a cellar below its hall range, reached by stone steps {@gatehouseConwy}.',
      'Wine came from Gascony by sea in tuns of about 252 gallons and in pipes of half that size. Here tuns and pipes lie on timber stillages, with ale barrels and sacks of dry goods.',
      'The trapdoor and hoist in the hall floor above are [[conj]]: casks were also rolled in on skids by a door at floor level.',
    ],
    also: [{ type: 'mech', id: 'hoist' }, { type: 'person', id: 'rat' }],
  },
  well: {
    terms: 'Well; well-house',
    body: [
      'Water could decide a siege, so every castle had a well sunk through the rock to water. Conwy\'s stone-lined well is about 91 feet deep {@gatehouseConwy}. This one is about 25 metres to the water and is cut in half to show its whole depth.',
      'The upper shaft is lined with stone where it passes through loose ground, then cut through bare rock. A timber well-house over the head carries the windlass. The details of the well-house are [[conj]].',
      'Water drawn here was carried in pails to the kitchen, the brewhouse and the bakehouse.',
    ],
    also: [{ type: 'mech', id: 'windlass' }, { type: 'person', id: 'waterCarrier' }],
  },
  hall: {
    terms: 'Latin aula',
    body: [
      'The great hall was where the household ate together at trestle tables, cleared away after meals. The lord and his guests sat on the dais at the upper end, which lies in the removed half of the castle {@woolgarHousehold}.',
      'At the lower end a timber screen hides the screens passage. Doors from it lead to the buttery and pantry, and the main door opens to the courtyard. The hall is heated by a fireplace with a hood in the curtain wall and lit by tall windows to the courtyard. Its open timber roof is of a [[conj]] form.',
      'Tables are being laid for dinner with cloths and trenchers, and the butler and pantler come and go with ale and bread.',
    ],
    also: [{ type: 'person', id: 'butler' }, { type: 'person', id: 'pantler' }],
  },
  chamber: {
    terms: 'Chamber',
    body: [
      'A chamber over the services, reached from the hall, is a common arrangement. Who used it here is [[conj]]: perhaps the constable or an officer of the garrison.',
      'In Edward\'s Welsh castles the finest lodgings were often in the great gatehouse {@wikiHarlech}.',
    ],
  },
  gatehouse: {
    terms: 'Gatehouse',
    body: [
      'The great gatehouse is modelled on Harlech\'s. Two D-shaped towers face the field, and the passage between them is closed by doors and three portcullises and overlooked by murder holes {@wikiHarlech}.',
      'Above the passage are two floors of chambers with fireplaces and large windows to the ward, high-status lodgings for the constable or the king. Historians disagree about who used which floor {@wikiHarlech}.',
      'The cut runs down the middle of the gate passage, showing the vault, the portcullis grooves and the chambers above.',
    ],
  },
  ward: {
    terms: 'Inner ward; bailey',
    body: [
      'The inner ward is the courtyard within the high inner curtain, ringed by the main buildings: hall, services, kitchen, stores and chapel {@wikiHarlech}. The chapel and the southern ranges lie in the removed half.',
      'Edward\'s castles were not grey. Conwy was rendered and limewashed white {@cadwConwy}; the stone colours here are left as stone so that the masonry reads.',
    ],
  },
  outerWard: {
    terms: 'Outer ward; outer curtain',
    body: [
      'In a concentric castle a lower outer curtain wraps the inner one, so that defenders on both walls can shoot at once {@taylorKW}. The narrow space between them is the outer ward.',
      'Beyond the outer gate a timber bridge crosses a rock-cut ditch.',
    ],
  },
};

export const MECH_NOTES = {
  windlass: {
    terms: 'Windlass; Latin tornus',
    body: [
      'A horizontal drum, turned by iron cranks at each end, winds and unwinds the well rope {@wikiWindlass}. The bucket\'s own weight takes it down, so the winder only has to steady the crank or brake the drum. Winding up a full bucket from 25 metres takes dozens of turns.',
      'The hand crank was known in Europe from the 9th century but spread slowly {@white}. A cranked windlass on a well in 1290 is plausible but [[conj]]; a spoked wheel or handspikes would be just as likely.',
      'Drag a crank up or down to turn it, or use the buttons. Let the bucket down, wind it up full and empty it into the trough.',
    ],
  },
  spit: {
    terms: 'Spit (broche); cob-irons; dripping pan',
    body: [
      'Meat was roasted on an iron spit before an open fire, resting on stands at a height to suit the heat, with a dripping pan below to catch the fat for basting {@brears} {@drippingPan}.',
      'Turned steadily, the meat browns evenly. Here each joint records how much heat each side has taken, so stopping the spit lets you watch one side char while the other stays raw.',
      'Turning the spit was a boy\'s job. Turnspit dogs in wheels are first described in the 16th century {@caius}, and weight-driven and smoke jacks are later still.',
    ],
  },
  oven: {
    terms: 'Oven; peel; oven rake (scuffle); malkin',
    body: [
      'Domed bread ovens baked with stored heat {@faggotOven}. The baker fills the oven with brushwood faggots and burns them inside. When the walls whiten he draws the embers out with a rake and swabs the floor with a wet mop, the malkin. The loaves go in on a long wooden peel, and the mouth is shut with a stop sealed with clay or dough. The hot masonry does the rest.',
      'The steps here follow that sequence. Fire the oven, rake out, swab, set the loaves, seal, bake and draw. Times are shortened. A real firing took an hour or more, and large loaves about an hour to bake.',
      'The local cut through the dome is an illustrator\'s device, like the main cut.',
    ],
  },
  hoist: {
    terms: 'Trapdoor; windlass; chime hooks',
    body: [
      'Casks were heavy: a tun of wine weighed about a ton. They were moved by rolling them on their rims and by slings, ropes and simple machines.',
      'Here a hatch in the hall floor opens onto the undercroft. A hand windlass on a frame above raises a cask slung by chime hooks gripping its projecting ends. Windlasses and pulleys were everyday building-site machinery, but this particular arrangement is [[conj]] {@wikiWindlass}.',
      'Open the trapdoor first, then wind the cask up.',
    ],
  },
  tap: {
    terms: 'Spigot and faucet; vent peg (spile)',
    body: [
      'Ale was drawn from the cask through a wooden tap low in the head. In medieval usage the spigot and faucet are the peg and the tube; the words were often swapped {@med}. A cask is airtight, so as ale runs out a partial vacuum forms and the flow glugs and stops. A vent peg in the top has to be eased out to let air in.',
      'The butler drove the vent peg home again when he had finished, to keep the ale from going flat and sour. Unhopped ale did not keep long in any case {@bennett}.',
      'Try opening the tap before loosening the vent peg.',
    ],
  },
};

export const PERSON_NOTES = {
  cook: {
    terms: 'Master cook; Latin coquus',
    body: [
      'The cook ran the kitchen under the clerk of the kitchen, who bought and accounted for the food {@woolgarHousehold}. A royal household had separate cooks for the king and for the hall {@ordinance1318}; a castle household might have one master cook and a few helpers.',
      'He wears an apron over his tunic, and a coif.',
    ],
  },
  scullion: {
    terms: 'Scullion; groom of the scullery',
    body: [
      'The scullery (squillery) looked after the pots, pans and dishes, and its grooms and boys did the heaviest work: scouring, fetching fuel and water, tending fires {@ordinance1318} {@woolgarHousehold}.',
    ],
  },
  spitBoy: {
    terms: 'Turnspit; turnbroche',
    body: [
      'The lowest job in the kitchen: sitting by the fire for hours turning the spit by hand. The term turnbroche and the exact arrangement are [[conj]] for 1290; the job itself was done by boys until dogs and jacks took over centuries later {@caius}.',
    ],
  },
  baker: {
    terms: 'Baker; Latin pistor',
    body: [
      'The baker made the household\'s bread from the castle\'s wheat. In the royal household he was a serjeant under the pantry, with a waferer for finer baking {@ordinance1318}.',
    ],
  },
  brewer: {
    terms: 'Brewer or brewster',
    body: [
      'Ale-brewing in medieval England was very often women\'s work: brewster is the feminine form {@bennett}. Great households, however, were overwhelmingly male {@woolgarHousehold}, and a castle\'s brewing may well have been done by men. A woman brewing here is [[conj]].',
      'She stirs the mash, tends the lead and skims the cooling wort before it is set to work with barm {@bibbesworth}.',
    ],
  },
  butler: {
    terms: 'Butler; Latin butellarius',
    body: [
      'The butler kept the buttery, issuing ale and wine and answering for every gallon in the daily account {@woolgarAccounts}. In the royal household a chief butler bought the wine, and serjeant butlers served the household and the king {@ordinance1318}.',
    ],
  },
  pantler: {
    terms: 'Pantler; Latin panetarius',
    body: [
      'The pantler kept the pantry: bread, salt, trenchers and napery. He laid the tables with cloths, salts and bread before each meal {@brears} {@ordinance1318}.',
    ],
  },
  waterCarrier: {
    terms: 'Water carrier',
    body: [
      'Water for cooking, washing and brewing all had to be carried, from the well to the kitchen trough and the brewhouse {@brears}. The job is shown here as a single servant\'s round [[conj]].',
    ],
  },
  clerk: {
    terms: 'Clerk; Latin clericus',
    body: [
      'Clerks kept the household\'s accounts on parchment rolls. Deliveries were also recorded on notched wooden tallies, split so that each party kept a half {@clanchy} {@tally} {@woolgarAccounts}.',
      'Here he notches the tally as each sack goes into the store-house and writes up the delivery. A clerk was often in minor orders and dressed accordingly in a long gown.',
    ],
  },
  watchman: {
    terms: 'Watchman (Latin vigil); a man of the garrison',
    body: [
      'Harlech\'s garrison was set at 36: the constable, thirty men of whom ten were crossbowmen, a chaplain, a smith, a carpenter and a mason {@wikiHarlech}. Some of them were always on watch. Here one man walks the inner wall-walk above the kitchens and another the outer curtain by the gate; the routes and the numbers on watch are [[conj]].',
      'He wears a quilted aketon (gambeson) over his tunic, a mail coif and a broad-brimmed iron kettle hat (chapel de fer), and carries a spear. Foot soldiers equipped like this appear in mid-thirteenth-century pictures {@morganBible}; his exact kit is [[conj]].',
    ],
  },
  crossbowman: {
    terms: 'Crossbowman (arbalaster)',
    body: [
      'Ten of Harlech\'s thirty garrison soldiers were crossbowmen {@wikiHarlech}. This one walks the outer curtain on the west side with his crossbow slung on his back and a quiver of bolts at his hip, stopping at the embrasures to look out. The patrol is [[conj]].',
      'The crossbow has a wooden bow (prod) and a stirrup at its nose. The shooter put his foot in the stirrup to hold the bow down while he drew the string back {@morganBible}.',
    ],
  },
  carter: {
    terms: 'Carter',
    body: ['Grain, malt, salt, fuel and much else came up to the castle by cart from the town and the quay. The carter unloads sacks into the store-house, one at a time on his shoulder {@taylorKW}.'],
  },
  horse: {
    terms: 'Cart-horse',
    body: ['A working horse in the shafts of a two-wheeled cart, in a padded collar. Horse collars of this kind were in use in England by the 13th century; the harness details are [[conj]].'],
  },
  cart: {
    terms: 'Two-wheeled cart',
    body: ['A two-wheeled cart with spoked wheels and a railed bed, loaded with sacks of grain for the store-house.'],
  },
  cat: {
    terms: 'Cat',
    body: ['Cats were kept to keep down rats and mice in the stores. This one prefers the warm hearth, but patrols the larder now and then.'],
  },
  rat: {
    terms: 'Black rat (Rattus rattus)',
    body: ['The rat of medieval Britain was the black rat. The brown rat arrived only in the 18th century {@rats}. Rats in the stores were a constant loss and a reason for keeping cats.'],
  },
};

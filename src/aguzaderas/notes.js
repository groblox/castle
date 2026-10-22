// Notes for the side panel: Castillo de las Aguzaderas. Markup as in
// src/data/notes.js: {@sourceId} cites a source, [[conj]] marks conjecture.

export const ABOUT = {
  title: 'Castillo de las Aguzaderas, c. 1410',
  terms: 'El Coronil, province of Seville; a castle of the Banda Morisca',
  body: [
    'Las Aguzaderas is a real castle, standing in a shallow hollow about 3 km from El Coronil. Unlike most castles it was not built on a height, because its task was to hold a spring: the water for settlers and their stock, and water denied to raiders from the kingdom of Granada {@wikiEs} {@iaph}. A ring of watchtowers on the hills round about kept the wider watch {@wikiEs}.',
    'The place appears in the thirteenth-century Repartimiento of Seville as "Aznalcázar", by the spring, and was given to the cathedral chapter, which carried out works in 1348–1355. The Crown took it in 1355, and in 1388 Juan I granted it to Per Afán de Ribera "because it lay on the frontier with the Moors" {@iaph} {@perafan}. Its keep may be earlier, one of a family of Seville council towers of the early fourteenth century {@molina}.',
    'The scene is set about 1410, while the Ribera held it and the frontier with Granada was still live. The model is cut through the middle of the south curtain, slicing the keep and the two southern corner towers; the albarrana tower at the north-east is cut open too, to show its well.',
    'The plan is measured from the surviving castle {@osm}, and its towers, vaults and keep follow the published descriptions {@iaph} {@tercia}. No measured plan or section has been published online, so all heights and wall thicknesses are estimates from photographs [[conj]]. The towers and merlons were heavily restored in the 1960s, and the merlons’ medieval shape is not certain {@wikiEs} {@tercia}.',
    'Nothing is recorded of the garrison: not the alcaide’s name, nor its numbers, nor how it lived. The people, the fire in the courtyard and the furnishings follow what is known of frontier garrisons generally, and all are [[conj]]. Where the sources disagree, as they do on the gate, the notes say so.',
  ],
};

export const ROOM_NOTES = {
  keep: {
    terms: 'Spanish torre del homenaje',
    body: [
      'The keep stands in the middle of the south curtain, half within the courtyard and half beyond the wall: unusually, it sticks out of the circuit {@tercia} {@osm}. It is about 11 m square, on a rubble podium about a metre high, with dressed stone at its corners, its plinth and its door {@molina} {@iaph}.',
      'It has two storeys, each a single chamber under a sail vault (bóveda vaída): a shallow dome rising from the four corners {@iaph}. The door, of ashlar, has its lintel on corbels moulded with a double roll {@molina}, and a machicolation above it at the level of the upper floor {@tercia}. Inside, a small annexe by the entrance is overlooked from above through a window and a murder hole (buhera) {@tercia}; here the murder hole opens through the vault over the entrance [[conj]].',
      'A narrow stair runs up to the terrace {@tercia}. Here it climbs in two flights in the thickness of the east wall, as in the Torre Lopera, whose plan is published {@molina}; the wall thicknesses follow Lopera too [[conj]].',
      'The keep has no recorded fireplace. Stores in sacks and jars below, and bedding, a chest and a charcoal brazier above, stand for how a small garrison might have used it [[conj]].',
    ],
    also: [{ type: 'room', id: 'keepTerrace' }, { type: 'person', id: 'alcaide' }],
  },
  keepTerrace: {
    terms: 'Spanish azotea; garitas; specula',
    body: [
      'The keep is roofed with a flat terrace inside a crenellated parapet. At each corner stood a small turret on corbels, a bartizan (garita); only their stubs survive {@iaph} {@tercia}. Their tops here are [[conj]].',
      'On the terrace stands a small round turret about 3 m tall, which the local historians call a specula, for signalling to El Coronil: low hills shut in the view from the hollow {@tercia}. Seen from above, a round feature about 2 m across stands on the terrace {@osm}. Here the stair in the wall comes up beside it [[conj]].',
      'Towers along the frontier passed warnings on by smoke by day and fire by night, from watchtower to watchtower and castle to castle {@dpej}. The brazier on the turret here is [[conj]].',
    ],
    also: [{ type: 'mech', id: 'signal' }, { type: 'person', id: 'atalaya' }],
  },
  cornerTower: {
    terms: 'Square corner tower',
    body: [
      'Three corners have square towers about 5 m a side {@osm}. Each is solid up to the wall-walk, the only way in; above that is one chamber under a pointed barrel vault, with arrow slits (saeteras) on all four faces {@iaph} {@tercia}.',
      'A hatch in a corner of the vault opens onto the crenellated roof terrace. There were no masonry stairs: the garrison went up by wooden ladder {@iaph}. The straw pallet here is [[conj]].',
    ],
    also: [{ type: 'room', id: 'wallWalk' }],
  },
  gate: {
    terms: 'Spanish puerta',
    body: [
      'The sources disagree on the entrance. One local account puts the gate in the west wall: a pointed arch with the remains of a machicolation above it {@tercia}. Another puts it on the north side, opposite the keep, with a stair and a portcullis {@minube}. The model follows the first, which describes the fabric in more detail [[conj]].',
      'Gates on this frontier were wooden leaves sheathed in iron, and were often renewed {@rojas}. The leaves here, standing open, are [[conj]].',
    ],
    also: [{ type: 'person', id: 'lancero' }],
  },
  albarrana: {
    terms: 'Spanish torre albarrana; pozo',
    body: [
      'At the fourth corner there is no corner tower. Instead a square tower stands a little out from the circuit, joined to it by a pointed arch {@iaph}. A tower of this kind, standing outside the wall and linked to it, is called an albarrana.',
      'It enclosed a well, so that the castle’s water could be held even under attack {@iaph}; one local account says it was the protection of the spring {@tercia}. The well-head and the pulley over it are [[conj]], as are the vaults and floors inside, which follow the corner towers.',
      'The official description places this tower at the south-east. On this project’s reading its compass points are all a quarter-turn out from the ground, and the imagery shows the tower and its enclosure at the north-east, as here {@osm}. One local account places them on the west side instead {@tercia}.',
    ],
    also: [{ type: 'room', id: 'annex' }, { type: 'room', id: 'spring' }],
  },
  annex: {
    terms: 'Walled enclosure',
    body: [
      'Later, round the albarrana tower, a quadrangular enclosure was added, which turned the old arch into its gate {@iaph}. Its walls are low, with rounded corners and no merlons {@osm}; one account calls it a wall without a parapet {@tercia}.',
      'It is dated, with a query, to the early fifteenth century {@iaph}, so whether it stood by 1410 is uncertain [[conj]]. Its height here is an estimate [[conj]].',
    ],
    also: [{ type: 'room', id: 'albarrana' }],
  },
  court: {
    terms: 'Spanish patio de armas',
    body: [
      'The courtyard measures about 30 by 32 m {@osm}. No buildings inside the walls are recorded, and today it is bare, dug down to the rock {@minube}. Frontier towers gave refuge to settlers and their herds {@molina}, and herds could be driven inside the walls when raiders came {@frontera}.',
      'Where the garrison cooked and slept is not recorded. The open fire, the firewood, the trough and the tethered horse are [[conj]].',
    ],
    also: [{ type: 'person', id: 'mozo' }, { type: 'person', id: 'ballestero' }],
  },
  wallWalk: {
    terms: 'Spanish adarve',
    body: [
      'The wall-walk ran round the whole circuit behind the merlons, and was the only way from tower to tower; it was reached by a stair built against the curtain {@iaph}. Where that stair stood is not clear from the description, so its place here, against the north curtain, is [[conj]].',
      'The curtains are of rubble (mampostería) with dressed stone at the corners {@tercia}. Their height and thickness here are estimates [[conj]].',
    ],
    also: [{ type: 'person', id: 'ballestero' }],
  },
  spring: {
    terms: 'Spanish fuente; pilón',
    body: [
      'The whole castle exists for this water. The spring of Las Aguzaderas made the land worth holding, and a castle that held it denied it to raiders {@wikiEs} {@pascual}.',
      'Its medieval position is not known; it is placed here, down the slope to the west where the valley drains, by guesswork [[conj]]. Troughs (pilones) where livestock watered still stand round about {@tercia}.',
      'The name is debated. The popular story is a rocky place where boars whetted (aguzar) their tusks; a philologist argues instead for an older "La Abuzadera", a spring so low that one had to lie face down to drink {@pascual}.',
    ],
    also: [{ type: 'person', id: 'vaquero' }, { type: 'person', id: 'cow' }],
  },
};

export const MECH_NOTES = {
  signal: {
    terms: 'Spanish ahumada (smoke), almenara (fire)',
    body: [
      'Warnings ran along the frontier by smoke by day and fire by night, passed from watchtower to watchtower and between castles {@dpej}. The keep’s turret was used to signal to El Coronil {@tercia}.',
      'How the signal was made here is not recorded: an iron brazier of brushwood on top of the turret is [[conj]]. Light it by day for smoke, or move the slider towards dusk and light it for a fire.',
    ],
  },
};

export const PERSON_NOTES = {
  alcaide: {
    terms: 'Castellan',
    body: [
      'A castle was kept for its lord by an alcaide. Who held Las Aguzaderas for the Ribera is not recorded, and his dress and habits here are [[conj]].',
    ],
  },
  ballestero: {
    terms: 'Crossbowman',
    body: [
      'The troops of the frontier were horsemen, crossbowmen and spearmen {@torres} {@leva}. Crossbows were the arm of the better-off {@solera}. The numbers and duties of the garrison here are not recorded [[conj]].',
    ],
  },
  lancero: {
    terms: 'Spearman',
    body: [
      'A lance and a leather shield, the adarga, were the ordinary arms of the frontier {@torres} {@leva}. The adarga was made of leather; its shape here, two joined ovals, and a guard on the gate are [[conj]].',
    ],
  },
  atalaya: {
    terms: 'Lookout',
    body: [
      'The hollow shuts in the view, which is why the keep carried a signal turret {@tercia}. A lookout keeping watch from the terrace is [[conj]].',
    ],
  },
  vaquero: {
    terms: 'Herdsman',
    body: [
      'The frontier lived mainly by stock-raising, and raiders came for cattle {@frontera} {@rojas}. A herdsman watering his beasts at the spring, under the castle’s eye, is [[conj]].',
    ],
  },
  mozo: {
    terms: 'Servant lad',
    body: ['A lad fetching firewood for the garrison’s fire is [[conj]].'],
  },
  cow: {
    terms: 'Cattle',
    body: ['Cattle were the wealth of the frontier and what raiding parties came to drive off {@rojas} {@frontera}.'],
  },
  horse: {
    terms: 'Horse',
    body: ['Frontier riders owed a horse and the arms of the jineta {@solera}. The alcaide’s horse is [[conj]].'],
  },
  hound: {
    terms: 'Dog',
    body: ['A herd dog with the cattle is [[conj]].'],
  },
};

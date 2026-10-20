// Surface "kinds" tell the ink-and-wash shader how to treat a face:
// which procedural pattern to draw (stone coursing, boards, slates...)
// and whether it is a cut face that gets section fill.
export const K = {
  PLAIN: 0,
  STONE: 1, // rubble / ashlar walling, drawn with coursing
  CUT: 2, // cut stone: section fill
  TIMBER: 3,
  ROOF: 4, // slates / shingles
  ROCK: 5, // natural rock surface
  GROUND: 6, // turf and trodden earth
  WATER: 7,
  EMIT: 8, // fire, embers: unlit
  BOARDS: 9, // floorboards
  PLASTER: 10, // limewashed interior
  CLOTH: 11,
  PAVING: 12, // flagstones
  CUT_TIMBER: 13, // end grain in section
  CUT_ROCK: 14, // rock in section, with strata
  SKIN: 15,
  METAL: 16,
  CUT_EARTH: 17,
  STRAW: 18,
  FUR: 19,
};

// What a solid of a given kind shows where it is cut.
export const CAP_OF = {
  [K.STONE]: K.CUT,
  [K.PLASTER]: K.CUT,
  [K.PAVING]: K.CUT,
  [K.PLAIN]: K.CUT,
  [K.TIMBER]: K.CUT_TIMBER,
  [K.BOARDS]: K.CUT_TIMBER,
  [K.ROOF]: K.CUT_TIMBER,
  [K.ROCK]: K.CUT_ROCK,
  [K.GROUND]: K.CUT_EARTH,
};

// Watercolour palette (display-space RGB, no colour management).
export const P = {
  stone: 0xbdb59c,
  stoneDark: 0xa39d86,
  stoneWarm: 0xc6b79a,
  ashlar: 0xc9c0a4,
  cut: 0x9c8772,
  cutTimber: 0x6f5034,
  cutRock: 0x857a72,
  cutEarth: 0x8c7a5c,
  rock: 0x9a958a,
  turf: 0xa7b278,
  earth: 0xb9a37e,
  timber: 0x9d7a52,
  timberDark: 0x7a5a3a,
  oak: 0xa88660,
  roof: 0x7f8993,
  lead: 0x8d939a,
  plaster: 0xe9dfc8,
  paving: 0xbcae95,
  boards: 0xb08e63,
  water: 0x86a9b4,
  iron: 0x4f4f52,
  fire: 0xffb24a,
  ember: 0xff6a2a,
  soot: 0x4a4440,
  void: 0x3b3430, // dark openings: loops, doorways seen from afar
  straw: 0xd8c27a,
  cloth: 0xb84a3a,
};

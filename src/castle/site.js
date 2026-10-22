import * as THREE from 'three';
import { DEG } from '../ui/controls.js';
import { G, ROOMS, ROOM_BY_ID } from './rooms.js';
import { buildShell } from './shell.js';
import { furnish } from './furnish.js';
import { landscape } from './landscape.js';
import { wards } from './wards.js';
import { interiors } from './interiors.js';
import { towers } from './towers.js';
import { stable } from './stable.js';
import { farm } from './farm.js';
import { setupEffects } from './ambient.js';
import { PLAN } from './plan.js';
import { buildCast } from '../people/cast.js';
import { createMechanisms } from '../mech/index.js';
import { GLOSSARY } from '../data/glossary.js';
import { ABOUT, ROOM_NOTES, MECH_NOTES, PERSON_NOTES } from '../data/notes.js';
import { SOURCES, SOURCE_IDS } from '../data/sources.js';

// Everything the app needs to show Aberwen. Castles are described by
// objects of this shape; src/sites.js picks the one on show.
export const ABERWEN = {
  id: 'aberwen',
  title: 'Aberwen Castle',
  date: 'c. 1290',
  subtitle: 'A cutaway of a fictional concentric castle in North Wales, after Edward I’s castles at Harlech, Conwy and Beaumaris',
  G,
  ROOMS,
  ROOM_BY_ID,
  roomGroups: [
    ['Kitchens & stores', ROOMS.filter((r) => r.service)],
    ['The rest of the castle', ROOMS.filter((r) => !r.service)],
  ],
  day: 0.25, // a grey late-autumn morning
  overview: { target: new THREE.Vector3(4, 1, -9), dist: 128, az: -10 * DEG, el: 21 * DEG },
  /** All static geometry, into one GeoBuilder. */
  buildStatic(b) {
    buildShell(b);
    furnish(b);
    landscape(b);
    wards(b);
    interiors(b);
    towers(b);
    stable(b);
    farm(b);
  },
  setupEffects,
  buildCast,
  createMechanisms,
  plan: PLAN,
  glossary: GLOSSARY,
  notes: { ABOUT, ROOM_NOTES, MECH_NOTES, PERSON_NOTES },
  sources: { SOURCES, SOURCE_IDS },
  // how people acknowledge you when clicked (glossary keys)
  greet: {
    soldiers: new Set(['watchman', 'crossbowman', 'gateGuard', 'sergeant', 'recruit', 'archer', 'soldierOff', 'constable', 'knight']),
    women: new Set(['brewer', 'laundress', 'henwife', 'lady', 'milkmaid', 'swineherd', 'gooseGirl', 'goatherd']),
    young: new Set(['child', 'page', 'squire', 'spitBoy', 'shepherd', 'king']),
  },
};

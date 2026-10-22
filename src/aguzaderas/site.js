import * as THREE from 'three';
import { DEG } from '../ui/controls.js';
import { G, ROOMS, ROOM_BY_ID } from './rooms.js';
import { buildAguzaderas } from './build.js';
import { setupEffects } from './effects.js';
import { buildCast } from './cast.js';
import { createMechanisms } from './mechs.js';
import { PLAN } from './plan.js';
import { GLOSSARY } from './glossary.js';
import { ABOUT, ROOM_NOTES, MECH_NOTES, PERSON_NOTES } from './notes.js';
import { SOURCES, SOURCE_IDS } from './sources.js';

// The Castillo de las Aguzaderas, El Coronil (Seville), c. 1410: a real
// castle, modelled from the published descriptions and measured plan (see
// docs/research/aguzaderas.md). Same shape as src/castle/site.js.
export const AGUZADERAS = {
  id: 'aguzaderas',
  title: 'Castillo de las Aguzaderas',
  date: 'c. 1410',
  subtitle: 'A cutaway of the frontier castle that guarded the spring of Las Aguzaderas, El Coronil (Seville), as it may have stood in the early fifteenth century',
  G,
  ROOMS,
  ROOM_BY_ID,
  roomGroups: [['The castle', ROOMS]],
  day: 0.6, // a clear spring morning in Andalusia
  overview: { target: new THREE.Vector3(-2, 3, -19), dist: 92, az: -14 * DEG, el: 24 * DEG },
  buildStatic: buildAguzaderas,
  setupEffects,
  buildCast,
  createMechanisms,
  plan: PLAN,
  glossary: GLOSSARY,
  notes: { ABOUT, ROOM_NOTES, MECH_NOTES, PERSON_NOTES },
  sources: { SOURCES, SOURCE_IDS },
  greet: {
    soldiers: new Set(['alcaide', 'ballestero', 'lancero', 'atalaya']),
    women: new Set(),
    young: new Set(['mozo']),
  },
};

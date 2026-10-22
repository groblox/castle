import * as THREE from 'three';
import { GLOSSARY } from './glossary.js';
import { lab } from '../data/labels.js';

// placeholder while the plan is drawn up
const ROOMS = [];
export const AGUZADERAS = {
  id: 'aguzaderas',
  title: 'Castillo de las Aguzaderas',
  date: 'c. 1400',
  subtitle: 'placeholder',
  G: {},
  ROOMS,
  ROOM_BY_ID: {},
  roomGroups: [],
  overview: { target: new THREE.Vector3(0, 0, 0), dist: 80, az: 0, el: 0.4 },
  buildStatic(b) {
    b.with({ label: lab('turf') }, () => b.box(-30, -2, -30, 30, 0, 30));
  },
  setupEffects() {},
  buildCast() {
    return { actors: {}, update() {} };
  },
  createMechanisms() {
    return {};
  },
  plan: { bounds: { x0: -30, x1: 30, z0: -30, z1: 30 }, cutZ: 0, rooms: [], areaAt: () => null, draw() {} },
  glossary: GLOSSARY,
  notes: { ABOUT: { title: '', terms: '', body: [] }, ROOM_NOTES: {}, MECH_NOTES: {}, PERSON_NOTES: {} },
  sources: { SOURCES: {}, SOURCE_IDS: [] },
  greet: { soldiers: new Set(), women: new Set(), young: new Set() },
};

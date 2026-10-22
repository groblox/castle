import { SITE_ID } from '../site.js';
import { GLOSSARY as ABERWEN } from './glossary.js';
import { GLOSSARY as AGUZADERAS } from '../aguzaderas/glossary.js';

// the hover terms of the castle on show
const GLOSSARY = SITE_ID === 'aguzaderas' ? AGUZADERAS : ABERWEN;

// Label ids are written into a picking buffer, one per vertex.
// Id 0 means "nothing".
export const LABELS = [null];
const index = new Map();

/** Get (or make) the label id for a glossary key, optionally tied to a room or mechanism. */
export function lab(key, room = null, mech = null) {
  const k = `${key}|${room}|${mech}`;
  if (index.has(k)) return index.get(k);
  const g = GLOSSARY[key];
  if (!g) throw new Error(`Unknown glossary key: ${key}`);
  const id = LABELS.length;
  LABELS.push({ key, term: g.term, gloss: g.gloss, room, mech });
  index.set(k, id);
  return id;
}

/** Label for a servant or animal: clicking opens notes on that role. */
export function labPerson(key, room = null) {
  const k = `person|${key}`;
  if (index.has(k)) return index.get(k);
  const g = GLOSSARY[key];
  if (!g) throw new Error(`Unknown glossary key: ${key}`);
  const id = LABELS.length;
  LABELS.push({ key, term: g.term, gloss: g.gloss, room, person: key });
  index.set(k, id);
  return id;
}

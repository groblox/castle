// Generate the sources files from each castle's sources and notes:
//   SOURCES.md             Aberwen (src/data/sources.js, src/data/notes.js)
//   SOURCES-AGUZADERAS.md  Las Aguzaderas (src/aguzaderas/sources.js, notes.js)
//   node scripts/sources.mjs
import { writeFileSync } from 'node:fs';
import * as aberwenSources from '../src/data/sources.js';
import * as aberwenNotes from '../src/data/notes.js';
import * as aguzSources from '../src/aguzaderas/sources.js';
import * as aguzNotes from '../src/aguzaderas/notes.js';

function generate(file, { SOURCES, SOURCE_IDS }, { ABOUT, ROOM_NOTES, MECH_NOTES, PERSON_NOTES }, intro, avoided, avoidedTitle = 'Anachronisms deliberately avoided') {

  const where = Object.fromEntries(SOURCE_IDS.map((id) => [id, []]));
  const conj = [];
  const scan = (label, note) => {
    for (const p of note.body || []) {
      for (const m of p.matchAll(/\{@(\w+)\}/g)) {
        if (!SOURCES[m[1]]) throw new Error(`Unknown source ${m[1]} in ${label}`);
        if (!where[m[1]].includes(label)) where[m[1]].push(label);
      }
      if (p.includes('[[conj]]')) conj.push(`- **${label}**: ${p.replace(/\s*\{@\w+\}/g, '').replace(/\[\[conj\]\]/g, '*(conjecture)*')}`);
    }
  };
  scan('About', ABOUT);
  for (const [k, n] of Object.entries(ROOM_NOTES)) scan(`Room: ${k}`, n);
  for (const [k, n] of Object.entries(MECH_NOTES)) scan(`Mechanism: ${k}`, n);
  for (const [k, n] of Object.entries(PERSON_NOTES)) scan(`Person: ${k}`, n);

  const out = [];
  out.push('# Sources');
  out.push('');
  out.push('Every reference used in the in-app notes, the claims it supports, and where it is cited.');
  out.push(...intro);
  out.push('');
  SOURCE_IDS.forEach((id, i) => {
    const s = SOURCES[id];
    out.push(`## ${i + 1}. ${s.short}`);
    out.push('');
    out.push(s.cite + (s.url ? ` <${s.url}>` : ''));
    out.push('');
    out.push('Supports:');
    out.push('');
    for (const c of s.claims) out.push(`- ${c}`);
    out.push('');
    out.push(`Cited in: ${where[id].length ? where[id].join('; ') : '(background reading)'}`);
    out.push('');
  });
  if (avoided.length) {
    out.push(`## ${avoidedTitle}`);
    out.push('');
    out.push(...avoided);
    out.push('');
  }
  out.push('## Statements marked as conjecture');
  out.push('');
  out.push(...conj);
  out.push('');
  writeFileSync(new URL(`../${file}`, import.meta.url), out.join('\n'));
  console.log(`${file} written: ${SOURCE_IDS.length} sources, ${conj.length} conjectural statements.`);
}

generate('SOURCES.md', aberwenSources, aberwenNotes, [
  'This file is generated from `src/data/sources.js` and `src/data/notes.js` by `npm run sources`;',
  'edit those files rather than this one.',
  '',
  'Aberwen Castle is fictional. Its plan, construction and household are modelled on Edward I\'s',
  'castles in North Wales (chiefly Harlech and Conwy, with the concentric plan of Beaumaris) and on',
  'the records of English great households. Where the evidence is thin or the scene invents, the',
  'notes mark the statement as conjecture; those statements are listed at the end.',
], [
  '- No New World foods (potatoes, maize, tomatoes, turkeys, chillies): see Woolgar, *Culture of Food*.',
  '- No hops or hopped beer: unhopped ale only (Bennett).',
  '- No dog-powered turnspit, smoke jack or clockwork jack: a boy turns the spit (Caius, 1576, for the first turnspit dogs).',
  '- No brown rats: black rats only (University of York, 2022).',
  '- Beaumaris (begun 1295) is later than the scene; only its plan idea is borrowed.',
]);

generate('SOURCES-AGUZADERAS.md', aguzSources, aguzNotes, [
  'This file is generated from `src/aguzaderas/sources.js` and `src/aguzaderas/notes.js` by',
  '`npm run sources`; edit those files rather than this one. The research behind them, with a',
  'confidence mark on every claim and the sources that could not be reached, is in',
  '`docs/research/aguzaderas.md`.',
  '',
  'The Castillo de las Aguzaderas is a real castle at El Coronil (Seville). The model follows the',
  'published descriptions and a plan measured from OpenStreetMap and the PNOA orthophoto. No',
  'measured plan or section was available online, so heights and wall thicknesses are estimates.',
  'Nothing is recorded of the garrison; the people and furnishings are conjecture and are marked so.',
], [
  '- No portcullis: one visitors\' page mentions one at a north entrance; the gate modelled follows the fuller description, which does not.',
  '- No tiled roofs: the towers and keep have flat terraces.',
  '- No buildings in the courtyard: none are recorded.',
  '- No fireplaces in the keep: none are described; a brazier stands in for heating.',
], 'Left out for want of evidence');

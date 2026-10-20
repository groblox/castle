// Generate SOURCES.md from src/data/sources.js and src/data/notes.js.
//   node scripts/sources.mjs
import { writeFileSync } from 'node:fs';
import { SOURCES, SOURCE_IDS } from '../src/data/sources.js';
import { ABOUT, ROOM_NOTES, MECH_NOTES, PERSON_NOTES } from '../src/data/notes.js';

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
out.push('This file is generated from `src/data/sources.js` and `src/data/notes.js` by `npm run sources`;');
out.push('edit those files rather than this one.');
out.push('');
out.push('Aberwen Castle is fictional. Its plan, construction and household are modelled on Edward I\'s');
out.push('castles in North Wales (chiefly Harlech and Conwy, with the concentric plan of Beaumaris) and on');
out.push('the records of English great households. Where the evidence is thin or the scene invents, the');
out.push('notes mark the statement as conjecture; those statements are listed at the end.');
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
out.push('## Anachronisms deliberately avoided');
out.push('');
out.push('- No New World foods (potatoes, maize, tomatoes, turkeys, chillies): see Woolgar, *Culture of Food*.');
out.push('- No hops or hopped beer: unhopped ale only (Bennett).');
out.push('- No dog-powered turnspit, smoke jack or clockwork jack: a boy turns the spit (Caius, 1576, for the first turnspit dogs).');
out.push('- No brown rats: black rats only (University of York, 2022).');
out.push('- Beaumaris (begun 1295) is later than the scene; only its plan idea is borrowed.');
out.push('');
out.push('## Statements marked as conjecture');
out.push('');
out.push(...conj);
out.push('');
writeFileSync(new URL('../SOURCES.md', import.meta.url), out.join('\n'));
console.log(`SOURCES.md written: ${SOURCE_IDS.length} sources, ${conj.length} conjectural statements.`);

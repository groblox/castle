// Which castle is on show. The choice is in the address (?castle=aberwen)
// and switching reloads the page, so every module can read it once at load.
// This file imports nothing, so anything may import it.

// The first is shown when the address names none.
export const SITES = [
  { id: 'aguzaderas', name: 'Castillo de las Aguzaderas', when: 'c. 1410', where: 'El Coronil, Seville' },
  { id: 'aberwen', name: 'Aberwen Castle', when: 'c. 1290', where: 'A fictional Edwardian castle in North Wales' },
];
const DEFAULT = SITES[0].id;

const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('castle');
export const SITE_ID = SITES.some((s) => s.id === asked) ? asked : DEFAULT;

/** The address of the same page showing another castle (other settings kept). */
export function siteUrl(id) {
  const u = new URL(location.href);
  if (id === DEFAULT) u.searchParams.delete('castle');
  else u.searchParams.set('castle', id);
  return u.toString();
}

// Which castle is on show. The choice is in the address (?castle=aguzaderas)
// and switching reloads the page, so every module can read it once at load.
// This file imports nothing, so anything may import it.

export const SITES = [
  { id: 'aberwen', name: 'Aberwen Castle', when: 'c. 1290', where: 'A fictional Edwardian castle in North Wales' },
  { id: 'aguzaderas', name: 'Castillo de las Aguzaderas', when: 'c. 1410', where: 'El Coronil, Seville' },
];

const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('castle');
export const SITE_ID = SITES.some((s) => s.id === asked) ? asked : 'aberwen';

/** The address of the same page showing another castle (other settings kept). */
export function siteUrl(id) {
  const u = new URL(location.href);
  if (id === 'aberwen') u.searchParams.delete('castle');
  else u.searchParams.set('castle', id);
  return u.toString();
}

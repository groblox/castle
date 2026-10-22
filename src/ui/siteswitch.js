import { SITES, SITE_ID, siteUrl } from '../site.js';

/**
 * Buttons at the top of the room list for choosing the castle. Choosing one
 * loads the page again with that castle: each is a whole scene of its own,
 * and building afresh is quicker and safer than taking one apart.
 */
export class SiteSwitch {
  constructor(el) {
    for (const s of SITES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = s.id === SITE_ID ? 'active' : '';
      b.setAttribute('aria-pressed', String(s.id === SITE_ID));
      b.title = `${s.name}, ${s.when}: ${s.where}`;
      b.innerHTML = `<b>${s.name.replace(/^Castillo de las /, '')}</b><span>${s.when}</span>`;
      b.addEventListener('click', () => {
        if (s.id === SITE_ID) return;
        document.getElementById('loading').classList.remove('done');
        location.href = siteUrl(s.id);
      });
      el.appendChild(b);
    }
  }
}

import { ROOM_BY_ID } from '../castle/rooms.js';
import { GLOSSARY } from '../data/glossary.js';
import { SOURCES, SOURCE_IDS } from '../data/sources.js';
import { ABOUT, ROOM_NOTES, MECH_NOTES, PERSON_NOTES } from '../data/notes.js';
import { activityOf } from '../data/activities.js';

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const md = (s) => esc(s).replace(/\*(.+?)\*/g, '<i>$1</i>');

/** Render a note: numbered citations, conjecture badges, a source list. */
function renderNote(note) {
  const order = [];
  const num = (id) => {
    if (!SOURCES[id]) return '?';
    let i = order.indexOf(id);
    if (i < 0) {
      order.push(id);
      i = order.length - 1;
    }
    return i + 1;
  };
  const paras = (note.body || [])
    .map((p) => {
      let h = esc(p);
      h = h.replace(/\s*\{@(\w+)\}/g, (_, id) => `<sup class="cite" title="${esc(SOURCES[id]?.short ?? id)}">${num(id)}</sup>`);
      h = h.replace(/<\/sup><sup class="cite"/g, '</sup><sup class="cite">,</sup><sup class="cite"');
      h = h.replace(/\[\[conj\]\]/g, '<span class="conj" title="Conjecture: the evidence is thin or the scene invents">conjecture</span>');
      return `<p>${h}</p>`;
    })
    .join('');
  const src = order.length
    ? `<h3>Sources</h3><ol class="sources">${order.map((id) => `<li>${sourceLine(id)}</li>`).join('')}</ol>`
    : '';
  return { paras, src };
}

function sourceLine(id) {
  const s = SOURCES[id];
  const cite = md(s.cite);
  return s.url ? `${cite} <a href="${s.url}" target="_blank" rel="noopener">link</a>` : cite;
}

/** Side panel with notes on the selected room, mechanism or servant. */
export class Panel {
  constructor(app) {
    this.app = app;
    this.el = document.getElementById('panel');
    this.body = document.getElementById('panel-body');
    document.getElementById('panel-close').addEventListener('click', () => this.hide());
    this.holding = null;
    const release = () => {
      if (this.holding) {
        this.holding.m.act(this.holding.id, false);
        this.holding = null;
      }
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('blur', release);
    this.body.addEventListener('click', (e) => {
      const a = e.target.closest('[data-go]');
      if (!a) return;
      e.preventDefault();
      const [type, id] = a.dataset.go.split(':');
      if (type === 'follow') {
        const c = this.current;
        if (c && c.actor) app.follow(app.following === c.actor ? null : c.actor);
        this.sync();
        return;
      }
      if (type === 'mech') {
        const m = app.mechs[id];
        if (m.room) app.focusRoom(m.room, { keepPanel: true });
        this.showMech(m);
      } else if (type === 'person') this.showPerson(id);
      else if (type === 'room') app.focusRoom(id);
      else if (type === 'sources') this.showSources();
    });
  }
  hide() {
    this.el.hidden = true;
    this.current = null;
  }
  _show(html) {
    this.body.innerHTML = html;
    this.el.hidden = false;
    this.body.scrollTop = 0;
  }

  _also(note) {
    if (!note.also || !note.also.length) return '';
    const items = note.also.map(({ type, id }) => {
      const name = type === 'mech' ? `${this.app.mechs[id]?.name ?? id} (working)` : GLOSSARY[id]?.term ?? id;
      return `<li><a data-go="${type}:${id}">${esc(name)}</a></li>`;
    });
    return `<h3>See also</h3><ul class="links">${items.join('')}</ul>`;
  }

  showRoom(room) {
    this.current = { type: 'room', id: room.id };
    const note = ROOM_NOTES[room.id] || { body: [] };
    const { paras, src } = renderNote(note);
    this._show(`<h2>${esc(room.name)}</h2><p class="terms">${esc(note.terms ?? '')}</p>${paras}${this._also(note)}${src}${this._footer()}`);
  }

  /** Notes on a person or beast; with the actor clicked, a live line on what they are doing and a Follow button. */
  showPerson(key, actor = null) {
    this.current = { type: 'person', id: key, actor };
    const g = GLOSSARY[key];
    const note = PERSON_NOTES[key] || { body: [g?.gloss ?? ''] };
    const { paras, src } = renderNote(note);
    const live = actor ? `<p class="status live"></p><div class="mech-controls"><button type="button" class="follow" data-go="follow:${esc(key)}"></button></div>` : '';
    this._show(`<h2>${esc(g?.term ?? key)}</h2><p class="terms">${esc(note.terms ?? '')}</p>${live}${paras}${src}${this._footer()}`);
    this.sync();
  }

  /** Refresh the live line and Follow button for the person on show. */
  sync() {
    const c = this.current;
    if (!c || c.type !== 'person' || !c.actor) return;
    const st = this.body.querySelector('.live');
    const btn = this.body.querySelector('button.follow');
    if (!st || !btn) return;
    const following = this.app.following === c.actor;
    const term = GLOSSARY[c.id]?.term ?? c.id;
    const what = activityOf(c.actor);
    st.textContent = `Now: ${what}.`;
    btn.textContent = following ? 'Stop following' : `Follow this ${term.toLowerCase().split(/[;(,]/)[0].trim()}`;
    btn.classList.toggle('next', !following);
    this._liveT = performance.now();
  }

  showMech(m) {
    this.current = { type: 'mech', id: m.id, m };
    const note = MECH_NOTES[m.id] || { body: [m.note ?? ''] };
    const { paras, src } = renderNote(note);
    const room = ROOM_BY_ID[m.room];
    this._show(
      `<h2>${esc(m.name)}</h2><p class="terms">${esc(note.terms ?? '')}${room ? ` &middot; <a data-go="room:${room.id}">${esc(room.name)}</a>` : ''}</p>` +
        `<p class="status"></p><div class="mech-controls"></div><h3>How it worked</h3>${paras}${src}${this._footer()}`,
    );
    this._buildControls(m);
  }

  showAbout() {
    this.current = { type: 'about' };
    const { paras, src } = renderNote(ABOUT);
    this._show(`<h2>${esc(ABOUT.title)}</h2><p class="terms">${esc(ABOUT.terms)}</p>${paras}${src}${this._footer(true)}`);
  }

  showSources() {
    this.current = { type: 'sources' };
    const items = SOURCE_IDS.map((id) => {
      const s = SOURCES[id];
      return `<li>${sourceLine(id)}<ul class="claims">${s.claims.map((c) => `<li>${md(c)}</li>`).join('')}</ul></li>`;
    });
    this._show(`<h2>Sources</h2><p class="terms">Every reference used in the notes, and what it is cited for.</p><ol class="sources full">${items.join('')}</ol>`);
  }

  _footer(noAll) {
    return noAll ? '<p class="more"><a data-go="sources:all">All sources and the claims they support &rarr;</a></p>' : '<p class="more"><a data-go="sources:all">All sources &rarr;</a></p>';
  }

  _buildControls(m) {
    const box = this.body.querySelector('.mech-controls');
    box.innerHTML = '';
    this.buttons = [];
    for (const c of m.controls()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = c.id;
      if (c.hold) {
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (b.disabled) return;
          this.holding = { m, id: c.id };
          m.act(c.id, true);
        });
      } else {
        b.addEventListener('click', () => m.act(c.id));
      }
      box.appendChild(b);
      this.buttons.push(b);
    }
    this._sync(m);
  }

  _sync(m) {
    const cs = m.controls();
    if (cs.length !== this.buttons.length) return this._buildControls(m);
    cs.forEach((c, i) => {
      const b = this.buttons[i];
      b.textContent = c.label;
      b.disabled = c.enabled === false;
      b.classList.toggle('next', !!c.next && c.enabled !== false);
    });
    this.body.querySelector('.status').textContent = m.status();
    this._ver = m.version;
  }

  update() {
    const c = this.current;
    if (c && c.type === 'mech' && c.m.version !== this._ver) this._sync(c.m);
    if (c && c.type === 'person' && c.actor && performance.now() - (this._liveT ?? 0) > 400) this.sync();
  }
}

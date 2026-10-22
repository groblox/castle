import { site } from '../sites.js';

/** Room list in the left-hand panel: click to fly to a room. */
export class RoomList {
  constructor(app, el) {
    this.app = app;
    this.el = el;
    this.buttons = new Map();
    for (const [title, rooms] of site.roomGroups) {
      const h = document.createElement('h3');
      h.textContent = title;
      el.appendChild(h);
      for (const r of rooms) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = r.service ? 'service' : '';
        b.innerHTML = `<span class="dot"></span>${r.name}`;
        b.addEventListener('click', () => app.focusRoom(r.id));
        el.appendChild(b);
        this.buttons.set(r.id, b);
      }
    }
  }
  setActive(id) {
    for (const [rid, b] of this.buttons) b.classList.toggle('active', rid === id);
  }
}

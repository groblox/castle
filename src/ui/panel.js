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
  showRoom(room) {
    this.current = { type: 'room', id: room.id };
    this._show(`<h2>${room.name}</h2>`);
  }
  showPerson(p) {
    this.current = { type: 'person', id: p };
    this._show(`<h2>${p}</h2>`);
  }

  showMech(m) {
    this.current = { type: 'mech', id: m.id, m };
    this._show(`<h2>${m.name}</h2><p class="status"></p><div class="mech-controls"></div><h3>How it worked</h3><p>${m.note ?? ''}</p>`);
    this._buildControls(m);
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
  }
}

/** Side panel with notes on the selected room, mechanism or servant. */
export class Panel {
  constructor(app) {
    this.app = app;
    this.el = document.getElementById('panel');
    this.body = document.getElementById('panel-body');
    document.getElementById('panel-close').addEventListener('click', () => this.hide());
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
  showMech(m) {
    this.current = { type: 'mech', id: m.id };
    this._show(`<h2>${m.name}</h2>`);
  }
  showPerson(p) {
    this.current = { type: 'person', id: p };
    this._show(`<h2>${p}</h2>`);
  }
}

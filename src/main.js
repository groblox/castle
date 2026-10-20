import { App } from './app.js';

const app = new App(document.getElementById('view'));
// test / debugging hook
window.__castle = app;
import { LABELS } from './data/labels.js';
window.__labels = LABELS;

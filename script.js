import { initAv } from './av-engine.js';
import { initPret } from './pret-engine.js';

const tabButtons = document.querySelectorAll('.tab-button');
const panels = {
    'tab-av': document.getElementById('tab-av'),
    'tab-pret': document.getElementById('tab-pret'),
};

tabButtons.forEach((button) => button.addEventListener('click', () => {
    const target = button.dataset.tab;
    tabButtons.forEach((b) => b.setAttribute('aria-selected', String(b === button)));
    Object.entries(panels).forEach(([name, panel]) => { panel.hidden = name !== target; });
}));

initAv();
initPret();

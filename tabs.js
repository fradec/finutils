// Navigation entre les onglets des outils.

const tabButtons = document.querySelectorAll('.tab-button');
const panels = {
    'tab-av': document.getElementById('tab-av'),
    'tab-pret': document.getElementById('tab-pret'),
};
const resetButtons = {
    'tab-av': document.getElementById('reset-button-av'),
    'tab-pret': document.getElementById('reset-button-pret'),
};

export function initTabs() {
    tabButtons.forEach((button) =>
        button.addEventListener('click', () => {
            const target = button.dataset.tab;
            tabButtons.forEach((b) => b.setAttribute('aria-selected', String(b === button)));
            Object.entries(panels).forEach(([name, panel]) => {
                panel.hidden = name !== target;
            });
            Object.entries(resetButtons).forEach(([name, resetButton]) => {
                resetButton.hidden = name !== target;
            });
        }),
    );
}

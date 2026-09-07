import {
    TAUX_PRELEVEMENTS_SOCIAUX,
    ABATTEMENT_ANNUEL,
    SEUIL_PRIMES_REDUIT,
    TAUX_FORFAITAIRE,
    NOTARY_FEE_RATE,
} from './constants.js';

// Formateur monétaire commun ; av masque les décimales sur un montant rond, pret les affiche toujours.
function formatEUR(montant, { minimumFractionDigits = 2 } = {}) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits, maximumFractionDigits: 2 }).format(montant);
}

function formatAmount(value) {
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

// --- Onglets ---

const tabButtons = document.querySelectorAll('.tab-button');
const panels = {
    'tab-av': document.getElementById('tab-av'),
    'tab-pret': document.getElementById('tab-pret'),
};
const resetButtons = {
    'tab-av': document.getElementById('reset-button-av'),
    'tab-pret': document.getElementById('reset-button-pret'),
};

tabButtons.forEach((button) => button.addEventListener('click', () => {
    const target = button.dataset.tab;
    tabButtons.forEach((b) => b.setAttribute('aria-selected', String(b === button)));
    Object.entries(panels).forEach(([name, panel]) => { panel.hidden = name !== target; });
    Object.entries(resetButtons).forEach(([name, resetButton]) => { resetButton.hidden = name !== target; });
}));

// --- Assurance vie ---

function initAv() {

document.getElementById('date-souscription').max = new Date().toISOString().split('T')[0];

document.getElementById('calculator-form').addEventListener('input', calculate);
document.getElementById('reset-button-av').addEventListener('click', resetForm);

document.querySelectorAll('input[name="rachat-type"]').forEach((radio) => radio.addEventListener('change', () => {
    document.getElementById('partiel-fields').hidden = document.querySelector('input[name="rachat-type"]:checked').value !== 'partiel';
}));

// L'abattement (et le choix seul/couple qui en double le montant) ne concerne que les contrats de plus de 8 ans.
const durationRadios = document.querySelectorAll('input[name="duration"]');
const durationSelect = {
    get value() { return document.querySelector('input[name="duration"]:checked').value; },
    set value(v) { document.querySelector(`input[name="duration"][value="${v}"]`).checked = true; },
    set disabled(v) { durationRadios.forEach((radio) => { radio.disabled = v; }); },
};
function updateAbattementVisibility() {
    document.getElementById('abattement-fields').hidden = durationSelect.value !== '8+';
}
durationRadios.forEach((radio) => radio.addEventListener('change', updateAbattementVisibility));

// Date de souscription (optionnelle) : calcule et verrouille automatiquement la tranche de durée.
document.getElementById('date-souscription').addEventListener('input', (event) => {
    const autoNoteEl = document.getElementById('duration-auto-note');
    if (!event.target.value) {
        durationSelect.disabled = false;
        autoNoteEl.innerText = '';
        return;
    }
    const annees = (Date.now() - new Date(event.target.value).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    durationSelect.value = annees < 4 ? '0-4' : annees < 8 ? '4-8' : '8+';
    durationSelect.disabled = true;
    autoNoteEl.innerText = `Durée calculée automatiquement : ${annees.toFixed(1)} an(s)`;
    updateAbattementVisibility();
});

document.getElementById('montant-retire').addEventListener('input', () => {
    const valeurRachat = parseFloat(document.getElementById('value-a').value) || 0;
    const montant = parseFloat(document.getElementById('montant-retire').value) || 0;
    // Arrondi au palier de 0,5 % pour rester compatible avec le pas du champ pourcentage.
    const pourcentage = valeurRachat > 0 ? Math.min(100, Math.round((montant / valeurRachat) * 200) / 2) : 0;
    document.getElementById('pourcentage-retire').value = pourcentage > 0 ? pourcentage : '';
});

document.getElementById('pourcentage-retire').addEventListener('input', (event) => {
    const valeurRachat = parseFloat(document.getElementById('value-a').value) || 0;
    const saisie = parseFloat(event.target.value);
    if (Number.isNaN(saisie)) {
        document.getElementById('montant-retire').value = '';
        return;
    }
    const pourcentage = Math.min(100, Math.max(1, saisie));
    if (pourcentage !== saisie) {
        event.target.value = pourcentage;
    }
    document.getElementById('montant-retire').value = ((pourcentage / 100) * valeurRachat).toFixed(2);
});

function calculate() {
    const primesVersees = parseFloat(document.getElementById('value-b').value) || 0;
    const valeurRachat = parseFloat(document.getElementById('value-a').value) || 0;
    const rachatPartiel = document.querySelector('input[name="rachat-type"]:checked').value === 'partiel';
    const montantRetire = rachatPartiel ? (parseFloat(document.getElementById('montant-retire').value) || 0) : valeurRachat;

    const resultsSection = document.getElementById('results-section');
    const resultsPlaceholder = document.getElementById('results-placeholder-av');
    const profitsInfo = document.getElementById('profits-info');
    const hasEnoughData = valeurRachat > 0 && montantRetire > 0;
    resultsSection.hidden = !hasEnoughData;
    resultsPlaceholder.hidden = hasEnoughData;
    if (!hasEnoughData) {
        profitsInfo.hidden = true;
        return;
    }

    // Quote-part de gains afférente au montant retiré (art. 125-0 A CGI), ramenée à la valeur de rachat totale.
    const gains = Math.max(0, montantRetire * (valeurRachat - primesVersees) / valeurRachat);
    const duration = durationSelect.value;
    const avantReforme = document.getElementById('before-sep-2017').checked;
    const tmi = parseFloat(document.querySelector('input[name="tmi"]:checked').value) || 0;
    const situation = document.querySelector('input[name="situation"]:checked').value;
    const exonere = document.getElementById('exoneration').checked;

    const plusValue = gains > 0;
    // Une moins-value sur assurance vie n'ouvre droit à aucune imputation ni report (BOI-RPPM-RCM-20-10-20-50).
    document.getElementById('profits-label').innerText = plusValue
        ? 'Bénéfices imposables sur ce rachat :'
        : "Ce rachat ne dégage aucune plus-value : il n'est donc pas imposable. La perte constatée n'est ni imputable sur vos autres revenus ni reportable.";
    document.getElementById('profits-value').innerText = plusValue ? formatEUR(gains, { minimumFractionDigits: 0 }) : '';
    profitsInfo.classList.toggle('is-positive', plusValue);
    profitsInfo.classList.toggle('is-negative', !plusValue);
    profitsInfo.hidden = primesVersees <= 0;

    const rowIntegration = document.getElementById('row-integration');
    const rowForfaitaire = document.getElementById('row-forfaitaire');
    rowIntegration.classList.remove('best-option');
    rowForfaitaire.classList.remove('best-option');
    rowIntegration.querySelector('td').innerText = 'Barème progressif (IR)';
    document.getElementById('badge-integration').innerText = '';
    document.getElementById('badge-forfaitaire').innerText = '';
    rowForfaitaire.hidden = false;

    // Prélèvements sociaux : dus sur la totalité des gains, sans abattement, même en cas d'exonération d'IR.
    const prelevementsSociaux = gains * TAUX_PRELEVEMENTS_SOCIAUX;

    if (exonere) {
        rowIntegration.querySelector('td').innerText = "Exonération d'IR (prélèvements sociaux seuls)";
        document.getElementById('tax-integration').innerText = formatEUR(prelevementsSociaux, { minimumFractionDigits: 0 });
        document.getElementById('net-integration').innerText = formatEUR(montantRetire - prelevementsSociaux, { minimumFractionDigits: 0 });
        rowForfaitaire.hidden = true;
        return;
    }

    // L'abattement ne s'applique qu'aux contrats de plus de 8 ans, et uniquement à la part imposable au titre de l'IR.
    const abattement = ABATTEMENT_ANNUEL[situation];
    const baseImposable = duration === '8+' ? Math.max(0, gains - abattement) : gains;

    const tauxForfaitaire = avantReforme
        ? TAUX_FORFAITAIRE.avantReforme[duration]
        : duration === '8+'
            ? (primesVersees <= SEUIL_PRIMES_REDUIT ? TAUX_FORFAITAIRE.apresReforme['8+sousSeuil'] : TAUX_FORFAITAIRE.apresReforme['8+surSeuil'])
            : TAUX_FORFAITAIRE.apresReforme[duration];

    const integrationResult = baseImposable * (tmi / 100) + prelevementsSociaux;
    const forfaitaireResult = baseImposable * tauxForfaitaire + prelevementsSociaux;

    document.getElementById('tax-integration').innerText = formatEUR(integrationResult, { minimumFractionDigits: 0 });
    document.getElementById('net-integration').innerText = formatEUR(montantRetire - integrationResult, { minimumFractionDigits: 0 });
    document.getElementById('tax-forfaitaire').innerText = formatEUR(forfaitaireResult, { minimumFractionDigits: 0 });
    document.getElementById('net-forfaitaire').innerText = formatEUR(montantRetire - forfaitaireResult, { minimumFractionDigits: 0 });

    const meilleureLigne = integrationResult <= forfaitaireResult ? rowIntegration : rowForfaitaire;
    const badgeMeilleur = meilleureLigne === rowIntegration ? 'badge-integration' : 'badge-forfaitaire';
    meilleureLigne.classList.add('best-option');
    document.getElementById(badgeMeilleur).innerText = '✅ À privilégier';
}

function resetForm() {
    document.getElementById('calculator-form').reset();
    document.getElementById('partiel-fields').hidden = true;
    document.getElementById('abattement-fields').hidden = true;
    durationSelect.disabled = false;
    document.getElementById('duration-auto-note').innerText = '';
    calculate();
}

}

// --- Prêt immobilier ---

function initPret() {

let hasEditedDownPayment = false;

const priceInput = document.getElementById('price');
const downPaymentInput = document.getElementById('downPayment');
const isNewInputs = document.querySelectorAll('input[name="isNew"]');
const worksInput = document.getElementById('works');
const financingAmountInput = document.getElementById('financingAmount');
const financingUnit = document.getElementById('financingUnit');
const rateInput = document.getElementById('rate');
const durationInput = document.getElementById('duration');
const durationValue = document.getElementById('durationValue');
const warningEl = document.getElementById('warning');
const resetButton = document.getElementById('reset-button-pret');
const resultPriceEl = document.getElementById('resultPrice');
const resultWorksRow = document.getElementById('resultWorksRow');
const resultWorksEl = document.getElementById('resultWorks');
const notaryFeesEl = document.getElementById('notaryFees');
const notaryFeesLabelEl = document.getElementById('notaryFeesLabel');
const resultDownPaymentEl = document.getElementById('resultDownPayment');
const resultDownPaymentLabelEl = document.getElementById('resultDownPaymentLabel');
const loanAmountEl = document.getElementById('loanAmount');
const monthlyPaymentEl = document.getElementById('monthlyPayment');
const monthlyDurationEl = document.getElementById('monthlyDuration');
const monthlyCountEl = document.getElementById('monthlyCount');
const totalCreditCostEl = document.getElementById('totalCreditCost');
const totalCostEl = document.getElementById('totalCost');

function getSelectedIsNewValue() {
    const selected = document.querySelector('input[name="isNew"]:checked');
    return selected ? selected.value : null;
}

function calculate() {
    const sanitizedPrice = Math.max(Number(priceInput.value) || 0, 0);
    const sanitizedWorks = Math.max(Number(worksInput.value) || 0, 0);
    const sanitizedDownPayment = Math.max(Number(downPaymentInput.value) || 0, 0);
    const sanitizedRate = Math.max(Number(rateInput.value) || 0, 0);
    const sanitizedDuration = Math.min(Math.max(Number(durationInput.value) || 1, 1), 25);
    durationValue.value = `${sanitizedDuration} an${sanitizedDuration > 1 ? 's' : ''}`;

    const isNewValue = getSelectedIsNewValue();
    const hasFinancingData = sanitizedPrice > 0
        && downPaymentInput.value !== ''
        && isNewValue !== null;
    if (hasFinancingData) {
        const notaryFeesRate = NOTARY_FEE_RATE[isNewValue] ?? NOTARY_FEE_RATE.ancien;
        const notaryFees = sanitizedPrice * notaryFeesRate;
        const totalCostValue = sanitizedPrice + notaryFees + sanitizedWorks;
        const loanAmount = Math.max(totalCostValue - sanitizedDownPayment, 0);
        const downPaymentRate = Math.round((sanitizedDownPayment / sanitizedPrice) * 100);

        financingAmountInput.value = formatAmount(loanAmount);
        financingUnit.hidden = false;
        notaryFeesLabelEl.textContent = `Frais de notaire estimés (${Math.round(notaryFeesRate * 100)}%)`;
        resultDownPaymentLabelEl.textContent = `Apport (${downPaymentRate}%)`;
        warningEl.className = 'warning';
        if (sanitizedDownPayment > totalCostValue) {
            warningEl.className = 'warning warning-danger';
            warningEl.textContent = "L'apport dépasse le coût total de l'opération. Vous pouvez le réduire pour obtenir un scénario plus réaliste.";
        } else if (downPaymentRate < 10) {
            warningEl.className = 'warning warning-info';
            warningEl.textContent = `Votre apport représente ${downPaymentRate}% du prix du bien. Il est préférable d'avoir au moins 10% d'apport.`;
        } else {
            warningEl.className = 'warning warning-success';
            warningEl.textContent = `Votre apport représente ${downPaymentRate}% du prix du bien.`;
        }
    } else {
        financingAmountInput.value = '';
        financingUnit.hidden = true;
        warningEl.textContent = '';
    }

    const hasEnoughData = sanitizedPrice > 0
        && downPaymentInput.value !== ''
        && sanitizedDownPayment >= 0
        && isNewValue !== null
        && durationInput.value !== ''
        && sanitizedDuration > 0
        && rateInput.value !== ''
        && sanitizedRate >= 0;
    const resultsSection = document.getElementById('results');
    const resultsPlaceholder = document.getElementById('results-placeholder-pret');
    resultsSection.hidden = !hasEnoughData;
    resultsPlaceholder.hidden = hasEnoughData;
    if (!hasEnoughData) {
        return;
    }

    const notaryFeesRate = NOTARY_FEE_RATE[isNewValue] ?? NOTARY_FEE_RATE.ancien;
    const notaryFees = sanitizedPrice * notaryFeesRate;
    const totalCostValue = sanitizedPrice + notaryFees + sanitizedWorks;
    const loanAmount = Math.max(totalCostValue - sanitizedDownPayment, 0);

    const monthlyRate = sanitizedRate / 100 / 12;
    const totalMonths = sanitizedDuration * 12;
    const monthlyPayment = loanAmount > 0 && monthlyRate > 0
        ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths))
        : loanAmount / totalMonths;
    const totalCreditCost = monthlyPayment * totalMonths - loanAmount;

    notaryFeesEl.textContent = formatEUR(notaryFees);
    resultPriceEl.textContent = formatEUR(sanitizedPrice);
    resultWorksRow.hidden = sanitizedWorks === 0;
    resultWorksEl.textContent = formatEUR(sanitizedWorks);
    document.querySelectorAll('#tab-pret .results-table tbody tr').forEach((row) => {
        row.classList.remove('stripe-odd', 'stripe-even');
    });
    [...document.querySelectorAll('#tab-pret .results-table tbody tr')]
        .filter((row) => !row.hidden)
        .forEach((row, index) => row.classList.add(index % 2 === 0 ? 'stripe-odd' : 'stripe-even'));
    resultDownPaymentEl.textContent = formatEUR(sanitizedDownPayment);
    loanAmountEl.textContent = formatEUR(loanAmount);
    monthlyPaymentEl.textContent = formatEUR(monthlyPayment);
    monthlyDurationEl.textContent = `${sanitizedDuration} an${sanitizedDuration > 1 ? 's' : ''}`;
    monthlyCountEl.textContent = `${totalMonths} mois`;
    totalCreditCostEl.textContent = formatEUR(totalCreditCost);
    totalCostEl.textContent = formatEUR(totalCostValue + totalCreditCost);
}

downPaymentInput.addEventListener('input', () => {
    hasEditedDownPayment = true;
    calculate();
});

priceInput.addEventListener('input', () => {
    if (!hasEditedDownPayment) {
        downPaymentInput.value = Math.round(Number(priceInput.value) * 0.1 || 0);
    }
    calculate();
});

[worksInput, rateInput, durationInput].forEach((el) => {
    el.addEventListener('input', calculate);
});

isNewInputs.forEach((input) => {
    input.addEventListener('change', calculate);
});

resetButton.addEventListener('click', () => {
    hasEditedDownPayment = false;
    document.getElementById('loan-form').reset();
    calculate();
});

calculate();

}

initAv();
initPret();

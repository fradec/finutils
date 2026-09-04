import { NOTARY_FEE_RATE } from './loan-defaults.js';

let hasEditedDownPayment = false;

const priceInput = document.getElementById('price');
const downPaymentInput = document.getElementById('downPayment');
const isNewInputs = document.querySelectorAll('input[name="isNew"]');
const worksInput = document.getElementById('works');
const financingAmountInput = document.getElementById('financingAmount');
const rateInput = document.getElementById('rate');
const durationInput = document.getElementById('duration');
const durationValue = document.getElementById('durationValue');
const warningEl = document.getElementById('warning');
const resetButton = document.getElementById('reset-button');
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

function formatCurrency(value) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

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

    financingAmountInput.value = Math.round(loanAmount);
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
  const resultsPlaceholder = document.getElementById('results-placeholder');
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

  notaryFeesEl.textContent = formatCurrency(notaryFees);
  resultPriceEl.textContent = formatCurrency(sanitizedPrice);
  resultWorksRow.hidden = sanitizedWorks === 0;
  resultWorksEl.textContent = formatCurrency(sanitizedWorks);
  document.querySelectorAll('.results-table tbody tr').forEach((row) => {
    row.classList.remove('stripe-odd', 'stripe-even');
  });
  [...document.querySelectorAll('.results-table tbody tr')]
    .filter((row) => !row.hidden)
    .forEach((row, index) => row.classList.add(index % 2 === 0 ? 'stripe-odd' : 'stripe-even'));
  resultDownPaymentEl.textContent = formatCurrency(sanitizedDownPayment);
  loanAmountEl.textContent = formatCurrency(loanAmount);
  monthlyPaymentEl.textContent = formatCurrency(monthlyPayment);
  monthlyDurationEl.textContent = `${sanitizedDuration} an${sanitizedDuration > 1 ? 's' : ''}`;
  monthlyCountEl.textContent = `${totalMonths} mois`;
  totalCreditCostEl.textContent = formatCurrency(totalCreditCost);
  totalCostEl.textContent = formatCurrency(totalCostValue + totalCreditCost);
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

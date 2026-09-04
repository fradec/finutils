import {
  DEFAULT_VALUES,
  NOTARY_FEE_RATE,
} from './loan-defaults.js';

let hasEditedDownPayment = false;

const priceInput = document.getElementById('price');
const downPaymentInput = document.getElementById('downPayment');
const isNewInputs = document.querySelectorAll('input[name="isNew"]');
const worksInput = document.getElementById('works');
const rateInput = document.getElementById('rate');
const durationInput = document.getElementById('duration');
const warningEl = document.getElementById('warning');
const resetButton = document.getElementById('reset-button');
const notaryFeesEl = document.getElementById('notaryFees');
const loanAmountEl = document.getElementById('loanAmount');
const monthlyPaymentEl = document.getElementById('monthlyPayment');
const totalCreditCostEl = document.getElementById('totalCreditCost');
const totalCostEl = document.getElementById('totalCost');

function formatCurrency(value) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function getSelectedIsNewValue() {
  const selected = document.querySelector('input[name="isNew"]:checked');
  return selected ? selected.value : DEFAULT_VALUES.isNew;
}

function calculate() {
  const sanitizedPrice = Math.max(Number(priceInput.value) || 0, 0);
  const sanitizedWorks = Math.max(Number(worksInput.value) || 0, 0);
  const sanitizedDownPayment = Math.max(Number(downPaymentInput.value) || 0, 0);
  const sanitizedRate = Math.max(Number(rateInput.value) || 0, 0);
  const sanitizedDuration = Math.min(Math.max(Number(durationInput.value) || 1, 1), 35);

  const isNewValue = getSelectedIsNewValue();
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

  warningEl.textContent = sanitizedDownPayment > totalCostValue
    ? "⚠️ L'apport dépasse le coût total de l'opération. Vous pouvez le réduire pour obtenir un scénario plus réaliste."
    : '';

  notaryFeesEl.textContent = formatCurrency(notaryFees);
  loanAmountEl.textContent = formatCurrency(loanAmount);
  monthlyPaymentEl.textContent = formatCurrency(monthlyPayment);
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

[worksInput, rateInput, durationInput, downPaymentInput].forEach((el) => {
  el.addEventListener('input', calculate);
});

isNewInputs.forEach((input) => {
  input.addEventListener('change', calculate);
});

resetButton.addEventListener('click', () => {
  priceInput.value = DEFAULT_VALUES.price;
  downPaymentInput.value = DEFAULT_VALUES.downPayment;
  worksInput.value = DEFAULT_VALUES.works;
  rateInput.value = DEFAULT_VALUES.rate;
  durationInput.value = DEFAULT_VALUES.duration;
  const defaultIsNewInput = document.querySelector(`input[name="isNew"][value="${DEFAULT_VALUES.isNew}"]`);
  if (defaultIsNewInput) {
    defaultIsNewInput.checked = true;
  }
  calculate();
});

priceInput.value = DEFAULT_VALUES.price;
downPaymentInput.value = DEFAULT_VALUES.downPayment;
worksInput.value = DEFAULT_VALUES.works;
rateInput.value = DEFAULT_VALUES.rate;
durationInput.value = DEFAULT_VALUES.duration;
const initialIsNewInput = document.querySelector(`input[name="isNew"][value="${DEFAULT_VALUES.isNew}"]`);
if (initialIsNewInput) {
  initialIsNewInput.checked = true;
}

calculate();

import { computeLoan } from './calculations.js';
import { formatEUR, formatAmount } from './formatters.js';

// --- Prêt immobilier ---

export function initPret() {
    let hasEditedDownPayment = false;

    const priceInput = document.getElementById('price');
    const downPaymentInput = document.getElementById('downPayment');
    const isNewInputs = document.querySelectorAll('input[name="isNew"]');
    const worksInput = document.getElementById('works');
    const financingAmountInput = document.getElementById('financingAmount');
    const financingUnit = document.getElementById('financingUnit');
    const rateInput = document.getElementById('rate');
    const insuranceRateInput = document.getElementById('insuranceRate');
    const feesInput = document.getElementById('fees');
    const durationInput = document.getElementById('duration');
    const durationValue = document.getElementById('durationValue');
    const warningEl = document.getElementById('warning');
    const resetButton = document.getElementById('reset-button-pret');
    const resultsSection = document.getElementById('results');
    const resultsPlaceholder = document.getElementById('results-placeholder-pret');
    const resultPriceEl = document.getElementById('resultPrice');
    const resultWorksRow = document.getElementById('resultWorksRow');
    const resultWorksEl = document.getElementById('resultWorks');
    const resultFeesRow = document.getElementById('resultFeesRow');
    const resultFeesEl = document.getElementById('resultFees');
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
    const creditBreakdownEl = document.getElementById('credit-breakdown');
    const monthlyPaymentLabelEl = document.getElementById('monthlyPaymentLabel');
    const insuranceSummaryEl = document.getElementById('insuranceSummary');
    const monthlyPaymentWithInsuranceEl = document.getElementById('monthlyPaymentWithInsurance');

    function getSelectedIsNewValue() {
        const selected = document.querySelector('input[name="isNew"]:checked');
        return selected ? selected.value : null;
    }

    function calculate() {
        const sanitizedPrice = Math.max(Number(priceInput.value) || 0, 0);
        const sanitizedWorks = Math.max(Number(worksInput.value) || 0, 0);
        const sanitizedDownPayment = Math.max(Number(downPaymentInput.value) || 0, 0);
        const sanitizedRate = Math.max(Number(rateInput.value) || 0, 0);
        const sanitizedInsuranceRate = Math.max(Number(insuranceRateInput.value) || 0, 0);
        const sanitizedFees = Math.max(Number(feesInput.value) || 0, 0);
        const sanitizedDuration = Math.min(Math.max(Number(durationInput.value) || 1, 1), 25);
        durationValue.value = `${sanitizedDuration} an${sanitizedDuration > 1 ? 's' : ''}`;

        const isNewValue = getSelectedIsNewValue();
        const hasFinancingData = sanitizedPrice > 0 && downPaymentInput.value !== '' && isNewValue !== null;
        const loan = hasFinancingData
            ? computeLoan({
                  price: sanitizedPrice,
                  works: sanitizedWorks,
                  downPayment: sanitizedDownPayment,
                  rate: sanitizedRate,
                  durationYears: sanitizedDuration,
                  isNew: isNewValue,
                  insuranceRate: sanitizedInsuranceRate,
                  fees: sanitizedFees,
              })
            : null;
        const hasInsurance = loan ? loan.insuranceCost > 0 : false;

        if (loan) {
            financingAmountInput.value = formatAmount(loan.loanAmount);
            financingUnit.hidden = false;
            notaryFeesLabelEl.textContent = `Frais de notaire estimés (${Math.round(loan.notaryFeesRate * 100)}%)`;
            resultDownPaymentLabelEl.textContent = `Apport (${loan.downPaymentRate}%)`;
            warningEl.className = 'warning';
            if (sanitizedDownPayment > loan.totalCost) {
                warningEl.className = 'warning warning-danger';
                warningEl.textContent =
                    "L'apport dépasse le coût total de l'opération. Vous pouvez le réduire pour obtenir un scénario plus réaliste.";
            } else if (loan.downPaymentRate < 10) {
                warningEl.className = 'warning warning-info';
                warningEl.textContent = `Votre apport représente ${loan.downPaymentRate}% du prix du bien. Il est préférable d'avoir au moins 10% d'apport.`;
            } else {
                warningEl.className = 'warning warning-success';
                warningEl.textContent = `Votre apport représente ${loan.downPaymentRate}% du prix du bien.`;
            }
        } else {
            financingAmountInput.value = '';
            financingUnit.hidden = true;
            warningEl.textContent = '';
        }

        const hasEnoughData = hasFinancingData && durationInput.value !== '' && rateInput.value !== '';
        resultsSection.hidden = !hasEnoughData;
        resultsPlaceholder.hidden = hasEnoughData;
        if (!hasEnoughData) {
            return;
        }

        notaryFeesEl.textContent = formatEUR(loan.notaryFees);
        resultPriceEl.textContent = formatEUR(sanitizedPrice);
        resultWorksRow.hidden = sanitizedWorks === 0;
        resultWorksEl.textContent = formatEUR(sanitizedWorks);
        resultFeesRow.hidden = sanitizedFees === 0;
        resultFeesEl.textContent = formatEUR(sanitizedFees);
        document.querySelectorAll('#tab-pret .results-table tbody tr').forEach((row) => {
            row.classList.remove('stripe-odd', 'stripe-even');
        });
        [...document.querySelectorAll('#tab-pret .results-table tbody tr')]
            .filter((row) => !row.hidden)
            .forEach((row, index) => row.classList.add(index % 2 === 0 ? 'stripe-odd' : 'stripe-even'));
        resultDownPaymentEl.textContent = formatEUR(sanitizedDownPayment);
        loanAmountEl.textContent = formatEUR(loan.loanAmount);
        monthlyPaymentEl.textContent = formatEUR(loan.monthlyPayment);
        monthlyDurationEl.textContent = `${sanitizedDuration} an${sanitizedDuration > 1 ? 's' : ''}`;
        monthlyCountEl.textContent = `${loan.totalMonths} mois`;
        totalCreditCostEl.textContent = formatEUR(loan.totalCreditCost);
        totalCostEl.textContent = formatEUR(loan.totalCostWithCredit);

        monthlyPaymentLabelEl.textContent = hasInsurance ? 'Mensualité hors assurance' : 'Mensualité';
        insuranceSummaryEl.hidden = !hasInsurance;
        if (hasInsurance) {
            monthlyPaymentWithInsuranceEl.textContent = formatEUR(loan.monthlyPaymentWithInsurance);
        }
        creditBreakdownEl.hidden = !hasInsurance;
        if (hasInsurance) {
            creditBreakdownEl.textContent = `Coût du crédit : ${formatEUR(loan.interestCost)} d'intérêts + ${formatEUR(loan.insuranceCost)} d'assurance emprunteur.`;
        }
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

    [worksInput, rateInput, insuranceRateInput, feesInput, durationInput].forEach((el) => {
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

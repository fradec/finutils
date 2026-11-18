import { SOURCE_URL, DATE_REFORME, CAS_EXONERATION } from './constants.js';
import { computeAvResult } from './calculations.js';
import { formatEUR } from './formatters.js';

// --- Assurance vie ---

export function initAv() {
    const dateSouscriptionInput = document.getElementById('date-souscription');
    const calculatorForm = document.getElementById('calculator-form');
    const resetButton = document.getElementById('reset-button-av');
    const rachatTypeRadios = document.querySelectorAll('input[name="rachat-type"]');
    const partielFields = document.getElementById('partiel-fields');
    const durationRadios = document.querySelectorAll('input[name="duration"]');
    const abattementFields = document.getElementById('abattement-fields');
    const durationAutoNoteEl = document.getElementById('duration-auto-note');
    const montantRetireInput = document.getElementById('montant-retire');
    const pourcentageRetireInput = document.getElementById('pourcentage-retire');
    const valueAInput = document.getElementById('value-a');
    const valueBInput = document.getElementById('value-b');
    const beforeSep2017Checkbox = document.getElementById('before-sep-2017');
    const dateReformeLabelEl = document.getElementById('date-reforme-label');
    const exonerationCheckbox = document.getElementById('exoneration');
    const exonerationLabelEl = document.getElementById('exoneration-label');
    const legalLinkAnchor = document.getElementById('legal-link-anchor');
    const resultsSection = document.getElementById('results-section');
    const resultsPlaceholder = document.getElementById('results-placeholder-av');
    const profitsInfo = document.getElementById('profits-info');
    const profitsLabelEl = document.getElementById('profits-label');
    const profitsValueEl = document.getElementById('profits-value');
    const rowIntegration = document.getElementById('row-integration');
    const rowForfaitaire = document.getElementById('row-forfaitaire');
    const badgeIntegrationEl = document.getElementById('badge-integration');
    const badgeForfaitaireEl = document.getElementById('badge-forfaitaire');
    const taxIntegrationEl = document.getElementById('tax-integration');
    const netIntegrationEl = document.getElementById('net-integration');
    const taxForfaitaireEl = document.getElementById('tax-forfaitaire');
    const netForfaitaireEl = document.getElementById('net-forfaitaire');

    dateSouscriptionInput.max = new Date().toISOString().split('T')[0];

    const dateReforme = new Date(DATE_REFORME).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    dateReformeLabelEl.innerText = `Primes versées avant le ${dateReforme}`;

    const casExoneration = CAS_EXONERATION.map((cas) => cas.charAt(0).toLowerCase() + cas.slice(1)).join(', ');
    exonerationLabelEl.innerText = `Cas d'exonération d'impôt sur le revenu (${casExoneration})`;

    legalLinkAnchor.href = SOURCE_URL;

    calculatorForm.addEventListener('input', calculate);
    resetButton.addEventListener('click', resetForm);

    rachatTypeRadios.forEach((radio) =>
        radio.addEventListener('change', () => {
            partielFields.hidden = document.querySelector('input[name="rachat-type"]:checked').value !== 'partiel';
        }),
    );

    // L'abattement (et le choix seul/couple qui en double le montant) ne concerne que les contrats de plus de 8 ans.
    const durationSelect = {
        get value() {
            return document.querySelector('input[name="duration"]:checked').value;
        },
        set value(v) {
            document.querySelector(`input[name="duration"][value="${v}"]`).checked = true;
        },
        set disabled(v) {
            durationRadios.forEach((radio) => {
                radio.disabled = v;
            });
        },
    };
    function updateAbattementVisibility() {
        abattementFields.hidden = durationSelect.value !== '8+';
    }
    durationRadios.forEach((radio) => radio.addEventListener('change', updateAbattementVisibility));

    // Date de souscription (optionnelle) : calcule et verrouille automatiquement la tranche de durée.
    dateSouscriptionInput.addEventListener('input', (event) => {
        if (!event.target.value) {
            durationSelect.disabled = false;
            durationAutoNoteEl.innerText = '';
            return;
        }
        const annees = (Date.now() - new Date(event.target.value).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        durationSelect.value = annees < 4 ? '0-4' : annees < 8 ? '4-8' : '8+';
        durationSelect.disabled = true;
        durationAutoNoteEl.innerText = `Durée calculée automatiquement : ${annees.toFixed(1)} an(s)`;
        updateAbattementVisibility();
    });

    montantRetireInput.addEventListener('input', () => {
        const valeurRachat = parseFloat(valueAInput.value) || 0;
        const montant = parseFloat(montantRetireInput.value) || 0;
        // Arrondi au palier de 0,5 % pour rester compatible avec le pas du champ pourcentage.
        const pourcentage = valeurRachat > 0 ? Math.min(100, Math.round((montant / valeurRachat) * 200) / 2) : 0;
        pourcentageRetireInput.value = pourcentage > 0 ? pourcentage : '';
    });

    pourcentageRetireInput.addEventListener('input', (event) => {
        const valeurRachat = parseFloat(valueAInput.value) || 0;
        const saisie = parseFloat(event.target.value);
        if (Number.isNaN(saisie)) {
            montantRetireInput.value = '';
            return;
        }
        const pourcentage = Math.min(100, Math.max(1, saisie));
        if (pourcentage !== saisie) {
            event.target.value = pourcentage;
        }
        montantRetireInput.value = ((pourcentage / 100) * valeurRachat).toFixed(2);
    });

    function calculate() {
        const primesVersees = parseFloat(valueBInput.value) || 0;
        const valeurRachat = parseFloat(valueAInput.value) || 0;
        const rachatPartiel = document.querySelector('input[name="rachat-type"]:checked').value === 'partiel';
        const montantRetire = rachatPartiel ? parseFloat(montantRetireInput.value) || 0 : valeurRachat;

        const hasEnoughData = valeurRachat > 0 && montantRetire > 0;
        resultsSection.hidden = !hasEnoughData;
        resultsPlaceholder.hidden = hasEnoughData;
        if (!hasEnoughData) {
            profitsInfo.hidden = true;
            return;
        }

        const duration = durationSelect.value;
        const avantReforme = beforeSep2017Checkbox.checked;
        const tmi = parseFloat(document.querySelector('input[name="tmi"]:checked').value) || 0;
        const situation = document.querySelector('input[name="situation"]:checked').value;
        const exonere = exonerationCheckbox.checked;

        const result = computeAvResult({
            primesVersees,
            valeurRachat,
            montantRetire,
            duration,
            avantReforme,
            tmi,
            situation,
            exonere,
        });

        // Une moins-value sur assurance vie n'ouvre droit à aucune imputation ni report (BOI-RPPM-RCM-20-10-20-50).
        profitsLabelEl.innerText = result.plusValue
            ? 'Bénéfices imposables sur ce rachat :'
            : "Ce rachat ne dégage aucune plus-value : il n'est donc pas imposable. La perte constatée n'est ni imputable sur vos autres revenus ni reportable.";
        profitsValueEl.innerText = result.plusValue ? formatEUR(result.gains, { minimumFractionDigits: 0 }) : '';
        profitsInfo.classList.toggle('is-positive', result.plusValue);
        profitsInfo.classList.toggle('is-negative', !result.plusValue);
        profitsInfo.hidden = primesVersees <= 0;

        rowIntegration.classList.remove('best-option');
        rowForfaitaire.classList.remove('best-option');
        rowIntegration.querySelector('td').innerText = 'Barème progressif (IR)';
        badgeIntegrationEl.innerText = '';
        badgeForfaitaireEl.innerText = '';
        rowForfaitaire.hidden = false;

        if (result.exonere) {
            rowIntegration.querySelector('td').innerText = "Exonération d'IR (prélèvements sociaux seuls)";
            taxIntegrationEl.innerText = formatEUR(result.taxIntegration, { minimumFractionDigits: 0 });
            netIntegrationEl.innerText = formatEUR(result.netIntegration, { minimumFractionDigits: 0 });
            rowForfaitaire.hidden = true;
            return;
        }

        taxIntegrationEl.innerText = formatEUR(result.taxIntegration, { minimumFractionDigits: 0 });
        netIntegrationEl.innerText = formatEUR(result.netIntegration, { minimumFractionDigits: 0 });
        taxForfaitaireEl.innerText = formatEUR(result.taxForfaitaire, { minimumFractionDigits: 0 });
        netForfaitaireEl.innerText = formatEUR(result.netForfaitaire, { minimumFractionDigits: 0 });

        const meilleureLigne = result.meilleureOption === 'integration' ? rowIntegration : rowForfaitaire;
        const badgeMeilleur = meilleureLigne === rowIntegration ? badgeIntegrationEl : badgeForfaitaireEl;
        meilleureLigne.classList.add('best-option');
        badgeMeilleur.innerText = '✅ À privilégier';
    }

    function resetForm() {
        calculatorForm.reset();
        partielFields.hidden = true;
        abattementFields.hidden = true;
        durationSelect.disabled = false;
        durationAutoNoteEl.innerText = '';
        calculate();
    }
}

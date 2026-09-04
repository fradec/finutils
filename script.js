import {
    TAUX_PRELEVEMENTS_SOCIAUX,
    ABATTEMENT_ANNUEL,
    SEUIL_PRIMES_REDUIT,
    TAUX_FORFAITAIRE,
} from './fiscal-rules.js';

document.getElementById('calculator-form').addEventListener('input', calculate);
document.getElementById('reset-button').addEventListener('click', resetForm);

function calculate() {
    const primesVersees = parseFloat(document.getElementById('value-b').value) || 0;
    const valeurRachat = parseFloat(document.getElementById('value-a').value) || 0;
    const gains = Math.max(0, valeurRachat - primesVersees);
    const duration = document.getElementById('duration').value;
    const avantReforme = document.getElementById('before-sep-2017').checked;
    const tmi = parseFloat(document.getElementById('tmi').value) || 0;

    document.getElementById('profits').value = gains.toFixed(2);

    // Prélèvements sociaux : dus sur la totalité des gains, sans abattement, quelle que soit l'option choisie.
    const prelevementsSociaux = gains * TAUX_PRELEVEMENTS_SOCIAUX;

    // L'abattement ne s'applique qu'aux contrats de plus de 8 ans, et uniquement à la part imposable au titre de l'IR.
    const baseImposable = duration === '8+' ? Math.max(0, gains - ABATTEMENT_ANNUEL.seul) : gains;

    const tauxForfaitaire = avantReforme
        ? TAUX_FORFAITAIRE.avantReforme[duration]
        : duration === '8+'
            ? (primesVersees <= SEUIL_PRIMES_REDUIT ? TAUX_FORFAITAIRE.apresReforme['8+sousSeuil'] : TAUX_FORFAITAIRE.apresReforme['8+surSeuil'])
            : TAUX_FORFAITAIRE.apresReforme[duration];

    const integrationResult = baseImposable * (tmi / 100) + prelevementsSociaux;
    const forfaitaireResult = baseImposable * tauxForfaitaire + prelevementsSociaux;

    document.getElementById('result-integration').innerText = `Taxe via intégration des produits à l'impôt sur le revenu : ${integrationResult.toFixed(2)} €`;
    document.getElementById('result-forfaitaire').innerText = `Taxe via prélèvement forfaitaire : ${forfaitaireResult.toFixed(2)} €`;
}

function resetForm() {
    document.getElementById('calculator-form').reset();
    document.getElementById('result-integration').innerText = '';
    document.getElementById('result-forfaitaire').innerText = '';
}

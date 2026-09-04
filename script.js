import {
    TAUX_PRELEVEMENTS_SOCIAUX,
    ABATTEMENT_ANNUEL,
    SEUIL_PRIMES_REDUIT,
    TAUX_FORFAITAIRE,
} from './fiscal-rules.js';

const formatEUR = (montant) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);

document.getElementById('calculator-form').addEventListener('input', calculate);
document.getElementById('reset-button').addEventListener('click', resetForm);

document.querySelectorAll('input[name="rachat-type"]').forEach((radio) => radio.addEventListener('change', () => {
    document.getElementById('partiel-fields').hidden = document.querySelector('input[name="rachat-type"]:checked').value !== 'partiel';
}));

document.getElementById('montant-retire').addEventListener('input', () => {
    const valeurRachat = parseFloat(document.getElementById('value-a').value) || 0;
    const montant = parseFloat(document.getElementById('montant-retire').value) || 0;
    document.getElementById('pourcentage-retire').value = valeurRachat > 0 ? ((montant / valeurRachat) * 100).toFixed(1) : '';
});

document.getElementById('pourcentage-retire').addEventListener('input', () => {
    const valeurRachat = parseFloat(document.getElementById('value-a').value) || 0;
    const pourcentage = parseFloat(document.getElementById('pourcentage-retire').value) || 0;
    document.getElementById('montant-retire').value = ((pourcentage / 100) * valeurRachat).toFixed(2);
});

function calculate() {
    const primesVersees = parseFloat(document.getElementById('value-b').value) || 0;
    const valeurRachat = parseFloat(document.getElementById('value-a').value) || 0;
    const rachatPartiel = document.querySelector('input[name="rachat-type"]:checked').value === 'partiel';
    const montantRetire = rachatPartiel ? (parseFloat(document.getElementById('montant-retire').value) || 0) : valeurRachat;
    // Quote-part de gains afférente au montant retiré (art. 125-0 A CGI), ramenée à la valeur de rachat totale.
    const gains = valeurRachat > 0 ? Math.max(0, montantRetire * (valeurRachat - primesVersees) / valeurRachat) : 0;
    const duration = document.getElementById('duration').value;
    const avantReforme = document.getElementById('before-sep-2017').checked;
    const tmi = parseFloat(document.getElementById('tmi').value) || 0;
    const situation = document.querySelector('input[name="situation"]:checked').value;
    const exonere = document.getElementById('exoneration').checked;

    document.getElementById('profits').value = gains.toFixed(2);

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
        document.getElementById('tax-integration').innerText = formatEUR(prelevementsSociaux);
        document.getElementById('net-integration').innerText = formatEUR(montantRetire - prelevementsSociaux);
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

    document.getElementById('tax-integration').innerText = formatEUR(integrationResult);
    document.getElementById('net-integration').innerText = formatEUR(montantRetire - integrationResult);
    document.getElementById('tax-forfaitaire').innerText = formatEUR(forfaitaireResult);
    document.getElementById('net-forfaitaire').innerText = formatEUR(montantRetire - forfaitaireResult);

    const meilleureLigne = integrationResult <= forfaitaireResult ? rowIntegration : rowForfaitaire;
    const badgeMeilleur = meilleureLigne === rowIntegration ? 'badge-integration' : 'badge-forfaitaire';
    meilleureLigne.classList.add('best-option');
    document.getElementById(badgeMeilleur).innerText = '✅ À privilégier';
}

function resetForm() {
    document.getElementById('calculator-form').reset();
    document.getElementById('partiel-fields').hidden = true;
    document.getElementById('result-integration').innerText = '';
    document.getElementById('result-forfaitaire').innerText = '';
}

// Fonctions de calcul pures (aucun accès au DOM), testables indépendamment de l'UI.

import {
    TAUX_PRELEVEMENTS_SOCIAUX,
    ABATTEMENT_ANNUEL,
    SEUIL_PRIMES_REDUIT,
    TAUX_FORFAITAIRE,
    NOTARY_FEE_RATE,
} from './constants.js';

// Répartit les gains d'un contrat de plus de 8 ans entre la fraction éligible au taux réduit
// et celle relevant du taux de droit commun (CGI, art. 200 A, 1-B-2° ; BOI-RPPM-RCM-20-15 § 190).
function repartirGainsAuSeuil(gains, { primesVersees, avantReforme, duration }) {
    // Avant 8 ans, aucun taux réduit : tous les gains relèvent du taux de droit commun.
    if (duration !== '8+') {
        return { gainsTauxReduit: 0, gainsTauxNormal: gains };
    }
    // Primes antérieures au 27/09/2017 : le taux historique de 7,5 % s'applique à tous les gains.
    if (avantReforme) {
        return { gainsTauxReduit: gains, gainsTauxNormal: 0 };
    }
    // Sinon, seule la fraction des gains attachée aux primes sous le seuil de 150 000 € reste à 7,5 %.
    const fractionReduite = primesVersees > 0 ? Math.min(1, SEUIL_PRIMES_REDUIT / primesVersees) : 1;
    const gainsTauxReduit = gains * fractionReduite;
    return { gainsTauxReduit, gainsTauxNormal: gains - gainsTauxReduit };
}

// Fiscalité d'un rachat d'assurance vie (barème progressif vs. prélèvement forfaitaire).
export function computeAvResult({
    primesVersees,
    valeurRachat,
    montantRetire,
    duration,
    avantReforme,
    tmi,
    situation,
    exonere,
}) {
    // Quote-part de gains afférente au montant retiré (art. 125-0 A CGI), ramenée à la valeur de rachat totale.
    const gains = Math.max(0, (montantRetire * (valeurRachat - primesVersees)) / valeurRachat);
    const plusValue = gains > 0;
    // Prélèvements sociaux : dus sur la totalité des gains, sans abattement, même en cas d'exonération d'IR.
    const prelevementsSociaux = gains * TAUX_PRELEVEMENTS_SOCIAUX;

    if (exonere) {
        return {
            gains,
            plusValue,
            exonere: true,
            taxIntegration: prelevementsSociaux,
            netIntegration: montantRetire - prelevementsSociaux,
        };
    }

    // L'abattement ne s'applique qu'aux contrats de plus de 8 ans.
    const abattement = duration === '8+' ? ABATTEMENT_ANNUEL[situation] : 0;
    const baseImposable = duration === '8+' ? Math.max(0, gains - abattement) : gains;
    const { gainsTauxReduit, gainsTauxNormal } = repartirGainsAuSeuil(gains, {
        primesVersees,
        avantReforme,
        duration,
    });

    // L'abattement s'impute d'abord sur la fraction à 7,5 %, puis sur le reliquat à 12,8 %
    // (BOI-RPPM-RCM-20-10-20-50 § 288).
    const baseTauxReduit = Math.max(0, gainsTauxReduit - abattement);
    const reliquatAbattement = Math.max(0, abattement - gainsTauxReduit);
    const baseTauxNormal = Math.max(0, gainsTauxNormal - reliquatAbattement);

    const tauxReduit = avantReforme
        ? TAUX_FORFAITAIRE.avantReforme[duration]
        : TAUX_FORFAITAIRE.apresReforme['8+sousSeuil'];
    const tauxNormal = avantReforme
        ? TAUX_FORFAITAIRE.avantReforme[duration]
        : duration === '8+'
          ? TAUX_FORFAITAIRE.apresReforme['8+surSeuil']
          : TAUX_FORFAITAIRE.apresReforme[duration];

    const taxIntegration = baseImposable * (tmi / 100) + prelevementsSociaux;
    const taxForfaitaire = baseTauxReduit * tauxReduit + baseTauxNormal * tauxNormal + prelevementsSociaux;

    return {
        gains,
        plusValue,
        exonere: false,
        taxIntegration,
        netIntegration: montantRetire - taxIntegration,
        taxForfaitaire,
        netForfaitaire: montantRetire - taxForfaitaire,
        meilleureOption: taxIntegration <= taxForfaitaire ? 'integration' : 'forfaitaire',
    };
}

// Simulateur de crédit immobilier (coût à financer, mensualité, coût total).
export function computeLoan({ price, works, downPayment, rate, durationYears, isNew }) {
    const notaryFeesRate = NOTARY_FEE_RATE[isNew] ?? NOTARY_FEE_RATE.ancien;
    const notaryFees = price * notaryFeesRate;
    const totalCost = price + notaryFees + works;
    const loanAmount = Math.max(totalCost - downPayment, 0);
    const downPaymentRate = price > 0 ? Math.round((downPayment / price) * 100) : 0;

    const monthlyRate = rate / 100 / 12;
    const totalMonths = durationYears * 12;
    const monthlyPayment =
        loanAmount > 0 && monthlyRate > 0
            ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths))
            : loanAmount / totalMonths;
    const totalCreditCost = monthlyPayment * totalMonths - loanAmount;

    return {
        notaryFeesRate,
        notaryFees,
        totalCost,
        loanAmount,
        downPaymentRate,
        monthlyPayment,
        totalMonths,
        totalCreditCost,
        totalCostWithCredit: totalCost + totalCreditCost,
    };
}

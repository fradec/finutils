// Fonctions de calcul pures (aucun accès au DOM), testables indépendamment de l'UI.

import {
    TAUX_PRELEVEMENTS_SOCIAUX,
    ABATTEMENT_ANNUEL,
    SEUIL_PRIMES_REDUIT,
    TAUX_FORFAITAIRE,
    NOTARY_FEE_RATE,
} from './constants.js';

// Fiscalité d'un rachat d'assurance vie (barème progressif vs. prélèvement forfaitaire).
export function computeAvResult({ primesVersees, valeurRachat, montantRetire, duration, avantReforme, tmi, situation, exonere }) {
    // Quote-part de gains afférente au montant retiré (art. 125-0 A CGI), ramenée à la valeur de rachat totale.
    const gains = Math.max(0, montantRetire * (valeurRachat - primesVersees) / valeurRachat);
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

    // L'abattement ne s'applique qu'aux contrats de plus de 8 ans, et uniquement à la part imposable au titre de l'IR.
    const abattement = ABATTEMENT_ANNUEL[situation];
    const baseImposable = duration === '8+' ? Math.max(0, gains - abattement) : gains;

    const tauxForfaitaire = avantReforme
        ? TAUX_FORFAITAIRE.avantReforme[duration]
        : duration === '8+'
            ? (primesVersees <= SEUIL_PRIMES_REDUIT ? TAUX_FORFAITAIRE.apresReforme['8+sousSeuil'] : TAUX_FORFAITAIRE.apresReforme['8+surSeuil'])
            : TAUX_FORFAITAIRE.apresReforme[duration];

    const taxIntegration = baseImposable * (tmi / 100) + prelevementsSociaux;
    const taxForfaitaire = baseImposable * tauxForfaitaire + prelevementsSociaux;

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
    const monthlyPayment = loanAmount > 0 && monthlyRate > 0
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

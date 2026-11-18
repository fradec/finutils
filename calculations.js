// Fonctions de calcul pures (aucun accès au DOM), testables indépendamment de l'UI.

import {
    TAUX_PRELEVEMENTS_SOCIAUX,
    ABATTEMENT_ANNUEL,
    SEUIL_PRIMES_REDUIT,
    TAUX_FORFAITAIRE,
    NOTARY_FEE_RATE,
} from './constants.js';

// Répartit les gains post-réforme d'un contrat de plus de 8 ans entre la fraction éligible au taux
// réduit de 7,5 % et celle relevant du taux de 12,8 % (CGI, art. 200 A, 1-B-2° ; BOI-RPPM-RCM-20-15 § 190).
function repartirGainsAuSeuil(gains, primesAvantReforme, primesApresReforme) {
    if (primesApresReforme <= 0) {
        return { gainsTauxReduit: 0, gainsTauxNormal: gains };
    }
    // Le seuil de 150 000 € est réduit des primes antérieures à la réforme, puis rapporté aux primes post-réforme.
    const plafond = Math.max(0, SEUIL_PRIMES_REDUIT - primesAvantReforme);
    const gainsTauxReduit = gains * Math.min(1, plafond / primesApresReforme);
    return { gainsTauxReduit, gainsTauxNormal: gains - gainsTauxReduit };
}

// Fiscalité d'un rachat d'assurance vie (barème progressif vs. prélèvement forfaitaire).
export function computeAvResult({
    primesVersees,
    primesAvantReforme = 0,
    valeurRachat,
    montantRetire,
    duration,
    tmi,
    situation,
    exonere,
}) {
    // Borne les entrées : un rachat ne peut être négatif ni dépasser la valeur de rachat totale.
    const primes = Math.max(0, primesVersees);
    const valeur = Math.max(0, valeurRachat);
    const rachat = valeur > 0 ? Math.min(Math.max(0, montantRetire), valeur) : 0;
    const primesAvant = Math.min(Math.max(0, primesAvantReforme), primes);
    const primesApres = primes - primesAvant;

    // Quote-part de gains afférente au montant retiré (art. 125-0 A CGI), ramenée à la valeur de rachat totale.
    const gains = valeur > 0 ? Math.max(0, (rachat * (valeur - primes)) / valeur) : 0;
    const plusValue = gains > 0;
    // Prélèvements sociaux : dus sur la totalité des gains, sans abattement, même en cas d'exonération d'IR.
    const prelevementsSociaux = gains * TAUX_PRELEVEMENTS_SOCIAUX;

    if (exonere) {
        return {
            gains,
            plusValue,
            exonere: true,
            taxIntegration: prelevementsSociaux,
            netIntegration: rachat - prelevementsSociaux,
        };
    }

    // Faute de détail par compartiment, les gains sont répartis au prorata des primes versées
    // (hypothèse d'une même performance sur les deux compartiments).
    const gainsAvantReforme = primes > 0 ? (gains * primesAvant) / primes : 0;
    const gainsApresReforme = gains - gainsAvantReforme;

    // L'abattement ne s'applique qu'aux contrats de plus de 8 ans.
    const abattement = duration === '8+' ? (ABATTEMENT_ANNUEL[situation] ?? 0) : 0;
    const { gainsTauxReduit, gainsTauxNormal } =
        duration === '8+'
            ? repartirGainsAuSeuil(gainsApresReforme, primesAvant, primesApres)
            : { gainsTauxReduit: 0, gainsTauxNormal: gainsApresReforme };

    // L'abattement s'impute d'abord sur les produits antérieurs à la réforme, puis sur la fraction
    // post-réforme à 7,5 %, puis sur celle à 12,8 % (BOI-RPPM-RCM-20-10-20-50 § 288).
    let reliquatAbattement = abattement;
    const baseAvantReforme = Math.max(0, gainsAvantReforme - reliquatAbattement);
    reliquatAbattement = Math.max(0, reliquatAbattement - gainsAvantReforme);
    const baseTauxReduit = Math.max(0, gainsTauxReduit - reliquatAbattement);
    reliquatAbattement = Math.max(0, reliquatAbattement - gainsTauxReduit);
    const baseTauxNormal = Math.max(0, gainsTauxNormal - reliquatAbattement);

    const tauxAvantReforme = TAUX_FORFAITAIRE.avantReforme[duration];
    const tauxReduit = TAUX_FORFAITAIRE.apresReforme['8+sousSeuil'];
    const tauxNormal =
        duration === '8+' ? TAUX_FORFAITAIRE.apresReforme['8+surSeuil'] : TAUX_FORFAITAIRE.apresReforme[duration];

    const baseImposable = Math.max(0, gains - abattement);
    const taxIntegration = baseImposable * (tmi / 100) + prelevementsSociaux;
    const taxForfaitaire =
        baseAvantReforme * tauxAvantReforme +
        baseTauxReduit * tauxReduit +
        baseTauxNormal * tauxNormal +
        prelevementsSociaux;

    return {
        gains,
        plusValue,
        exonere: false,
        taxIntegration,
        netIntegration: rachat - taxIntegration,
        taxForfaitaire,
        netForfaitaire: rachat - taxForfaitaire,
        meilleureOption: taxIntegration <= taxForfaitaire ? 'integration' : 'forfaitaire',
    };
}

// Simulateur de crédit immobilier (coût à financer, mensualité, coût total).
export function computeLoan({ price, works, downPayment, rate, durationYears, isNew, insuranceRate = 0 }) {
    // Borne les entrées pour éviter des montants négatifs ou une durée nulle.
    const prix = Math.max(0, price);
    const travaux = Math.max(0, works);
    const apport = Math.max(0, downPayment);
    const tauxAnnuel = Math.max(0, rate);
    const tauxAssurance = Math.max(0, insuranceRate);

    const notaryFeesRate = NOTARY_FEE_RATE[isNew] ?? NOTARY_FEE_RATE.ancien;
    const notaryFees = prix * notaryFeesRate;
    const totalCost = prix + notaryFees + travaux;
    const loanAmount = Math.max(totalCost - apport, 0);
    const downPaymentRate = prix > 0 ? Math.round((apport / prix) * 100) : 0;

    const monthlyRate = tauxAnnuel / 100 / 12;
    const totalMonths = Math.max(1, durationYears * 12);
    const monthlyPayment =
        loanAmount > 0 && monthlyRate > 0
            ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths))
            : loanAmount / totalMonths;
    const interestCost = monthlyPayment * totalMonths - loanAmount;

    // Assurance emprunteur : prime mensuelle calculée sur le capital initialement emprunté.
    const monthlyInsurance = (loanAmount * tauxAssurance) / 100 / 12;
    const insuranceCost = monthlyInsurance * totalMonths;
    const totalCreditCost = interestCost + insuranceCost;

    return {
        notaryFeesRate,
        notaryFees,
        totalCost,
        loanAmount,
        downPaymentRate,
        monthlyPayment,
        monthlyPaymentWithInsurance: monthlyPayment + monthlyInsurance,
        monthlyInsurance,
        totalMonths,
        interestCost,
        insuranceCost,
        totalCreditCost,
        totalCostWithCredit: totalCost + totalCreditCost,
    };
}

// Règles fiscales des rachats d'assurance-vie en France (contrats en unités de compte/euros, hors succession).
// Référence officielle : https://www.service-public.gouv.fr/particuliers/vosdroits/F22414
// --- Assurance vie ---

export const SOURCE_URL = 'https://www.service-public.gouv.fr/particuliers/vosdroits/F22414';

// Date à partir de laquelle les primes versées suivent le régime issu de la loi de finances 2018.
export const DATE_REFORME = '2017-09-27';

// Prélèvements sociaux (CSG, CRDS, etc.), dus sur la totalité des gains quelle que soit l'option fiscale.
export const TAUX_PRELEVEMENTS_SOCIAUX = 0.172;

// Abattement annuel sur les gains, applicable uniquement aux contrats de plus de 8 ans,
// à l'option barème comme à l'option forfaitaire.
export const ABATTEMENT_ANNUEL = { seul: 4600, couple: 9200 };

// Seuil (apprécié sur les primes versées après la réforme, tous contrats confondus) séparant les deux taux
// du prélèvement forfaitaire pour les contrats de plus de 8 ans.
export const SEUIL_PRIMES_REDUIT = 150000;

// Taux du prélèvement forfaitaire (hors prélèvements sociaux), selon la durée et la date des primes versées.
export const TAUX_FORFAITAIRE = {
    avantReforme: { '0-4': 0.35, '4-8': 0.15, '8+': 0.075 },
    apresReforme: { '0-4': 0.128, '4-8': 0.128, '8+sousSeuil': 0.075, '8+surSeuil': 0.128 },
};

// Cas dans lesquels les produits sont exonérés d'impôt sur le revenu (les prélèvements sociaux restent dus).
export const CAS_EXONERATION = [
    'Licenciement',
    'Invalidité (2e ou 3e catégorie)',
    'Mise à la retraite anticipée',
    "Liquidation judiciaire (cessation d'activité non salariée)",
];

// --- Prêt immobilier ---

export const NOTARY_FEE_RATE = {
    neuf: 0.03,
    ancien: 0.08,
};

// Formateurs numériques communs aux deux outils.

// Formateur monétaire commun ; av masque les décimales sur un montant rond, pret les affiche toujours.
export function formatEUR(montant, { minimumFractionDigits = 2 } = {}) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits, maximumFractionDigits: 2 }).format(montant);
}

export function formatAmount(value) {
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

# finutils

Outils simples de simulation financière, présentés sur une seule page à onglets. Aucune dépendance ni build : ouvrir `index.html` via un petit serveur local (`python3 -m http.server`) suffit.

## Outils disponibles

- **Assurance vie** — Calculateur de fiscalité d'un rachat d'assurance vie (barème progressif vs. prélèvement forfaitaire).
- **Prêt immobilier** — Simulateur de crédit immobilier (coût à financer, mensualité, coût total).

## Tests

Les calculs (`calculations.js`) sont testés avec le test runner intégré de Node, sans dépendance à installer :

```
node --test
```

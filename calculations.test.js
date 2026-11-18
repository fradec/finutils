import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAvResult, computeLoan } from './calculations.js';

function assertClose(actual, expected, epsilon = 0.01) {
    assert.ok(Math.abs(actual - expected) < epsilon, `expected ${actual} to be close to ${expected}`);
}

// --- Assurance vie ---

test('rachat en moins-value : non imposable, aucune taxe', () => {
    const result = computeAvResult({
        primesVersees: 10000,
        valeurRachat: 8000,
        montantRetire: 8000,
        duration: '0-4',
        tmi: 30,
        situation: 'seul',
        exonere: false,
    });
    assert.equal(result.gains, 0);
    assert.equal(result.plusValue, false);
    assert.equal(result.taxIntegration, 0);
    assert.equal(result.taxForfaitaire, 0);
});

test('exonération : seuls les prélèvements sociaux restent dus', () => {
    const result = computeAvResult({
        primesVersees: 5000,
        valeurRachat: 15000,
        montantRetire: 15000,
        duration: '0-4',
        tmi: 41,
        situation: 'seul',
        exonere: true,
    });
    assert.equal(result.exonere, true);
    assertClose(result.taxIntegration, 1720); // 10 000 de gains x 17,2 %
    assertClose(result.netIntegration, 13280);
    assert.equal(result.taxForfaitaire, undefined);
});

test('abattement au-delà de 8 ans, sous le seuil de 150 000 €', () => {
    const result = computeAvResult({
        primesVersees: 50000,
        valeurRachat: 100000,
        montantRetire: 100000,
        duration: '8+',
        tmi: 30,
        situation: 'seul',
        exonere: false,
    });
    // gains 50 000, abattement 4 600 => base imposable 45 400
    assertClose(result.taxForfaitaire, 45400 * 0.075 + 50000 * 0.172);
    assert.equal(result.meilleureOption, 'forfaitaire');
});

test('seuil de 150 000 € dépassé après réforme : taux forfaitaire majoré', () => {
    const result = computeAvResult({
        primesVersees: 200000,
        valeurRachat: 250000,
        montantRetire: 250000,
        duration: '8+',
        tmi: 0,
        situation: 'couple',
        exonere: false,
    });
    // gains 50 000 ; fraction à 7,5 % = 50 000 x 150 000/200 000 = 37 500, le reste (12 500) à 12,8 %.
    // L'abattement couple (9 200) s'impute d'abord sur la fraction à 7,5 %.
    assertClose(result.taxForfaitaire, 28300 * 0.075 + 12500 * 0.128 + 50000 * 0.172);
    assertClose(result.taxIntegration, 50000 * 0.172); // barème : TMI 0 % sur les gains après abattement
    assert.equal(result.meilleureOption, 'integration'); // TMI à 0 % reste imbattable
});

test('seuil de 150 000 € atteint : la totalité des gains reste à 7,5 %', () => {
    const result = computeAvResult({
        primesVersees: 150000,
        valeurRachat: 200000,
        montantRetire: 200000,
        duration: '8+',
        tmi: 30,
        situation: 'seul',
        exonere: false,
    });
    // gains 50 000, abattement 4 600 => 45 400 entièrement au taux réduit
    assertClose(result.taxForfaitaire, 45400 * 0.075 + 50000 * 0.172);
});

test("l'abattement s'impute d'abord sur la fraction à 7,5 %, puis sur celle à 12,8 %", () => {
    const result = computeAvResult({
        primesVersees: 1000000,
        valeurRachat: 1010000,
        montantRetire: 1010000,
        duration: '8+',
        tmi: 30,
        situation: 'seul',
        exonere: false,
    });
    // gains 10 000 ; fraction à 7,5 % = 1 500, fraction à 12,8 % = 8 500.
    // Les 4 600 d'abattement absorbent les 1 500, le reliquat (3 100) s'impute sur la fraction à 12,8 %.
    assertClose(result.taxForfaitaire, (8500 - 3100) * 0.128 + 10000 * 0.172);
});

test('rachat avant 8 ans après réforme : 12,8 % sur tous les gains, sans abattement', () => {
    const result = computeAvResult({
        primesVersees: 100000,
        valeurRachat: 120000,
        montantRetire: 120000,
        duration: '4-8',
        tmi: 41,
        situation: 'couple',
        exonere: false,
    });
    // gains 20 000, aucun abattement avant 8 ans
    assertClose(result.taxForfaitaire, 20000 * 0.128 + 20000 * 0.172);
});

test('primes antérieures à la réforme après 8 ans : 7,5 % sur tous les gains, sans seuil', () => {
    const result = computeAvResult({
        primesVersees: 400000,
        primesAvantReforme: 400000,
        valeurRachat: 500000,
        montantRetire: 500000,
        duration: '8+',
        tmi: 30,
        situation: 'seul',
        exonere: false,
    });
    // gains 100 000, abattement 4 600 => 95 400 à 7,5 %, aucune fraction à 12,8 %
    assertClose(result.taxForfaitaire, 95400 * 0.075 + 100000 * 0.172);
});

test('primes réparties entre avant et après la réforme : chaque compartiment suit son régime', () => {
    const result = computeAvResult({
        primesVersees: 200000,
        primesAvantReforme: 100000,
        valeurRachat: 300000,
        montantRetire: 300000,
        duration: '8+',
        tmi: 30,
        situation: 'seul',
        exonere: false,
    });
    // gains 100 000, dont 50 000 rattachés aux primes antérieures (7,5 %).
    // Le seuil résiduel est de 150 000 - 100 000 = 50 000 pour 100 000 de primes post-réforme :
    // 25 000 de gains à 7,5 %, 25 000 à 12,8 %.
    // L'abattement de 4 600 s'impute en priorité sur les gains antérieurs.
    assertClose(result.taxForfaitaire, (45400 + 25000) * 0.075 + 25000 * 0.128 + 100000 * 0.172);
});

test('le seuil de 150 000 € est diminué des primes antérieures à la réforme', () => {
    const result = computeAvResult({
        primesVersees: 250000,
        primesAvantReforme: 150000,
        valeurRachat: 500000,
        montantRetire: 500000,
        duration: '8+',
        tmi: 30,
        situation: 'seul',
        exonere: false,
    });
    // gains 250 000, dont 150 000 antérieurs. Plafond résiduel nul : les 100 000 restants sont à 12,8 %.
    // L'abattement (4 600) s'impute sur les 150 000 antérieurs, taxés à 7,5 %.
    assertClose(result.taxForfaitaire, 145400 * 0.075 + 100000 * 0.128 + 250000 * 0.172);
});

test('primes antérieures à la réforme supérieures au total : plafonnées au total', () => {
    const result = computeAvResult({
        primesVersees: 100000,
        primesAvantReforme: 250000,
        valeurRachat: 150000,
        montantRetire: 150000,
        duration: '8+',
        tmi: 30,
        situation: 'seul',
        exonere: false,
    });
    // Tout est réputé antérieur : gains 50 000, abattement 4 600 => 45 400 à 7,5 %.
    assertClose(result.taxForfaitaire, 45400 * 0.075 + 50000 * 0.172);
});

test('rachat supérieur à la valeur du contrat : les gains sont plafonnés', () => {
    const result = computeAvResult({
        primesVersees: 100000,
        valeurRachat: 150000,
        montantRetire: 300000,
        duration: '8+',
        tmi: 30,
        situation: 'seul',
        exonere: false,
    });
    // Le rachat est ramené à 150 000 : gains = 150 000 - 100 000 = 50 000, et non 100 000.
    assertClose(result.gains, 50000);
    assertClose(result.netIntegration, 150000 - result.taxIntegration);
});

test('valeur de rachat nulle : aucun gain, aucun NaN', () => {
    const result = computeAvResult({
        primesVersees: 10000,
        valeurRachat: 0,
        montantRetire: 0,
        duration: '0-4',
        tmi: 30,
        situation: 'seul',
        exonere: false,
    });
    assert.equal(result.gains, 0);
    assert.equal(result.taxForfaitaire, 0);
    assert.equal(result.netForfaitaire, 0);
});

test('montant retiré négatif : traité comme un rachat nul', () => {
    const result = computeAvResult({
        primesVersees: 10000,
        valeurRachat: 15000,
        montantRetire: -5000,
        duration: '0-4',
        tmi: 30,
        situation: 'seul',
        exonere: false,
    });
    assert.equal(result.gains, 0);
    assert.equal(result.netIntegration, 0);
});

test('primes versées avant le 27/09/2017 : taux forfaitaire historique', () => {
    const result = computeAvResult({
        primesVersees: 10000,
        primesAvantReforme: 10000,
        valeurRachat: 20000,
        montantRetire: 20000,
        duration: '4-8',
        tmi: 11,
        situation: 'seul',
        exonere: false,
    });
    // taux avant réforme sur 4-8 ans = 15 % (contre 12,8 % après réforme)
    assertClose(result.taxForfaitaire, 10000 * 0.15 + 10000 * 0.172);
});

// --- Prêt immobilier ---

test('mensualité sans intérêt : capital réparti à parts égales', () => {
    const loan = computeLoan({
        price: 200000,
        works: 0,
        downPayment: 20000,
        rate: 0,
        durationYears: 20,
        isNew: 'ancien',
    });
    assert.equal(loan.notaryFees, 16000); // 8 % dans l'ancien
    assert.equal(loan.loanAmount, 196000);
    assert.equal(loan.downPaymentRate, 10);
    assertClose(loan.monthlyPayment, 196000 / 240);
    assertClose(loan.totalCreditCost, 0);
});

test('frais de notaire réduits dans le neuf', () => {
    const loan = computeLoan({ price: 100000, works: 0, downPayment: 0, rate: 0, durationYears: 1, isNew: 'neuf' });
    assert.equal(loan.notaryFees, 3000); // 3 % dans le neuf
    assert.equal(loan.downPaymentRate, 0);
});

test('un crédit avec intérêts coûte plus cher que le capital emprunté', () => {
    const loan = computeLoan({
        price: 300000,
        works: 0,
        downPayment: 33000,
        rate: 3,
        durationYears: 20,
        isNew: 'ancien',
    });
    assert.equal(loan.downPaymentRate, 11);
    assert.ok(loan.monthlyPayment > loan.loanAmount / loan.totalMonths);
    assert.ok(loan.totalCreditCost > 0);
    assertClose(loan.totalCostWithCredit, loan.totalCost + loan.totalCreditCost);
});

test('durée nulle : mensualité finie sur un mois', () => {
    const loan = computeLoan({ price: 100000, works: 0, downPayment: 0, rate: 0, durationYears: 0, isNew: 'ancien' });
    assert.equal(loan.totalMonths, 1);
    assert.ok(Number.isFinite(loan.monthlyPayment));
    assertClose(loan.monthlyPayment, loan.loanAmount);
});

test('entrées négatives : ramenées à zéro', () => {
    const loan = computeLoan({
        price: -100000,
        works: -5000,
        downPayment: -10000,
        rate: -1,
        durationYears: -5,
        isNew: 'neuf',
    });
    assert.equal(loan.notaryFees, 0);
    assert.equal(loan.totalCost, 0);
    assert.equal(loan.loanAmount, 0);
    assert.equal(loan.downPaymentRate, 0);
    assert.equal(loan.totalMonths, 1);
    assert.equal(loan.monthlyPayment, 0);
});

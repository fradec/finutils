import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAvResult, computeLoan } from './calculations.js';

function assertClose(actual, expected, epsilon = 0.01) {
    assert.ok(Math.abs(actual - expected) < epsilon, `expected ${actual} to be close to ${expected}`);
}

// --- Assurance vie ---

test('rachat en moins-value : non imposable, aucune taxe', () => {
    const result = computeAvResult({
        primesVersees: 10000, valeurRachat: 8000, montantRetire: 8000,
        duration: '0-4', avantReforme: false, tmi: 30, situation: 'seul', exonere: false,
    });
    assert.equal(result.gains, 0);
    assert.equal(result.plusValue, false);
    assert.equal(result.taxIntegration, 0);
    assert.equal(result.taxForfaitaire, 0);
});

test('exonération : seuls les prélèvements sociaux restent dus', () => {
    const result = computeAvResult({
        primesVersees: 5000, valeurRachat: 15000, montantRetire: 15000,
        duration: '0-4', avantReforme: false, tmi: 41, situation: 'seul', exonere: true,
    });
    assert.equal(result.exonere, true);
    assertClose(result.taxIntegration, 1720); // 10 000 de gains x 17,2 %
    assertClose(result.netIntegration, 13280);
    assert.equal(result.taxForfaitaire, undefined);
});

test('abattement au-delà de 8 ans, sous le seuil de 150 000 €', () => {
    const result = computeAvResult({
        primesVersees: 50000, valeurRachat: 100000, montantRetire: 100000,
        duration: '8+', avantReforme: false, tmi: 30, situation: 'seul', exonere: false,
    });
    // gains 50 000, abattement 4 600 => base imposable 45 400
    assertClose(result.taxForfaitaire, 45400 * 0.075 + 50000 * 0.172);
    assert.equal(result.meilleureOption, 'forfaitaire');
});

test('seuil de 150 000 € dépassé après réforme : taux forfaitaire majoré', () => {
    const result = computeAvResult({
        primesVersees: 200000, valeurRachat: 250000, montantRetire: 250000,
        duration: '8+', avantReforme: false, tmi: 0, situation: 'couple', exonere: false,
    });
    // gains 50 000, abattement couple 9 200 => base imposable 40 800
    assertClose(result.taxForfaitaire, 40800 * 0.128 + 50000 * 0.172);
    assert.equal(result.meilleureOption, 'integration'); // TMI à 0 % reste imbattable
});

test('primes versées avant le 27/09/2017 : taux forfaitaire historique', () => {
    const result = computeAvResult({
        primesVersees: 0, valeurRachat: 10000, montantRetire: 10000,
        duration: '4-8', avantReforme: true, tmi: 11, situation: 'seul', exonere: false,
    });
    // taux avant réforme sur 4-8 ans = 15 % (contre 12,8 % après réforme)
    assertClose(result.taxForfaitaire, 10000 * 0.15 + 10000 * 0.172);
});

// --- Prêt immobilier ---

test('mensualité sans intérêt : capital réparti à parts égales', () => {
    const loan = computeLoan({ price: 200000, works: 0, downPayment: 20000, rate: 0, durationYears: 20, isNew: 'ancien' });
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
    const loan = computeLoan({ price: 300000, works: 0, downPayment: 33000, rate: 3, durationYears: 20, isNew: 'ancien' });
    assert.equal(loan.downPaymentRate, 11);
    assert.ok(loan.monthlyPayment > loan.loanAmount / loan.totalMonths);
    assert.ok(loan.totalCreditCost > 0);
    assertClose(loan.totalCostWithCredit, loan.totalCost + loan.totalCreditCost);
});

import assert from 'node:assert/strict';
import { reconcileBankLedger, normalizeTransaction, BANK_RECONCILIATION_VERSION } from '../src/engine/bank-reconciliation-v1.mjs';
import { reconcileBankLedgerGoverned, isExplicitCashLedgerRow } from '../src/engine/bank-reconciliation-governed-v1.mjs';

function run(name, fn) {
  try { fn(); console.log('✓', name); }
  catch (error) { console.error('✗', name); throw error; }
}

run('exact match is confirmed and allocated once', () => {
  const r = reconcileBankLedger({
    bankTransactions: [{ date: '17/08/2026', amount: '-4000', counterparty: 'شركة رواد للتسويق المحدودة', description: 'شراء بضاعة', reference: 'ABC123' }],
    ledgerTransactions: [{ date: '17/08/2026', debit: '4000', supplier: 'رواد للتسويق', description: 'شراء بضاعة', reference: 'ABC123' }]
  });
  assert.equal(r.version, BANK_RECONCILIATION_VERSION);
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].kind, 'EXACT_MATCH');
  assert.equal(r.matches[0].status, 'CONFIRMED');
  assert.equal(r.matches[0].confidence, 100);
});

run('date tolerance produces a probable/confirmed scored match instead of a false missing item', () => {
  const r = reconcileBankLedger({
    dateToleranceDays: 3,
    bankTransactions: [{ date: '14/03/2026', amount: '-5000', counterparty: 'رواد' }],
    ledgerTransactions: [{ date: '15/03/2026', debit: '5000', supplier: 'رواد' }]
  });
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].kind, 'DATE_TOLERANCE_MATCH');
  assert.equal(r.matches[0].dateDifferenceDays, 1);
  assert.equal(r.matches[0].confidence, 90);
  assert.equal(r.exceptions.some(x => x.type === 'DATE_DIFFERENCE'), true);
});

run('one ledger entry cannot be consumed by two bank transactions', () => {
  const r = reconcileBankLedger({
    bankTransactions: [
      { id: 'b1', date: '03/02/2026', amount: '-8500', counterparty: 'رواد' },
      { id: 'b2', date: '03/02/2026', amount: '-8500', counterparty: 'رواد' }
    ],
    ledgerTransactions: [{ id: 'l1', date: '03/02/2026', debit: '8500', supplier: 'رواد' }]
  });
  assert.equal(r.matches.length, 1);
  assert.equal(r.summary.unmatchedBank, 1);
  assert.equal(r.exceptions.some(x => x.type === 'BANK_ONLY'), true);
});

run('one bank payment can match multiple ledger entries', () => {
  const r = reconcileBankLedger({
    bankTransactions: [{ id: 'b1', date: '10/04/2026', amount: '-10000', counterparty: 'رواد' }],
    ledgerTransactions: [
      { id: 'l1', date: '10/04/2026', debit: '4000', supplier: 'رواد' },
      { id: 'l2', date: '10/04/2026', debit: '3500', supplier: 'رواد' },
      { id: 'l3', date: '10/04/2026', debit: '2500', supplier: 'رواد' }
    ]
  });
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].kind, 'COMPOSITE_MATCH');
  assert.equal(r.matches[0].ledger.length, 3);
  assert.equal(r.summary.unmatchedLedger, 0);
});

run('multiple bank payments can match one ledger entry', () => {
  const r = reconcileBankLedger({
    bankTransactions: [
      { id: 'b1', date: '10/04/2026', amount: '-2000', counterparty: 'رواد' },
      { id: 'b2', date: '10/04/2026', amount: '-2000', counterparty: 'رواد' }
    ],
    ledgerTransactions: [{ id: 'l1', date: '10/04/2026', debit: '4000', supplier: 'رواد' }]
  });
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].kind, 'COMBINED_PAYMENT_MATCH');
  assert.equal(r.matches[0].bank.length, 2);
});

run('bank charges stay outside supplier matching amount and enter only the proposed journal', () => {
  const tx = normalizeTransaction({ date: '05/08/2026', amount: '-2500', charges: '0.50', counterparty: 'رواد' }, 'bank', 0);
  assert.equal(tx.amountMinor, 250000n);
  assert.equal(tx.feeMinor, 50n);
  const r = reconcileBankLedger({ bankTransactions: [{ date: '05/08/2026', amount: '-2500', charges: '0.50', counterparty: 'رواد' }], ledgerTransactions: [] });
  assert.equal(r.summary.bankOnlyTotal, '2500.00');
  assert.equal(r.summary.bankChargesTotal, '0.50');
  assert.equal(r.adjustmentProposals[0].lines[0].amount, '2500.00');
  assert.equal(r.adjustmentProposals[0].lines[1].amount, '0.50');
  assert.equal(r.adjustmentProposals[0].lines.at(-1).amount, '2500.50');
  assert.equal(r.adjustmentProposals[0].postingAllowed, false);
});

run('supplier balance is labeled proposed and not final', () => {
  const amounts = [500, 1500, 2500, 2500, 3000, 3600];
  const r = reconcileBankLedger({
    supplierBalance: '14460.68',
    balanceNature: 'credit',
    bankTransactions: amounts.map((amount, i) => ({ id: `b${i}`, date: `0${i + 1}/08/2026`, amount: String(-amount), counterparty: 'رواد' })),
    ledgerTransactions: []
  });
  assert.equal(r.summary.bankOnlyTotal, '13600.00');
  assert.equal(r.proposedSupplierBalance.after, '860.68');
  assert.equal(r.proposedSupplierBalance.label, 'رصيد مقترح بعد التسوية');
  assert.equal(r.proposedSupplierBalance.final, false);
});

run('aliases learned from accountant decisions normalize supplier identity', () => {
  const r = reconcileBankLedger({
    aliases: [{ alias: 'رواد', canonical: 'شركة رواد للتسويق المحدودة' }],
    bankTransactions: [{ date: '11/08/2026', amount: '-3000', counterparty: 'رواد' }],
    ledgerTransactions: [{ date: '11/08/2026', debit: '3000', supplier: 'شركة رواد للتسويق المحدودة' }]
  });
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].status, 'CONFIRMED');
});

run('explicit cash/cashbox supplier rows are excluded from bank reconciliation by default', () => {
  const bank = [
    { id: 'b-bank', date: '08/04/2026', amount: '-2000', counterparty: 'رواد' }
  ];
  const ledger = [
    { id: 'l-bank', date: '08/04/2026', debit: '2000', supplier: 'رواد', account: 'البنك الاهلي' },
    { id: 'l-cash', date: '11/04/2026', debit: '2000', supplier: 'رواد', account: 'صندوق المندوبين والكاش (الصندوق الرئيسي)' }
  ];
  assert.equal(isExplicitCashLedgerRow(ledger[1]), true);
  const r = reconcileBankLedgerGoverned({ bankTransactions: bank, ledgerTransactions: ledger, dateToleranceDays: 3 });
  assert.equal(r.matches.length, 1);
  assert.equal(r.summary.unmatchedLedger, 0);
  assert.equal(r.summary.sourceLedgerTransactions, 2);
  assert.equal(r.summary.excludedNonBankLedger, 1);
  assert.equal(r.exceptions.some(x => x.type === 'LEDGER_ONLY'), false);
  assert.equal(r.excludedNonBankLedger[0].id, 'l-cash');
});

run('cash exclusion can be explicitly disabled for diagnostic comparisons', () => {
  const r = reconcileBankLedgerGoverned({
    bankOnlyLedger: false,
    bankTransactions: [],
    ledgerTransactions: [{ id: 'l-cash', date: '11/04/2026', debit: '2000', supplier: 'رواد', account: 'كاش' }]
  });
  assert.equal(r.summary.excludedNonBankLedger, 0);
  assert.equal(r.summary.unmatchedLedger, 1);
  assert.equal(r.exceptions.some(x => x.type === 'LEDGER_ONLY'), true);
});

console.log('bank reconciliation v1 tests passed');

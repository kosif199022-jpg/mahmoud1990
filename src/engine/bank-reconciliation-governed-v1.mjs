/*
 * KOSIF governed bank reconciliation adapter v1.
 * A bank reconciliation must not classify explicit cash/cashbox supplier settlements
 * as ledger-only bank exceptions. The deterministic matcher remains unchanged;
 * this adapter scopes its ledger input to bank-relevant rows first.
 */
import { reconcileBankLedger, reconciliationCapabilities, normalizeText } from './bank-reconciliation-v1.mjs';

export const governedReconciliationCapabilities = Object.freeze({
  ...reconciliationCapabilities,
  controls: [...reconciliationCapabilities.controls, 'explicit-cash-ledger-exclusion']
});

const CASH_MARKERS = ['صندوق', 'كاش', 'cash', 'cashbox', 'petty cash'];

export function isExplicitCashLedgerRow(row = {}) {
  const fields = [
    row.account,
    row.counterAccount,
    row.contraAccount,
    row.accountName,
    row.channel,
    row.paymentMethod
  ].filter(Boolean).map(normalizeText);
  return fields.some(text => CASH_MARKERS.some(marker => text.includes(normalizeText(marker))));
}

export function reconcileBankLedgerGoverned(input = {}) {
  const sourceLedger = Array.isArray(input.ledgerTransactions) ? input.ledgerTransactions : [];
  const bankOnlyLedger = input.bankOnlyLedger !== false;
  const excludedLedger = bankOnlyLedger ? sourceLedger.filter(isExplicitCashLedgerRow) : [];
  const ledgerTransactions = bankOnlyLedger ? sourceLedger.filter(row => !isExplicitCashLedgerRow(row)) : sourceLedger;
  const result = reconcileBankLedger({ ...input, ledgerTransactions });

  result.summary = {
    ...result.summary,
    sourceLedgerTransactions: sourceLedger.length,
    excludedNonBankLedger: excludedLedger.length
  };
  result.excludedNonBankLedger = excludedLedger.map(row => ({
    id: String(row.transaction_id ?? row.transactionId ?? row.id ?? ''),
    date: String(row.date ?? row.transactionDate ?? row.postingDate ?? ''),
    amount: String(row.amount ?? row.debit ?? row.credit ?? ''),
    account: String(row.account ?? row.counterAccount ?? row.contraAccount ?? ''),
    reason: 'explicit-cash-ledger-row'
  }));
  result.policy = {
    ...result.policy,
    bankOnlyLedger,
    explicitCashLedgerExcluded: bankOnlyLedger
  };
  return result;
}

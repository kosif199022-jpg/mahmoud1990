import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBankText, parseLedgerText, reconcileTextSources, reconcileTransactions, suggestedJournalDrafts } from '../src/engine/v49-reconciliation.mjs';

const BANK=`| 17/08/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 114686237 | JM | -4,000.00 |
| 11/08/2026 | حوالة فورية محلية صادرة | شراء بضاعة مفوضين شركة رواد للتسويق المحدودة | 121264986 | JM | -3,000.00 |
| 05/08/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 115356665 | JM | -3,600.00 |
| 23/07/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 121475953 | JM | -3,000.00 |
| 18/07/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 116055477 | JM | -2,500.00 |
| 09/07/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 119457006 | JM | -3,500.00 |
| 02/07/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 123335099 | JM | -2,500.00 |
| 29/06/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 116406890 | JM | -2,000.00 |
| 27/06/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 117127940 | JM | -3,000.00 |
| 20/06/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 116536723 | JM | -2,500.00 |
| 06/06/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 104751835 | JM | -1,500.00 |
| 04/06/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 108961081 | JM | -3,500.00 |
| 23/05/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 105280755 | JM | -2,000.00 |
| 19/05/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 116288666 | JM | -500.00 |
| 19/05/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 114833908 | JM | -2,500.00 |
| 26/02/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 119965779 | JM | -3,700.00 |
| 14/03/2026 | حوالة فورية محلية صادرة | شراء بضاعة مندوبين شركة رواد للتسويق المحدودة | 104012913 | JM | -5,000.00 |`;

const LEDGER=`#\tرقم السند\tالنوع\tالحساب\tالتاريخ\tمدين\tدائن\tالرصيد\tملاحظة\tالحساب المقابل
1\t3228\tسند يومية\tشركة رواد للتسويق المحدودة\t19/05/2026\t2,500.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
2\t3267\tسند يومية\tشركة رواد للتسويق المحدودة\t23/05/2026\t2,000.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
3\t3243\tسند يومية\tشركة رواد للتسويق المحدودة\t04/06/2026\t3,500.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
4\t3280\tسند يومية\tشركة رواد للتسويق المحدودة\t27/06/2026\t3,000.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
5\t3283\tسند يومية\tشركة رواد للتسويق المحدودة\t29/06/2026\t2,000.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
6\t3300\tسند يومية\tشركة رواد للتسويق المحدودة\t09/07/2026\t3,500.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
7\t3304\tسند يومية\tشركة رواد للتسويق المحدودة\t18/07/2026\t2,500.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
8\t3328\tسند يومية\tشركة رواد للتسويق المحدودة\t11/08/2026\t3,000.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
9\t3337\tسند يومية\tشركة رواد للتسويق المحدودة\t17/08/2026\t4,000.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
10\t3086\tسند يومية\tشركة رواد للتسويق المحدودة\t01/03/2026\t3,700.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي
11\t3139\tسند يومية\tشركة رواد للتسويق المحدودة\t15/03/2026\t5,000.00\t0.00\t0\tدفعة من الحساب لشركة رواد\tالبنك الاهلي`;

test('parses pasted bank and ledger formats',()=>{
  const bank=parseBankText(BANK), ledger=parseLedgerText(LEDGER);
  assert.equal(bank.length,17);
  assert.equal(ledger.length,11);
  assert.equal(bank[0].amountMinor,'400000');
  assert.equal(ledger[0].channel,'bank');
});

test('Rooad regression: finds 13,600 SAR bank-only and two date differences',()=>{
  const r=reconcileTextSources(BANK,LEDGER,{dateToleranceDays:3,recordedSupplierBalance:'14460.68'});
  assert.equal(r.summary.bankOnlyCount,6);
  assert.equal(r.summary.bankOnlyTotalMinor,'1360000');
  assert.equal(r.summary.ledgerOnlyCount,0);
  assert.equal(r.summary.dateDifferenceCount,2);
  assert.equal(r.adjustedBalance.suggestedMinor,'86068');
  const missing=r.exceptions.bankOnly.map(x=>[x.date,x.amountMinor]);
  assert.deepEqual(missing,[
    ['2026-08-05','360000'],['2026-07-23','300000'],['2026-07-02','250000'],
    ['2026-06-20','250000'],['2026-06-06','150000'],['2026-05-19','50000']
  ]);
});

test('never uses one ledger line twice',()=>{
  const bank=[
    {id:'b1',date:'2026-01-01',amount:'1000',counterparty:'شركة ألف المحدودة'},
    {id:'b2',date:'2026-01-01',amount:'1000',counterparty:'شركة ألف المحدودة'}
  ];
  const ledger=[{id:'l1',date:'2026-01-01',amount:'1000',counterparty:'شركة ألف المحدودة',channel:'bank'}];
  const r=reconcileTransactions(bank,ledger,{dateToleranceDays:0});
  assert.equal(r.matches.length,1);
  assert.equal(r.summary.bankOnlyCount,1);
});

test('supports one bank payment matched to multiple ledger lines',()=>{
  const bank=[{id:'b1',date:'2026-01-10',amount:'10000',counterparty:'شركة ألف المحدودة'}];
  const ledger=[
    {id:'l1',date:'2026-01-10',amount:'4000',counterparty:'شركة ألف المحدودة',channel:'bank'},
    {id:'l2',date:'2026-01-10',amount:'3500',counterparty:'شركة ألف المحدودة',channel:'bank'},
    {id:'l3',date:'2026-01-10',amount:'2500',counterparty:'شركة ألف المحدودة',channel:'bank'}
  ];
  const r=reconcileTransactions(bank,ledger,{dateToleranceDays:1});
  assert.equal(r.summary.compositeCount,1);
  assert.equal(r.summary.bankOnlyCount,0);
  assert.equal(r.summary.ledgerOnlyCount,0);
});

test('cash supplier payments are excluded from bank matching by default',()=>{
  const bank=[];
  const ledger=[{id:'l1',date:'2026-01-10',amount:'500',counterparty:'شركة ألف المحدودة',channel:'cash'}];
  const r=reconcileTransactions(bank,ledger,{});
  assert.equal(r.summary.ledgerCount,0);
  assert.equal(r.summary.excludedLedgerNonBankCount,1);
});

test('journal suggestions remain drafts and require human approval',()=>{
  const r=reconcileTransactions([{id:'b1',date:'2026-01-10',amount:'500',counterparty:'شركة ألف المحدودة'}],[],{});
  const drafts=suggestedJournalDrafts(r,{supplierAccount:'2101',bankAccount:'1101'});
  assert.equal(drafts.length,1);
  assert.equal(drafts[0].status,'draft');
  assert.equal(drafts[0].autoPost,false);
  assert.equal(drafts[0].humanApprovalRequired,true);
  assert.equal(drafts[0].lines[0].drMinor,'50000');
});

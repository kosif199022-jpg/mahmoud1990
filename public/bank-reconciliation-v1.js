/* KOSIF Bank Reconciliation v1 — client workspace. Arithmetic and allocation run on the deterministic server engine. */
(() => {
  'use strict';
  const V = window.KosifV38;
  if (!V || window.__kosifBankReconciliationV1) return;
  window.__kosifBankReconciliationV1 = true;

  const STORE_ALIASES = 'kosif_bankrec_aliases_v1';
  const STORE_APPROVALS = 'kosif_bankrec_approvals_v1';
  const esc = value => V.esc ? V.esc(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = value => {
    const n = Number(value);
    return Number.isFinite(n) ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) : esc(value);
  };
  const loadAliases = () => { try { return localStorage.getItem(STORE_ALIASES) || ''; } catch { return ''; } };
  const saveAliases = text => { try { localStorage.setItem(STORE_ALIASES, text); } catch {} };
  const loadApprovals = () => { try { return new Set(JSON.parse(localStorage.getItem(STORE_APPROVALS) || '[]')); } catch { return new Set(); } };
  const saveApprovals = set => { try { localStorage.setItem(STORE_APPROVALS, JSON.stringify([...set])); } catch {} };

  const BANK_SAMPLE = [
    'التاريخ\tالمبلغ\tنوع العملية\tالمستفيد\tرقم المرجع\tالوصف\tالرسوم',
    '17/08/2026\t-4000\tحوالة فورية محلية صادرة\tشركة رواد للتسويق المحدودة\t114686237\tشراء بضاعة مندوبين 20260817SANCBKNCBK6B82411036586589\t1.00',
    '11/08/2026\t-3000\tحوالة فورية محلية صادرة\tشركة رواد للتسويق المحدودة\t121264986\tشراء بضاعة مفوضين 20260811SANCBKNCBK6B82411344805510\t1.00',
    '05/08/2026\t-3600\tحوالة فورية محلية صادرة\tشركة رواد للتسويق المحدودة\tREF-3600\tشراء بضاعة مندوبين\t0.50'
  ].join('\n');
  const LEDGER_SAMPLE = [
    'التاريخ\tالمورد\tرقم السند\tمدين\tدائن\tالملاحظة\tالحساب المقابل',
    '17/08/2026\tرواد للتسويق\t114686237\t4000\t0\tشراء بضاعة\tالبنك',
    '12/08/2026\tرواد\t121264986\t3000\t0\tسداد مورد\tالبنك'
  ].join('\n');

  const synonyms = {
    date: ['date','التاريخ','تاريخ','transaction date','posting date'],
    amount: ['amount','المبلغ','قيمة','القيمة','value'],
    type: ['type','نوع العملية','نوع','channel','القناة'],
    counterparty: ['counterparty','beneficiary','المستفيد','المورد','supplier','vendor','party'],
    reference: ['reference','ref','رقم المرجع','المرجع','رقم السند','voucher','document no'],
    description: ['description','الوصف','البيان','note','الملاحظة','memo'],
    charges: ['charges','fees','fee','الرسوم','رسوم'],
    debit: ['debit','dr','مدين'], credit: ['credit','cr','دائن'], account: ['account','الحساب','الحساب المقابل','counter account']
  };
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  function keyOf(header) {
    const h = norm(header);
    for (const [key, list] of Object.entries(synonyms)) if (list.some(x => h === norm(x))) return key;
    return h.replace(/\s+/g, '_');
  }
  function splitLine(line, delimiter) {
    if (delimiter === '\t') return line.split('\t');
    const out = []; let cur = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted; }
      else if (ch === delimiter && !quoted) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur); return out;
  }
  function parseTable(text, side) {
    const lines = String(text || '').replace(/\r/g, '').split('\n').map(x => x.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error(side === 'bank' ? 'كشف البنك يحتاج صف عناوين وصف بيانات واحد على الأقل.' : 'كشف الدفاتر يحتاج صف عناوين وصف بيانات واحد على الأقل.');
    const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
    const headers = splitLine(lines[0], delimiter).map(keyOf);
    return lines.slice(1).map((line, index) => {
      const cols = splitLine(line, delimiter);
      const row = { id: `${side}-${index + 1}` };
      headers.forEach((h, i) => row[h] = String(cols[i] ?? '').trim());
      if (side === 'bank') return {
        id: row.id, date: row.date, amount: row.amount, type: row.type, counterparty: row.counterparty,
        reference: row.reference, description: row.description, charges: row.charges
      };
      return {
        id: row.id, date: row.date, supplier: row.counterparty, reference: row.reference,
        debit: row.debit, credit: row.credit, description: row.description, account: row.account
      };
    }).filter(row => Object.values(row).some(Boolean));
  }
  function parseAliases(text) {
    return String(text || '').split(/\n/).map(x => x.trim()).filter(Boolean).map(line => {
      const i = line.indexOf('=');
      return i > 0 ? { alias: line.slice(0, i).trim(), canonical: line.slice(i + 1).trim() } : null;
    }).filter(Boolean);
  }
  function chip(status) {
    const labels = { CONFIRMED:'مطابقة مؤكدة', PROBABLE:'مطابقة مرجحة', REVIEW:'تحتاج مراجعة', EXACT_MATCH:'Exact', DATE_TOLERANCE_MATCH:'فرق تاريخ', COMPOSITE_MATCH:'Split Match', COMBINED_PAYMENT_MATCH:'Combined Payment' };
    const cls = status === 'CONFIRMED' ? 'fact' : status === 'PROBABLE' ? 'source' : 'risk-m';
    return '<span class="v38-chip ' + cls + '">' + esc(labels[status] || status) + '</span>';
  }
  function exceptionLabel(type) {
    return ({ DATE_DIFFERENCE:'فرق تاريخ', BANK_ONLY:'بالبنك فقط', LEDGER_ONLY:'بالدفاتر فقط', AMOUNT_DIFFERENCE:'فرق مبلغ', DUPLICATE:'تكرار', WRONG_SUPPLIER:'مورد مختلف', WRONG_ACCOUNT:'حساب غير متوقع' })[type] || type;
  }

  function renderResult(out, host, aliasesEl) {
    const s = out.summary || {};
    const proposals = out.adjustmentProposals || [];
    const approvals = loadApprovals();
    host.innerHTML =
      '<div class="v38-kpis">' +
        V.kpi('المطابقات', String(s.matches || 0), `${s.confirmed || 0} مؤكدة · ${s.probable || 0} مرجحة`, true) +
        V.kpi('بالبنك فقط', String(s.unmatchedBank || 0), 'قيمة محتملة: ' + fmt(s.bankOnlyTotal || 0)) +
        V.kpi('بالدفاتر فقط', String(s.unmatchedLedger || 0), 'قيمة: ' + fmt(s.ledgerOnlyTotal || 0)) +
        V.kpi('رسوم بنكية منفصلة', fmt(s.bankChargesTotal || 0), 'لا تدخل في قيمة المورد') +
      '</div>' +
      (out.proposedSupplierBalance ? '<div class="v38-note warn"><span>🧾</span><span><b>' + esc(out.proposedSupplierBalance.label) + ':</b> ' + fmt(out.proposedSupplierBalance.before) + ' − ' + fmt(out.proposedSupplierBalance.bankOnlyPayments) + ' = <b>' + fmt(out.proposedSupplierBalance.after) + '</b>. هذا رصيد مقترح وليس نهائيًا.</span></div>' : '') +
      '<h3 style="margin:18px 0 8px">نتائج المطابقة</h3>' +
      '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>الحالة</th><th>البنك</th><th>الدفاتر</th><th class="num">القيمة</th><th class="num">الثقة</th><th>الدليل</th></tr></thead><tbody>' +
      (out.matches || []).map(m => '<tr><td>' + chip(m.status) + '<br>' + chip(m.kind) + '</td><td>' + esc(m.bank.map(x => `${x.date || '—'} · ${x.counterparty || '—'}`).join(' + ')) + '</td><td>' + esc(m.ledger.map(x => `${x.date || '—'} · ${x.counterparty || '—'}`).join(' + ')) + '</td><td class="num">' + fmt(m.amount) + '</td><td class="num"><b>' + esc(m.confidence) + '%</b></td><td>' + (m.dateDifferenceDays != null ? 'فرق تاريخ: ' + esc(m.dateDifferenceDays) + ' يوم' : '—') + (m.evidence?.referenceEqual ? '<br>المرجع مطابق' : '') + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<h3 style="margin:18px 0 8px">الاستثناءات</h3>' +
      '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>النوع</th><th>التفصيل</th><th class="num">القيمة/الفرق</th><th>إجراء</th></tr></thead><tbody>' +
      (out.exceptions || []).map((e, i) => '<tr><td><span class="v38-chip ' + (e.severity === 'error' ? 'risk-h' : e.severity === 'warning' ? 'risk-m' : 'fact') + '">' + esc(exceptionLabel(e.type)) + '</span></td><td>' + esc(e.message || '') + (e.bank ? '<br><small>بنك: ' + esc(`${e.bank.date || ''} · ${e.bank.counterparty || ''} · ${e.bank.reference || ''}`) + '</small>' : '') + (e.ledger ? '<br><small>دفتر: ' + esc(`${e.ledger.date || ''} · ${e.ledger.counterparty || ''} · ${e.ledger.reference || ''}`) + '</small>' : '') + '</td><td class="num">' + esc(e.difference || e.bank?.amount || e.ledger?.amount || '—') + '</td><td>' + (e.learningSuggestion?.alias && e.learningSuggestion?.canonical ? '<button class="v38-btn" data-learn="' + i + '">تعليم كاسم بديل</button>' : '—') + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<h3 style="margin:18px 0 8px">القيود المقترحة — اعتماد بشري إلزامي</h3>' +
      (proposals.length ? '<div class="v38-scroll"><table class="v38-table"><thead><tr><th>المصدر</th><th>القيد المقترح</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>' + proposals.map(p => '<tr><td>' + esc(p.sourceTransactionId) + '</td><td>' + p.lines.map(l => esc(`${l.side === 'debit' ? 'من ح/' : 'إلى ح/'} ${l.account} ${fmt(l.amount)}`)).join('<br>') + '</td><td><span class="v38-chip ' + (approvals.has(p.id) ? 'fact' : 'risk-m') + '">' + (approvals.has(p.id) ? 'معتمد للمراجعة' : 'مقترح') + '</span></td><td><button class="v38-btn gold" data-approve="' + esc(p.id) + '">' + (approvals.has(p.id) ? 'إلغاء الاعتماد' : 'اعتماد كمفقود') + '</button></td></tr>').join('') + '</tbody></table></div>' : '<div class="v38-note ok"><span>✅</span><span>لا توجد قيود مفقودة مقترحة من حركات البنك غير المطابقة.</span></div>') +
      '<div class="v38-note ai"><span>⚙️</span><span>الحساب، مجموعات Split/Combined، منع إعادة استخدام القيد، الرصيد المقترح، ومجاميع القيود تنفذها النواة الحتمية. الذكاء الاصطناعي — إن استُخدم لاحقًا — يقتصر على فهم النصوص وتفسير الفروق ولا يملك سلطة الترحيل.</span></div>';

    host.querySelectorAll('[data-learn]').forEach(btn => btn.onclick = () => {
      const e = (out.exceptions || [])[Number(btn.dataset.learn)]; if (!e?.learningSuggestion) return;
      const line = `${e.learningSuggestion.alias}=${e.learningSuggestion.canonical}`;
      const current = aliasesEl.value.trim();
      if (!current.split(/\n/).includes(line)) aliasesEl.value = (current ? current + '\n' : '') + line;
      saveAliases(aliasesEl.value); V.toast('تم حفظ الاسم البديل للتسويات القادمة', 'ok');
    });
    host.querySelectorAll('[data-approve]').forEach(btn => btn.onclick = () => {
      const id = btn.dataset.approve; const set = loadApprovals();
      if (set.has(id)) set.delete(id); else set.add(id); saveApprovals(set);
      renderResult(out, host, aliasesEl);
    });
  }

  V.registerView({
    id: 'bank-reconciliation-v1', title: 'المطابقة البنكية الذكية', icon: '⇄', order: 906,
    render(sec) {
      sec.innerHTML =
        V.hero('KOSIF Reconciliation Engine', 'مطابقة كشف البنك مع حساب المورد: Exact + فروق التاريخ + Split/Combined + درجات ثقة + استثناءات + قيود مقترحة، مع منع المطابقة المزدوجة واعتماد بشري إلزامي.', [['fact','Deterministic Matching'],['source','Human Approval']]) +
        '<div class="v38-card"><div class="v38-note info"><span>1</span><span>الصق كشف البنك وكشف المورد من Excel/CSV كجدول بعناوين. المبالغ السالبة في البنك تُفهم كسداد، بينما مدين المورد يُفهم كحركة سداد مقابلة.</span></div>' +
        '<div class="v38-form-grid"><div class="v38-field" style="grid-column:1/-1"><label>كشف البنك</label><textarea id="kosif-br-bank" style="min-height:170px" spellcheck="false"></textarea></div>' +
        '<div class="v38-field" style="grid-column:1/-1"><label>كشف حساب المورد / الدفتر</label><textarea id="kosif-br-ledger" style="min-height:170px" spellcheck="false"></textarea></div>' +
        '<div class="v38-field"><label>نافذة فرق التاريخ</label><select id="kosif-br-window"><option value="1">±1 يوم</option><option value="3" selected>±3 أيام</option><option value="5">±5 أيام</option><option value="7">±7 أيام</option></select></div>' +
        '<div class="v38-field"><label>أقصى عناصر Split/Combined</label><select id="kosif-br-split"><option>3</option><option selected>4</option><option>5</option><option>6</option></select></div>' +
        '<div class="v38-field"><label>رصيد المورد قبل التسوية</label><input id="kosif-br-balance" placeholder="مثال 14460.68"></div>' +
        '<div class="v38-field"><label>طبيعة الرصيد</label><select id="kosif-br-nature"><option value="credit" selected>دائن</option><option value="debit">مدين</option></select></div>' +
        '<div class="v38-field" style="grid-column:1/-1"><label>أسماء بديلة محفوظة — Alias=Canonical</label><textarea id="kosif-br-aliases" style="min-height:82px" placeholder="رواد=شركة رواد للتسويق المحدودة"></textarea></div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="v38-btn gold" id="kosif-br-run">نفّذ المطابقة الحتمية</button><button class="v38-btn" id="kosif-br-save-aliases">حفظ الأسماء البديلة</button><button class="v38-btn" id="kosif-br-reset">إعادة نموذج التجربة</button></div>' +
        '<div id="kosif-br-out" style="margin-top:16px"></div></div>';
      const bankEl = sec.querySelector('#kosif-br-bank'), ledgerEl = sec.querySelector('#kosif-br-ledger'), aliasesEl = sec.querySelector('#kosif-br-aliases'), outEl = sec.querySelector('#kosif-br-out');
      const reset = () => { bankEl.value = BANK_SAMPLE; ledgerEl.value = LEDGER_SAMPLE; aliasesEl.value = loadAliases() || 'رواد=شركة رواد للتسويق المحدودة'; outEl.innerHTML = ''; };
      reset();
      sec.querySelector('#kosif-br-reset').onclick = reset;
      sec.querySelector('#kosif-br-save-aliases').onclick = () => { saveAliases(aliasesEl.value); V.toast('تم حفظ الأسماء البديلة محليًا', 'ok'); };
      sec.querySelector('#kosif-br-run').onclick = async () => {
        try {
          const bankTransactions = parseTable(bankEl.value, 'bank');
          const ledgerTransactions = parseTable(ledgerEl.value, 'ledger');
          saveAliases(aliasesEl.value);
          outEl.innerHTML = '<div class="v38-loading">تشغيل محرك المطابقة ومنع التخصيص المزدوج…</div>';
          const r = await V.api('/api/kosif/reconciliation/run', { method: 'POST', body: {
            bankTransactions, ledgerTransactions, aliases: parseAliases(aliasesEl.value),
            dateToleranceDays: Number(sec.querySelector('#kosif-br-window').value), maxSplitSize: Number(sec.querySelector('#kosif-br-split').value),
            supplierBalance: sec.querySelector('#kosif-br-balance').value, balanceNature: sec.querySelector('#kosif-br-nature').value
          }});
          renderResult(r, outEl, aliasesEl);
        } catch (error) {
          outEl.innerHTML = '<div class="v38-note danger"><span>⛔</span><span>' + esc(error.message || error) + '</span></div>';
        }
      };
    }
  });
})();

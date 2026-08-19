/*
 * KOSIF v38 — الاستيراد والتصدير الاحترافي
 * حزم ارتباط كاملة قابلة للنقل، CSV بترميز آمن، وExcel حقيقي XLSX
 * (كاتب ZIP بدون ضغط + CRC32) — كل التصدير محلي في المتصفح.
 */
(() => {
  'use strict';
  const V = window.KosifV38; if (!V) return;

  /* ——— أدوات ملفات ——— */
  function download(name, data, mime) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 6000);
  }
  const csvCell = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const toCsv = rows => '\ufeff' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');

  /* ——— كاتب XLSX حقيقي (Store-only ZIP) ——— */
  const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipStore(entries) { // entries: [{name, data:Uint8Array}]
    const chunks = [], enc = new TextEncoder();
    let offset = 0;
    const central = [];
    const push = b => { chunks.push(b); offset += b.length; };
    for (const e of entries) {
      const nameB = enc.encode(e.name);
      const crc = crc32(e.data);
      const local = new Uint8Array(30 + nameB.length);
      const dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true);
      dv.setUint16(8, 0, true); dv.setUint16(10, 0, true); dv.setUint16(12, 0, true);
      dv.setUint32(14, crc, true); dv.setUint32(18, e.data.length, true); dv.setUint32(22, e.data.length, true);
      dv.setUint16(26, nameB.length, true); dv.setUint16(28, 0, true);
      local.set(nameB, 30);
      push(local); push(e.data);
      central.push({ nameB, crc, size: e.data.length, offset: offset - e.data.length - 30 - nameB.length });
    }
    const cdStart = offset;
    for (const c of central) {
      const h = new Uint8Array(46 + c.nameB.length);
      const dv = new DataView(h.buffer);
      dv.setUint32(0, 0x02014b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 20, true); dv.setUint16(8, 0x0800, true);
      dv.setUint16(10, 0, true); dv.setUint16(12, 0, true); dv.setUint16(14, 0, true);
      dv.setUint32(16, c.crc, true); dv.setUint32(20, c.size, true); dv.setUint32(24, c.size, true);
      dv.setUint16(28, c.nameB.length, true);
      dv.setUint32(42, c.offset, true);
      h.set(c.nameB, 46);
      push(h);
    }
    const end = new Uint8Array(22);
    const dv = new DataView(end.buffer);
    dv.setUint32(0, 0x06054b50, true); dv.setUint16(8, central.length, true); dv.setUint16(10, central.length, true);
    dv.setUint32(12, offset - cdStart, true); dv.setUint32(16, cdStart, true);
    push(end);
    return new Blob(chunks, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const xmlEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  function sheetXml(rows) {
    const colName = i => { let s = ''; i++; while (i > 0) { s = String.fromCharCode(65 + ((i - 1) % 26)) + s; i = Math.floor((i - 1) / 26); } return s; };
    let body = '';
    rows.forEach((r, ri) => {
      body += '<row r="' + (ri + 1) + '">';
      r.forEach((c, ci) => {
        const ref = colName(ci) + (ri + 1);
        if (typeof c === 'number' && Number.isFinite(c)) body += '<c r="' + ref + '"><v>' + c + '</v></c>';
        else if (c !== '' && c != null) body += '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEsc(c) + '</t></is></c>';
      });
      body += '</row>';
    });
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + body + '</sheetData></worksheet>';
  }
  function toXlsx(sheets) { // sheets: [{name, rows}]
    const enc = new TextEncoder();
    const entries = sheets.map(s => ({ name: 'xl/worksheets/' + s.file, data: enc.encode(sheetXml(s.rows)) }));
    entries.unshift({
      name: '[Content_Types].xml',
      data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + sheets.map(s => '<Override PartName="/xl/worksheets/' + s.file + '" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>')
    });
    entries.splice(1, 0, {
      name: '_rels/.rels',
      data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    });
    entries.push({
      name: 'xl/workbook.xml',
      data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map((s, i) => '<sheet name="' + xmlEsc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>')
    });
    entries.push({
      name: 'xl/_rels/workbook.xml.rels',
      data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/' + s.file + '"/>').join('') + '</Relationships>')
    });
    return zipStore(entries);
  }

  /* ——— قراءة حالة العمل ——— */
  function liveState() {
    try { if (typeof state !== 'undefined' && state?.tb) return state; } catch {}
    try { return JSON.parse(localStorage.getItem('tamhees_v1') || 'null') || null; } catch { return null; }
  }
  const numOf = v => { const n = Number(String(v ?? '0').replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };

  function tbRows(st) {
    const accs = Array.isArray(st?.tb?.accounts) ? st.tb.accounts : [];
    return [['رقم الحساب', 'اسم الحساب', 'مدين', 'دائن'],
      ...accs.map(a => [String(a.code ?? a.no ?? ''), String(a.name ?? ''), numOf(a.dr), numOf(a.cr)])];
  }
  function journalRows(st) {
    const out = [['رقم القيد', 'التاريخ', 'الحساب', 'بيان السطر', 'مدين', 'دائن']];
    const rounds = Array.isArray(st?.rounds) ? st.rounds : [];
    for (const r of rounds) for (const j of (r?.parsed?.ajes || r?.ajes || [])) {
      const id = String(j.id ?? j.no ?? ''), date = String(j.date ?? ''), memo = String(j.memo ?? j.desc ?? '');
      for (const ln of (j.lines || [])) out.push([id, date, String(ln.account ?? ''), memo + (ln.desc ? ' — ' + ln.desc : ''), numOf(ln.dr), numOf(ln.cr)]);
    }
    return out;
  }

  /* ——— حزمة التصدير الكاملة ——— */
  function buildPackage() {
    const st = liveState();
    const keys = {};
    for (const k of ['tamhees_v1', 'kosif_ai_settings_v1', 'kosif_v38_company']) { try { const v = localStorage.getItem(k); if (v) keys[k] = JSON.parse(v); } catch { try { const v = localStorage.getItem(k); if (v) keys[k] = v; } catch {} } }
    return {
      format: 'kosif-v38-package',
      version: 1,
      app: 'KOSIF v38.0.0-root',
      exportedAt: new Date().toISOString(),
      state: st, localStorageSafe: keys
    };
  }
  async function importPackage(pkg) {
    if (pkg?.format !== 'kosif-v38-package') throw new Error('الملف ليس حزمة KOSIF v38 صالحة');
    if (pkg.state?.tb?.accounts && pkg.state.entity) {
      localStorage.setItem('tamhees_v1', JSON.stringify(pkg.state));
    }
    for (const [k, v] of Object.entries(pkg.localStorageSafe || {})) {
      if (!/^kosif_[a-z0-9_]+$/i.test(k)) continue;
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }

  /* ——— استيراد CSV قيود ——— */
  function parseJournalsCsv(text) {
    const lines = text.replace(/^\ufeff/, '').split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return { entries: [], errors: ['ملف فارغ'] };
    const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
    const split = line => { const out = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(s => s.trim()); };
    const header = split(lines[0]).map(h => h.toLowerCase());
    const idx = names => { for (const n of names) { const i = header.findIndex(h => h.includes(n)); if (i >= 0) return i; } return -1; };
    const iId = idx(['id', 'قيد', 'رقم']), iDate = idx(['date', 'تاريخ']), iAcc = idx(['account', 'حساب']),
      iDr = idx(['debit', 'مدين', 'dr']), iCr = idx(['credit', 'دائن', 'cr']), iMemo = idx(['memo', 'بيان', 'وصف']);
    if (iAcc < 0 || iDr < 0 || iCr < 0) return { entries: [], errors: ['لم يُعثر على أعمدة الحساب/مدين/دائن المطلوبة'] };
    const byEntry = new Map();
    const errors = [];
    lines.slice(1).forEach((line, li) => {
      const cells = split(line);
      const id = iId >= 0 ? cells[iId] : 'IMP-' + (li + 1);
      const date = iDate >= 0 ? (cells[iDate] || '').slice(0, 10) : '';
      if (iDate >= 0 && !/^\d{4}-\d{2}-\d{2}/.test(date)) { errors.push('سطر ' + (li + 2) + ': تاريخ غير صالح'); return; }
      const ln = { account: cells[iAcc], dr: cells[iDr] || '0', cr: cells[iCr] || '0', desc: iMemo >= 0 ? cells[iMemo] || '' : '' };
      if (!byEntry.has(id)) byEntry.set(id, { id, date: date || '1900-01-01', memo: ln.desc, lines: [] });
      byEntry.get(id).lines.push(ln);
    });
    return { entries: [...byEntry.values()], errors };
  }

  /* ——— الشاشة ——— */
  V.registerView({
    id: 'v38-io', title: 'استيراد/تصدير', icon: '⇅', order: 920,
    render(sec) {
      sec.innerHTML =
        V.hero('مركز الاستيراد والتصدير', 'حزم ارتباط قابلة للنقل بين الأجهزة، وملفات CSV آمنة، وجداول Excel حقيقية XLSX — كلها محليًا في المتصفح دون رفع بيانات.', [['fact', 'معالجة محلية'], ['human', 'الاستعادة بقرارك']]) +

        V.card('تصدير ملف الارتباط', 'حزمة JSON شاملة أو جداول جاهزة للتحليل',
          '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
          '<button class="v38-btn gold" id="v38-io-pkg">⬇ حزمة كاملة (JSON)</button>' +
          '<button class="v38-btn primary" id="v38-io-xlsx-tb">⬇ ميزان المراجعة (XLSX)</button>' +
          '<button class="v38-btn primary" id="v38-io-xlsx-je">⬇ قيود التسوية (XLSX)</button>' +
          '<button class="v38-btn ghost" id="v38-io-csv-tb">⬇ الميزان (CSV)</button>' +
          '</div><div class="v38-note info"><span>📦</span><span>الحزمة الكاملة تتضمن حالة الارتباط والميزان والجولات والإعدادات المحلية الآمنة (بدون أي مفاتيح AI). استوردها في جهاز آخر لاستكمال العمل.</span></div>') +

        V.card('استيراد الحزمة', 'استعادة ملف ارتباط من حزمة مُصدَّرة',
          '<div class="v38-form-grid"><div class="v38-field"><label>ملف الحزمة (JSON)</label><input type="file" id="v38-io-file-pkg" accept=".json"></div></div>' +
          '<div style="margin-top:10px"><button class="v38-btn primary" id="v38-io-import" disabled>⬆ استعادة الحزمة</button></div>' +
          '<div class="v38-note warn"><span>⚠️</span><span>الاستعادة تستبدل حالة العمل المحلية الحالية؛ تأكد من تصدير نسخة أولًا.</span></div>') +

        V.card('استيراد قيود يومية (CSV)', 'قيود تُفحص حتميًا قبل القبول — لا ترحيل صامت',
          '<div class="v38-form-grid">' +
          '<div class="v38-field"><label>ملف القيود</label><input type="file" id="v38-io-file-je" accept=".csv,.tsv,.txt"></div>' +
          '</div><div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap"><button class="v38-btn primary" id="v38-io-parse-je" disabled>فحص القيود حتميًا</button><button class="v38-btn ghost" id="v38-io-sample-je">تعبئة نموذج</button></div>' +
          '<div id="v38-io-je-out" style="margin-top:12px"></div>');

      let pkgFile = null, jeText = null;
      V.$('#v38-io-file-pkg').onchange = e => { pkgFile = e.target.files?.[0] || null; V.$('#v38-io-import').disabled = !pkgFile; };
      V.$('#v38-io-file-je').onchange = async e => { const f = e.target.files?.[0]; if (!f) { jeText = null; V.$('#v38-io-parse-je').disabled = true; return; } jeText = await f.text(); V.$('#v38-io-parse-je').disabled = false; };
      V.$('#v38-io-sample-je').onclick = () => {
        const sample = toCsv([['id', 'date', 'account', 'memo', 'dr', 'cr'], ['AJ-1', '2026-12-31', '4101', 'تأجيل إيراد مستلم مقدمًا', '250000', '0'], ['AJ-1', '2026-12-31', '2301', 'تأجيل إيراد مستلم مقدمًا', '0', '250000']]);
        download('kosif-v38-sample-journals.csv', sample, 'text/csv;charset=utf-8');
        V.toast('نُزّل نموذج قيود CSV', 'ok');
      };

      V.$('#v38-io-pkg').onclick = () => { download('kosif-v38-package-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(buildPackage(), null, 1), 'application/json'); V.toast('صُدّرت الحزمة الكاملة', 'ok'); };
      V.$('#v38-io-xlsx-tb').onclick = () => {
        const st = liveState();
        if (!st?.tb?.accounts?.length) return V.toast('لا يوجد ميزان معتمد للتصدير', 'error');
        download('kosif-v38-trial-balance.xlsx', toXlsx([{ name: 'ميزان المراجعة', file: 'sheet1.xml', rows: tbRows(st) }]));
        V.toast('صُدّر الميزان XLSX', 'ok');
      };
      V.$('#v38-io-xlsx-je').onclick = () => {
        const rows = journalRows(liveState());
        if (rows.length <= 1) return V.toast('لا قيود تسوية مسجلة بعد', 'error');
        download('kosif-v38-journals.xlsx', toXlsx([{ name: 'القيود', file: 'sheet1.xml', rows }]));
        V.toast('صُدّرت القيود XLSX', 'ok');
      };
      V.$('#v38-io-csv-tb').onclick = () => {
        const st = liveState();
        if (!st?.tb?.accounts?.length) return V.toast('لا يوجد ميزان معتمد للتصدير', 'error');
        download('kosif-v38-trial-balance.csv', toCsv(tbRows(st)), 'text/csv;charset=utf-8');
        V.toast('صُدّر الميزان CSV', 'ok');
      };
      V.$('#v38-io-import').onclick = async () => {
        if (!pkgFile) return;
        try {
          const pkg = JSON.parse(await pkgFile.text());
          await importPackage(pkg);
          V.toast('استُعيدت الحزمة بنجاح — أعد تحميل الصفحة لتفعيلها', 'ok');
          setTimeout(() => location.reload(), 1600);
        } catch (e) { V.toast('فشل الاستيراد: ' + e.message, 'error'); }
      };
      V.$('#v38-io-parse-je').onclick = async () => {
        const out = V.$('#v38-io-je-out');
        if (!jeText) return;
        const { entries, errors } = parseJournalsCsv(jeText);
        if (!entries.length) { out.innerHTML = '<div class="v38-note danger">' + errors.map(V.esc).join('<br>') + '</div>'; return; }
        out.innerHTML = '<div class="v38-loading">فحص ' + entries.length + ' قيدًا عبر النواة الحتمية…</div>';
        let okCount = 0; const problems = [];
        for (const e of entries) {
          try {
            const r = await V.api('/api/kosif/v38/accounting/validate-journal', { method: 'POST', body: { entry: e, exp: 2 } });
            if (r.ok) okCount++; else problems.push({ id: e.id, errs: (r.errors || []).slice(0, 2).map(x => x.message) });
          } catch (err2) { problems.push({ id: e.id, errs: [err2.message] }); }
        }
        out.innerHTML =
          '<div class="v38-kpis">' + V.kpi('قيود سليمة', String(okCount), 'اجتازت فحص التوازن', true) + V.kpi('قيود مرفوضة', String(problems.length), 'لا تُرحّل قبل التصحيح') + '</div>' +
          (problems.length ? '<div class="v38-note danger"><span>⛔</span><span>' + problems.slice(0, 8).map(p => V.esc(p.id) + ': ' + p.errs.join(' / ')).join('<br>') + '</span></div>' : '<div class="v38-note ok"><span>✅</span><span>جميع القيود متوازنة وجاهزة لمسار الاعتماد البشري.</span></div>') +
          '<div><button class="v38-btn ghost sm" id="v38-io-je-csv">⬇ تنزيل القيود المفحوصة (CSV)</button></div>';
        V.$('#v38-io-je-csv').onclick = () => {
          const rows = [['رقم القيد', 'التاريخ', 'الحساب', 'البيان', 'مدين', 'دائن', 'النتيجة']];
          for (const e of entries) for (const ln of e.lines) rows.push([e.id, e.date, ln.account, ln.desc || e.memo, numOf(ln.dr), numOf(ln.cr), problems.some(p => p.id === e.id) ? 'مرفوض' : 'سليم']);
          download('kosif-v38-checked-journals.csv', toCsv(rows), 'text/csv;charset=utf-8');
        };
      };
    }
  });

  /* تصدير الأدوات لوحدات أخرى */
  V.io = { toCsv, toXlsx, download, buildPackage, parseJournalsCsv };
})();

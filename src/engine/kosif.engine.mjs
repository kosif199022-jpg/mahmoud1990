/**
 * kosif.engine.mjs — محرك التشغيل المرجعي لمخطط كوسيف
 * يقرأ kosif.blueprint.json ويشغّل الأجزاء الحتمية منه.
 * قاعدة المشروع: كل رقم يخرج من هنا، ولا رقم يخرج من نموذج لغوي.
 */

export function buildEngine(bp) {
  /* ── 1) تطبيع النص العربي ────────────────────────────────── */
  const textSteps = bp.normalization.arabic_text_pipeline.map((s) => ({
    re: new RegExp(s.pattern, "gu"),
    to: s.replace,
  }));

  const normalizeAr = (v) =>
    textSteps.reduce((acc, s) => acc.replace(s.re, s.to), String(v ?? "").toLowerCase());

  /* ── 2) تحليل الأرقام إلى وحدات صغرى صحيحة ───────────────── */
  const np = bp.normalization.numeral_parsing;
  const digitMap = { ...np.digit_maps.arabic_indic, ...np.digit_maps.eastern };
  const scale = 10 ** np.precision.scale;

  function parseAmount(raw, { signedColumn = false } = {}) {
    if (raw === null || raw === undefined || raw === "") return null;
    if (typeof raw === "number") return Math.round(raw * scale);

    let s = String(raw).trim().replace(/[٠-٩۰-۹]/g, (d) => digitMap[d]);
    let sign = 1;

    for (const form of np.negative_forms) {
      if (form.context === "signed_balance_column_only" && !signedColumn) continue;
      const m = s.match(new RegExp(form.pattern, "u"));
      if (m) { sign = form.sign; s = m[1].trim(); break; }
    }

    for (const t of np.thousand_separators) s = s.split(t).join("");
    for (const d of np.decimal_separators) if (d !== ".") s = s.split(d).join(".");
    s = s.replace(/[^\d.]/g, "");

    if (!s || (s.match(/\./g) || []).length > 1) return null;
    const n = Number(s);
    return Number.isFinite(n) ? sign * Math.round(n * scale) : null;
  }

  /* ── 3) محرك التصنيف بحدود كلمات عربية صحيحة ─────────────── */
  const mm = bp.classification_engine.match_mode;
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const token = (terms) =>
    new RegExp(`${mm.token_boundary_left}(?:${terms.map(esc).join("|")})${mm.token_boundary_right}`, mm.flags);

  const rules = bp.classification_engine.rules
    .map((r) => ({
      ...r,
      _any: token(r.match.any.map(normalizeAr)),
      _not: r.match.not ? token(r.match.not.map(normalizeAr)) : null,
    }))
    .sort((a, b) => b.priority - a.priority);

  function classify(account) {
    const name = normalizeAr(account.account_name);
    const hits = rules.filter((r) => r._any.test(name) && !(r._not && r._not.test(name)));
    if (!hits.length) {
      const fallback = bp.classification_engine.resolution.on_no_match;
      return { rule_id: null, ...fallback, rule_conflicts: [] };
    }
    const [win, ...rest] = hits;
    return {
      rule_id: win.id,
      label_ar: win.label_ar,
      class: win.class,
      fsli: win.fsli,
      assertions: win.assertions,
      standards: win.standards,
      inherent_risk: win.inherent_risk,
      pbc_pack: win.pbc_pack,
      procedure_pack: win.procedure_pack,
      flags: {
        is_estimate: !!win.is_estimate,
        fraud_relevant: !!win.fraud_relevant,
        presumed_fraud_risk: !!win.presumed_fraud_risk,
        always_significant_risk: !!win.always_significant_risk,
        expected_zero: win.expected_closing_balance === 0,
      },
      rule_conflicts: rest.map((r) => r.id),
    };
  }

  /* ── 4) الأهمية النسبية ──────────────────────────────────── */
  function computeMateriality({ benchmarkId, benchmarkValue, riskBand = "moderate", pctOverride }) {
    const b = bp.materiality_engine.benchmarks.find((x) => x.id === benchmarkId);
    if (!b) throw new Error(`مقياس غير معروف: ${benchmarkId}`);
    const pct = pctOverride ?? (b.range[0] + b.range[1]) / 2;
    const overall = Math.round(Math.abs(benchmarkValue) * pct);
    const pmFactor = bp.materiality_engine.performance_materiality.factor_by_risk[riskBand];
    return {
      benchmark: b.id,
      benchmark_label_ar: b.label_ar,
      pct_applied: pct,
      overall_materiality: overall,
      performance_materiality: Math.round(overall * pmFactor),
      clearly_trivial: Math.round(overall * bp.materiality_engine.clearly_trivial.default),
      requires_human_confirm: true,
    };
  }

  /* ── 5) درجة المخاطر مع تفكيك إلزامي ─────────────────────── */
  function scoreRisk(account, cls, ctx) {
    const { performance_materiality: pm, clearly_trivial: ct } = ctx.materiality;
    const clamp = (v) => Math.max(0, Math.min(100, v));
    const bal = Math.abs(account.closing_balance ?? 0);
    const py = Math.abs(account.py_closing_balance ?? 0);

    const f = {
      inherent_risk: cls.inherent_risk ?? 50,
      magnitude: Math.min(100, (100 * bal) / Math.max(pm, 1)),
      volatility: py || pm ? Math.min(100, (Math.abs(bal - py) / Math.max(py, pm)) * 100) : 0,
      anomaly: ctx.anomalyScore ?? 0,
      evidence_gap: ctx.evidenceGap ?? 0,
    };

    let score =
      f.inherent_risk * 0.4 + f.magnitude * 0.15 + f.volatility * 0.15 + f.anomaly * 0.2 + f.evidence_gap * 0.1;

    const applied = [];
    if (cls.flags?.always_significant_risk && score < 85) { score = 85; applied.push("طرف ذو علاقة → حد أدنى 85"); }
    if (cls.flags?.presumed_fraud_risk && score < 80) { score = 80; applied.push("مخاطر غش مفترضة → حد أدنى 80"); }
    if (cls.flags?.is_estimate) { score += 8; applied.push("تقدير محاسبي +8"); }
    if (cls.class === "unclassified" && score < 55) { score = 55; applied.push("غير مصنّف → حد أدنى 55"); }
    if (cls.flags?.expected_zero && bal > ct) { score = Math.max(score, 90); applied.push("حساب معلّق برصيد → حد أدنى 90"); }

    const final = clamp(Math.round(score));
    const band = bp.risk_engine.bands.find((b) => final >= b.from && final <= b.to);
    return { score: final, band: band.id, band_label_ar: band.label_ar, factors: f, escalations: applied };
  }

  /* ── 6) فحوص ميزان المراجعة ──────────────────────────────── */
  function runTbChecks(tb, ctx) {
    const hits = [];
    const push = (id, detail) => {
      const def = bp.deterministic_checks.trial_balance.find((c) => c.id === id);
      hits.push({ id, label_ar: def.label_ar, severity: def.severity, ...detail });
    };

    const dr = tb.reduce((s, r) => s + (r.debit ?? 0), 0);
    const cr = tb.reduce((s, r) => s + (r.credit ?? 0), 0);
    if (Math.abs(dr - cr) > 100) push("TB-01", { difference: dr - cr });

    const seen = new Map();
    for (const r of tb) {
      if (seen.has(r.account_no)) push("TB-02", { account_no: r.account_no });
      seen.set(r.account_no, true);
    }

    const normalSign = bp.taxonomy.normal_balance;
    for (const r of tb) {
      const expected = normalSign[r.classification?.class];
      const bal = r.closing_balance ?? 0;
      if (expected === "debit" && bal < -ctx.materiality.clearly_trivial) push("TB-03", { account_no: r.account_no, balance: bal });
      if (expected === "credit" && bal > ctx.materiality.clearly_trivial) push("TB-03", { account_no: r.account_no, balance: bal });
      if (r.classification?.flags?.expected_zero && Math.abs(bal) > ctx.materiality.clearly_trivial)
        push("TB-09", { account_no: r.account_no, balance: bal });
      if (r.py_closing_balance !== undefined) {
        const delta = Math.abs(bal - r.py_closing_balance);
        const pct = r.py_closing_balance ? delta / Math.abs(r.py_closing_balance) : 1;
        if (pct > 0.3 && delta > ctx.materiality.performance_materiality)
          push("TB-07", { account_no: r.account_no, delta, pct: +pct.toFixed(3) });
      }
    }
    return hits;
  }

  /* ── 7) شجرة الرأي وفق معيار 705 ─────────────────────────── */
  function determineOpinion(input) {
    const t = bp.opinion_engine.decision_tree;
    const path = [];
    let node = t.root;
    const answers = { ...input };

    while (node && !t.results[node]) {
      const def = t.nodes[node];
      path.push({ node, question_ar: def.question_ar });
      const a = answers[node];
      if (a === undefined) return { status: "needs_input", awaiting: node, question_ar: def.question_ar, path };
      node = def.branches
        ? def.branches.find((b) => b.when === a)?.next
        : def.options
        ? def.options.find((o) => o.value === a)?.next
        : a === true || a === "yes"
        ? def.yes
        : def.no;
      if (!node) return { status: "invalid_answer", at: path.at(-1).node, path };
    }

    return {
      status: "resolved",
      ...t.results[node],
      result_id: node,
      path,
      signed: false,
      note_ar: "اقتراح المحرك فقط — لا يُعد رأيًا حتى يوقّعه الشريك المسؤول.",
    };
  }

  /* ── 8) العقد الوحيد لاستدعاء النماذج ────────────────────── */
  const stableJson = (o) =>
    JSON.stringify(o, (_, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
        : v
    );

  function assertModelRequest(req) {
    const errs = [];
    if (!bp.ai_layer.tasks.some((t) => t.id === req.task_id)) errs.push(`task_id غير مسجّل: ${req.task_id}`);
    if (!Array.isArray(req.messages) || !req.messages.length) errs.push("messages مفقودة أو فارغة");
    (req.messages ?? []).forEach((m, i) => {
      if (typeof m.content !== "string") errs.push(`messages[${i}].content ليس نصًا — هذا هو مصدر [object Object]`);
      else if (m.content.includes("[object Object]")) errs.push(`messages[${i}].content يحتوي [object Object]`);
      else if (!m.content.trim()) errs.push(`messages[${i}].content فارغ`);
    });
    if (req.context_bundle && typeof req.context_bundle !== "object") errs.push("context_bundle يجب أن يكون كائنًا يُسلسل بـ stableJson");
    if (errs.length) throw new Error("فشل تحقق ما قبل الاستدعاء:\n- " + errs.join("\n- "));
    return true;
  }

  function buildModelRequest({ task_id, system_ar, userText, context = {} }) {
    const task = bp.ai_layer.tasks.find((t) => t.id === task_id);
    if (!task) throw new Error(`مهمة غير معروفة: ${task_id}`);
    const req = {
      provider: "gemini",
      model: "gemini-2.5-pro",
      task_id,
      system_ar,
      messages: [
        { role: "user", content: `${userText}\n\n<السياق>\n${stableJson(context)}\n</السياق>` },
      ],
      context_bundle: { ...context, redaction_applied: true },
      response_contract: { format: "json", schema_id: task.schema_id, max_tokens: 2048, temperature: task.temperature },
    };
    assertModelRequest(req);
    return req;
  }

  /* ── 9) حارس الأرقام: يمنع تسرّب أرقام النموذج ───────────── */
  function stripModelNumbers(aiText, allowedNumbers) {
    const allowed = new Set(allowedNumbers.map((n) => String(n)));
    return String(aiText).replace(/-?\d[\d,،.]*/g, (m) => {
      const key = m.replace(/[,،]/g, "");
      return allowed.has(key) ? m : "«رقم محذوف — يُحقن من المحرك الحتمي»";
    });
  }

  return {
    normalizeAr, parseAmount, classify, computeMateriality, scoreRisk,
    runTbChecks, determineOpinion, buildModelRequest, assertModelRequest,
    stripModelNumbers, stableJson,
  };
}

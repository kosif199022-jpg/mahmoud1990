/* KOSIF v42 — canonical implementation manifest for the 50,000-note baseline. */
export const REQUIREMENTS_BASELINE = Object.freeze({
  id: 'KOSIF-MASTER-NOTES-1-50000',
  version: '2026-08-20',
  totalItems: 50000,
  uniqueRequirementTexts: 10010,
  repeatedAdvancedItems: 40000,
  domains: 53,
  implementationModel: 'control-pattern + domain evidence + per-item traceability'
});

export const PRIORITY_ORDER = Object.freeze([
  'numeric_correctness',
  'security_privacy',
  'professional_compliance',
  'source_authority',
  'data_integrity',
  'accessibility_mobile',
  'capability_preservation',
  'visual_consistency',
  'performance'
]);

/*
 * Evidence entries below are repository artifacts, not virtual HTTP routes.
 * The Wealth/Mafateeh reader itself is supplied at runtime through suite-proxy.js;
 * therefore /wealth/reader.html and /wealth/books/library.json are verified by
 * the proxy/edge implementation plus production smoke tests rather than treated
 * as physical files that must exist under public/.
 */
export const REQUIRED_EVIDENCE_PATHS = Object.freeze([
  'src/requirements/v42-control-plane.mjs',
  'src/engine/v38-core.mjs',
  'src/engine/v38-evidence-graph.mjs',
  'src/kosif-workspace.js',
  'src/security-edge.js',
  'src/v38-api.js',
  'src/v38-source-intelligence.js',
  'src/suite-edge.js',
  'src/suite-proxy.js',
  'public/v36-ai-gate.js',
  'public/v36-governance.js',
  'public/kosif-studio-v40.js',
  'public/kosif-studio-v40.css',
  'public/kosif-editorial-v41.js',
  'public/kosif-editorial-v41.css',
  'public/wealth-library-v37.js',
  'public/standards',
  'public/standards/data/library.json',
  'governance/review-state.json',
  'governance/rollback-registry.json',
  'ops/kosif-main-monitor.mjs',
  '.github/workflows/deploy-cloudflare.yml'
]);

export const DOMAIN_EVIDENCE = Object.freeze({
  'الرؤية والمنتج': ['src/kosif-workspace.js', 'docs/KOSIF_UNIFIED_REQUIREMENTS_2026-08-20.md'],
  'الهوية البصرية': ['public/kosif-studio-v40.css', 'public/kosif-editorial-v41.css'],
  'الشاشة الرئيسية والتنقل': ['public/kosif-studio-v40.js', 'public/index.html'],
  'تجربة الموبايل': ['public/v38-user-polish.js', 'public/kosif-editorial-v41.css'],
  'PWA والتثبيت': ['public/manifest.webmanifest', 'public/index.html'],
  'محرك الكتب': ['src/suite-proxy.js', 'public/wealth-library-v37.js', 'src/suite-edge.js'],
  'قارئ مفاتيح الثروة': ['src/suite-proxy.js', 'public/wealth-library-v37.js'],
  'تنظيف كتب المعايير': ['public/standards', 'public/standards/data/library.json'],
  'قالب استيراد الكتب': ['public/wealth-library-v37.js', 'src/suite-edge.js', 'public/standards/data/library.json'],
  'عقل النظام': ['src/engine/v38-core.mjs', 'src/requirements/v42-control-plane.mjs'],
  'المصادر الرسمية': ['src/v38-source-intelligence.js', 'public/data/kosif-official-sources-2026.json'],
  'تاريخ سريان المعايير': ['src/v38-source-intelligence.js', 'public/standards'],
  'محرك البحث المعرفي': ['public/standards', 'src/v38-source-intelligence.js'],
  'المحرك الحسابي الحتمي': ['src/engine/v38-core.mjs', 'src/engine/kosif.engine.mjs'],
  'ميزان المراجعة': ['src/engine/v38-core.mjs', 'tests/v38-core.test.mjs'],
  'دفتر الأستاذ': ['src/engine/v38-core.mjs', 'src/kosif-workspace.js'],
  'المطابقات': ['src/engine/v38-core.mjs', 'src/engine/v38-evidence-graph.mjs'],
  'الأهمية النسبية': ['src/engine/v38-core.mjs', 'tests/v38-core.test.mjs'],
  'المخاطر': ['src/engine/v38-core.mjs', 'src/engine/v38-evidence-graph.mjs'],
  'PBC': ['src/kosif-workspace.js', 'public/v36-operations.js'],
  'الأدلة': ['src/engine/v38-evidence-graph.mjs', 'public/v38-evidence-graph.js'],
  'الملاحظات المهنية': ['src/kosif-workspace.js', 'public/v36-reviewer-media.js'],
  'القيود المقترحة': ['src/engine/v38-core.mjs', 'public/v36-governance.js'],
  'القوائم المالية': ['src/engine/v38-core.mjs', 'public/v36-outputs.js'],
  'التقارير': ['public/v38-reports.js', 'public/kosif-studio-v40.js'],
  'مجلس المراجعين': ['public/v38-council-v3.js', 'public/v36-governance.js'],
  'تنسيق نماذج AI': ['public/v36-ai-gate.js', 'src/requirements/v42-control-plane.mjs'],
  'الاعتماد البشري': ['public/v36-governance.js', 'governance/review-state.json'],
  'الشفافية والتفسير': ['src/engine/v38-evidence-graph.mjs', 'src/requirements/v42-control-plane.mjs'],
  'المستخدمون والصلاحيات': ['src/security-edge.js', 'src/requirements/v42-control-plane.mjs'],
  'الأمن': ['src/security-edge.js', 'scripts/check-security-edge-v36-3.mjs'],
  'الخصوصية': ['src/security-edge.js', 'scripts/check-library-privacy-v36-3.mjs'],
  'سجل التدقيق': ['src/requirements/v42-control-plane.mjs', 'src/engine/v38-evidence-graph.mjs'],
  'إدارة البيانات': ['src/v38-api.js', 'src/requirements/v42-control-plane.mjs'],
  'قواعد البيانات': ['src/v38-api.js', 'wrangler.toml'],
  'API والخدمات': ['src/v38-api.js', 'src/requirements/v42-control-plane.mjs'],
  'الأداء': ['ops/kosif-main-monitor.mjs', 'src/requirements/v42-control-plane.mjs'],
  'Accessibility وRTL': ['public/kosif-editorial-v41.css', 'public/v38-user-polish.js'],
  'الاختبارات': ['tests/v42-requirements-control-plane.test.mjs', 'scripts/check-v42-requirements.mjs'],
  'GitHub': ['.github/workflows/deploy-cloudflare.yml', 'scripts/check-v42-requirements.mjs'],
  'CI/CD': ['.github/workflows/deploy-cloudflare.yml', 'package.json'],
  'Cloudflare': ['.github/workflows/deploy-cloudflare.yml', 'wrangler.toml'],
  'المراقبة': ['ops/kosif-main-monitor.mjs', 'src/requirements/v42-control-plane.mjs'],
  'التعاون': ['src/v38-realtime.js', 'src/v38-realtime-session.js'],
  'بوابة العميل': ['src/security-edge.js', 'public/v36-operations.js'],
  'التكاملات': ['src/v38-api.js', 'src/kosif-workspace.js'],
  'الضرائب والزكاة': ['src/v38-source-intelligence.js', 'public/standards'],
  'حزم الدول والصناعات': ['src/v38-source-intelligence.js', 'src/kosif-workspace.js'],
  'لوحات المعلومات': ['public/kosif-studio-v40.js', 'public/requirements/index.html'],
  'الابتكار المستقبلي': ['src/requirements/v42-control-plane.mjs', 'governance/rollback-registry.json'],
  'البنية المعمارية الأساسية لـ KOSIF': ['src/requirements/v42-control-plane.mjs', 'src/kosif-workspace.js'],
  'النواة المعمارية وإعادة الهيكلة': ['src/requirements/v42-control-plane.mjs', 'src/engine/v38-core.mjs'],
  'التوسعة المتقدمة حتى 50000 ملاحظة': ['src/requirements/v42-control-plane.mjs', 'tests/v42-requirements-control-plane.test.mjs']
});

export function evidenceForDomain(domain) {
  return Object.freeze([...(DOMAIN_EVIDENCE[domain] || ['src/requirements/v42-control-plane.mjs'])]);
}

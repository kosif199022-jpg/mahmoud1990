#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'config', 'kosif-guardians.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const targetArg = process.argv.find((x) => !x.startsWith('--') && x !== process.argv[1] && x !== process.argv[0]);
const strict = process.argv.includes('--strict');
const target = path.resolve(root, targetArg || config.target);

if (!fs.existsSync(target)) {
  console.error(`KOSIF Guardians: target not found: ${target}`);
  process.exit(2);
}

const html = fs.readFileSync(target, 'utf8');
const findings = [];
const checks = [];

function count(re) {
  return (html.match(re) || []).length;
}

function finding(guardian, severity, code, message, evidence = undefined) {
  findings.push({ guardian, severity, code, message, ...(evidence ? { evidence } : {}) });
}

function check(name, fn) {
  const before = findings.length;
  fn();
  const own = findings.slice(before);
  checks.push({
    name,
    status: own.some((f) => f.severity === 'error') ? 'fail' : own.length ? 'warn' : 'pass',
    findings: own.length
  });
}

check('01-document-foundation', () => {
  if (!/^\s*<!doctype html>/i.test(html)) finding('document-foundation', 'error', 'DOCTYPE', 'Missing HTML5 doctype.');
  if (config.quality.requireArabicLanguage && !/<html[^>]*\blang=["']ar["']/i.test(html)) finding('document-foundation', 'error', 'LANG_AR', 'Root html element must declare lang="ar".');
  if (config.quality.requireRTL && !/<html[^>]*\bdir=["']rtl["']/i.test(html)) finding('document-foundation', 'error', 'DIR_RTL', 'Root html element must declare dir="rtl".');
  for (const marker of config.requiredMeta) if (!html.includes(marker)) finding('document-foundation', 'error', 'META_REQUIRED', `Missing required metadata marker: ${marker}`);
});

check('02-design-token-guardian', () => {
  const missing = config.requiredDesignTokens.filter((token) => !html.includes(token));
  if (missing.length) finding('design-token-guardian', 'error', 'TOKENS_MISSING', `Missing required design tokens: ${missing.join(', ')}`, { missing });
  const hexLiterals = count(/#[0-9a-fA-F]{6}\b/g);
  if (hexLiterals > 180) finding('design-token-guardian', 'warning', 'HEX_DRIFT', `High number of raw hex color literals (${hexLiterals}); prefer design tokens.`);
});

check('03-accessibility-guardian', () => {
  if (config.quality.requireFocusVisible && !/:focus-visible\b/i.test(html)) finding('accessibility-guardian', 'error', 'FOCUS_VISIBLE', 'No :focus-visible rule detected.');
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const missingAlt = images.filter((tag) => !/\balt\s*=/.test(tag));
  if (missingAlt.length) finding('accessibility-guardian', 'warning', 'IMG_ALT', `${missingAlt.length} image element(s) have no alt attribute.`);
  const unlabeledInputs = [...html.matchAll(/<(input|select|textarea)\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => !/\b(aria-label|aria-labelledby|id)\s*=/.test(tag));
  if (unlabeledInputs.length > 10) finding('accessibility-guardian', 'warning', 'FORM_LABEL', `${unlabeledInputs.length} form controls lack id/ARIA labeling hooks.`);
});

check('04-motion-guardian', () => {
  if (config.quality.requireReducedMotion && !/prefers-reduced-motion\s*:\s*reduce/i.test(html)) finding('motion-guardian', 'error', 'REDUCED_MOTION', 'prefers-reduced-motion: reduce support is required.');
  const infiniteAnimations = count(/animation[^;}{]*\binfinite\b/gi);
  if (infiniteAnimations > 8) finding('motion-guardian', 'warning', 'INFINITE_MOTION', `Detected ${infiniteAnimations} infinite animations; verify they are intentional.`);
});

check('05-responsive-guardian', () => {
  if (config.quality.requireViewportFitCover && !/viewport-fit=cover/i.test(html)) finding('responsive-guardian', 'error', 'VIEWPORT_FIT', 'viewport-fit=cover is required for iPhone safe-area behavior.');
  const mediaQueries = count(/@media\b/g);
  if (mediaQueries === 0) finding('responsive-guardian', 'warning', 'NO_MEDIA', 'No responsive media queries detected.');
  const fixedWide = [...html.matchAll(/width\s*:\s*(\d{4,})px/gi)].map((m) => Number(m[1])).filter((n) => n >= 1000);
  if (fixedWide.length > 10) finding('responsive-guardian', 'warning', 'FIXED_WIDTH', `Many very wide fixed pixel widths detected (${fixedWide.length}).`);
});

check('06-rtl-logical-css-guardian', () => {
  const physical = count(/\b(margin-left|margin-right|padding-left|padding-right|left\s*:|right\s*:)/gi);
  if (physical > config.quality.maxPhysicalDirectionCssUses) finding('rtl-logical-css-guardian', 'warning', 'PHYSICAL_DIRECTIONS', `${physical} physical direction declarations detected; prefer logical CSS properties.`);
  if (!/(margin-inline|padding-inline|inset-inline)/i.test(html)) finding('rtl-logical-css-guardian', 'warning', 'LOGICAL_PROPS', 'No CSS logical direction properties detected.');
});

check('07-scroll-and-modal-guardian', () => {
  const modalMentions = count(/\bmodal\b/gi);
  if (modalMentions && !/(overflow-y\s*:\s*auto|overflow\s*:\s*auto)/i.test(html)) finding('scroll-and-modal-guardian', 'warning', 'MODAL_SCROLL', 'Modal UI detected without an obvious overflow:auto rule.');
  const fixedBodies = count(/body[^{}]*\{[^}]*position\s*:\s*fixed/gi);
  if (fixedBodies) finding('scroll-and-modal-guardian', 'warning', 'BODY_FIXED', 'Fixed body positioning can break iOS modal scrolling.');
  if (!/overflow-x\s*:\s*auto/i.test(html)) finding('scroll-and-modal-guardian', 'warning', 'TABLE_SCROLL', 'No overflow-x:auto rule detected for wide tables/content.');
});

check('08-code-safety-guardian', () => {
  const evalCount = count(/\beval\s*\(/g) + count(/new\s+Function\s*\(/g) + count(/document\.write\s*\(/g);
  if (evalCount) finding('code-safety-guardian', 'error', 'DYNAMIC_CODE', `Detected ${evalCount} dynamic-code/document.write usage(s).`);
  const domWrites = count(/\.innerHTML\s*=/g) + count(/\.outerHTML\s*=/g);
  if (domWrites > config.quality.maxUnsafeDomWrites) finding('code-safety-guardian', 'warning', 'DOM_WRITES', `${domWrites} direct HTML write(s) detected; review sanitization boundaries.`);
  const importantUses = count(/!important/g);
  if (importantUses > config.quality.maxInlineImportantUses) finding('code-safety-guardian', 'warning', 'IMPORTANT_OVERUSE', `${importantUses} !important declaration(s) detected.`);
});

check('09-external-resource-guardian', () => {
  const externalScripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']https:\/\/[^"']+["'][^>]*>/gi)].map((m) => m[0]);
  const withoutIntegrity = externalScripts.filter((tag) => !/\bintegrity\s*=/.test(tag));
  if (withoutIntegrity.length) finding('external-resource-guardian', 'warning', 'SRI', `${withoutIntegrity.length} external script(s) do not declare Subresource Integrity.`);
  const httpRefs = count(/["']http:\/\//gi);
  if (httpRefs) finding('external-resource-guardian', 'error', 'INSECURE_HTTP', `${httpRefs} insecure http:// reference(s) detected.`);
});

check('10-observability-guardian', () => {
  const found = config.observabilityMarkers.filter((marker) => html.toLowerCase().includes(marker.toLowerCase()));
  if (!found.length) finding('observability-guardian', 'warning', 'NO_OBSERVABILITY', 'No PostHog/Sentry/global error observability marker detected in the frontend artifact.');
  if (!/unhandledrejection/i.test(html)) finding('observability-guardian', 'warning', 'PROMISE_ERRORS', 'No unhandledrejection listener detected.');
});

const severityWeight = { error: 12, warning: 3, info: 1 };
const penalty = findings.reduce((sum, f) => sum + (severityWeight[f.severity] || 0), 0);
const score = Math.max(0, 100 - penalty);
const errors = findings.filter((f) => f.severity === 'error').length;
const warnings = findings.filter((f) => f.severity === 'warning').length;
const status = errors ? 'fail' : warnings ? 'warn' : 'pass';

const report = {
  suite: 'KOSIF Design & Code Guardians',
  version: config.version,
  target: path.relative(root, target),
  generatedAt: new Date().toISOString(),
  status,
  score,
  summary: { checks: checks.length, errors, warnings, findings: findings.length },
  checks,
  findings
};

const outDir = path.join(root, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'kosif-guardians-report.json'), JSON.stringify(report, null, 2) + '\n');

const md = [
  '# KOSIF Design & Code Guardians',
  '',
  `- Target: \`${report.target}\``,
  `- Status: **${status.toUpperCase()}**`,
  `- Score: **${score}/100**`,
  `- Errors: **${errors}**`,
  `- Warnings: **${warnings}**`,
  '',
  '## Checks',
  '',
  ...checks.map((c) => `- ${c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⚠️'} ${c.name} — ${c.findings} finding(s)`),
  '',
  '## Findings',
  '',
  ...(findings.length ? findings.map((f) => `- **${f.severity.toUpperCase()}** \`${f.code}\` — ${f.message}`) : ['- No findings.']),
  ''
].join('\n');
fs.writeFileSync(path.join(outDir, 'kosif-guardians-report.md'), md);

console.log(md);
if (errors || (strict && warnings)) process.exit(1);

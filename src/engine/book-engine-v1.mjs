/*
 * KOSIF Book Engine v1
 * Unified, provenance-preserving normalization for Arabic/English professional books.
 *
 * Design rules:
 * 1) Raw source is never discarded. Every emitted block keeps source page/line provenance.
 * 2) Exact/repetitive boilerplate can be removed; substantive near-duplicates are preserved.
 * 3) OCR repair is conservative: normalize presentation/spacing noise, flag suspicious text,
 *    and never invent missing accounting/standards wording.
 * 4) Hierarchy is structural metadata only: part > chapter > section > heading > paragraph/list.
 */

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const HEADING_RULES = [
  { level: 'part', re: /^(?:الباب|الجزء)\s+(?:[اأإآء-يA-Za-z0-9٠-٩۰-۹()\-–—]+(?:\s+[اأإآء-يA-Za-z0-9٠-٩۰-۹()\-–—]+){0,5})$/i },
  { level: 'chapter', re: /^(?:الفصل)\s+(?:[اأإآء-يA-Za-z0-9٠-٩۰-۹()\-–—]+(?:\s+[اأإآء-يA-Za-z0-9٠-٩۰-۹()\-–—]+){0,5})$/i },
  { level: 'section', re: /^(?:القسم|المبحث|المطلب)\s*(?:\(?[0-9٠-٩۰-۹]+\)?|[اأإآء-يA-Za-z]+)?(?:\s*[:\-–—]\s*.*)?$/i },
  { level: 'heading', re: /^(?:مقدمة|تمهيد|نطاق القسم|الهدف|الأهداف|التعريفات|الخلاصة|الملخص|مثال(?:\s+تطبيقي)?|أسئلة|إجابات|Appendix|Introduction|Summary|Definitions?)\s*[:\-–—]?\s*.*$/i }
];

export const BOOK_SCHEMA = 'kosif.book.v1';

export function normalizeDigits(value = '') {
  return String(value).replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d))).replace(/[۰-۹]/g, d => String(EASTERN_DIGITS.indexOf(d)));
}

export function normalizeText(value = '') {
  return String(value)
    .replace(/\u00ad/g, '')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ـ]{2,}/g, 'ـ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([،؛:,.!?؟])/g, '$1')
    .replace(/([،؛:,.!?؟])(?=[^\s\n])/g, '$1 ')
    .trim();
}

function canonicalForFingerprint(value = '') {
  return normalizeDigits(normalizeText(value))
    .toLowerCase()
    .replace(/[\s\u0640]+/g, ' ')
    .replace(/[“”"'`«»()[\]{}<>]/g, '')
    .replace(/[.,،؛:!?؟]/g, '')
    .trim();
}

function fnv1a(input = '') {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function textFingerprint(value = '') {
  return fnv1a(canonicalForFingerprint(value));
}

function looksLikePageNumber(line) {
  return /^(?:[-–—]?\s*)?[0-9٠-٩۰-۹]{1,4}(?:\s*[-–—]?)$/.test(line);
}

function looksLikeListItem(line) {
  return /^(?:[•●▪►■◆✓✔-]|\(?[0-9٠-٩۰-۹]{1,3}[.)\-]|[أ-ي][.)\-])\s+/.test(line);
}

function classifyHeading(line) {
  const clean = normalizeText(line);
  for (const rule of HEADING_RULES) if (rule.re.test(clean)) return rule.level;
  if (clean.length <= 90 && !/[.!؟?]$/.test(clean) && /^(?:[0-9٠-٩۰-۹]+(?:\/[0-9٠-٩۰-۹]+)*\s+)?[اأإآء-يA-Za-z]/.test(clean)) {
    const words = clean.split(/\s+/).length;
    if (words <= 9) return 'heading';
  }
  return null;
}

function suspiciousOcr(line) {
  const chars = [...line];
  if (!chars.length) return false;
  const replacement = (line.match(/�/g) || []).length;
  const controls = (line.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g) || []).length;
  const isolated = (line.match(/(?:^|\s)[A-Za-z0-9]{1}(?:\s|$)/g) || []).length;
  return replacement > 0 || controls > 0 || (line.length > 25 && isolated >= 5);
}

function splitPage(page) {
  const pageNo = Number(page?.page ?? page?.number ?? 0) || 0;
  const raw = String(page?.text ?? '');
  return raw.split(/\r?\n/).map((source, idx) => ({
    page: pageNo,
    line: idx + 1,
    raw: source,
    clean: normalizeText(source)
  }));
}

function discoverRepeatingBoilerplate(pages) {
  const occurrence = new Map();
  for (const page of pages) {
    const unique = new Set();
    const lines = splitPage(page).filter(x => x.clean.length >= 5 && x.clean.length <= 180);
    for (const x of [...lines.slice(0, 4), ...lines.slice(-4)]) {
      const key = canonicalForFingerprint(x.clean);
      if (key) unique.add(key);
    }
    for (const key of unique) occurrence.set(key, (occurrence.get(key) || 0) + 1);
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.35));
  return new Set([...occurrence.entries()].filter(([, n]) => n >= threshold).map(([k]) => k));
}

function createNode(type, text, source, extra = {}) {
  const clean = normalizeText(text);
  return {
    id: `${type}-${source.page || 0}-${source.line || 0}-${textFingerprint(clean)}`,
    type,
    text: clean,
    source: { page: source.page || null, line: source.line || null },
    raw: source.raw ?? String(text),
    flags: suspiciousOcr(clean) ? ['suspected-ocr-noise'] : [],
    ...extra
  };
}

export function buildBookDocument(input = {}) {
  const pages = Array.isArray(input.pages) ? input.pages : [];
  const boilerplate = discoverRepeatingBoilerplate(pages);
  // Exact prose repeated far away can be legitimate in standards. Only collapse nearby duplicates;
  // preserve distant repeats and mark them for review instead of deleting professional wording.
  const seenExact = new Map();
  let emittedIndex = 0;
  const nodes = [];
  const removed = [];
  const outline = [];
  const counters = { part: 0, chapter: 0, section: 0, heading: 0, paragraph: 0, list_item: 0 };
  const path = { part: null, chapter: null, section: null, heading: null };

  for (const page of pages) {
    for (const source of splitPage(page)) {
      const line = source.clean;
      if (!line) continue;
      const canonical = canonicalForFingerprint(line);
      if (looksLikePageNumber(line)) {
        removed.push({ reason: 'page-number', ...source });
        continue;
      }
      if (boilerplate.has(canonical)) {
        removed.push({ reason: 'repeating-header-footer', ...source });
        continue;
      }
      const headingLevel = classifyHeading(line);
      const type = headingLevel || (looksLikeListItem(line) ? 'list_item' : 'paragraph');
      const duplicateKey = `${type}:${textFingerprint(line)}`;
      const previous = type === 'list_item' ? null : seenExact.get(duplicateKey);
      const pageDistance = previous && source.page && previous.page ? Math.abs(source.page - previous.page) : Infinity;
      const nearbyDuplicate = Boolean(previous && pageDistance <= 1 && emittedIndex - previous.emittedIndex <= 8);
      if (nearbyDuplicate) {
        removed.push({ reason: 'exact-duplicate', ...source });
        continue;
      }
      if (type !== 'list_item') seenExact.set(duplicateKey, { page: source.page, emittedIndex });

      counters[type] = (counters[type] || 0) + 1;
      if (['part', 'chapter', 'section', 'heading'].includes(type)) {
        path[type] = null;
        if (type === 'part') { path.chapter = null; path.section = null; path.heading = null; }
        if (type === 'chapter') { path.section = null; path.heading = null; }
        if (type === 'section') path.heading = null;
        const node = createNode(type, line, source, { order: counters[type], path: { ...path } });
        if (previous && !node.flags.includes('repeated-text-review')) node.flags.push('repeated-text-review');
        path[type] = node.id;
        node.path = { ...path };
        nodes.push(node);
        outline.push({ id: node.id, level: type, title: node.text, page: node.source.page, path: { ...path } });
      } else {
        const node = createNode(type, line, source, { order: counters[type], path: { ...path } });
        if (previous && type !== 'list_item' && !node.flags.includes('repeated-text-review')) node.flags.push('repeated-text-review');
        nodes.push(node);
      }
      emittedIndex++;
    }
  }

  const sourcePages = pages.map(p => Number(p?.page ?? p?.number ?? 0) || 0).filter(Boolean);
  const flags = [];
  if (nodes.some(n => n.flags.includes('suspected-ocr-noise'))) flags.push('contains-suspected-ocr-noise');
  if (nodes.some(n => n.flags.includes('repeated-text-review'))) flags.push('contains-distant-repeated-text');
  if (!outline.length && nodes.length) flags.push('flat-structure-needs-review');

  return {
    schema: BOOK_SCHEMA,
    id: String(input.id || `book-${textFingerprint(input.title || 'untitled')}`),
    title: String(input.title || 'كتاب بدون عنوان').trim(),
    language: String(input.language || 'ar'),
    direction: String(input.direction || (String(input.language || 'ar').startsWith('ar') ? 'rtl' : 'ltr')),
    authority: String(input.authority || 'reference'),
    source: {
      kind: String(input.source?.kind || 'extracted-text'),
      title: String(input.source?.title || input.title || ''),
      issuer: String(input.source?.issuer || ''),
      url: String(input.source?.url || ''),
      edition: String(input.source?.edition || ''),
      importedAt: String(input.source?.importedAt || new Date().toISOString())
    },
    stats: {
      pages: new Set(sourcePages).size,
      nodes: nodes.length,
      outlineItems: outline.length,
      removedArtifacts: removed.length,
      suspectedOcrNodes: nodes.filter(n => n.flags.includes('suspected-ocr-noise')).length,
      repeatedTextReviewNodes: nodes.filter(n => n.flags.includes('repeated-text-review')).length
    },
    flags,
    outline,
    nodes,
    removedArtifacts: removed
  };
}

export function bookToSearchRecords(book) {
  if (!book || book.schema !== BOOK_SCHEMA || !Array.isArray(book.nodes)) return [];
  return book.nodes.map((n, index) => ({
    id: n.id,
    bookId: book.id,
    index,
    type: n.type,
    text: n.text,
    page: n.source?.page || null,
    path: n.path || {},
    authority: book.authority,
    sourceTitle: book.source?.title || book.title
  }));
}

export function validateBookDocument(book) {
  const errors = [];
  if (!book || book.schema !== BOOK_SCHEMA) errors.push('BOOK_SCHEMA_INVALID');
  if (!String(book?.id || '').trim()) errors.push('BOOK_ID_REQUIRED');
  if (!String(book?.title || '').trim()) errors.push('BOOK_TITLE_REQUIRED');
  if (!Array.isArray(book?.nodes)) errors.push('BOOK_NODES_REQUIRED');
  if (Array.isArray(book?.nodes)) {
    const ids = new Set();
    for (const n of book.nodes) {
      if (!n?.id || ids.has(n.id)) errors.push('BOOK_NODE_ID_INVALID_OR_DUPLICATE');
      ids.add(n?.id);
      if (!n?.text) errors.push('BOOK_NODE_TEXT_REQUIRED');
      if (!n?.source || (!n.source.page && !n.source.line)) errors.push('BOOK_NODE_PROVENANCE_REQUIRED');
    }
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

/* Build the b4 audio index from the mafateeh-al-tharwa audio manifest.
 *
 * The narration lives in kosif199022-jpg/mafateeh-al-tharwa (34 MP3s, ~66 MB). It is
 * NOT copied into this repository — Kosif already reaches that project through the
 * MAFATEEH service binding, so the worker streams it instead of duplicating the bytes.
 * This script only records the small index the reader needs: which b4 chapter maps to
 * which track, its duration and its narrated title.
 *
 * Mapping: the recording covers the last 34 of the book's 46 chapters, so audio track N
 * is b4 chapter N+12. That offset is NOT assumed — it is derived from each chapter's own
 * `study.track` and then re-verified against the manifest title, and the script refuses
 * to write an index if any chapter disagrees.
 *
 * Word-level timings also exist upstream (public/audio/timings/*.json), but their word
 * counts do not line up with the body text stored here: only 10 of 34 chapters match any
 * combination of the stored fields, so they cannot drive highlighting without landing on
 * the wrong words. They are deliberately not imported.
 *
 * Usage: node scripts/import-mafateeh-audio.mjs <path-to-mafateeh-repo> [data-root]
 */
import fs from 'node:fs';
import path from 'node:path';

const repo = process.argv[2];
const root = process.argv[3] || 'public/standards/data';
if (!repo) throw new Error('Usage: node scripts/import-mafateeh-audio.mjs <mafateeh-repo> [data-root]');

const manifestPath = path.join(repo, 'public/audio/manifest.json');
if (!fs.existsSync(manifestPath)) throw new Error(`Audio manifest not found at ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const byTrack = new Map((manifest.chapters || []).map((c) => [Number(c.no), c]));
if (!byTrack.size) throw new Error('Audio manifest lists no chapters');

/* Same folding the library search uses, so a title comparison is not defeated by hamza
 * or ta-marbuta spelling differences between the two projects. */
const fold = (s) =>
  String(s || '')
    .normalize('NFKC')
    .replace(/[ً-ْ]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^؀-ۿa-z0-9]+/gi, ' ')
    .trim();

const entries = [];
const problems = [];

for (let no = 1; no <= 46; no++) {
  const file = path.join(root, 'b4', `${no}.json`);
  if (!fs.existsSync(file)) throw new Error(`Missing chapter file ${file} — run import-mafateeh-book.mjs first`);
  const ch = JSON.parse(fs.readFileSync(file, 'utf8'));
  const track = ch.study?.track;
  if (track == null) continue;

  const m = byTrack.get(Number(track));
  if (!m) { problems.push(`chapter ${no}: track ${track} has no manifest entry`); continue; }

  /* The offset is a consequence of the data, not an input to it: assert it holds. */
  if (Number(track) !== no - 12) problems.push(`chapter ${no}: track ${track} breaks the +12 offset`);

  const a = fold(m.title), b = fold(ch.title);
  if (!(a === b || (a.length > 8 && (a.includes(b) || b.includes(a))))) {
    problems.push(`chapter ${no}: title mismatch — book "${ch.title}" vs audio "${m.title}"`);
  }

  entries.push({
    chapter: no,
    track: Number(track),
    title: ch.title,
    duration: Number(m.duration) || 0,
    bytes: Number(m.bytes) || 0,
  });
}

if (problems.length) {
  console.error('KOSIF_B4_AUDIO_IMPORT_FAILED');
  for (const p of problems) console.error('- ' + p);
  process.exit(2);
}
if (entries.length !== 34) throw new Error(`Expected 34 narrated chapters, found ${entries.length}`);

const index = {
  book: 'b4',
  title: manifest.title || 'مفاتيح الثروة — النسخة الصوتية',
  /* Provenance matters here: this is synthesized narration, not a human reading, and the
   * reader says so rather than presenting it as an authored audiobook. */
  synthesized: true,
  voices: manifest.sources || [],
  generatedAt: manifest.generated_at || null,
  sourceRepo: 'kosif199022-jpg/mafateeh-al-tharwa',
  totalDuration: entries.reduce((s, e) => s + e.duration, 0),
  coverage: { narrated: entries.length, chapters: 46, from: entries[0].chapter, to: entries[entries.length - 1].chapter },
  tracks: entries,
};

fs.writeFileSync(path.join(root, 'b4-audio.json'), JSON.stringify(index, null, 2) + '\n');

console.log('KOSIF_B4_AUDIO_IMPORT_OK', JSON.stringify({
  narrated: entries.length,
  chapters: `${index.coverage.from}..${index.coverage.to}`,
  hours: +(index.totalDuration / 3600).toFixed(2),
  bytesNotCopied: entries.reduce((s, e) => s + e.bytes, 0),
}));

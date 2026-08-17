# Kosif — Master Requirements & Regression Contract

Date: 2026-08-17
Target release: v36.3+

This registry consolidates the product requirements repeatedly requested across the Kosif / حسابات ٢ / تمحيص project history, historical HTML releases, written transcripts of voice conversations, screenshots, audit notes, and the current native Worker source. It is a regression contract, not a marketing list.

> Voice-note provenance: requirements described as “voice” here are taken from the available transcribed/written conversation material. This registry does not claim access to raw audio that is not present in the project sources.

## 1. Product identity and architecture

- Product name presented to users is **Kosif / kosif**. Do not expose legacy Tamhees branding in production UI.
- Production starts from the native Kosif shell. Do not rebuild the old app with `document.write`, `theme-restore`, or packed `parts/*.txt` payloads.
- Recovered legacy logic may remain only as an approved deterministic module; legacy UI must not own routing, styling, branding, or navigation.
- No whole-document DOM-patching observer should be used as the normal UI architecture.
- One app shell is the source of truth. `frontend/index.html` and `public/index.html` must remain byte-identical if both are retained.

## 2. Navigation and mobile UX

The phone bottom navigation is exactly:

1. الرئيسية
2. الميزان
3. الجولات
4. المطالبات
5. المزيد

- الخريطة المعيارية belongs inside “المزيد”, not the primary bottom bar.
- No second/hidden legacy bottom navigation may coexist.
- “المزيد” is a single scrollable sheet/dialog with one clear close action and a stable scroll position.
- The background must not receive accidental interaction while a modal/sheet is open.
- More contains the professional areas that exist in the build: companies, standards map, analytics, PBC, reports/outputs, reviewer notes, standards library, books, official sources, search/commands, AI, engagement/governance, settings, appearance, accessibility/font size, and About.
- Use fixed-size inline SVG icons; icon geometry must not scale into large black glyphs when text is enlarged.

## 3. Responsive layout and accessibility

- Arabic is the default RTL experience.
- Font size is user-controlled from **90% through 200%**. Acceptance snapshots include 100%, 115%, 130%, 150%, and 200%.
- Text enlargement must not change navigation icon boxes or break More, tables, dialogs, buttons, or headers.
- Fluid grids use `min-width:0`, wrapping, and no fixed-height assumptions for text.
- Mobile tables remain usable with horizontal scrolling; account/name identification should remain visible where practical.
- Clear focus-visible treatment, keyboard Escape to close dialogs, sensible dialog semantics, and a skip-to-content control.
- `prefers-reduced-motion` disables non-essential motion.
- Long Arabic reading surfaces keep their dedicated reader typography and are not forced into dashboard motion styling.
- Printing/exported reports must remain readable and professionally formatted.

## 4. Design and motion system

The requested quality is a system, not a purple skin:

- page enter transitions;
- staggered card entry;
- gradient flow on primary surfaces;
- shimmer only for loading states;
- restrained particle field;
- live-status pulse/glow only when semantically live;
- button ripple;
- desktop-only pointer tilt where appropriate;
- glass sheets/dialogs;
- real progress ring/bar;
- success motion for completed meaningful tasks;
- dark mode and reduced-motion must remain first-class.

No external Google Font dependency is required for production PWA reliability; use the approved local/system Arabic stack unless a font asset is deliberately bundled.

## 5. Active company and data modes

- There is one active-company identity across overview, TB, rounds, PBC, More, reports, and AI context.
- Switching company updates every view from the same underlying state, never a duplicated hard-coded company label.
- Public companies are synchronized and writable only with device-held authorization; server stores a fingerprint, not the write token itself.
- Encrypted companies are encrypted client-side with AES-GCM before upload; Cloudflare stores ciphertext. No admin override may decrypt them.
- Demo mode must be clearly demo data and must never imply that real company data is included.

## 6. Trial balance and deterministic audit engine

- Excel / CSV / TXT TB import with auto-detection and manual mapping fallback.
- Balance checks, duplicate/missing code checks, abnormal balances, negative/unusual balances, no movement, large movements, prior-year changes, new/vanished accounts, suspense/clearing, related-party cues, round numbers/unusual endings.
- Per-account risk score with reason, assertions, related standards, evidence/disclosure expectations, and explainable “why/how/example/what if wrong” drawer.
- Materiality benchmark, performance materiality, trivial threshold, and revision history with manual override.
- Deterministic arithmetic remains outside LLM judgment.
- Adjusting entries always enforce debit = credit and support proposed/reviewed/accepted/rejected/external-posting states.
- Corrected/adjusted TB and export remain available.

## 7. PBC, evidence and document pipeline

- Initial mandatory PBC list, then dynamic requests after document review and later rounds.
- PBC states: Missing / Requested / Received / Under Review / Accepted / Rejected / Need Clarification.
- Document classes include TB, GL, AR/AP aging, bank/reconciliation, fixed assets, inventory, payroll, revenue, expenses, tax/zakat, leases, loans, contracts, minutes, FS/notes, and other.
- Pipeline is traceable: upload → security → parsing → table detection → mapping → cleaning → normalization → validation → canonical dataset → audit/AI engines.
- Reviewer may add manual evidence requests.
- Human reviewer notes support text, voice recording/input where available, and must feed the next review context without being silently treated as objective evidence.

## 8. Analytics and reconciliations

- GL analytics: duplicates, unbalanced journals, manual/post-close entries, unusual dates, large/round amounts, just-below-materiality, unusual combinations, period-end revenue, reversals, management accounts, suspense movements, rare combinations, pattern changes.
- Reconciliations: TB↔GL and GL↔subledgers / bank / tax / inventory / FA / payroll / AR / AP, plus GL↔FS.
- FS cross-check: mapping completeness, arithmetic, totals/subtotals, comparatives, notes, cash flow/equity reconciliations, cross references.
- Benford and other exploratory tests are indicators, not automatic findings.
- Operational sales/cost lab supports sales, cost, margin, negative-margin flags, potential duplicate records, returns, cut-off, customer/contact data quality, and customer concentration; it creates review indicators, not automatic misstatements.

## 9. Professional engagement and governance

The engagement layer must explicitly cover at least:

- acceptance / continuance;
- independence and conflict checks;
- ISA 210 engagement terms;
- ISA 220 engagement-level quality management;
- ISQM 1 firm-level quality-management awareness;
- listed / PIE classification where relevant;
- EQCR / engagement quality review requirement or decision;
- reporting framework selection (Full IFRS / IFRS for SMEs / local-other);
- country/jurisdiction profile;
- fraud and significant-risk considerations;
- risk register with inherent/control/fraud/significant/assertions/evidence/planned/result/residual dimensions.

Readiness checklists are planning/governance aids and must not automatically assert compliance or an audit opinion.

## 10. Standards and source precedence

- Saudi engagements use SOCPA/local adoption as the primary application authority.
- International IFRS/IAS/IFRIC and IAASB material is used with explicit distinction between international issuance and Saudi adoption/effective status.
- Maintain source freshness, including IFRS 18/19 readiness and IFRS 20 future effective-date awareness already implemented.
- Latest official post-book updates override stale local book extracts for source freshness, without inventing Saudi adoption.
- Source metadata should distinguish issued date, effective date, jurisdiction/adoption status, provenance, and whether a title is professional authority or study/training material.
- Professional search must never mix development/motivational books into accounting/audit authority context.

## 11. Standards library / books / office

- Embedded searchable standards library works online/offline and opens standards from account chips.
- Reader supports search, themes, font/readability controls, TTS, speech highlighting, Media Session, Wake Lock, auto-scroll 1–10 with touch-stop, sleep timer, code jump, exports, reading progress/streak.
- Smart books library supports uploaded PDFs/books and protected library routes.
- “مفاتيح الثروة” b4 remains a development title: 6 parts / 46 chapters / 34,700 words, `professionalAuthority=false`, excluded from professional search index, study layer separated from body and labeled “ليست من متن الكتاب”.
- “قسم المكتب” / library surfaces should let the user browse reference books directly where the packaged/uploaded source supports it.

## 12. AI Agent and Review Council

AI connection has one state machine:

`locked/disconnected → owner-open → testing → connected → error`

- Never show “connected/active/ready” because a key merely exists.
- API-key entry and AI execution are owner-password gated.
- Real provider+model+key connection test must pass; verified fingerprint lives in the owner server session.
- Changing provider/model/key invalidates verification.
- Keys are never stored in LocalStorage or application exports/logs.
- OpenAI, Gemini, Claude all use the same Agent Profile dimensions: jurisdiction, industry/entity profile, role/professional instructions, source priority and evidence discipline.
- Evidence attachments remain multimodal where supported; do not reduce every PDF/image to plain text before provider submission.
- Prompt-injection defense treats instructions found inside uploaded documents as untrusted evidence/data.
- Council runs blind independent reviewers; consensus/dissent is preserved; human approval remains mandatory.
- Council should require at least two independently verified providers for a multi-provider conclusion. Claude chairs/adjudicates only when its own configured connection is verified.

## 13. Long-running task progress

- Progress is based on real phases, not a cosmetic timer.
- Typical round phases: source refresh → standards context → books/evidence context → data checks → risk procedures → AI analysis → findings → outputs.
- Display current phase, meaningful percentage, ETA based on observed elapsed work, completion/error/paused state.
- Network/provider errors must end or pause the spinner with a clear recoverable message.

## 14. Outputs and human decisions

- Final finding register, adjusting entries, missing documents, additional procedures, account-to-standard matrix, disclosure corrections, management questions, client action plan, corrected TB, completion checklist, draft audit report, management letter, executive summary, engagement package.
- Draft FS outputs include statement of profit/loss, financial position, cash flows, changes in equity, OCI/notes as applicable.
- Export JSON/CSV/Word/print/PDF where implemented.
- Audit Trail records human accept/reject/changes. Final professional judgment belongs to the human reviewer.

## 15. Languages and jurisdiction

- Arabic default.
- Preserve historical language capability for English, Italian and Hindi where the available translated labels/data support it; do not claim a complete translation where the source only contains a partial dictionary.
- Country selector defaults to Saudi Arabia; other jurisdictions must not silently reuse Saudi conclusions without changing the framework/source profile.

## 16. Release, cache and PWA integrity

Every production release has one build identity shared by source, Worker health/version endpoint, assets, app cache and standards cache.

Minimum fields:

- `version`
- `buildId`
- `release`
- `schemaVersion`
- `appCache`
- `standardsCache`
- `sourceRepo`
- `sourceCommit` when the deployment system can provide it

- `/__version` is `no-store` and is the diagnosis source of truth.
- App and standards Service Workers use explicit release generations and purge known `tamhees*`, old Kosif native and old app caches during activation.
- API/user-data requests are excluded from SW caching.
- A new release must not run mixed old/new UI assets after an update.
- About should expose the visible build identity for support/debugging.

## 17. Permanent CI / browser acceptance

A release cannot be considered green unless automated checks include:

- all JS syntax;
- injected/inline browser payload parsing;
- CSS block balance;
- no duplicate static IDs;
- no missing static assets;
- no unreachable worker declarations;
- standards metadata/chapter continuity;
- development b4 exclusion from professional index;
- exact mobile nav order;
- font max 200%;
- no repeated AI helper declarations in the production inline client;
- no whole-document MutationObserver in the main workspace client;
- AI locked/verified state contract;
- `/__version` and cache-generation contract;
- mobile Chromium 390×844 and desktop browser probes;
- More opens/closes without overflow;
- 200% font does not create horizontal app-shell overflow or giant navigation SVGs;
- active company label stays stable across primary views;
- standards library and smart library routes work;
- dark and reduced-motion behavior;
- no browser console fatal errors or failed critical static assets.

## 18. Explicit anti-regressions

Do not reintroduce:

- legacy green Tamhees UI or user-facing Tamhees name;
- map in phone primary navigation;
- duplicated navigation systems;
- key-presence = AI active logic;
- API keys in LocalStorage;
- broad `document.documentElement` subtree mutation patching in the main client;
- old caches that can restore an obsolete shell;
- professional search contamination by development books;
- standards buttons that do nothing;
- body-scroll/modal-scroll conflicts on iPhone;
- auto-scroll continuing while a modal/body lock is active;
- nested-scroll blocking from hardcoded scroll selector lists;
- silent permanent 0% progress/spinners;
- contradictory active-company labels.


## 19. Historical interaction restoration — voice, media and multilingual core

- **مساعد صوتي** داخل التطبيق يجيب حتميًا من حالة الملف على: «ابدأ منين؟»، «ملخص الشغل»، و«المشاكل المفتوحة»، ويستطيع قراءة الرد بالعربية والتنقل بأوامر صوتية عندما يدعم المتصفح Speech Recognition. لا يحوّل الصوت أو الحسابات إلى حكم مهني آلي.
- ملاحظات المراجع تستعيد التسجيل الصوتي والفيديو والمرفقات؛ الخام محفوظ محليًا في IndexedDB، بينما يدخل سياق المراجعة الوصف/الملخص وبيانات النزاهة فقط، ولا يُعامل التسجيل الخام كدليل موضوعي تلقائيًا.
- الواجهة الأساسية تستعيد **English / Italian / Hindi** إلى جانب العربية. هذه ترجمة للواجهة والمصطلحات التجريبية التي كانت موجودة تاريخيًا، وليست ادعاءً بأن كتب المعايير أو المصادر الرسمية مترجمة بالكامل؛ تلك تبقى بلغة المصدر.
- خيار الأهمية النسبية «الربح قبل الضريبة / الزكاة» يجب أن يظل ظاهرًا إذا كان المحرك يدعمه.
- اختيار «منشأة مدرجة» يفعّل اختبارات جاهزية IAS 33 وIFRS 8 وISA 701، واختيار IFRS for SMEs مع منشأة مدرجة يظهر تعارض أهلية يحتاج حسمًا بدل المرور بصمت.
- الإطار المحاسبي وطبيعة الكيان يجب أن يتزامنا مع سجل جاهزية الارتباط، لا أن يبقيا حقول عرض فقط.

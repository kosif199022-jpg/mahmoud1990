# KOSIF Design Quality Stack v44

## الهدف

طبقة تصميم وجودة غير مدمرة فوق KOSIF Editorial v41. لا تغيّر منطق المحاسبة أو المراجعة أو الأمن أو الموافقات. تركّز على خمس قواعد ثابتة: hierarchy واضحة، typography عربية قوية، spacing موحد، animation هادئ، وresponsive حقيقي من الهاتف إلى سطح المكتب.

## ما تم دمجه

- **Design Tokens**: `config/design-tokens-v44.json` هو المصدر الحاكم للألوان، الخطوط، المقاسات، المسافات، radius، shadows، motion، breakpoints و44px touch target.
- **Runtime Design Layer**: `public/kosif-design-system-v44.css` و`public/kosif-design-system-v44.js`.
- **Native Motion**: Web Animations / IntersectionObserver بدلاً من فرض React على التطبيق الحالي، مع احترام `prefers-reduced-motion`.
- **Accessible primitives**: focus-visible، touch targets، keyboard/input mode، table scroll regions وsemantic annotations.
- **Playwright + axe-core**: فحص Desktop Chromium وMobile Safari/WebKit، responsive overflow، touch targets وCritical WCAG regressions.
- **Lighthouse CI**: thresholds للأداء، Accessibility، Best Practices، SEO وCLS.
- **Storybook HTML**: كتالوج مرئي للـhierarchy، typography، spacing، cards، statuses وactions بدون تحويل التطبيق إلى React.
- **Chromatic**: جاهز للنشر البصري عند إضافة secret باسم `CHROMATIC_PROJECT_TOKEN`.
- **Sentry bridge**: `window.KOSIFObservability` يرسل إلى `window.Sentry` تلقائياً إذا تم تحميل Sentry وتهيئته بــDSN في بيئة النشر، وإلا يحتفظ بسلوك console آمن.

## لماذا لم نضف shadcn/Radix/Framer Motion مباشرة؟

الواجهة الحالية Framework-agnostic/HTML وليست React component tree. إدخال مكتبات React الآن سيضيف runtime وبنية موازية بلا فائدة ويهدد الاستقرار. تم دمج نفس المبادئ المناسبة تقنياً باستخدام HTML/ARIA/native motion. إذا انتقل KOSIF لاحقاً إلى React يمكن استبدال primitives تدريجياً بـRadix/shadcn وMotion بدون تغيير Design Tokens.

## Storybook

```bash
npm run build
npm install --no-save --package-lock=false storybook@latest @storybook/html-vite@latest
npm run storybook
```

لبناء النسخة الثابتة:

```bash
npm run storybook:build
```

## Browser QA

```bash
npm install --no-save --package-lock=false @playwright/test@1.55.0 @axe-core/playwright@4.10.2
npx playwright install chromium webkit
npm run build
KOSIF_BASE_URL=http://127.0.0.1:4173 KOSIF_QA_MODE=static npx playwright test --config=playwright.config.mjs
```

## Lighthouse

بعد تشغيل `public/` على المنفذ 4173:

```bash
npm run lighthouse
```

## Chromatic

أضف GitHub Actions secret باسم `CHROMATIC_PROJECT_TOKEN`. عند وجوده، Workflow `KOSIF Design Quality v44` يرفع Storybook تلقائياً إلى Chromatic. غياب المفتاح لا يمنع بقية بوابات الجودة.

## Sentry

الـbridge لا يحمّل SDK خارجيًا ولا يرسل بيانات بدون إعداد صريح. عند تهيئة Sentry في shell أو Worker/HTML، سيستخدمه KOSIF تلقائياً عبر `window.Sentry.captureException` و`captureMessage`.

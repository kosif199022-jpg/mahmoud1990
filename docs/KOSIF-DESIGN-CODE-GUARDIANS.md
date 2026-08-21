# KOSIF Design & Code Guardians

هذه الحزمة تضيف عشر طبقات فحص خفيفة للمشروع من دون إضافة dependencies جديدة أو تغيير واجهة الإنتاج.

## الحراس العشرة

1. **Document Foundation Guardian** — يتحقق من doctype و`lang="ar"` و`dir="rtl"` وبيانات الـviewport والوصف والثيم.
2. **Design Token Guardian** — يمنع تآكل الهوية البصرية ويتحقق من وجود design tokens الأساسية ويرصد الإفراط في الألوان الخام.
3. **Accessibility Guardian** — يفحص `:focus-visible`، و`alt` للصور، ونقاط ربط labels/ARIA لعناصر النماذج.
4. **Motion Guardian** — يفرض دعم `prefers-reduced-motion` ويرصد الإفراط في الحركات المستمرة.
5. **Responsive Guardian** — يفحص iPhone safe-area/viewport، وجود responsive media queries، والعروض الثابتة الكبيرة.
6. **RTL Logical CSS Guardian** — يرصد الاعتماد الزائد على `left/right` ويشجع `margin-inline` و`padding-inline` و`inset-inline`.
7. **Scroll & Modal Guardian** — يرصد الأنماط التي قد تكسر تمرير الـmodals والجداول، خصوصًا على iOS.
8. **Code Safety Guardian** — يمنع `eval` و`new Function` و`document.write` ويرصد direct DOM writes و`!important` بكثافة.
9. **External Resource Guardian** — يرصد `http://` والـexternal scripts التي لا تستخدم Subresource Integrity.
10. **Observability Guardian** — يتحقق من وجود آثار PostHog/Sentry/global error handling ويرصد غياب `unhandledrejection`.

## التشغيل المحلي

```bash
node scripts/kosif-guardians.mjs frontend/index.html
```

لتحويل التحذيرات إلى فشل CI أيضًا:

```bash
node scripts/kosif-guardians.mjs frontend/index.html --strict
```

## المخرجات

يتم إنشاء:

- `artifacts/kosif-guardians-report.json`
- `artifacts/kosif-guardians-report.md`

الـWorkflow الموجود في `.github/workflows/kosif-guardians.yml` يشغّل الحراس على تغييرات الواجهة في Pull Requests، وعلى `main` عند تعديل الواجهة، ويمكن تشغيله يدويًا أيضًا.

## سياسة الفشل

الوضع الافتراضي **fail-closed للأخطاء الأساسية فقط** حتى لا نمنع التطوير بسبب تحذيرات أسلوبية. التحذيرات تظهر في التقرير ولا توقف الـCI إلا عند استخدام `--strict`.

## التوسعة

القيم القابلة للضبط موجودة في `config/kosif-guardians.json`. يمكن زيادة thresholds تدريجيًا مع تنظيف الكود بدل كسر المشروع دفعة واحدة.

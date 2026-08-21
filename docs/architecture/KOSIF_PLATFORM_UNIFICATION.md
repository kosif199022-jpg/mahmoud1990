# KOSIF Platform Unification v46

هذا التحديث يوحّد البنية الهندسية لمنصة KOSIF مع الحفاظ على النواة الحتمية الحالية وعدم استبدال مسارات الإنتاج الموثوقة بنماذج تجريبية.

## 1. حدود المسؤولية

- تبقى محركات المحاسبة والمراجعة الحتمية هي المرجع للحسابات النهائية، التسويات، الأهمية النسبية، الترحيل، وسلامة القيود.
- الذكاء الاصطناعي طبقة تحليل وشرح واقتراح؛ لا يصدر رأي مراجعة نهائيًا ولا يرحّل قيدًا دون اعتماد بشري موثق.
- `src/services/gemini.service.ts` طبقة Gemini مركزية تعمل بمفتاح خادم فقط. استخدام أي متغير `NEXT_PUBLIC_*` لمفاتيح الذكاء الاصطناعي ممنوع.
- `src/services/mcp-client.service.ts` عميل MCP fail-closed: HTTPS، قائمة أدوات مسموحة، مهلة تنفيذ، وBearer token اختياري.
- خادم `mcp/kosif-engineering-copilot` الحالي هو خادم الإنتاج المعتمد، بما فيه OAuth. الملفات التجريبية الخفيفة لا تستبدله.

## 2. مصدر الشيفرة

شجرة المستودع هي مصدر الحقيقة الوحيد. تم إلغاء الاعتماد على ملفات النقل الضخمة أو أجزاء Base64:

- `.v38-import/` محذوف بالكامل.
- `Kosif-Full-Application-Source.json` محذوف.
- فحص `source-export-integrity` أصبح يتحقق من سلامة شجرة المصدر الفعلية وبصماتها بدل مطالبة المستودع بملف dump مكرر.

## 3. CI/CD

يوجد ثلاثة workflows نشطة فقط:

1. `ci-quality-gate.yml` — البناء، TypeScript، الاختبارات الحتمية، Storybook، Playwright/Axe، SBOM وTrivy.
2. `deploy-production.yml` — نفس مسار Cloudflare الإنتاجي الموثوق واختبارات التحقق الحية؛ تم تغيير الاسم فقط لتوحيد التنظيم.
3. `gemini-mcp-agent.yml` — نفس نشر MCP المعزول المحمي بـOAuth واختبارات visual smoke؛ تم تغيير الاسم فقط لتوحيد التنظيم.

لا يتم إضعاف بوابات المحاسبة أو الأمان لتسريع النشر.

## 4. Design System

تمت إضافة طبقة Tokens مستقلة في `src/styles/tokens.css` بلوحة Deep Slate / Emerald / Sapphire، مع:

- ألوان دلالية موحدة.
- spacing وradius وmotion tokens.
- دعم `prefers-reduced-motion`.
- Theme enterprise وLight override.
- قصة Storybook فعلية لعرض الأساس البصري واختبار عناصر RTL والوصول.

هذه الطبقة تُضاف بشكل تدريجي ولا تستبدل تلقائيًا الهوية البصرية المنشورة والمجتازة للفحص قبل اكتمال visual regression على كل الشاشات.

## 5. Vector Memory

المهاجرة `supabase/migrations/20260821_system_brain_pgvector.sql` تضيف:

- `pgvector` بأبعاد 768.
- فهرس HNSW للبحث الدلالي.
- سجل تنفيذ للوكلاء.
- دالة similarity محكومة.
- RLS مفعّل دون سياسات قراءة عامة.
- `REVOKE` صريح من `anon` و`authenticated`؛ الوصول يتم عبر خدمات Edge/Server الموثوقة فقط.

## 6. إدارة الأسرار

`.env.example` يحتوي أسماء المتغيرات فقط. القيم الحقيقية تبقى في GitHub/Cloudflare/Supabase Secrets ولا تكتب في الشيفرة أو الواجهة.

## 7. الخطوة التالية بعد الدمج

بعد اجتياز البوابات ودمج هذا التغيير يمكن ترحيل الواجهات تدريجيًا إلى المكونات المعيارية والـTokens، وتفعيل Gemini على بيئة الإنتاج بمجرد إعداد `GEMINI_API_KEY` في الخادم، ثم إجراء rollout بصري شاشةً شاشة مع Playwright وAxe وvisual regression.

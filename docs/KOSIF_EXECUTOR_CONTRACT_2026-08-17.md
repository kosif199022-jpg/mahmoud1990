# Kosif Gemini Executor Contract — 2026-08-17

## الهدف

Gemini Executor هو **Execution & Deliverables Agent** يأتي بعد Council V2 وفصل Claude. كلمة Execution هنا تعني تحويل الأحكام التي اعتمدها المراجع البشري إلى مخرجات عملية قابلة للمراجعة؛ **لا تعني الترحيل الآلي للقيود ولا تعديل بيانات العميل أو الميزان الأصلي**.

## شروط البدء

1. يوجد تشغيل Council V2 مكتمل بإصدار `2.0`.
2. يوجد فصل صالح من Claude يحتوي `accepted_findings[]`.
3. كل Finding قبله Claude يجب أن يحصل على قرار بشري صريح: `Accepted` أو `Rejected`؛ لا يبدأ Executor مع أي قرار `Pending`.
4. يجب وجود Finding واحد على الأقل بحالة `Accepted` بشريًا.
5. بوابة المالك مفتوحة.
6. Gemini مختبر بنجاح في Council V2 في جلسة المالك الحالية؛ المفتاح يظل في ذاكرة الصفحة ولا يُكتب في LocalStorage أو ملف الارتباط.

## المخرجات الأربعة عشر

1. `final_findings_register` — Final Findings Register.
2. `proposed_adjusting_entries` — Proposed Adjusting Entries.
3. `missing_document_requests` — Missing Document Requests.
4. `additional_audit_procedures` — Additional Audit Procedures.
5. `account_to_standard_matrix` — Account-to-Standard Matrix.
6. `disclosure_corrections` — Disclosure Corrections.
7. `management_questions` — Management Questions.
8. `client_action_plan` — Client Action Plan.
9. `corrected_trial_balance_draft` — Corrected Trial Balance Draft.
10. `audit_completion_checklist` — Audit Completion Checklist.
11. `draft_audit_report` — Draft Audit Report.
12. `management_letter` — Management Letter.
13. `executive_summary` — Executive Summary.
14. `engagement_completion_package` — Engagement Completion Package.

كل المخرجات **Draft** حتى اعتماد لاحق من المراجع البشري.

## القيود والتسويات

- كل قيد ينتجه Gemini يكون `status = Proposed` مهما كان نص استجابة النموذج.
- الحقول التشغيلية تفرض `reviewed_by_human = false` و`posted = false` عند الإنشاء.
- Kosif يتحقق برمجيًا من أن مجموع `debit` يساوي مجموع `credit`; الحزمة كلها تُرفض إذا وجد قيد غير متوازن.
- الحالات المهنية الممكنة بعد ذلك تبقى: `Proposed / Under Review / Accepted / Rejected / Posted Externally`.
- **لا يتم الترحيل الفعلي داخل Executor.** `Posted Externally` لا يثبت إلا عبر تكامل مستقل وإجراء بشري صريح خارج هذه المرحلة.

## Corrected Trial Balance

`corrected_trial_balance_draft` هو مسودة توضح أثر:

`Original TB + Proposed Adjustments = Adjusted / Corrected TB Draft`

ولا يستبدل `Original TB` ولا يكتب فوقه. يجب أن يظل أثر كل Adjustment قابلًا للتتبع.

## Human-in-the-loop

- حكم Claude ليس اعتمادًا بشريًا.
- Executor لا يستطيع تحويل Finding إلى تنفيذ إلا بعد قرار المستخدم `Accepted`.
- `Rejected` لا يدخل حزمة التنفيذ.
- Evidence gaps تُحفظ كطلبات أدلة أو إجراءات مفتوحة ولا تتحول تلقائيًا إلى Misstatement مثبت.
- سجل التدقيق يسجل قرارات الإنسان، إنشاء الحزمة، وتصديرها.

## حدود الأمان

- لا raw API keys في LocalStorage / SessionStorage / ملفات العمل / Audit Trail.
- لا تعديل تلقائي للميزان أو التقرير النهائي أو القيود الأصلية.
- لا Automatic Posting.
- لا اختلاق أرقام فقرات معيارية أو مصادر غير موجودة في السياق.
- الكتب الشخصية لا تدخل سياق الحكم إلا إذا تم اعتمادها مهنيًا عبر طبقة Smart Library Trust.
- الولاية غير السعودية لا تتحول صامتًا إلى مصادر سعودية؛ سياسة jurisdiction fail-safe تبقى سارية على طلب Executor.

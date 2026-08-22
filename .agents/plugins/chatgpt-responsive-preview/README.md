# KOSIF Responsive Preview + QA

بلجن داخلي داخل KOSIF مبني على تطبيق Responsive Preview Studio Pro المرفق.

- واجهة التشغيل: `/preview/index.html`
- جسر KOSIF/ChatGPT: `/responsive-preview-plugin.js`
- أوضاع: Single / Split / Matrix / Fluid
- معاينة أجهزة الهاتف والتابلت واللابتوب وسطح المكتب
- Safe Area و8px Grid وRuler وOutline وInspect
- QA سريع للـ overflow، العناصر خارج الشاشة، الصور وalt، الحقول، أهداف اللمس، الأزرار/الروابط، Duplicate IDs وH1
- التقارير ترسل إلى المضيف عبر `postMessage` عند توفر الجسر داخل تطبيق المعاينة

## حدود الأمان

الفحص وInspect يحتاجان نفس النطاق. المواقع الخارجية قد تمنع التضمين عبر CSP أو X-Frame-Options. هذا البلجن لا يتجاوز حماية المتصفح ولا يرسل بيانات مراجعة محاسبية إلى مزود خارجي.

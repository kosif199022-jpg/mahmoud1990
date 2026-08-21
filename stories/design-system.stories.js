export default {
  title: 'KOSIF/Design System/Enterprise Tokens',
};

const swatches = [
  ['App', '#0B0F17'],
  ['Surface', '#111827'],
  ['Emerald', '#10B981'],
  ['Sapphire', '#3B82F6'],
  ['Warning', '#F59E0B'],
  ['Text', '#F9FAFB'],
];

export const Foundations = () => `
  <main dir="rtl" data-kosif-theme="enterprise" style="min-height:100vh;background:var(--kosif-bg-app-dark);color:var(--kosif-text-primary);padding:32px;font-family:system-ui,sans-serif">
    <section style="max-width:1080px;margin:auto">
      <p style="color:var(--kosif-accent-emerald);font-weight:700">KOSIF ENTERPRISE DESIGN SYSTEM</p>
      <h1 style="font-size:clamp(28px,5vw,52px);margin:8px 0 24px">Deep Slate · Emerald · Sapphire</h1>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
        ${swatches.map(([name, color]) => `<article class="kosif-glass-card" style="padding:16px"><div style="height:72px;background:${color};border-radius:12px;border:1px solid var(--kosif-border-glass)"></div><strong style="display:block;margin-top:10px">${name}</strong><code style="color:var(--kosif-text-muted)">${color}</code></article>`).join('')}
      </div>
      <article class="kosif-glass-card" style="padding:24px;margin-top:20px">
        <h2 style="margin-top:0">بطاقة تدقيق معيارية</h2>
        <p style="color:var(--kosif-text-muted)">حدود زجاجية هادئة، تسلسل بصري واضح، ومسافات ثابتة مع احترام تقليل الحركة.</p>
        <button aria-label="تشغيل فحص التدقيق" style="border:0;border-radius:10px;padding:11px 16px;background:var(--kosif-accent-emerald);color:#04130e;font-weight:800">تشغيل الفحص</button>
      </article>
    </section>
  </main>`;

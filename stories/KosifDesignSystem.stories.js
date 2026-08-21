const shell = (content) => `
  <div dir="rtl" style="font-family:var(--k44-font);background:var(--k44-paper-soft);color:var(--k44-ink);min-height:100vh;padding:32px">
    <main style="max-width:1100px;margin:auto">${content}</main>
  </div>`;

export default {
  title: 'KOSIF/Design System v44'
};

export const Hierarchy = {
  render: () => shell(`
    <section class="card">
      <div style="font-size:var(--k44-fs-xs);color:var(--k44-gold-strong);font-weight:700">KOSIF · TRUSTED AUDIT INTELLIGENCE</div>
      <h1 style="font-size:var(--k44-fs-display);margin:.25em 0 .2em">قرار أوضح. مراجعة أهدأ.</h1>
      <p style="font-size:var(--k44-fs-lg);color:var(--k44-muted);max-width:62ch">مثال مرجعي للهرمية البصرية: عنوان رئيسي واحد، وصف مختصر، ثم إجراء أساسي وإجراء ثانوي فقط.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px">
        <button class="btn primary">بدء المراجعة</button>
        <button class="btn ghost">عرض التفاصيل</button>
      </div>
    </section>`)
};

export const Typography = {
  render: () => shell(`
    <section class="card">
      <h2 style="font-size:var(--k44-fs-2xl)">سُلّم الكتابة</h2>
      <div style="display:grid;gap:16px;margin-top:20px">
        <div><strong style="font-size:var(--k44-fs-display)">Display</strong><div style="color:var(--k44-muted)">للعناوين المحورية فقط</div></div>
        <div><strong style="font-size:var(--k44-fs-2xl)">Heading 2</strong><div style="color:var(--k44-muted)">لعناوين الأقسام</div></div>
        <div><strong style="font-size:var(--k44-fs-xl)">Heading 3</strong><div style="color:var(--k44-muted)">للعناوين داخل البطاقات</div></div>
        <p style="font-size:var(--k44-fs-md);line-height:var(--k44-lh-reading);max-width:72ch">النص الأساسي يستخدم طول سطر مريحًا وارتفاع سطر واسعًا بما يناسب القراءة العربية الطويلة ومعايير المحاسبة والمراجعة.</p>
      </div>
    </section>`)
};

export const SpacingAndCards = {
  render: () => shell(`
    <div class="grid g3">
      ${['مخاطر مرتفعة','أدلة المراجعة','حالة المعايير'].map((title, index) => `
        <article class="card">
          <div style="font-size:var(--k44-fs-sm);color:var(--k44-muted)">0${index + 1}</div>
          <h3 style="margin-top:8px">${title}</h3>
          <p style="margin-top:8px;color:var(--k44-muted)">بطاقة مرجعية تستخدم شبكة المسافات الموحدة بدل القيم العشوائية.</p>
        </article>`).join('')}
    </div>`)
};

export const StatusAndActions = {
  render: () => shell(`
    <section class="card">
      <h2>الحالات والإجراءات</h2>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
        <span class="badge ok">مكتمل</span>
        <span class="badge warn">يحتاج مراجعة</span>
        <span class="badge danger">مخاطر مرتفعة</span>
        <span class="badge info">معلومة</span>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px">
        <button class="btn primary">اعتماد</button>
        <button class="btn gold">مراجعة المعيار</button>
        <button class="btn ghost">إلغاء</button>
      </div>
    </section>`)
};

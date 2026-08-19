/*
 * KOSIF v38 — بوابة ملايين الكتب (المحاسبة والأعمال)
 * فهرس منسق محلي + بحث حي في عشرات ملايين عناوين Open Library
 * عبر جسر الخادم المؤقت (تخزين 24 ساعة)، مع وصول للقراءة الكاملة
 * حيثما أتاحها أرشيف الإنترنت.
 */
(() => {
  'use strict';
  const V = window.KosifV38; if (!V) return;

  V.registerView({
    id: 'v38-books', title: 'مكتبة الملايين', icon: '📚', order: 970,
    render(sec) {
      sec.innerHTML =
        V.hero('مكتبة ملايين الكتب — المحاسبة والأعمال', 'بوابة بحث مهنية إلى عشرات ملايين العناوين في Open Library (رخصة مفتوحة)، مقيّدة بمواضيع المحاسبة والتدقيق والتمويل والأعمال، مع فهرس مراجع منسق يغطي IFRS/IAS وISA والمراجع السعودية الرسمية والكلاسيكيات العالمية.', [['source', 'Open Library'], ['fact', 'فهرس منسق محلي']]) +
        '<div class="v38-card v38-no-print"><div class="v38-cardh"><h3>بحث الملايين</h3><span class="hint">الكتب تُجلب عبر خادم Kosif مع تخزين مؤقت 24 ساعة</span></div>' +
        '<div class="v38-form-grid">' +
        '<div class="v38-field"><label>ابحث في العناوين والمؤلفين</label><input id="v38-bk-q" placeholder="مثال: forensic accounting، financial statement analysis، IFRS"></div>' +
        '<div class="v38-field"><label>الموضوع</label><select id="v38-bk-subject"><option value="accounting">المحاسبة</option><option value="business">الأعمال</option><option value="audit">التدقيق والمراجعة</option><option value="finance">التمويل</option></select></div>' +
        '</div><div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap"><button class="v38-btn gold" id="v38-bk-go">🔍 ابحث في الملايين</button><button class="v38-btn ghost" id="v38-bk-more">المزيد من النتائج ↘</button></div>' +
        '<div id="v38-bk-status" style="margin-top:10px"></div><div id="v38-bk-results" style="margin-top:12px"></div></div>' +
        '<div class="v38-card"><div class="v38-cardh"><h3>الفهرس المهني المنسق</h3><span class="hint">مراجع مختارة لا يستغني عنها مراجع ومحاسب</span><span class="v38-spacer"></span><span class="v38-badge" id="v38-bk-cat-n">…</span></div>' +
        '<div id="v38-bk-catalog"><div class="v38-loading">تحميل الفهرس…</div></div></div>';

      let lastQuery = null, offset = 0;
      const bookCard = b => '<div class="v38-book">' +
        '<div class="cover">' + (b.cover ? '<img src="' + V.esc(b.cover) + '" alt="غلاف" loading="lazy" onerror="this.remove()">' : '📖') + '</div>' +
        '<b>' + V.esc(b.title || 'بدون عنوان') + '</b>' +
        '<small>' + V.esc((b.authors || []).slice(0, 2).join('، ') || 'مؤلف غير معروف') + '</small>' +
        '<small>' + [b.year ? String(b.year) : '', b.editions ? b.editions + ' طبعة' : '', b.pages ? b.pages + ' ص' : ''].filter(Boolean).join(' · ') + '</small>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:auto">' +
        (b.readUrl ? '<a class="v38-btn sm gold" style="text-decoration:none" target="_blank" rel="noopener" href="' + V.esc(b.readUrl) + '">📖 قراءة</a>' : '') +
        (b.url ? '<a class="v38-btn sm ghost" style="text-decoration:none" target="_blank" rel="noopener" href="' + V.esc(b.url) + '">التفاصيل ↗</a>' : '') +
        '</div></div>';

      async function search(reset) {
        const q = V.$('#v38-bk-q').value.trim();
        if (!q) return V.toast('اكتب كلمات للبحث', 'error');
        if (reset || q !== lastQuery) { offset = 0; lastQuery = q; }
        const st = V.$('#v38-bk-status');
        st.innerHTML = '<div class="v38-loading">بحث في ملايين العناوين عبر خادم Kosif…</div>';
        try {
          const r = await V.api('/api/kosif/v38/books/search?q=' + encodeURIComponent(q) + '&subject=' + V.$('#v38-bk-subject').value + '&limit=24&offset=' + offset);
          st.innerHTML = '<div class="v38-kpis">' + V.kpi('نتائج مطابقة', new Intl.NumberFormat('en-US').format(r.totalMatches), 'في Open Library — ' + V.esc(r.subject), true) + V.kpi('معروضة', String(r.page.offset + 1) + '–' + (r.page.offset + r.page.returned), 'صفحة النتائج الحالية') + V.kpi('قابلة للقراءة كاملة', String(r.books.filter(b => b.readableOnline).length), 'عبر أرشيف الإنترنت') + '</div>';
          const grid = V.$('#v38-bk-results');
          grid.innerHTML = (offset === 0 ? '' : grid.innerHTML) + '<div class="v38-books-grid">' + r.books.map(bookCard).join('') + '</div>' +
            '<div class="v38-note info" style="grid-column:1/-1"><span>📚</span><span>' + V.esc(r.attribution) + '</span></div>';
          offset += r.page.returned;
        } catch (e) { st.innerHTML = '<div class="v38-note danger">' + V.esc(e.message) + '</div>'; }
      }
      V.$('#v38-bk-go').onclick = () => search(true);
      V.$('#v38-bk-more').onclick = () => search(false);
      V.$('#v38-bk-q').addEventListener('keydown', e => { if (e.key === 'Enter') search(true); });

      V.api('/api/kosif/v38/books/catalog').then(c => {
        const cat = c.catalog;
        V.$('#v38-bk-cat-n').textContent = cat.total;
        V.$('#v38-bk-catalog').innerHTML = cat.sections.map(sec2 =>
          '<h4 style="color:var(--v38-navy);margin:14px 0 8px;font-size:14px">' + V.esc(sec2.section) + ' <span class="v38-badge">' + sec2.items.length + '</span></h4>' +
          '<div style="display:flex;flex-wrap:wrap;gap:7px">' + sec2.items.map(it =>
            '<button class="v38-tab-btn" data-v38bkq="' + V.esc(it.title) + '" title="' + V.esc(it.code) + '">' + V.esc(it.title) + '</button>').join('') + '</div>').join('') +
          '<div class="v38-note ok"><span>🎯</span><span>' + V.esc(cat.note) + '</span></div>';
        V.$$('[data-v38bkq]', sec).forEach(b => b.onclick = () => {
          V.$('#v38-bk-q').value = b.dataset.v38bkq;
          V.$('#v38-bk-catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
          search(true);
          V.$('#v38-bk-status').scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }).catch(e => { V.$('#v38-bk-catalog').innerHTML = '<div class="v38-note danger">' + V.esc(e.message) + '</div>'; });
    }
  });
})();

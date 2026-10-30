// Sources & method: every dataset with publisher, licence, dates, resolution, method and limits; references; credit.

import { state } from '../store.js';
import { t, L, registerStrings, fmtDate } from '../i18n.js';
import { esc, icon } from '../ui.js';

registerStrings({
  ar: {
    'sr.credit': 'الإسناد والترخيص',
    'sr.creditBody': 'جُمعت البيانات في الأطلس الأصلي {link} وتُنشر بترخيص CC-BY-4.0، والحدود من Natural Earth وهي ملكية عامة.',
    'sr.asOf': 'وضع النزاعات محدّث حتى {date}.',
    'sr.edition': 'تعيد هذه النسخة تصميم الواجهة فقط، ولا تتحقّق بشكل مستقل من حقول الوضع الحالي.',
    'sr.datasets': 'مجموعات البيانات',
    'sr.publisher': 'الجهة',
    'sr.license': 'الترخيص',
    'sr.published': 'تاريخ النشر',
    'sr.retrieved': 'آخر استرجاع',
    'sr.file': 'الملف',
    'sr.resolution': 'الدقة المكانية',
    'sr.method': 'المنهجية',
    'sr.limits': 'القيود',
    'sr.fields': 'الحقول المستخدمة',
    'sr.primary': 'مصادر أولية موصى بها',
    'sr.open': 'صفحة المصدر',
    'sr.derived': 'محسوب في هذه النسخة',
    'sr.d1': 'التنوّع الديني',
    'sr.d1t': 'مؤشر جيني–سيمبسون على حصص التقاليد الدينية: واحد ناقص مجموع مربّعات الحصص. صفر يعني تقليداً واحداً، وكلما ارتفع زاد التنوّع.',
    'sr.d2': 'الجوار',
    'sr.d2t': 'أقرب نقاط تسمية الدول داخل الإقليم الفرعي نفسه. هذا تقريب للقرب الجغرافي، لا قائمة حدود رسمية.',
    'sr.d3': 'أعداد الارتباط',
    'sr.d3t': 'عدد السجلات المرتبطة بالدولة في هذا الأطلس (نزاعات، روابط، أحداث، موارد). تقيس تغطية الأطلس لا درجة الخطر.',
    'sr.refs': 'المراجع',
    'sr.errata': 'تصحيحات هذه النسخة',
    'sr.errataLede': 'البيانات الأصلية منشورة بترخيص CC-BY-4.0، وهذه هي التغييرات التي أدخلتها هذه النسخة عليها.',
    'sr.uvTitle': 'علامة «لم تتحقّق منها هذه النسخة»',
    'sr.unverified': 'تنقل هذه النسخة الوضع الحالي وأحدث التطوّرات من الأطلس الأصلي (حتى {d}) دون أن تدقّقها بصورة مستقلة مقابل مصادر أولية، وتضع هذه العلامة على كل سجلّ يتضمّن تطوّرات من هذا النوع: في لوحة التفاصيل شارة، وفي الخط الزمني حدّ متقطّع حول نقطة الحدث. عدد السجلات المعلَّمة: {list}.',
    'sr.k.conflict': 'نزاعات', 'sr.k.event': 'أحداث', 'sr.k.choke': 'مضائق وممرات', 'sr.k.country': 'دول',
  },
  en: {
    'sr.credit': 'Credit and licence',
    'sr.creditBody': 'The data was compiled by the original atlas {link} and is published under CC-BY-4.0; borders are from Natural Earth, in the public domain.',
    'sr.asOf': 'Conflict status as of {date}.',
    'sr.edition': 'This edition redesigns the interface only and does not independently verify the current-status fields.',
    'sr.datasets': 'Datasets',
    'sr.publisher': 'Publisher',
    'sr.license': 'Licence',
    'sr.published': 'Published',
    'sr.retrieved': 'Last retrieved',
    'sr.file': 'File',
    'sr.resolution': 'Spatial resolution',
    'sr.method': 'Method',
    'sr.limits': 'Limitations',
    'sr.fields': 'Fields used',
    'sr.primary': 'Recommended primary sources',
    'sr.open': 'Source page',
    'sr.derived': 'Derived in this edition',
    'sr.d1': 'Religious diversity',
    'sr.d1t': 'The Gini–Simpson index over religious-tradition shares: one minus the sum of squared shares. Zero means a single tradition; higher means more diverse.',
    'sr.d2': 'Neighbours',
    'sr.d2t': 'The nearest country label points within the same subregion. A proximity approximation, not an official border list.',
    'sr.d3': 'Linked-record counts',
    'sr.d3t': 'The number of records linked to a state in this atlas (conflicts, ties, events, resources). They measure the atlas’s coverage, not risk.',
    'sr.refs': 'References',
    'sr.errata': 'Corrections in this edition',
    'sr.errataLede': 'The original data is published under CC-BY-4.0; these are the changes this edition made to it.',
    'sr.uvTitle': 'The “not independently verified” mark',
    'sr.unverified': 'This edition carries the current status and recent developments over from the original atlas (as of {d}) without checking them independently against primary sources, and marks every record that includes such developments: a badge in the details panel, a dashed outline around the event’s dot in the timeline. Marked records: {list}.',
    'sr.k.conflict': 'conflicts', 'sr.k.event': 'events', 'sr.k.choke': 'chokepoints', 'sr.k.country': 'states',
  },
});

const ORIGINAL = { url: 'https://claude.ai/artifact/7Y8KPakRKzrUtZYxjCwJai', title: 'الأطلس الجيوسياسي والعرقي الديني العالمي' };
const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? u : null);
const ext = (url, label) => (safeUrl(url)
  ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}${icon('external', 13)}</a>`
  : esc(label));

export function mount(el, DB) {
  const S = DB.sources;
  const ref = (id) => { const r = DB.referenceById.get(id); return r ? ext(r.url, L(r.name)) : esc(id); };
  const row = (k, v) => (v ? `<div><dt>${esc(t(k))}</dt><dd>${v}</dd></div>` : '');

  const card = (d) => `<article class="src-card" aria-labelledby="src-${esc(d.id)}">
      <header class="src-card-h">
        <h4 id="src-${esc(d.id)}">${esc(L(d.title))}</h4>
        <p class="src-pub">${esc(L(d.publisher))}</p>
      </header>
      <dl class="src-meta">
        ${row('sr.license', esc(L(d.license)))}
        ${row('sr.published', esc(fmtDate(d.published)))}
        ${row('sr.retrieved', esc(fmtDate(d.lastRetrieved)))}
        ${row('sr.file', `<span class="num">${esc(d.file)}</span>`)}
      </dl>
      <dl class="src-text">
        ${row('sr.resolution', esc(L(d.resolution)))}
        ${row('sr.method', esc(L(d.methodology)))}
        ${row('sr.limits', esc(L(d.limitations)))}
        ${d.fieldsUsed?.length ? row('sr.fields', `<ul class="src-fields">${d.fieldsUsed.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`) : ''}
        ${d.recommendedPrimary?.length ? row('sr.primary', d.recommendedPrimary.map(ref).join('<span class="src-sep">، </span>')) : ''}
      </dl>
      ${safeUrl(d.url) ? `<a class="src-link" href="${esc(d.url)}" target="_blank" rel="noopener">${esc(t('sr.open'))}${icon('external', 14)}</a>` : ''}
    </article>`;

  const errata = (DB.errata || []).filter((e) => e.applied);
  const uvKinds = ['conflict', 'event', 'choke', 'country'].filter((k) => DB.unverified?.[k]?.size);
  const uvList = uvKinds.map((k) => `${t('sr.k.' + k)} ${DB.unverified[k].size}`).join(state.lang === 'ar' ? '، ' : ', ');
  const link = `<a href="${esc(ORIGINAL.url)}" target="_blank" rel="noopener" lang="ar">«${esc(ORIGINAL.title)}»</a>`;
  el.innerHTML = `<div class="src">
    <p class="src-lede">${esc(L(S.note))}</p>
    <section class="src-credit" aria-labelledby="src-credit-h">
      <h3 class="vw-h3" id="src-credit-h">${esc(t('sr.credit'))}</h3>
      <p>${esc(t('sr.creditBody')).replace('{link}', link)}</p>
      <p>${esc(t('sr.asOf', { date: fmtDate(DB.conflictsAsOf) }))} ${esc(t('sr.edition'))}</p>
    </section>
    ${uvKinds.length ? `<section class="src-uv" aria-labelledby="src-uv-h">
      <h3 class="vw-h3" id="src-uv-h">${icon('info', 15)}${esc(t('sr.uvTitle'))}</h3>
      <p>${esc(t('sr.unverified', { d: fmtDate(DB.conflictsAsOf), list: uvList }))}</p>
    </section>` : ''}
    ${errata.length ? `<section aria-labelledby="src-er-h">
      <h3 class="vw-h3" id="src-er-h">${esc(t('sr.errata'))} <span class="n">${errata.length}</span></h3>
      <p class="vw-note src-er-lede">${esc(t('sr.errataLede'))}</p>
      <dl class="src-derived">${errata.map((e) => `<div><dt>${esc(L(e.where))}</dt><dd>${esc(L(e.what))}</dd></div>`).join('')}</dl>
    </section>` : ''}
    <section aria-labelledby="src-ds-h">
      <h3 class="vw-h3" id="src-ds-h">${esc(t('sr.datasets'))} <span class="n">${S.datasets.length}</span></h3>
      <div class="src-grid">${S.datasets.map(card).join('')}</div>
    </section>
    <section aria-labelledby="src-dv-h">
      <h3 class="vw-h3" id="src-dv-h">${esc(t('sr.derived'))}</h3>
      <dl class="src-derived">
        ${['d1', 'd2', 'd3'].map((k) => `<div><dt>${esc(t('sr.' + k))}</dt><dd>${esc(t(`sr.${k}t`))}</dd></div>`).join('')}
      </dl>
    </section>
    <section aria-labelledby="src-rf-h">
      <h3 class="vw-h3" id="src-rf-h">${esc(t('sr.refs'))} <span class="n">${S.references.length}</span></h3>
      <ul class="src-refs">${S.references.map((r) => `<li><span class="src-ref-n">${ext(r.url, L(r.name))}</span><span class="src-ref-r">${esc(L(r.role))}</span></li>`).join('')}</ul>
    </section>
  </div>`;

  return { update() {}, destroy() {} };
}

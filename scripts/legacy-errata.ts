/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// One-time port of legacy/js/errata.js, kept as the record of what scripts/migrate-errata.ts applied (D4).
// Untyped on purpose: it is the legacy code verbatim, run once.


const swap = (obj, key, from, to) => {
  if (!obj || typeof obj[key] !== 'string' || !obj[key].includes(from)) return false;
  obj[key] = obj[key].replace(from, to);
  return true;
};

export const ERRATA = [
  {
    id: 'shebaa',
    where: { ar: 'نزاع لبنان وإسرائيل — المطالب الإقليمية', en: 'Lebanon–Israel conflict — territorial claims' },
    what: { ar: 'إسرائيل تسيطر على مزارع شبعا منذ 1967 ولم تضمّها في ذلك العام.', en: 'Israel has held the Shebaa Farms since 1967; it did not annex them that year.' },
    apply: (R) => {
      const c = R.cMideast.conflicts.find((x) => x.id === 'lebanon-israel');
      return [swap(c?.territorialClaims, 'en', 'has annexed the Shebaa Farms since 1967', 'has held the Shebaa Farms since 1967'),
        swap(c?.territorialClaims, 'ar', 'وتضمّ مزارع شبعا منذ 1967', 'وتسيطر على مزارع شبعا منذ 1967')];
    },
  },
  {
    id: 'chechen-wars',
    where: { ar: 'المجموعات العرقية — الشيشان', en: 'Ethnic groups — Chechens' },
    what: { ar: 'الحرب الثانية امتدّت من 1999 إلى 2009، لا داخل التسعينيات فقط.', en: 'The second war ran from 1999 to 2009, not only within the 1990s.' },
    apply: (R) => {
      const p = R.ethnic.features.find((f) => f.properties.groupId === 'chechens')?.properties;
      return [swap(p, 'noteEn', 'two wars with Russia in the 1990s', 'two wars with Russia (1994–1996 and 1999–2009)'),
        swap(p, 'noteAr', 'حربين مع روسيا في التسعينيات', 'حربين مع روسيا (1994–1996 و1999–2009)')];
    },
  },
  {
    id: 'zulu-languages',
    where: { ar: 'المجموعات العرقية — الزولو', en: 'Ethnic groups — Zulu' },
    what: { ar: 'لجنوب أفريقيا اثنتا عشرة لغة رسمية منذ إضافة لغة الإشارة عام 2023.', en: 'South Africa has had twelve official languages since sign language was added in 2023.' },
    apply: (R) => {
      const p = R.ethnic.features.find((f) => f.properties.groupId === 'zulu')?.properties;
      return [swap(p, 'noteEn', "one of the country's eleven official languages", "one of the country's twelve official languages"),
        swap(p, 'noteAr', 'اللغات الرسمية الإحدى عشرة', 'اللغات الرسمية الاثنتي عشرة')];
    },
  },
  {
    id: 'halabja-toll',
    where: { ar: 'الخط الزمني — حلبجة وحملة الأنفال', en: 'Timeline — Halabja and the Anfal campaign' },
    what: { ar: 'فُصل عدد ضحايا هجوم حلبجة (نحو 3,200 إلى 5,000) عن حصيلة حملة الأنفال (عشرات الآلاف).', en: 'Separated the Halabja attack toll (about 3,200–5,000) from the Anfal campaign toll (tens of thousands).' },
    apply: (R) => {
      const e = R.timeline.events.find((x) => x.id === 'halabja');
      return [swap(e, 'sumEn', 'within the Anfal campaign, which killed tens of thousands and was later classified',
        'within the Anfal campaign. The attack killed some 3,200–5,000 people; the wider campaign killed tens of thousands and was later classified'),
        swap(e, 'sumAr', 'ضمن حملة الأنفال التي قُتل فيها عشرات الآلاف، وصُنّفت لاحقاً',
          'ضمن حملة الأنفال. قُتل في الهجوم نحو 3,200 إلى 5,000 شخص، وفي الحملة كلها عشرات الآلاف، وصُنّفت الحملة لاحقاً')];
    },
  },
  {
    id: 'gaza-hostages',
    where: { ar: 'الخط الزمني — وقف النار في غزة 2025', en: 'Timeline — Gaza ceasefire 2025' },
    what: { ar: 'أُطلق المحتجزون الأحياء، وسُلّمت الرفات لاحقاً.', en: 'The living hostages were released; remains were returned later.' },
    apply: (R) => {
      const e = R.timeline.events.find((x) => x.id === 'gaza-ceasefire-2025');
      return [swap(e, 'sumEn', 'the remaining Israeli hostages were released', 'the remaining living Israeli hostages were released, with remains returned later'),
        swap(e, 'sumAr', 'وأُطلق المحتجزون الإسرائيليون المتبقّون', 'وأُطلق المحتجزون الإسرائيليون الأحياء المتبقّون، وسُلّمت الرفات لاحقاً')];
    },
  },
  {
    id: 'darfur-genocide',
    where: { ar: 'الخط الزمني — دارفور 2003', en: 'Timeline — Darfur 2003' },
    what: { ar: 'نُسب وصف الإبادة إلى أصحابه: الحكومة الأمريكية والمحكمة الجنائية الدولية، بينما لم تصل لجنة أممية في 2005 إلى هذا الاستنتاج.', en: 'Attributed the genocide finding: the US government and the ICC; a 2005 UN commission did not reach it.' },
    apply: (R) => {
      const e = R.timeline.events.find((x) => x.id === 'darfur-2003');
      return [swap(e, 'sumEn', 'international actors classified the campaign as genocide', 'the US government and the International Criminal Court described the campaign as genocide, while a 2005 UN commission of inquiry did not reach that finding'),
        swap(e, 'sumAr', 'وصنّفت أطراف دولية الحملة إبادة جماعية', 'ووصفت الحكومة الأمريكية والمحكمة الجنائية الدولية الحملة بالإبادة الجماعية، بينما لم تصل لجنة تحقيق أممية في 2005 إلى هذا الاستنتاج')];
    },
  },
  {
    id: 'syunik-attribution',
    where: { ar: 'أرمينيا وأذربيجان — المطالب الإقليمية وملف أرمينيا', en: 'Armenia–Azerbaijan — territorial claims and the Armenia file' },
    what: { ar: 'نُسب وصف «الاحتلال» في سيونيك إلى أرمينيا، وتعترض أذربيجان عليه.', en: 'Attributed the "occupation" in Syunik to Armenia; Azerbaijan rejects the term.' },
    apply: (R) => {
      const c = R.cEurope.conflicts.find((x) => x.id === 'armenia-azerbaijan');
      const arm = R.intel.countries.ARM?.disputes?.[0];
      return [swap(c?.territorialClaims, 'en', "alongside Azerbaijan's occupation since 2021", "alongside what Armenia describes as Azerbaijan's occupation since 2021 (a term Azerbaijan rejects)"),
        swap(c?.territorialClaims, 'ar', 'إضافةً إلى احتلال أذربيجان', 'إضافةً إلى ما تصفه أرمينيا باحتلال أذربيجان (وهو وصف ترفضه أذربيجان)'),
        swap(arm, 'en', 'sections of Syunik occupied since 2021', 'sections of Syunik Armenia says have been occupied since 2021'),
        swap(arm, 'ar', 'ومقاطع من سيونيك محتلّة منذ 2021', 'ومقاطع من سيونيك تقول أرمينيا إنها محتلّة منذ 2021')];
    },
  },
  {
    id: 'iraq-disputes',
    where: { ar: 'ملف العراق — الخلافات الإقليمية', en: 'Iraq file — territorial disputes' },
    what: { ar: 'حُذف سطر عن حلايب والفشقة لا يخصّ العراق.', en: "Removed a line about Hala'ib and al-Fashaga that does not concern Iraq." },
    apply: (R) => {
      const d = R.intel.countries.IRQ?.disputes;
      const i = d ? d.findIndex((x) => /Hala'ib/.test(x.en)) : -1;
      if (i < 0) return [false];
      d.splice(i, 1);
      return [true];
    },
  },
  {
    id: 'brics-indonesia',
    where: { ar: 'التكتلات — بريكس', en: 'Blocs — BRICS' },
    what: { ar: 'أُضيفت إندونيسيا (عضو كامل منذ يناير 2025). عضوية السعودية غير مؤكّدة رسمياً: دُعيت في 2023.', en: "Added Indonesia (full member since January 2025). Saudi Arabia's membership is not formally confirmed: it was invited in 2023." },
    apply: (R) => {
      const b = R.relations.blocs.find((x) => x.id === 'brics');
      if (!b) return [false];
      if (!b.members.includes('IDN')) b.members.push('IDN');
      b.note = { ar: 'عضوية السعودية غير مؤكّدة رسمياً: دُعيت في 2023 ولم تُعلن انضمامها الكامل.', en: 'Saudi Arabia was invited in 2023 and has not formally confirmed full membership.' };
      return [true];
    },
  },
];

const conflictIn = (R, id) => ['cAfrica', 'cAmericas', 'cAsia', 'cEurope', 'cMideast'].map((k) => R[k].conflicts.find((c) => c.id === id)).find(Boolean);

ERRATA.push(
  {
    id: 'arabic-enum-labels',
    where: { ar: 'نصوص عربية في عدّة ملفّات نزاع', en: 'Arabic text in several conflict files' },
    what: { ar: 'استُبدلت رموز تصنيف إنجليزية ظهرت داخل النص العربي بتسمياتها العربية.', en: 'Replaced English classification codes left inside Arabic text with their Arabic labels.' },
    apply: (R) => [
      swap(conflictIn(R, 'rwanda-burundi-great-lakes')?.status, 'ar', 'بوصفه post-conflict', 'بوصفه ملفّ «ما بعد النزاع»'),
      swap(conflictIn(R, 'sri-lanka-tamil')?.dimensionNote, 'ar', 'بوصفه post-conflict', 'بوصفه ملفّ «ما بعد النزاع»'),
      swap(conflictIn(R, 'haiti')?.dimensionNote, 'ar', 'صُنّف state-collapse', 'صُنّف «انهيار دولة»'),
      swap(conflictIn(R, 'xinjiang')?.dimensionNote, 'ar', 'صُنّف severity بقيمة repression لا بقيمة حرب', 'صُنّفت شدّته «قمع دولة» لا «حرباً»'),
      swap(conflictIn(R, 'basque-catalonia')?.status, 'ar', 'يُصنّف هذا السجل كـ political لا كنزاع مسلح', 'يُصنّف هذا السجل ملفّاً سياسياً بلا عنف لا نزاعاً مسلحاً'),
      swap(conflictIn(R, 'northern-ireland')?.status, 'ar', 'ويُصنّف هذا السجل كـ political', 'ويُصنّف هذا السجل ملفّاً سياسياً بلا عنف'),
    ],
  },
  {
    id: 'taiwan-arabic',
    where: { ar: 'مضيق تايوان — الوضع الحالي (العربية)', en: 'Taiwan Strait — current status (Arabic)' },
    what: { ar: '«ضغط رمادي اللون» صار «ضغط المنطقة الرمادية»، و«تحريش» صار «مضايقة».', en: 'Arabic wording fixed: "grey-zone pressure" and "harassment" were mistranslated.' },
    apply: (R) => {
      const s = conflictIn(R, 'taiwan-strait')?.status;
      return [swap(s, 'ar', 'ضغط رمادي اللون متصاعد', 'ضغط متصاعد في «المنطقة الرمادية»'), swap(s, 'ar', 'بحملة تحريش منسّقة', 'بحملة مضايقة منسّقة')];
    },
  },
  {
    id: 'kian-wording',
    where: { ar: 'ترانسنيستريا وكوسوفو (العربية)', en: 'Transnistria and Kosovo (Arabic)' },
    what: { ar: 'استُبدلت كلمة «كيان» بـ«إقليم» لأنها مشحونة سياسياً في العربية.', en: 'Replaced the politically loaded Arabic word for "entity" with "territory".' },
    apply: (R) => {
      const out = [swap(conflictIn(R, 'kosovo-serbia')?.dimensionNote, 'ar', 'حول وضع كيان', 'حول وضع إقليم')];
      const t = conflictIn(R, 'transnistria');
      const fix = (o) => { if (o && typeof o.ar === 'string' && o.ar.includes('كيان')) { o.ar = o.ar.replace(/الكيان/g, 'الإقليم').replace(/كيان/g, 'إقليم'); return true; } return false; };
      if (t) { for (const k of ['dimensionNote', 'history', 'politicalCauses', 'status']) out.push(fix(t[k])); for (const e of t.externalPowers || []) out.push(fix(e.role)); }
      return out;
    },
  },
  {
    id: 'middle-corridor-name',
    where: { ar: 'المضائق — الممر الأوسط', en: 'Chokepoints — Middle Corridor' },
    what: { ar: 'صُحّح الاسم العربي إلى «الممر الأوسط (عبر قزوين)».', en: 'Corrected the Arabic name to «الممر الأوسط (عبر قزوين)».' },
    apply: (R) => { const p = R.choke.points.find((x) => x.id === 'turkish-caspian'); return [swap(p, 'ar', 'ممرّ وسط آسيا الأوسط', 'الممر الأوسط (عبر قزوين)')]; },
  },
  {
    id: 'myanmar-superlative',
    where: { ar: 'الخط الزمني — انقلاب ميانمار', en: 'Timeline — Myanmar coup' },
    what: { ar: 'نُسب وصف «أكثر النزاعات تفتّتاً» إلى المحلّلين.', en: 'Attributed "the world\'s most fragmented conflict" to analysts.' },
    apply: (R) => {
      const e = R.timeline.events.find((x) => x.id === 'myanmar-coup');
      return [swap(e, 'sumEn', "and the world's most fragmented conflict", "and what analysts describe as the world's most fragmented conflict"),
        swap(e, 'sumAr', 'وأكثر النزاعات تفتّتاً في العالم', 'وما يصفه محلّلون بأنه أكثر النزاعات تفتّتاً في العالم')];
    },
  },
  {
    id: 'hpakant-jade',
    where: { ar: 'مواقع الموارد — مناجم هباكانت', en: 'Resource sites — Hpakant mines' },
    what: { ar: 'نوع المورد «يشم» لا «ذهب».', en: 'Resource type is jade, not gold.' },
    apply: (R) => {
      const s = R.resources.sites.find((x) => /Hpakant/.test(x.en));
      if (!s) return [false];
      if (!R.resources.types.some((t) => t.id === 'jade')) R.resources.types.push({ id: 'jade', ar: 'اليشم', en: 'Jade', color: '#4f9a72' });
      s.type = 'jade';
      return [true];
    },
  },
  {
    id: 'confidence-compiled',
    where: { ar: 'إثيوبيا والساحل — درجة التحقّق', en: 'Ethiopia and the Sahel — verification badge' },
    what: { ar: 'خُفّضت إلى «يحتاج تحديثاً» لأن مصدر أحدث تطوّر «تقارير مجمّعة» بلا جهة محدّدة.', en: 'Lowered to "needs update": the latest item cites unnamed "compiled reporting".' },
    apply: (R) => ['ethiopia', 'sahel'].map((id) => { const c = conflictIn(R, id); if (c?.confidence !== 'verified') return false; c.confidence = 'partial'; return true; }),
  },
  {
    id: 'iraq-kurdistan-offtopic',
    where: { ar: 'العراق وإقليم كردستان — أحدث التطوّرات', en: 'Iraq and the Kurdistan Region — latest developments' },
    what: { ar: 'حُذف بند عن زيارة دمشق لا يخصّ ملفّ بغداد وأربيل (وارد في ملفّ سوريا).', en: 'Removed an item about a Damascus visit that belongs to the Syria file, not Baghdad–Erbil.' },
    apply: (R) => {
      const c = conflictIn(R, 'iraq-kurdistan');
      const i = c?.recent?.findIndex((r) => /Damascus/.test(r.en)) ?? -1;
      if (i < 0) return [false];
      c.recent.splice(i, 1);
      return [true];
    },
  },
  {
    id: 'territorial-edges-kind',
    where: { ar: 'شبكة العلاقات — روسيا/أوكرانيا، باكستان/الهند، أرمينيا/أذربيجان', en: 'Relations — Russia/Ukraine, Pakistan/India, Armenia/Azerbaijan' },
    what: { ar: 'خلافات إقليمية لا تستند إلى معاهدة، فلم تعد تُرسم كخطوط التزام رسمي.', en: 'Territorial disputes are not treaty commitments, so they no longer draw as treaty lines.' },
    apply: (R) => [['RUS', 'UKR'], ['PAK', 'IND'], ['ARM', 'AZE']].map(([a, b]) => {
      const e = R.relations.edges.find((x) => x.type === 'territorial' && ((x.a === a && x.b === b) || (x.a === b && x.b === a)));
      if (!e || e.kind !== 'treaty') return false;
      e.kind = 'assessed';
      return true;
    }),
  },
  {
    id: 'sources-path',
    where: { ar: 'سجلّ المصادر', en: 'Source register' },
    what: { ar: 'صُحّح مسار ملفّ النزاعات.', en: 'Corrected the conflicts file path.' },
    apply: (R) => { const d = R.sources.datasets.find((x) => x.id === 'atlas-conflicts'); if (!d || d.file === 'thematic/conflicts/*.json') return [false]; d.file = 'thematic/conflicts/*.json'; return [true]; },
  },
);

/**
 * Records carrying developments dated after this edition's own knowledge (mid-2026), per the content review.
 * The UI marks them "not independently verified by this edition". Their text is the original atlas's.
 */
export const UNVERIFIED = {
  conflict: ['sudan', 'ethiopia', 'sahel', 'drc-east', 'south-sudan', 'venezuela', 'essequibo', 'haiti', 'taiwan-strait', 'south-china-sea',
    'kashmir', 'afghanistan-pakistan', 'myanmar', 'russia-ukraine', 'armenia-azerbaijan', 'israel-palestine', 'iran-us-israel',
    'syria-transition', 'lebanon-israel', 'yemen', 'iraq-kurdistan', 'turkey-kurdish', 'gulf-security'],
  choke: ['hormuz', 'bab-al-mandab', 'taiwan-strait'],
  event: ['islamabad-memorandum', 'sdf-dissolution', 'bab-al-mandab-2026', 'ethiopia-2026', 'gaza-ceasefire-year', 'ethiopia-pretoria',
    'venezuela-intervention', 'pokrovsk', 'aleppo-sdf-deal', 'iran-war-2026', 'afpak-open-war', 'lebanon-war-2026', 'bamako-blockade'],
  country: ['SYR', 'ETH', 'MMR', 'VEN', 'HTI'],
};

/** Apply every correction to the raw data; returns the list with an `applied` flag for the Sources view. */
export function applyErrata(R) {
  return ERRATA.map((e) => {
    let applied = false;
    try { applied = e.apply(R).some(Boolean); } catch (err) { console.warn('[atlas] erratum failed', e.id, err); }
    if (!applied) console.warn('[atlas] erratum not applied (text not found):', e.id);
    return { id: e.id, where: e.where, what: e.what, applied };
  });
}

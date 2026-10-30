// Dossier: the reading panel for whatever is selected (store.state.selection {kind, id}). Owns #dossier only.
// Every kind shares one frame: a fixed header (eyebrow, name, plate, badges, actions), tabs, and a scrolling body.
// At ≤ 760px base.css makes #dossier a bottom sheet; this module adds the drag handle, half/full snap and swipe-down to close.

import * as store from './store.js';
import { state } from './store.js';
import { t, L, Lk, registerStrings, fmtNum, fmtPct, fmtCompact, fmtGdp, fmtDate, isRTL } from './i18n.js';
import { esc, icon, copyText, shareLink, reducedMotion, cssVar, hideTip } from './ui.js';
import { SEVERITY, DIMENSIONS, CONFIDENCE, CHOKE_STATUS, RELIGION_FAMILIES } from './config.js';
import { sevVar, edgeVar, resClassVar, traditionColor } from './palette.js';
import { donut, barList, pips } from './charts.js';

registerStrings({
  ar: {
    'dz.panel': 'لوحة التفاصيل',
    'dz.sections': 'أقسام اللوحة',
    'dz.kind.country': 'دولة',
    'dz.kind.conflict': 'ملف نزاع',
    'dz.kind.group': 'مجموعة عرقية',
    'dz.kind.religion': 'تقليد ديني',
    'dz.kind.choke': 'مضيق وممر بحري',
    'dz.kind.disputed': 'إقليم متنازع عليه',
    'dz.kind.event': 'حدث في الخط الزمني',
    'dz.kind.bloc': 'تكتّل دولي',
    'dz.kind.site': 'موقع مورد',
    'dz.fly': 'أظهِره على الخريطة',
    'dz.copy': 'انسخ رابط هذه الصفحة',
    'dz.copied': 'نُسخ الرابط',
    'dz.copyFail': 'تعذّر نسخ الرابط. انسخه من شريط العنوان.',
    'dz.compare': 'قارنها بدولة أخرى',
    'dz.close': 'أغلق اللوحة',
    'dz.expand': 'وسّع اللوحة',
    'dz.shrink': 'صغّر اللوحة',
    'dz.readMore': 'اقرأ المزيد',
    'dz.readLess': 'اعرض أقل',
    'dz.N': 'شمالاً', 'dz.S': 'جنوباً', 'dz.E': 'شرقاً', 'dz.W': 'غرباً',
    'dz.network': 'افتح شبكة العلاقات',
    'dz.none': 'لا شيء مسجّل في هذه النسخة.',
    'dz.sourceOf': 'المصدر: {s}',
    'dz.kindTreaty': 'بمعاهدة',
    'dz.kindAssessed': 'تقدير تحليلي',

    'dz.t.summary': 'ملخّص', 'dz.t.religion': 'الدين', 'dz.t.peoples': 'الشعوب', 'dz.t.conflicts': 'النزاعات',
    'dz.t.relations': 'العلاقات', 'dz.t.resources': 'الموارد', 'dz.t.history': 'التاريخ',
    'dz.b.worst': 'أشدّ ملفاتها: {s}',
    'dz.b.worstTip': 'أشدّ ملفات النزاع التي هي طرف مباشر فيها',

    'dz.f.pop': 'السكان', 'dz.f.gdp': 'الناتج المحلي الإجمالي', 'dz.f.gdppc': 'نصيب الفرد من الناتج',
    'dz.f.area': 'المساحة', 'dz.f.density': 'الكثافة السكانية', 'dz.f.income': 'فئة الدخل', 'dz.f.economy': 'فئة الاقتصاد',
    'dz.f.type': 'الوضع', 'dz.f.region': 'القارة والإقليم الفرعي', 'dz.f.system': 'نظام الحكم', 'dz.f.langs': 'اللغات',
    'dz.f.areaTip': 'محسوبة من مضلّع Natural Earth بمقياس 1:50m، فهي تقريبية.',
    'dz.f.note': 'السكان والناتج من Natural Earth لسنة الأساس المذكورة بجوار كل رقم.',
    'dz.u.km2': 'كم²', 'dz.u.perKm2': 'نسمة لكل كم²', 'dz.u.usd': '{v} دولار',
    'dz.noIntel': 'ملف معلومات الدول لا يغطّي هذه الدولة في هذه النسخة، لذلك لا يظهر نظام الحكم واللغات والنزاعات الحدودية. الأرقام أعلاه من Natural Earth.',

    'dz.x.title': 'الانكشاف الاستراتيجي',
    'dz.x.conflicts': 'نزاعات هي طرف فيها', 'dz.x.external': 'تدخّلات كقوة خارجية', 'dz.x.ties': 'تحالفات · خصومات',
    'dz.x.blocs': 'تكتّلات', 'dz.x.chokes': 'مضائق على سواحلها', 'dz.x.res': 'سجلات موارد',

    'dz.s.blocs': 'عضوية التكتّلات',
    'dz.s.noBlocs': 'لا عضوية مسجّلة في التكتّلات التي يتتبّعها الأطلس.',
    'dz.s.neighbors': 'قريبة جغرافياً داخل الإقليم الفرعي',
    'dz.s.neighborsNote': 'أقرب الدول بحسب نقاط التسمية على الخريطة، لا قائمة حدود رسمية.',
    'dz.s.separatists': 'حركات انفصالية أو مطالب حكم ذاتي',
    'dz.uv': 'يتضمّن تطوّرات لم تتحقّق منها هذه النسخة',
    'dz.uv.tip': 'الوضع الحالي وأحدث التطوّرات منقولة من الأطلس الأصلي (حتى {d})، ولم تُدقّقها هذه النسخة بصورة مستقلة مقابل مصادر أولية.',
    'dz.s.disputes': 'نزاعات إقليمية وحدودية',
    'dz.s.neDisputed': 'أقاليم متنازع عليها تحت إدارتها (Natural Earth)',
    'dz.s.noneRecorded': 'لا شيء مسجّل في ملف المعلومات.',

    'dz.rel.title': 'التركيب الديني',
    'dz.rel.majority': 'الأغلبية',
    'dz.rel.diversity': 'مؤشر التنوّع',
    'dz.rel.diversityTip': 'احتمال أن ينتمي شخصان يُختاران عشوائياً إلى تقليدين مختلفين. صفر يعني تجانساً تاماً.',
    'dz.rel.source': 'المصدر وسنة التقدير',
    'dz.rel.contested': 'تقدير موضع خلاف: الأرقام الرسمية والتقديرات المستقلة تتباين لهذه الدولة.',
    'dz.rel.note': 'ملاحظة على البيانات',
    'dz.rel.method': 'كيف تُقاس النسب',
    'dz.rel.shares': 'النسب حسب التقليد',
    'dz.rel.none': 'لا يوجد تقدير ديني موثّق لهذه الدولة في هذه النسخة. هذا غياب بيانات لا غياب تعدّد ديني.',

    'dz.p.title': 'مجموعات عرقية مرسومة في الدولة',
    'dz.p.none': 'لا تظهر في هذه الدولة أيّ من المجموعات العرقية المرسومة في هذه النسخة ({n} مجموعة مختارة). هذا غياب بيانات لا غياب تنوّع.',
    'dz.p.family': 'العائلة اللغوية', 'dz.p.lang': 'اللغة',

    'dz.c.party': 'طرف مباشر في',
    'dz.c.external': 'منخرطة كقوة خارجية في',
    'dz.c.noParty': 'ليست طرفاً مباشراً في أيّ من ملفات النزاع المرصودة في هذه النسخة ({n} ملفاً).',
    'dz.c.noExternal': 'لا يسجّل الأطلس لها دوراً كقوة خارجية في هذه الملفات.',

    'dz.r.contested': 'توصيف مختلف عليه',
    'dz.r.contestedTip': 'المحلّلون يختلفون على توصيف هذه العلاقة.',
    'dz.r.weight': 'قوة العلاقة: {n} من 5',
    'dz.r.bilateral': 'خلفية العلاقة الثنائية',
    'dz.r.none': 'لا توجد علاقة ثنائية مرسومة لهذه الدولة في شبكة هذه النسخة ({n} علاقة). عضوية التكتّلات في تبويب الملخّص.',
    'dz.r.hint': 'مرّر المؤشر فوق علاقة لإبراز الدولة الأخرى على الخريطة.',

    'dz.res.entries': 'سجلات الموارد الاستراتيجية',
    'dz.res.rank': 'المرتبة {n} عالمياً',
    'dz.res.sites': 'مواقع على الخريطة',
    'dz.res.chokes': 'مضائق وممرات على سواحلها',
    'dz.res.none': 'لا يوجد سجل موارد استراتيجية لهذه الدولة في هذه النسخة. الملف انتقائي يركّز على الموارد المرتبطة بالنزاع والتنافس، فهذا غياب بيانات لا غياب موارد.',

    'dz.h.title': 'أحداث مرتبطة بالدولة',
    'dz.h.none': 'لا يرتبط بهذه الدولة أيّ حدث في الخط الزمني لهذه النسخة ({n} حدثاً بين {from} و{to}). هذا غياب بيانات لا غياب تاريخ.',

    'dz.cf.t.status': 'الوضع', 'dz.cf.t.parties': 'الأطراف', 'dz.cf.t.roots': 'الجذور', 'dz.cf.t.related': 'مرتبط',
    'dz.cf.asOf': 'الوضع كما هو بتاريخ {d}',
    'dz.cf.started': 'بدأ', 'dz.cf.phase': 'المرحلة الحالية منذ',
    'dz.cf.now': 'الوضع الراهن',
    'dz.cf.recent': 'أحدث التطوّرات',
    'dz.cf.noRecent': 'لا تطوّرات مؤرّخة مسجّلة لهذا الملف في هذه النسخة.',
    'dz.cf.parties': 'أطراف النزاع',
    'dz.cf.externals': 'القوى الخارجية',
    'dz.cf.noExternals': 'لا قوى خارجية مسجّلة لهذا الملف.',
    'dz.cf.countries': 'الدول المعنية',
    'dz.cf.dims': 'أبعاد النزاع',
    'dz.cf.ethno': 'البعد العرقي والديني',
    'dz.cf.noEthno': 'لا يوجد بعد عرقي أو ديني مسجّل لهذا النزاع؛ الانقسام الفاعل فيه من طبيعة أخرى.',
    'dz.cf.history': 'الخلفية التاريخية', 'dz.cf.causes': 'الأسباب السياسية',
    'dz.cf.claims': 'المطالب الإقليمية', 'dz.cf.interests': 'المصالح الاستراتيجية',
    'dz.cf.events': 'أحداث في الخط الزمني', 'dz.cf.chokes': 'مضائق وممرات متأثّرة',
    'dz.cf.resources': 'موارد على المحكّ', 'dz.cf.sources': 'مراجع الملف',
    'dz.cf.noRelated': 'لا روابط مسجّلة لهذا الملف في هذه النسخة.',

    'dz.g.t.overview': 'نظرة عامة', 'dz.g.t.conflicts': 'النزاعات',
    'dz.g.region': 'النطاق', 'dz.g.countries': 'دول الانتشار', 'dz.g.note': 'عن المجموعة',
    'dz.g.conflictsNote': 'ملفات نزاع في دول انتشار المجموعة. وجودها هنا لا يعني بالضرورة أن المجموعة طرف فيها.',
    'dz.g.noConflicts': 'لا ملف نزاع مرصوداً في دول انتشار هذه المجموعة في هذه النسخة.',

    'dz.rl.t.spread': 'الانتشار', 'dz.rl.t.method': 'المنهجية',
    'dz.rl.family': 'العائلة الدينية',
    'dz.rl.majorityIn': 'أغلبية في', 'dz.rl.presentIn': 'حاضر بنسبة 1٪ أو أكثر في',
    'dz.rl.majorityTip': 'عدد الدول المغطّاة التي يكون فيها هذا التقليد الأكبر نسبةً.',
    'dz.rl.states': '{n} دولة',
    'dz.rl.shares': 'نسبة الأتباع حسب الدولة',
    'dz.rl.sharesNote': 'الدول المغطّاة التي يبلغ فيها 1٪ أو أكثر، بحدّ أقصى 25 دولة.',
    'dz.rl.none': 'لا تبلغ نسبته 1٪ في أيّ دولة مغطّاة في هذه النسخة.',
    'dz.rl.coverage': 'التغطية', 'dz.rl.method': 'المنهجية',

    'dz.ch.status': 'الحالة', 'dz.ch.flow': 'تدفّق النفط', 'dz.ch.mbd': 'مليون برميل يومياً', 'dz.ch.year': 'تقدير {y}',
    'dz.ch.noFlow': 'لا يوجد رقم تدفّق نفطي منشور لهذا الممر في هذه النسخة.',
    'dz.ch.width': 'العرض', 'dz.ch.share': 'لماذا يهمّ', 'dz.ch.borders': 'الدول المطلّة',
    'dz.ch.alts': 'البدائل', 'dz.ch.risk': 'المخاطر الحالية', 'dz.ch.conflicts': 'نزاعات مرتبطة',
    'dz.ch.noConflicts': 'لا ملف نزاع مرتبطاً بهذا الممر في هذه النسخة.',

    'dz.d.names': 'الاسم بالعربية والإنجليزية', 'dz.d.admin': 'الإدارة وفق Natural Earth', 'dz.d.claimant': 'تطالب به',
    'dz.d.claimTip': 'مستخرجة من ملاحظة Natural Earth أدناه.',
    'dz.d.multiple': 'عدّة أطراف',
    'dz.d.note': 'ملاحظة Natural Earth', 'dz.d.noteLabel': 'نصّ المصدر بالإنجليزية كما ورد',
    'dz.d.noNote': 'لا ملاحظة في المصدر لهذا الإقليم.',
    'dz.d.caveat': 'طبقة Natural Earth للأقاليم المتنازع عليها ليست شاملة، وهي تصوير كارتوغرافي واحد لا موقف قانوني.',

    'dz.e.cats': 'التصنيف', 'dz.e.summary': 'ماذا حدث', 'dz.e.countries': 'الدول المعنية',
    'dz.e.conflicts': 'ملفات نزاع مرتبطة', 'dz.e.prev': 'الحدث السابق', 'dz.e.next': 'الحدث التالي',
    'dz.e.setYear': 'اضبط الخط الزمني على {y}',
    'dz.e.first': 'هذا أول حدث في الخط الزمني', 'dz.e.last': 'هذا آخر حدث في الخط الزمني',

    'dz.b.kind': 'أساس العضوية', 'dz.b.treaty': 'تكتّل قائم على معاهدة', 'dz.b.assessed': 'تجمّع بتقدير تحليلي',
    'dz.b.members': 'الأعضاء', 'dz.b.membersN': '{n} عضواً',
    'dz.b.edges': 'علاقات مرسومة بين الأعضاء',
    'dz.b.edgesTip': 'علاقات ثنائية في شبكة الأطلس طرفاها عضوان في التكتّل.',

    'dz.st.type': 'المورد', 'dz.st.country': 'الدولة', 'dz.st.note': 'عن الموقع', 'dz.st.record': 'سجل هذا المورد في الدولة',
  },
  en: {
    'dz.panel': 'Details panel',
    'dz.sections': 'Panel sections',
    'dz.kind.country': 'State',
    'dz.kind.conflict': 'Conflict file',
    'dz.kind.group': 'Ethnic group',
    'dz.kind.religion': 'Religious tradition',
    'dz.kind.choke': 'Maritime chokepoint',
    'dz.kind.disputed': 'Disputed territory',
    'dz.kind.event': 'Timeline event',
    'dz.kind.bloc': 'International bloc',
    'dz.kind.site': 'Resource site',
    'dz.fly': 'Show on the map',
    'dz.copy': 'Copy a link to this page',
    'dz.copied': 'Link copied',
    'dz.copyFail': 'The link did not copy. Copy it from the address bar.',
    'dz.compare': 'Compare with another state',
    'dz.close': 'Close the panel',
    'dz.expand': 'Expand the panel',
    'dz.shrink': 'Shrink the panel',
    'dz.readMore': 'Read more',
    'dz.readLess': 'Show less',
    'dz.N': 'N', 'dz.S': 'S', 'dz.E': 'E', 'dz.W': 'W',
    'dz.network': 'Open the relations network',
    'dz.none': 'Nothing recorded in this edition.',
    'dz.sourceOf': 'Source: {s}',
    'dz.kindTreaty': 'Treaty',
    'dz.kindAssessed': 'Assessed',

    'dz.t.summary': 'Summary', 'dz.t.religion': 'Religion', 'dz.t.peoples': 'Peoples', 'dz.t.conflicts': 'Conflicts',
    'dz.t.relations': 'Relations', 'dz.t.resources': 'Resources', 'dz.t.history': 'History',
    'dz.b.worst': 'Most severe file: {s}',
    'dz.b.worstTip': 'The most severe conflict file it is a direct party to',

    'dz.f.pop': 'Population', 'dz.f.gdp': 'GDP', 'dz.f.gdppc': 'GDP per person',
    'dz.f.area': 'Area', 'dz.f.density': 'Population density', 'dz.f.income': 'Income group', 'dz.f.economy': 'Economy class',
    'dz.f.type': 'Status', 'dz.f.region': 'Continent and subregion', 'dz.f.system': 'Political system', 'dz.f.langs': 'Languages',
    'dz.f.areaTip': 'Computed from the Natural Earth 1:50m polygon, so it is approximate.',
    'dz.f.note': 'Population and GDP come from Natural Earth for the baseline year shown next to each figure.',
    'dz.u.km2': 'km²', 'dz.u.perKm2': 'per km²', 'dz.u.usd': '${v}',
    'dz.noIntel': 'The country-intel file does not cover this state in this edition, so its political system, languages and border disputes are not shown. The figures above come from Natural Earth.',

    'dz.x.title': 'Strategic exposure',
    'dz.x.conflicts': 'conflicts it is party to', 'dz.x.external': 'external involvements', 'dz.x.ties': 'alliances · rivalries',
    'dz.x.blocs': 'blocs', 'dz.x.chokes': 'chokepoints on its coasts', 'dz.x.res': 'resource records',

    'dz.s.blocs': 'Bloc membership',
    'dz.s.noBlocs': 'No membership recorded in the blocs this atlas tracks.',
    'dz.s.neighbors': 'Geographically close, same subregion',
    'dz.s.neighborsNote': 'Nearest states by map label point, not an official list of borders.',
    'dz.s.separatists': 'Separatist or autonomy movements',
    'dz.uv': 'Includes developments this edition has not independently verified',
    'dz.uv.tip': 'The current status and recent items come from the original atlas (as of {d}); this edition has not independently checked them against primary sources.',
    'dz.s.disputes': 'Territorial and border disputes',
    'dz.s.neDisputed': 'Disputed areas it administers (Natural Earth)',
    'dz.s.noneRecorded': 'None recorded in the intel file.',

    'dz.rel.title': 'Religious composition',
    'dz.rel.majority': 'Majority',
    'dz.rel.diversity': 'Diversity index',
    'dz.rel.diversityTip': 'The chance that two people chosen at random belong to different traditions. Zero means complete uniformity.',
    'dz.rel.source': 'Source and year',
    'dz.rel.contested': 'Contested estimate: official figures and independent estimates differ for this state.',
    'dz.rel.note': 'Note on the data',
    'dz.rel.method': 'How the shares are measured',
    'dz.rel.shares': 'Shares by tradition',
    'dz.rel.none': 'There is no documented religious estimate for this state in this edition. This is an absence of data, not an absence of religious diversity.',

    'dz.p.title': 'Ethnic groups mapped in this state',
    'dz.p.none': 'None of the {n} selected ethnic groups in this edition is mapped in this state. This is an absence of data, not an absence of diversity.',
    'dz.p.family': 'Language family', 'dz.p.lang': 'Language',

    'dz.c.party': 'Direct party to',
    'dz.c.external': 'Involved as an external power in',
    'dz.c.noParty': 'Not a direct party to any of the {n} conflict files tracked in this edition.',
    'dz.c.noExternal': 'The atlas records no external-power role for it in these files.',

    'dz.r.contested': 'Disputed reading',
    'dz.r.contestedTip': 'Analysts disagree on how to characterise this relationship.',
    'dz.r.weight': 'Strength: {n} of 5',
    'dz.r.bilateral': 'Background to the relationship',
    'dz.r.none': "No bilateral link is drawn for this state in this edition's network ({n} links). Bloc membership is in the Summary tab.",
    'dz.r.hint': 'Point at a link to highlight the other state on the map.',

    'dz.res.entries': 'Strategic resource records',
    'dz.res.rank': 'World rank {n}',
    'dz.res.sites': 'Sites on the map',
    'dz.res.chokes': 'Chokepoints on its coasts',
    'dz.res.none': 'There is no strategic-resource record for this state in this edition. The file is selective, focused on resources tied to conflict and competition, so this is an absence of data, not of resources.',

    'dz.h.title': 'Events involving this state',
    'dz.h.none': 'No timeline event in this edition ({n} events, {from}–{to}) is tied to this state. This is an absence of data, not of history.',

    'dz.cf.t.status': 'Status', 'dz.cf.t.parties': 'Parties', 'dz.cf.t.roots': 'Roots', 'dz.cf.t.related': 'Related',
    'dz.cf.asOf': 'Status as of {d}',
    'dz.cf.started': 'Began', 'dz.cf.phase': 'Current phase since',
    'dz.cf.now': 'Current situation',
    'dz.cf.recent': 'Latest developments',
    'dz.cf.noRecent': 'No dated developments are recorded for this file in this edition.',
    'dz.cf.parties': 'Parties to the conflict',
    'dz.cf.externals': 'External powers',
    'dz.cf.noExternals': 'No external powers are recorded for this file.',
    'dz.cf.countries': 'States involved',
    'dz.cf.dims': 'Dimensions',
    'dz.cf.ethno': 'Ethnic and religious dimension',
    'dz.cf.noEthno': 'No ethnic or religious dimension is recorded for this conflict; its operative divide is of another kind.',
    'dz.cf.history': 'Historical background', 'dz.cf.causes': 'Political causes',
    'dz.cf.claims': 'Territorial claims', 'dz.cf.interests': 'Strategic interests',
    'dz.cf.events': 'Timeline events', 'dz.cf.chokes': 'Chokepoints affected',
    'dz.cf.resources': 'Resources at stake', 'dz.cf.sources': 'References for this file',
    'dz.cf.noRelated': 'No links are recorded for this file in this edition.',

    'dz.g.t.overview': 'Overview', 'dz.g.t.conflicts': 'Conflicts',
    'dz.g.region': 'Area', 'dz.g.countries': 'States where present', 'dz.g.note': 'About the group',
    'dz.g.conflictsNote': 'Conflict files in the states where the group lives. Being listed here does not mean the group is a party.',
    'dz.g.noConflicts': 'No tracked conflict file in the states where this group lives, in this edition.',

    'dz.rl.t.spread': 'Where it is', 'dz.rl.t.method': 'Method',
    'dz.rl.family': 'Religious family',
    'dz.rl.majorityIn': 'Majority in', 'dz.rl.presentIn': 'At 1% or more in',
    'dz.rl.majorityTip': 'Covered states where this tradition has the largest share.',
    'dz.rl.states': '{n} states',
    'dz.rl.shares': 'Share of followers by state',
    'dz.rl.sharesNote': 'Covered states where it is 1% or more, up to 25 states.',
    'dz.rl.none': 'It does not reach 1% in any covered state in this edition.',
    'dz.rl.coverage': 'Coverage', 'dz.rl.method': 'Method',

    'dz.ch.status': 'Status', 'dz.ch.flow': 'Oil flow', 'dz.ch.mbd': 'million barrels a day', 'dz.ch.year': '{y} estimate',
    'dz.ch.noFlow': 'No published oil-flow figure for this passage in this edition.',
    'dz.ch.width': 'Width', 'dz.ch.share': 'Why it matters', 'dz.ch.borders': 'Bordering states',
    'dz.ch.alts': 'Alternatives', 'dz.ch.risk': 'Current risk', 'dz.ch.conflicts': 'Related conflicts',
    'dz.ch.noConflicts': 'No conflict file is tied to this passage in this edition.',

    'dz.d.names': 'Name in Arabic and English', 'dz.d.admin': 'Administration per Natural Earth', 'dz.d.claimant': 'Claimed by',
    'dz.d.claimTip': 'Taken from the Natural Earth note below.',
    'dz.d.multiple': 'Several parties',
    'dz.d.note': 'Natural Earth note', 'dz.d.noteLabel': 'Source text, as published',
    'dz.d.noNote': 'The source has no note for this territory.',
    'dz.d.caveat': "Natural Earth's disputed-areas layer is not exhaustive; it is one cartographic depiction, not a legal position.",

    'dz.e.cats': 'Category', 'dz.e.summary': 'What happened', 'dz.e.countries': 'States involved',
    'dz.e.conflicts': 'Related conflict files', 'dz.e.prev': 'Previous event', 'dz.e.next': 'Next event',
    'dz.e.setYear': 'Set the timeline to {y}',
    'dz.e.first': 'This is the first event on the timeline', 'dz.e.last': 'This is the last event on the timeline',

    'dz.b.kind': 'Basis', 'dz.b.treaty': 'Treaty-based bloc', 'dz.b.assessed': 'Assessed grouping',
    'dz.b.members': 'Members', 'dz.b.membersN': '{n} members',
    'dz.b.edges': 'Links drawn between members',
    'dz.b.edgesTip': "Bilateral links in the atlas network whose two ends are both members.",

    'dz.st.type': 'Resource', 'dz.st.country': 'State', 'dz.st.note': 'About the site', 'dz.st.record': "This resource in the state's record",
  },
});

// Natural Earth enumerations (English in the source) → [ar, en].
const NE = {
  'Africa': ['أفريقيا', 'Africa'], 'Asia': ['آسيا', 'Asia'], 'Europe': ['أوروبا', 'Europe'], 'Oceania': ['أوقيانوسيا', 'Oceania'],
  'North America': ['أمريكا الشمالية', 'North America'], 'South America': ['أمريكا الجنوبية', 'South America'],
  'Antarctica': ['القارة القطبية الجنوبية', 'Antarctica'], 'Seven seas (open ocean)': ['البحار المفتوحة', 'Open ocean'],
  'Eastern Africa': ['شرق أفريقيا', 'Eastern Africa'], 'Western Africa': ['غرب أفريقيا', 'Western Africa'],
  'Northern Africa': ['شمال أفريقيا', 'Northern Africa'], 'Southern Africa': ['الجنوب الأفريقي', 'Southern Africa'],
  'Middle Africa': ['وسط أفريقيا', 'Middle Africa'], 'Western Asia': ['غرب آسيا', 'Western Asia'],
  'Central Asia': ['آسيا الوسطى', 'Central Asia'], 'Southern Asia': ['جنوب آسيا', 'Southern Asia'],
  'Eastern Asia': ['شرق آسيا', 'Eastern Asia'], 'South-Eastern Asia': ['جنوب شرق آسيا', 'South-Eastern Asia'],
  'Northern Europe': ['شمال أوروبا', 'Northern Europe'], 'Southern Europe': ['جنوب أوروبا', 'Southern Europe'],
  'Eastern Europe': ['شرق أوروبا', 'Eastern Europe'], 'Western Europe': ['غرب أوروبا', 'Western Europe'],
  'Northern America': ['أمريكا الشمالية', 'Northern America'], 'Central America': ['أمريكا الوسطى', 'Central America'],
  'Caribbean': ['الكاريبي', 'Caribbean'], 'Australia and New Zealand': ['أستراليا ونيوزيلندا', 'Australia and New Zealand'],
  'Melanesia': ['ميلانيزيا', 'Melanesia'], 'Micronesia': ['ميكرونيزيا', 'Micronesia'], 'Polynesia': ['بولينيزيا', 'Polynesia'],
  '1. High income: OECD': ['دخل مرتفع، عضو في منظمة التعاون الاقتصادي والتنمية', 'High income, OECD member'],
  '2. High income: nonOECD': ['دخل مرتفع، خارج منظمة التعاون الاقتصادي والتنمية', 'High income, outside the OECD'],
  '3. Upper middle income': ['دخل متوسط أعلى', 'Upper middle income'],
  '4. Lower middle income': ['دخل متوسط أدنى', 'Lower middle income'],
  '5. Low income': ['دخل منخفض', 'Low income'],
  '1. Developed region: G7': ['متقدّم، من مجموعة السبع', 'Developed, G7'],
  '2. Developed region: nonG7': ['متقدّم، خارج مجموعة السبع', 'Developed, outside the G7'],
  '3. Emerging region: BRIC': ['ناشئ، من مجموعة بريك', 'Emerging, BRIC'],
  '4. Emerging region: MIKT': ['ناشئ، من مجموعة ميكت', 'Emerging, MIKT'],
  '5. Emerging region: G20': ['ناشئ، من مجموعة العشرين', 'Emerging, G20'],
  '6. Developing region': ['نامٍ', 'Developing'],
  '7. Least developed region': ['الأقل نمواً', 'Least developed'],
  'Sovereign country': ['دولة ذات سيادة', 'Sovereign state'], 'Country': ['دولة ضمن كيان سيادي', 'Country within a sovereign state'],
  'Dependency': ['إقليم تابع', 'Dependency'], 'Disputed': ['متنازع عليه', 'Disputed'],
  'Indeterminate': ['وضع غير محسوم', 'Indeterminate'], 'Sovereignty': ['كيان سيادي', 'Sovereignty'],
};
// Ethnic language families (ids in ethnic_groups.json).
const FAMILY = {
  semitic: ['سامية', 'Semitic'], iranian: ['إيرانية', 'Iranian'], turkic: ['تركية', 'Turkic'], 'indo-european': ['هندية أوروبية', 'Indo-European'],
  kartvelian: ['كارتفيلية', 'Kartvelian'], caucasian: ['قوقازية', 'Caucasian'], slavic: ['سلافية', 'Slavic'],
  'sino-tibetan': ['صينية تبتية', 'Sino-Tibetan'], mongolic: ['مغولية', 'Mongolic'], 'indo-aryan': ['هندية آرية', 'Indo-Aryan'],
  dravidian: ['درافيدية', 'Dravidian'], bantu: ['بانتو', 'Bantu'], cushitic: ['كوشية', 'Cushitic'], berber: ['أمازيغية', 'Berber (Amazigh)'],
  'niger-congo': ['نيجرية كونغولية', 'Niger–Congo'], chadic: ['تشادية', 'Chadic'], isolate: ['لغة معزولة', 'Language isolate'],
  romance: ['رومانسية', 'Romance'], celtic: ['كلتية', 'Celtic'],
};
const pick = (pair, raw) => (pair ? pair[state.lang === 'ar' ? 0 : 1] : raw);
const ne = (v) => (v ? pick(NE[v], String(v).replace(/^\d+\.\s*/, '')) : '—');
const famName = (f) => pick(FAMILY[f], f || '—');

const KIND_ICON = { country: 'globe', conflict: 'flame', group: 'people', religion: 'pie', choke: 'anchor', disputed: 'hatch', event: 'clock', bloc: 'network', site: 'gem' };
// Lens a selection kind belongs to (SPEC); country keeps the current lens.
const LENS_OF = { conflict: 'conflicts', group: 'ethnic', religion: 'religion', choke: 'chokepoints', disputed: 'disputed', event: 'history', bloc: 'powers', site: 'resources' };
const SEV = Object.fromEntries(SEVERITY.map((s) => [s.id, s]));

// Severity marker shapes (config SEVERITY[].shape), drawn in the severity token.
const SHAPES = {
  pulse: '<circle cx="7" cy="7" r="3.2" fill="currentColor"/><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".55"/>',
  disc: '<circle cx="7" cy="7" r="5" fill="currentColor"/>',
  square: '<rect x="2.5" y="2.5" width="9" height="9" rx="1" fill="currentColor"/>',
  ring: '<circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  diamond: '<path d="M7 1.4L12.6 7 7 12.6 1.4 7z" fill="currentColor"/>',
  dashed: '<circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.4 1.8"/>',
  dot: '<circle cx="7" cy="7" r="3" fill="currentColor"/>',
  hollow: '<circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.3"/>',
};
// Edge kinds mirror the network drawing: treaty = solid line, assessed = dashed.
const LINE = (dash) => `<svg class="dz-line" width="16" height="6" viewBox="0 0 16 6" aria-hidden="true"><path d="M1 3h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"${dash ? ' stroke-dasharray="2.5 3"' : ''}/></svg>`;

let DB = null;
let el = null;
let body = null;
let curTabs = [];
let curTab = null;
const tabMem = {};
let opener = null;
let leaveTimer = 0;
let kbd = false;
let hlKey = null;
let drag = null;
let suppressClick = false;
let uid = 0;

/* ---------------- small builders (all return HTML strings; every data string is escaped) ---------------- */

const tip = (html) => `data-tip="${esc(html)}"`;
const hl = (isos) => (isos && isos.length ? `data-hl="${esc(isos.join(' '))}"` : '');
const selAttrs = (kind, id) => `data-sel-kind="${esc(kind)}" data-sel-id="${esc(id)}"`;
const sw = (color) => `<i class="sw" style="background:${color}"></i>`;
const dataColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : 'var(--cat-0)');
const listJoin = (arr) => (arr || []).join(state.lang === 'ar' ? '، ' : ', ');
const byName = (a, b) => a.localeCompare(b, state.lang);
const nameC = (iso) => { const c = DB.countries.get(iso); return c ? Lk(c, 'name') : iso; };
const tradName = (tid) => L(DB.religion.traditionById.get(tid)) || tid;
const resTypeName = (id) => L(DB.resources.typeById.get(id)) || id;
const resColor = (type) => resClassVar(DB.resources.classOf[type]);

function sevGlyph(id, size = 14) {
  return `<svg class="dz-glyph" width="${size}" height="${size}" viewBox="0 0 14 14" aria-hidden="true" style="color:${sevVar(id)}">${SHAPES[SEV[id]?.shape] || SHAPES.dot}</svg>`;
}
function sevPill(id, text) {
  return `<span class="pill dz-pill">${sevGlyph(id, 12)}${esc(text ?? L(SEV[id]))}</span>`;
}
function confPill(cf) {
  const c = CONFIDENCE[cf.confidence];
  if (!c) return '';
  return `<span class="pill ${c.tone}" tabindex="0" ${tip(esc(L(c.note)))}>${icon(c.tone === 'good' ? 'check' : 'alert', 13)}${esc(L(c))}<span class="vh">: ${esc(L(c.note))}</span></span>`;
}
/** Badge for items whose status/recent text comes from the original atlas and was not re-checked in this edition. */
function unverifiedPill(kind, id) {
  if (!DB.isUnverified?.(kind, id)) return '';
  const why = t('dz.uv.tip', { d: fmtDate(DB.conflictsAsOf) });
  return `<span class="pill dz-pill dz-uv" tabindex="0" ${tip(esc(why))}>${icon('info', 13)}${esc(t('dz.uv'))}<span class="vh">: ${esc(why)}</span></span>`;
}
function chokePill(p) {
  const s = CHOKE_STATUS[p.status];
  if (!s) return '';
  return `<span class="pill ${s.tone}">${icon(s.tone === 'good' ? 'check' : 'alert', 13)}${esc(L(s))}</span>`;
}
function kindPill(kind) {
  const d = DB.relations.edgeKinds?.[kind];
  const label = t(kind === 'treaty' ? 'dz.kindTreaty' : 'dz.kindAssessed');
  return `<span class="pill dz-pill" ${d ? tip(esc(L(d))) : ''}>${LINE(kind !== 'treaty')}${esc(label)}</span>`;
}

function coord(ll) {
  if (!ll || ll[0] == null || ll[1] == null || Number.isNaN(+ll[0])) return '';
  const [lon, lat] = ll;
  return `<span class="dz-coord"><bdi class="data">${fmtNum(Math.abs(lat), 2)}°</bdi> ${esc(t(lat >= 0 ? 'dz.N' : 'dz.S'))} <bdi class="data">${fmtNum(Math.abs(lon), 2)}°</bdi> ${esc(t(lon >= 0 ? 'dz.E' : 'dz.W'))}</span>`;
}
/** "34.3 مليون" → number in the data face, unit word in the UI face. */
function numUnit(str) {
  const m = String(str).match(/^(\$?[−\-]?[\d.,]+)\s*(.*)$/);
  return m ? `<span class="data">${esc(m[1])}</span>${m[2] ? ` <span class="dz-unit">${esc(m[2])}</span>` : ''}` : esc(str);
}

function cchip(iso) {
  const c = DB.countries.get(iso);
  if (!c) return `<span class="chip dz-chip is-static">${esc(iso)}</span>`;
  return `<button type="button" class="chip dz-chip" ${selAttrs('country', iso)} ${hl([iso])}>${esc(Lk(c, 'name'))}</button>`;
}
function cchips(isos, { sort = false } = {}) {
  let list = [...new Set(isos || [])];
  if (sort) list = list.sort((a, b) => byName(nameC(a), nameC(b)));
  return list.length ? `<div class="chips dz-chips">${list.map(cchip).join('')}</div>` : '';
}
function kchip(kind, id, label, { lead = '', isos } = {}) {
  return `<button type="button" class="chip dz-chip" ${selAttrs(kind, id)} ${hl(isos)}>${lead}${esc(label)}</button>`;
}

function sec(title, inner, { count, id, cls = '', lead = '' } = {}) {
  if (!inner) return '';
  return `<section class="dz-sec ${cls}"${id ? ` id="dz-a-${id}"` : ''}>
    ${title ? `<h3 class="dz-h">${lead}<span>${esc(title)}</span>${count != null ? `<span class="n">${fmtNum(count)}</span>` : ''}</h3>` : ''}
    ${inner}</section>`;
}
function prose(text, { clamp = true, cls = '', lang } = {}) {
  const s = String(text ?? '').trim();
  if (!s) return '';
  const la = lang ? ` lang="${lang}" dir="auto"` : '';
  if (!clamp || s.length < 170) return `<p class="dz-prose ${cls}"${la}>${esc(s)}</p>`;
  const id = `dz-p${++uid}`;
  return `<p class="dz-prose dz-clamp ${cls}" id="${id}"${la}>${esc(s)}</p>
    <button type="button" class="dz-more" data-act="more" aria-controls="${id}" aria-expanded="false"><span>${esc(t('dz.readMore'))}</span>${icon('chevron', 14)}</button>`;
}
const empty = (msg) => `<p class="dz-empty">${icon('info', 16)}<span>${esc(msg)}</span></p>`;
const caveat = (msg) => (msg ? `<p class="caveat dz-caveat">${icon('alert', 16)}<span>${esc(msg)}</span></p>` : '');
const note = (msg) => (msg ? `<p class="dz-note">${esc(msg)}</p>` : '');
const bullets = (items) => (items.length ? `<ul class="dz-list">${items.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '');
const rows = (items) => (items.length ? `<ul class="dz-rows" role="list">${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '');

function fact(label, valueHtml, { year, wide = false, text = false, tipText } = {}) {
  return `<div class="dz-fact${wide ? ' wide' : ''}${text ? ' text' : ''}">
    <dt${tipText ? ` ${tip(esc(tipText))} tabindex="0"` : ''}>${esc(label)}${tipText ? icon('info', 12) : ''}</dt>
    <dd>${valueHtml}${year ? `<span class="dz-yr data">${esc(year)}</span>` : ''}</dd></div>`;
}
const facts = (items) => `<dl class="dz-facts">${items.filter(Boolean).join('')}</dl>`;

/** Generic clickable row: glyph | title | meta, then a sub line. title/meta/sub are HTML. */
function rowBtn({ kind, id, isos, glyph = '', title, meta = '', sub = '', lines = 1 }) {
  return `<button type="button" class="dz-row" ${selAttrs(kind, id)} ${hl(isos)}>
    <span class="dz-row-g">${glyph}</span>
    <span class="dz-row-t">${title}</span>
    ${meta ? `<span class="dz-row-m">${meta}</span>` : ''}
    ${sub ? `<span class="dz-row-s${lines === 2 ? ' l2' : ''}">${sub}</span>` : ''}
  </button>`;
}
function conflictRow(cf, { sub, meta } = {}) {
  return rowBtn({
    kind: 'conflict', id: cf.id, isos: cf.countries, glyph: sevGlyph(cf.severity),
    title: esc(L(cf.name)),
    meta: meta ?? (cf.startYear ? `<span class="data">${esc(cf.startYear)}</span>` : ''),
    sub: sub ?? `<span class="dz-sevlab">${esc(L(SEV[cf.severity]))}</span><span class="dz-one">${esc(L(cf.status))}</span>`,
    lines: sub ? 2 : 1,
  });
}
function chokeRow(p) {
  return rowBtn({ kind: 'choke', id: p.id, isos: p.borderStates, glyph: icon('anchor', 15), title: esc(L(p)), meta: chokePill(p), sub: `<span class="dz-one">${esc(Lk(p, 'risk'))}</span>` });
}
function siteRow(s) {
  return rowBtn({ kind: 'site', id: s.id, isos: [s.iso3], glyph: sw(resColor(s.type)), title: esc(L(s)), meta: `<span class="dz-meta-t">${esc(resTypeName(s.type))}</span>`, sub: `<span class="dz-one">${esc(Lk(s, 'note'))}</span>` });
}
function groupRow(g) {
  return rowBtn({
    kind: 'group', id: g.id, isos: g.countries, glyph: icon('people', 15), title: esc(Lk(g, 'name')),
    meta: `<span class="dz-meta-t">${esc(famName(g.family))}</span>`,
    sub: `<span class="dz-sub-k">${esc(Lk(g, 'lang'))}</span> ${esc(Lk(g, 'note'))}`, lines: 2,
  });
}
function catTag(cid) {
  const c = DB.timeline.catById.get(cid);
  return c ? `<span class="dz-cat">${sw(dataColor(c.color))}${esc(L(c))}</span>` : '';
}
function eventList(events, { cats = true } = {}) {
  if (!events.length) return '';
  return `<ol class="dz-tl" role="list">${events.map((e) => `<li>
    <button type="button" class="dz-tl-item" ${selAttrs('event', e.id)} ${hl(e.countries)}>
      <span class="dz-date">${esc(fmtDate(e.date))}</span>
      <span class="dz-tl-t">${esc(L(e))}</span>
      ${cats && e.cat?.length ? `<span class="dz-cats">${e.cat.map(catTag).join('')}</span>` : ''}
    </button></li>`).join('')}</ol>`;
}
function resourceEntry(e, { country = false } = {}) {
  const conf = (e.conflictIds || []).map((id) => DB.conflictById.get(id)).filter(Boolean);
  return `<div class="dz-res" ${hl([e.iso3])}>
    <div class="dz-res-h">${sw(resColor(e.type))}<b>${esc(resTypeName(e.type))}</b>
      ${country ? cchip(e.iso3) : ''}
      ${e.rank ? `<span class="pill dz-pill">${esc(t('dz.res.rank', { n: e.rank }))}</span>` : ''}
      <span class="dz-res-m"><span class="data">${esc(e.year ?? '')}</span>${e.source ? ` · ${esc(srcName(e.source))}` : ''}</span></div>
    ${prose(L(e), { cls: 'sm' })}
    ${conf.length ? `<div class="chips dz-chips">${conf.map((c) => kchip('conflict', c.id, L(c.name), { lead: sevGlyph(c.severity, 11), isos: c.countries })).join('')}</div>` : ''}
  </div>`;
}

function srcName(id) {
  const r = DB.referenceById.get(id);
  if (r) return L(r.name);
  const d = DB.datasetById.get(id);
  return d ? L(d.title) : id;
}
function refItem(id) {
  const r = DB.referenceById.get(id), d = r ? null : DB.datasetById.get(id);
  const name = srcName(id), url = (r || d)?.url;
  const role = r ? L(r.role) : d ? d.publisher : '';
  const link = url && /^https?:\/\//i.test(url)
    ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}${icon('external', 13)}</a>`
    : `<span>${esc(name)}</span>`;
  return `<li>${link}${role ? `<span class="dz-ref-r">${esc(role)}</span>` : ''}</li>`;
}

function altName(x) {
  if (x.nameAr) return state.lang === 'ar' ? x.nameEn : x.nameAr;
  if (x.name && typeof x.name === 'object') return state.lang === 'ar' ? x.name.en : x.name.ar;
  return state.lang === 'ar' ? x.en : x.ar;
}
const altSpan = (x) => { const a = altName(x); return a ? `<bdi class="dz-alt" lang="${state.lang === 'ar' ? 'en' : 'ar'}">${esc(a)}</bdi>` : ''; };

/* ---------------- kinds: head() → header model, tabs() → [{id, label, count?, render}] ---------------- */

const KINDS = {
  country: {
    head(c) {
      const worst = c.conflicts.map((id) => DB.conflictById.get(id)).filter(Boolean).sort((a, b) => b.rank - a.rank)[0];
      const badges = [];
      if (worst) badges.push(`<span class="pill dz-pill" ${tip(esc(t('dz.b.worstTip')))}>${sevGlyph(worst.severity, 12)}${esc(t('dz.b.worst', { s: L(SEV[worst.severity]) }))}</span>`);
      if (c.religion?.majority) badges.push(`<span class="pill dz-pill">${sw(traditionColor(c.religion.majority))}${esc(tradName(c.religion.majority))} <span class="data">${esc(fmtPct(c.religion.majorityShare))}</span></span>`);
      if (c.type && c.type !== 'Sovereign country') badges.push(`<span class="pill">${esc(ne(c.type))}</span>`);
      badges.push(unverifiedPill('country', c.iso3));
      return { region: ne(c.subregion), title: Lk(c, 'name'), plate: [altSpan(c), `<span class="data">${esc(c.iso3)}</span>`, coord([c.lon, c.lat])], badges: badges.join('') };
    },
    tabs(c) {
      return [
        { id: 'summary', label: t('dz.t.summary'), render: () => countrySummary(c) },
        { id: 'religion', label: t('dz.t.religion'), count: c.religion ? null : 0, render: () => countryReligion(c) },
        { id: 'peoples', label: t('dz.t.peoples'), count: c.groups.length, render: () => countryPeoples(c) },
        { id: 'conflicts', label: t('dz.t.conflicts'), count: new Set([...c.conflicts, ...c.external]).size, render: () => countryConflicts(c) },
        { id: 'relations', label: t('dz.t.relations'), count: c.edges.length, render: () => countryRelations(c) },
        { id: 'resources', label: t('dz.t.resources'), count: c.resources.length + c.sites.length + c.chokepoints.length, render: () => countryResources(c) },
        { id: 'history', label: t('dz.t.history'), count: c.events.length, render: () => countryHistory(c) },
      ];
    },
  },

  conflict: {
    head(cf) {
      const plate = [altSpan(cf)];
      if (cf.started) plate.push(`<span>${esc(t('dz.cf.started'))} <bdi class="dz-when">${esc(fmtDate(cf.started))}</bdi></span>`);
      if (cf.currentPhaseStarted) plate.push(`<span>${esc(t('dz.cf.phase'))} <bdi class="dz-when">${esc(fmtDate(cf.currentPhaseStarted))}</bdi></span>`);
      return {
        region: L(cf.regionName), title: L(cf.name), plate,
        badges: sevPill(cf.severity) + confPill(cf),
        // The as-of stamp stays prominent: current-status fields are not independently verified by this edition.
        extra: `<div class="dz-asof-row"><p class="dz-asof">${icon('clock', 14)}<span>${esc(t('dz.cf.asOf', { d: fmtDate(cf.statusAsOf || DB.conflictsAsOf) }))}</span></p>${unverifiedPill('conflict', cf.id)}</div>`,
      };
    },
    tabs(cf) {
      const rel = relatedOf(cf);
      return [
        { id: 'status', label: t('dz.cf.t.status'), render: () => conflictStatus(cf) },
        { id: 'parties', label: t('dz.cf.t.parties'), count: L(cf.parties)?.length || 0, render: () => conflictParties(cf) },
        { id: 'roots', label: t('dz.cf.t.roots'), render: () => conflictRoots(cf) },
        { id: 'related', label: t('dz.cf.t.related'), count: rel.events.length + rel.chokes.length + rel.res.length + rel.refs.length, render: () => conflictRelated(cf, rel) },
      ];
    },
  },

  group: {
    head(g) {
      return { region: Lk(g, 'region'), title: Lk(g, 'name'), plate: [altSpan(g), coord([g.lon, g.lat])], badges: `<span class="pill">${esc(famName(g.family))}</span>` };
    },
    tabs(g) {
      const conf = conflictsIn(g.countries);
      return [
        { id: 'overview', label: t('dz.g.t.overview'), render: () => groupOverview(g) },
        { id: 'conflicts', label: t('dz.g.t.conflicts'), count: conf.length, render: () => groupConflicts(conf) },
      ];
    },
  },

  religion: {
    head(tr, id) {
      const fam = RELIGION_FAMILIES.find((f) => f.id === DB.religion.familyOf[id]);
      const maj = majorityCount(id);
      return {
        region: fam ? L(fam) : '', title: L(tr), plate: [altSpan(tr)],
        badges: `<span class="pill dz-pill">${sw(traditionColor(id))}${esc(t('dz.rl.majorityIn'))} <span class="data">${fmtNum(maj)}</span></span>`,
      };
    },
    tabs(tr, id) {
      return [
        { id: 'spread', label: t('dz.rl.t.spread'), count: sharesOf(id).length, render: () => religionSpread(tr, id) },
        { id: 'method', label: t('dz.rl.t.method'), render: religionMethod },
      ];
    },
  },

  choke: {
    head(p) { return { region: '', title: L(p), plate: [altSpan(p), coord(p.coords)], badges: chokePill(p) + unverifiedPill('choke', p.id) }; },
    tabs(p) { return [{ id: 'main', render: () => chokeBody(p) }]; },
  },

  disputed: {
    head(d) { return { region: ne(d.subregion), title: Lk(d, 'name'), plate: [altSpan(d), coord([d.lon, d.lat])], badges: '' }; },
    tabs(d) { return [{ id: 'main', render: () => disputedBody(d) }]; },
  },

  event: {
    head(e) {
      return { region: e.cat?.[0] ? L(DB.timeline.catById.get(e.cat[0])) : '', title: L(e), plate: [altSpan(e), `<bdi class="dz-when">${esc(fmtDate(e.date))}</bdi>`], badges: unverifiedPill('event', e.id) };
    },
    tabs(e) { return [{ id: 'main', render: () => eventBody(e) }]; },
  },

  bloc: {
    head(b) {
      return { region: t(b.kind === 'treaty' ? 'dz.b.treaty' : 'dz.b.assessed'), title: L(b), plate: [altSpan(b)], badges: `<span class="pill">${esc(t('dz.b.membersN', { n: fmtNum(b.members.length) }))}</span>` };
    },
    tabs(b) { return [{ id: 'main', render: () => blocBody(b) }]; },
  },

  site: {
    head(s) { return { region: resTypeName(s.type), title: L(s), plate: [altSpan(s), coord(s.coords)], badges: '' }; },
    tabs(s) { return [{ id: 'main', render: () => siteBody(s) }]; },
  },
};

/* ---------------- country ---------------- */

function countrySummary(c) {
  const intel = c.intel;
  const money = (v) => numUnit(t('dz.u.usd', { v: fmtNum(v) }));
  const head = facts([
    fact(t('dz.f.pop'), numUnit(fmtCompact(c.pop)), { year: c.popYear }),
    fact(t('dz.f.gdp'), c.gdp ? numUnit(fmtGdp(c.gdp)) : '—', { year: c.gdp ? c.gdpYear : null }),
    fact(t('dz.f.gdppc'), c.gdpPerCap ? money(c.gdpPerCap) : '—', { year: c.gdpPerCap ? c.gdpYear : null }),
    fact(t('dz.f.area'), `<span class="data">${fmtNum(c.areaKm2)}</span> <span class="dz-unit">${esc(t('dz.u.km2'))}</span>`, { tipText: t('dz.f.areaTip') }),
    fact(t('dz.f.density'), c.density ? `<span class="data">${fmtNum(c.density, c.density < 10 ? 1 : 0)}</span> <span class="dz-unit">${esc(t('dz.u.perKm2'))}</span>` : '—'),
    fact(t('dz.f.income'), esc(ne(c.income)), { text: true }),
    fact(t('dz.f.economy'), esc(ne(c.economy)), { text: true }),
    fact(t('dz.f.type'), esc(ne(c.type)), { text: true }),
    fact(t('dz.f.region'), `${esc(ne(c.continent))} · ${esc(ne(c.subregion))}`, { text: true, wide: true }),
    intel?.system ? fact(t('dz.f.system'), esc(L(intel.system)), { text: true, wide: true }) : '',
    intel?.langs ? fact(t('dz.f.langs'), esc(listJoin(L(intel.langs))), { text: true, wide: true }) : '',
  ]);

  const edges = c.edges.map((id) => DB.edgeById.get(id)).filter(Boolean);
  const nAll = edges.filter((e) => e.type === 'alliance').length, nRiv = edges.filter((e) => e.type === 'rivalry').length;
  const blocs = c.blocs.filter((b) => DB.relations.blocById.has(b));
  const cell = (ic, v, label, goto, anchor, zero) => `<button type="button" class="dz-x${zero ? ' is-zero' : ''}" data-act="goto" data-goto="${goto}"${anchor ? ` data-anchor="${anchor}"` : ''}>
      <span class="dz-x-v">${icon(ic, 15)}<span class="data">${v}</span></span><span class="dz-x-l">${esc(label)}</span></button>`;
  const exposure = `<div class="dz-x-grid">
    ${cell('flame', fmtNum(c.conflicts.length), t('dz.x.conflicts'), 'conflicts', '', !c.conflicts.length)}
    ${cell('target', fmtNum(c.external.length), t('dz.x.external'), 'conflicts', 'external', !c.external.length)}
    ${cell('network', `${fmtNum(nAll)}<span class="dz-x-sep">·</span>${fmtNum(nRiv)}`, t('dz.x.ties'), 'relations', '', !(nAll + nRiv))}
    ${cell('layers', fmtNum(blocs.length), t('dz.x.blocs'), 'summary', 'blocs', !blocs.length)}
    ${cell('anchor', fmtNum(c.chokepoints.length), t('dz.x.chokes'), 'resources', 'chokes', !c.chokepoints.length)}
    ${cell('gem', fmtNum(c.resources.length), t('dz.x.res'), 'resources', 'entries', !c.resources.length)}
  </div>`;

  const blocChips = blocs.length
    ? `<div class="chips dz-chips">${blocs.map((id) => { const b = DB.relations.blocById.get(id); return kchip('bloc', id, L(b), { isos: b.members }); }).join('')}</div>`
    : empty(t('dz.s.noBlocs'));
  const neigh = c.neighbors.length ? cchips(c.neighbors) + note(t('dz.s.neighborsNote')) : '';
  const disputedNE = c.disputed.map((id) => DB.disputedById.get(id)).filter(Boolean);

  let intelPart;
  if (intel) {
    const seps = (intel.separatists || []).map(L), disp = (intel.disputes || []).map(L);
    intelPart = sec(t('dz.s.separatists'), seps.length ? bullets(seps) : note(t('dz.s.noneRecorded')))
      + sec(t('dz.s.disputes'), disp.length ? bullets(disp) : note(t('dz.s.noneRecorded')));
  } else {
    intelPart = sec(null, empty(t('dz.noIntel')));
  }

  return sec(null, head + note(t('dz.f.note')), { cls: 'first' })
    + sec(t('dz.x.title'), exposure)
    + sec(t('dz.s.blocs'), blocChips, { id: 'blocs', count: blocs.length })
    + intelPart
    + (disputedNE.length ? sec(t('dz.s.neDisputed'), `<div class="chips dz-chips">${disputedNE.map((d) => kchip('disputed', d.id, Lk(d, 'name'), { lead: icon('hatch', 13) })).join('')}</div>`) : '')
    + sec(t('dz.s.neighbors'), neigh);
}

function countryReligion(c) {
  const r = c.religion;
  if (!r) return sec(null, empty(t('dz.rel.none')), { cls: 'first' }) + sec(t('dz.rel.method'), prose(L(DB.religion.methodNote)));
  const parts = r.sorted.map(([tid, p]) => ({ label: tradName(tid), value: p, color: traditionColor(tid) }));
  const sum = parts.reduce((s, p) => s + p.value, 0);
  const chart = donut(parts, {
    size: 128, thickness: 15, total: Math.max(100, sum), label: t('dz.rel.title'),
    center: esc(fmtPct(r.majorityShare)), sub: esc(tradName(r.majority)),
  });
  const side = facts([
    fact(t('dz.rel.majority'), `${sw(traditionColor(r.majority))}${esc(tradName(r.majority))}`, { text: true, wide: true }),
    fact(t('dz.rel.diversity'), `<span class="data">${fmtNum(r.diversity, 2)}</span>`, { tipText: t('dz.rel.diversityTip'), wide: true }),
    fact(t('dz.rel.source'), esc(srcName(r.source)), { year: r.year, text: true, wide: true }),
  ]);
  const bars = barList(parts.map((p) => ({ ...p, tip: `<b>${esc(p.label)}</b> ${esc(fmtPct(p.value, p.value < 10 ? 1 : 0))}` })), { unit: '%', max: 100 });
  return sec(null, `<div class="dz-donut">${chart}<div class="dz-donut-side">${side}</div></div>`, { cls: 'first' })
    + (r.contested ? sec(null, caveat(t('dz.rel.contested'))) : '')
    + sec(t('dz.rel.shares'), bars, { count: parts.length })
    + (r.note ? sec(t('dz.rel.note'), prose(L(r.note))) : '')
    + sec(t('dz.rel.method'), prose(L(DB.religion.methodNote)));
}

function countryPeoples(c) {
  const gs = c.groups.map((id) => DB.ethnic.groups.get(id)).filter(Boolean);
  const warn = caveat(Lk(DB.ethnic.meta, 'warning'));
  if (!gs.length) return sec(null, empty(t('dz.p.none', { n: fmtNum(DB.stats.groups) })), { cls: 'first' }) + sec(null, warn);
  return sec(t('dz.p.title'), rows(gs.map(groupRow)), { count: gs.length, cls: 'first' }) + sec(null, warn);
}

function countryConflicts(c) {
  const party = c.conflicts.map((id) => DB.conflictById.get(id)).filter(Boolean).sort((a, b) => b.rank - a.rank);
  const ext = [...new Set(c.external)].map((id) => DB.conflictById.get(id)).filter(Boolean).sort((a, b) => b.rank - a.rank);
  const extRows = ext.map((cf) => {
    const ep = (cf.externalPowers || []).find((e) => e.iso3 === c.iso3);
    return conflictRow(cf, {
      meta: ep?.kind ? kindPill(ep.kind) : '',
      sub: `<span class="dz-sevlab">${esc(L(SEV[cf.severity]))}</span>${esc(ep ? L(ep.role) : '')}`,
    });
  });
  return sec(t('dz.c.party'), party.length ? rows(party.map((cf) => conflictRow(cf))) : empty(t('dz.c.noParty', { n: fmtNum(DB.conflicts.length) })), { count: party.length, cls: 'first' })
    + sec(t('dz.c.external'), ext.length ? rows(extRows) : empty(t('dz.c.noExternal')), { count: ext.length, id: 'external' });
}

function countryRelations(c) {
  const iso = c.iso3;
  const edges = c.edges.map((id) => DB.edgeById.get(id)).filter(Boolean);
  const netBtn = `<button type="button" class="btn dz-wide-btn" data-act="network">${icon('network', 16)}<span>${esc(t('dz.network'))}</span></button>`;
  if (!edges.length) return sec(null, empty(t('dz.r.none', { n: fmtNum(DB.relations.edges.length) })) + netBtn, { cls: 'first' });
  const seen = new Set();
  const groups = DB.relations.edgeTypes.map((et) => {
    const list = edges.filter((e) => e.type === et.id).sort((a, b) => (b.weight || 0) - (a.weight || 0));
    if (!list.length) return '';
    const items = list.map((e) => {
      const partner = e.a === iso ? e.b : e.a;
      const bil = !seen.has(partner) ? DB.bilateralFor(iso, partner) : null;
      seen.add(partner);
      return `<div class="dz-rel" ${hl([partner])}>
        <div class="dz-rel-h">${cchip(partner)}${kindPill(e.kind)}
          ${e.contested ? `<span class="pill warn" ${tip(esc(t('dz.r.contestedTip')))}>${icon('alert', 12)}${esc(t('dz.r.contested'))}</span>` : ''}
          ${e.weight ? `<span class="dz-weight" ${tip(esc(t('dz.r.weight', { n: e.weight })))}>${pips(e.weight, 5, edgeVar(e.type))}<span class="vh">${esc(t('dz.r.weight', { n: e.weight }))}</span></span>` : ''}
        </div>
        ${prose(L(e), { clamp: false, cls: 'sm' })}
        ${bil ? `<div class="dz-bi"><p class="dz-bi-h">${esc(t('dz.r.bilateral'))}</p>${prose(L(bil), { cls: 'sm' })}</div>` : ''}
      </div>`;
    });
    return sec(L(et), rows(items), { count: list.length, lead: sw(edgeVar(et.id)) });
  }).join('');
  return sec(null, note(t('dz.r.hint')) + netBtn, { cls: 'first dz-tight' }) + groups;
}

function countryResources(c) {
  const entries = [...c.resources].sort((a, b) => (a.rank || 99) - (b.rank || 99));
  const sites = c.sites.map((id) => DB.siteById.get(id)).filter(Boolean);
  const chokes = c.chokepoints.map((id) => DB.chokeById.get(id)).filter(Boolean);
  if (!entries.length && !sites.length && !chokes.length) return sec(null, empty(t('dz.res.none')), { cls: 'first' });
  return sec(t('dz.res.entries'), entries.length ? rows(entries.map((e) => resourceEntry(e))) : empty(t('dz.res.none')), { id: 'entries', count: entries.length, cls: 'first' })
    + (sites.length ? sec(t('dz.res.sites'), rows(sites.map(siteRow)), { count: sites.length }) : '')
    + (chokes.length ? sec(t('dz.res.chokes'), rows(chokes.map(chokeRow)), { id: 'chokes', count: chokes.length }) : '')
    + (entries.length ? sec(null, note(L(DB.resources.note))) : '');
}

function countryHistory(c) {
  const evs = c.events.map((id) => DB.eventById.get(id)).filter(Boolean);
  if (!evs.length) {
    const [from, to] = DB.timeline.range;
    return sec(null, empty(t('dz.h.none', { n: fmtNum(DB.timeline.events.length), from, to })), { cls: 'first' });
  }
  return sec(t('dz.h.title'), eventList(evs), { count: evs.length, cls: 'first' });
}

/* ---------------- conflict ---------------- */

function relatedOf(cf) {
  return {
    events: (cf.events || []).map((id) => DB.eventById.get(id)).filter(Boolean),
    chokes: (cf.chokepoints || []).map((id) => DB.chokeById.get(id)).filter(Boolean),
    res: DB.resources.entries.filter((e) => (e.conflictIds || []).includes(cf.id)),
    refs: cf.sourceRefs || [],
  };
}

function conflictStatus(cf) {
  const recent = [...(cf.recent || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const list = recent.length
    ? `<ol class="dz-tl dz-tl-static" role="list">${recent.map((r) => `<li><div class="dz-tl-item">
        <span class="dz-date">${esc(fmtDate(r.date))}</span>
        <p class="dz-prose sm">${esc(L(r))}</p>
        ${r.source ? `<span class="dz-src">${esc(t('dz.sourceOf', { s: r.source }))}</span>` : ''}
      </div></li>`).join('')}</ol>`
    : empty(t('dz.cf.noRecent'));
  return sec(t('dz.cf.now'), prose(L(cf.status)), { cls: 'first' })
    + sec(t('dz.cf.recent'), list, { count: recent.length || null });
}

function conflictParties(cf) {
  const parties = L(cf.parties) || [];
  const eps = cf.externalPowers || [];
  const epRows = eps.map((e) => `<div class="dz-ep" ${hl([e.iso3])}>
      <div class="dz-rel-h">${cchip(e.iso3)}${e.kind ? kindPill(e.kind) : ''}</div>
      ${prose(L(e.role), { clamp: false, cls: 'sm' })}</div>`);
  return sec(t('dz.cf.parties'), parties.length ? `<ol class="dz-parties" role="list">${parties.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>` : empty(t('dz.none')), { count: parties.length, cls: 'first' })
    + sec(t('dz.cf.externals'), eps.length ? rows(epRows) : empty(t('dz.cf.noExternals')), { count: eps.length })
    + sec(t('dz.cf.countries'), cchips(cf.countries));
}

function conflictRoots(cf) {
  const dims = (cf.dimensions || []).map((d) => `<span class="pill">${esc(L(DIMENSIONS[d]) || d)}</span>`).join('');
  const ethno = L(cf.ethnoReligious);
  const ethnoHtml = ethno ? prose(ethno) : empty(L(cf.ethnoReligiousNote) || t('dz.cf.noEthno'));
  return sec(t('dz.cf.dims'), (dims ? `<div class="chips dz-chips">${dims}</div>` : '') + prose(L(cf.dimensionNote)), { cls: 'first' })
    + sec(t('dz.cf.ethno'), ethnoHtml)
    + sec(t('dz.cf.history'), prose(L(cf.history)))
    + sec(t('dz.cf.causes'), prose(L(cf.politicalCauses)))
    + sec(t('dz.cf.claims'), prose(L(cf.territorialClaims)))
    + sec(t('dz.cf.interests'), prose(L(cf.strategicInterests)));
}

function conflictRelated(cf, rel) {
  const out = sec(t('dz.cf.events'), eventList(rel.events), { count: rel.events.length, cls: 'first' })
    + sec(t('dz.cf.chokes'), rows(rel.chokes.map(chokeRow)), { count: rel.chokes.length })
    + sec(t('dz.cf.resources'), rows(rel.res.map((e) => resourceEntry(e, { country: true }))), { count: rel.res.length })
    + sec(t('dz.cf.sources'), rel.refs.length ? `<ul class="dz-refs" role="list">${rel.refs.map(refItem).join('')}</ul>` : '', { count: rel.refs.length });
  return out || sec(null, empty(t('dz.cf.noRelated')), { cls: 'first' });
}

/* ---------------- group / religion ---------------- */

function conflictsIn(isos) {
  const set = new Set(isos || []);
  return DB.conflicts.filter((c) => (c.countries || []).some((i) => set.has(i)));
}

function groupOverview(g) {
  return sec(null, facts([
    fact(t('dz.p.family'), esc(famName(g.family)), { text: true }),
    fact(t('dz.p.lang'), esc(Lk(g, 'lang')), { text: true }),
    fact(t('dz.g.region'), esc(Lk(g, 'region')), { text: true, wide: true }),
  ]), { cls: 'first' })
    + sec(t('dz.g.note'), prose(Lk(g, 'note')))
    + sec(t('dz.g.countries'), cchips(g.countries, { sort: true }), { count: g.countries.length })
    + sec(null, caveat(Lk(DB.ethnic.meta, 'warning')));
}

function groupConflicts(list) {
  if (!list.length) return sec(null, empty(t('dz.g.noConflicts')), { cls: 'first' });
  return sec(null, note(t('dz.g.conflictsNote')) + rows(list.map((cf) => conflictRow(cf))), { cls: 'first' });
}

function majorityCount(id) {
  let n = 0;
  for (const c of DB.countries.values()) if (c.religion?.majority === id) n++;
  return n;
}
function sharesOf(id) {
  return Object.entries(DB.religion.countries)
    .map(([iso, v]) => [iso, v.groups?.[id] || 0, v.year])
    .filter(([, p]) => p >= 1)
    .sort((a, b) => b[1] - a[1]);
}

function religionSpread(tr, id) {
  const all = sharesOf(id);
  const top = all.slice(0, 25);
  const fam = RELIGION_FAMILIES.find((f) => f.id === DB.religion.familyOf[id]);
  const head = facts([
    fam ? fact(t('dz.rl.family'), esc(L(fam)), { text: true, wide: true }) : '',
    fact(t('dz.rl.majorityIn'), numUnit(t('dz.rl.states', { n: fmtNum(majorityCount(id)) })), { tipText: t('dz.rl.majorityTip') }),
    fact(t('dz.rl.presentIn'), numUnit(t('dz.rl.states', { n: fmtNum(all.length) }))),
  ]);
  const color = traditionColor(id);
  const bars = top.length ? barList(top.map(([iso, p, yr]) => ({
    label: nameC(iso), value: p, color,
    tip: `<b>${esc(nameC(iso))}</b> ${esc(fmtPct(p, p < 10 ? 1 : 0))}${yr ? ` <span class="tip-sub">${esc(yr)}</span>` : ''}`,
    attrs: `${selAttrs('country', iso)} ${hl([iso])} role="button" tabindex="0"`,
  })), { unit: '%', max: 100 }) + note(t('dz.rl.sharesNote')) : empty(t('dz.rl.none'));
  return sec(null, head, { cls: 'first' }) + sec(t('dz.rl.shares'), `<div class="dz-bars">${bars}</div>`, { count: top.length || null });
}

function religionMethod() {
  return sec(t('dz.rl.coverage'), prose(L(DB.religion.coverageNote), { clamp: false }), { cls: 'first' })
    + sec(t('dz.rl.method'), prose(L(DB.religion.methodNote), { clamp: false }));
}

/* ---------------- choke / disputed / event / bloc / site ---------------- */

function chokeBody(p) {
  const flow = p.oilFlowMbd != null
    ? `<div class="dz-figure"><b class="data">${fmtNum(p.oilFlowMbd, 1)}</b><span>${esc(t('dz.ch.mbd'))}</span>${p.flowYear ? `<span class="dz-yr dz-when">${esc(t('dz.ch.year', { y: p.flowYear }))}</span>` : ''}</div>`
    : empty(t('dz.ch.noFlow'));
  const conf = (p.conflictIds || []).map((id) => DB.conflictById.get(id)).filter(Boolean);
  return sec(t('dz.ch.flow'), flow + note(L(DB.chokeNote)), { cls: 'first' })
    + sec(t('dz.ch.width'), prose(Lk(p, 'widthKm'), { clamp: false }))
    + sec(t('dz.ch.share'), prose(Lk(p, 'shareNote')))
    + sec(t('dz.ch.borders'), cchips(p.borderStates))
    + sec(t('dz.ch.alts'), prose(Lk(p, 'alternatives')))
    + sec(t('dz.ch.risk'), prose(Lk(p, 'risk')))
    + sec(t('dz.ch.conflicts'), conf.length ? rows(conf.map((cf) => conflictRow(cf))) : empty(t('dz.ch.noConflicts')), { count: conf.length });
}

// Abbreviations Natural Earth uses in its notes.
const NE_ALIAS = { uk: 'GBR', usa: 'USA', azer: 'AZE', uae: 'ARE' };
function matchCountry(name) {
  const n = String(name || '').trim().replace(/^the\s+/i, '').toLowerCase();
  if (!n) return null;
  const alias = NE_ALIAS[n.replace(/\./g, '')];
  if (alias && DB.countries.has(alias)) return alias;
  for (const c of DB.countries.values()) {
    if ([c.nameEn, c.nameLong, c.sovereign].some((x) => x && x.toLowerCase() === n)) return c.iso3;
  }
  return null;
}

/** Names listed after a phrase in a Natural Earth note: "Admin. by India; Claimed by Pakistan and China". */
function noteParties(noteText, re) {
  const m = String(noteText || '').match(re);
  return m ? m[1].replace(/;\s*$/, '').split(/,|\band\b|\bfor\b/).map((s) => s.trim()).filter(Boolean) : [];
}

function disputedBody(d) {
  // Natural Earth's `claimant` field repeats the de-facto sovereign (Gaza → Israel), so parties come from the note itself;
  // the admin field is the fallback when the note names no administrator.
  const claimants = noteParties(d.note, /claimed by ([^;]+)/i);
  const admins = noteParties(d.note, /admin\. by ([^;]+)/i);
  if (!admins.length && d.admin && d.admin !== d.nameEn) admins.push(d.admin);
  const party = (raw) => {
    if (/^multiple$/i.test(raw)) return `<span class="chip dz-chip is-static">${esc(t('dz.d.multiple'))}</span>`;
    const iso = matchCountry(raw);
    return iso ? cchip(iso) : `<span class="chip dz-chip is-static">${esc(raw)}</span>`;
  };
  return sec(null, facts([
    fact(t('dz.d.names'), `<span lang="ar">${esc(d.nameAr)}</span> · <bdi lang="en">${esc(d.nameEn)}</bdi>`, { text: true, wide: true }),
    admins.length ? fact(t('dz.d.admin'), `<div class="chips dz-chips">${admins.map(party).join('')}</div>`, { text: true, wide: true }) : '',
    claimants.length ? fact(t('dz.d.claimant'), `<div class="chips dz-chips">${claimants.map(party).join('')}</div>`, { text: true, wide: true, tipText: t('dz.d.claimTip') }) : '',
  ]), { cls: 'first' })
    + sec(t('dz.d.note'), d.note ? `<p class="dz-src-label">${esc(t('dz.d.noteLabel'))}</p><blockquote class="dz-quote" lang="en" dir="ltr">${esc(d.note)}</blockquote>` : empty(t('dz.d.noNote')))
    + sec(null, caveat(t('dz.d.caveat')));
}

function eventBody(e) {
  const evs = DB.timeline.events;
  const i = evs.findIndex((x) => x.id === e.id);
  const prev = evs[i - 1], next = evs[i + 1];
  const conf = (e.conflictIds || []).map((id) => DB.conflictById.get(id)).filter(Boolean);
  const pressed = state.year === e.year && state.yearFilter;
  const nav = (x, dirKey, endKey, cls) => (x
    ? `<button type="button" class="dz-pn-b ${cls}" ${selAttrs('event', x.id)} ${hl(x.countries)}>
        <span class="dz-pn-k">${icon('chevron', 14)}${esc(t(dirKey))}</span>
        <span class="dz-pn-t">${esc(L(x))}</span><span class="dz-date">${esc(fmtDate(x.date))}</span></button>`
    : `<p class="dz-pn-b is-end ${cls}"><span class="dz-pn-k">${esc(t(endKey))}</span></p>`);
  return sec(t('dz.e.cats'), `<div class="dz-cats lg">${(e.cat || []).map(catTag).join('')}</div>`, { cls: 'first' })
    + sec(t('dz.e.summary'), prose(Lk(e, 'sum'), { clamp: false }))
    + sec(t('dz.e.countries'), cchips(e.countries))
    + (conf.length ? sec(t('dz.e.conflicts'), rows(conf.map((cf) => conflictRow(cf))), { count: conf.length }) : '')
    + sec(null, `<button type="button" class="btn dz-wide-btn" data-act="year" aria-pressed="${pressed}">${icon('clock', 16)}<span>${esc(t('dz.e.setYear', { y: e.year }))}</span></button>
        <nav class="dz-pn" aria-label="${esc(t('dz.kind.event'))}">${nav(prev, 'dz.e.prev', 'dz.e.first', 'prev')}${nav(next, 'dz.e.next', 'dz.e.last', 'next')}</nav>`)
    + sec(null, caveat(L(DB.timeline.boundaryLimitation)));
}

function blocBody(b) {
  const set = new Set(b.members);
  const inner = DB.relations.edges.filter((e) => set.has(e.a) && set.has(e.b)).length;
  return sec(null, facts([
    fact(t('dz.b.kind'), esc(t(b.kind === 'treaty' ? 'dz.b.treaty' : 'dz.b.assessed')), { text: true, wide: true }),
    fact(t('dz.b.members'), `<span class="data">${fmtNum(b.members.length)}</span>`),
    fact(t('dz.b.edges'), `<span class="data">${fmtNum(inner)}</span>`, { tipText: t('dz.b.edgesTip') }),
  ]), { cls: 'first' })
    + (b.note ? sec(null, caveat(L(b.note))) : '')
    + sec(t('dz.b.members'), cchips(b.members, { sort: true }), { count: b.members.length })
    + sec(null, `<button type="button" class="btn dz-wide-btn" data-act="network">${icon('network', 16)}<span>${esc(t('dz.network'))}</span></button>`);
}

function siteBody(s) {
  const c = DB.countries.get(s.iso3);
  const record = (c?.resources || []).filter((e) => e.type === s.type);
  return sec(null, facts([
    fact(t('dz.st.type'), `${sw(resColor(s.type))}${esc(resTypeName(s.type))}`, { text: true }),
    fact(t('dz.st.country'), cchip(s.iso3), { text: true }),
  ]), { cls: 'first' })
    + sec(t('dz.st.note'), prose(Lk(s, 'note'), { clamp: false }))
    + (record.length ? sec(t('dz.st.record'), rows(record.map((e) => resourceEntry(e)))) : '');
}

/* ---------------- frame ---------------- */

function actionBtn(act, ic, key, extra = '') {
  return `<button type="button" class="btn ghost icon dz-act" data-act="${act}" aria-label="${esc(t(key))}" ${tip(esc(t(key)))} ${extra}>${icon(ic, 17)}</button>`;
}

function frameHtml(kind, id, h, tabs, active) {
  const snapFull = el?.dataset.snap === 'full';
  const plate = (h.plate || []).filter(Boolean);
  const multi = tabs.length > 1;
  return `<div class="dz-grip"><button type="button" class="dz-handle" data-act="snap" aria-expanded="${snapFull}" aria-label="${esc(t(snapFull ? 'dz.shrink' : 'dz.expand'))}"><i></i></button></div>
  <header class="dz-head">
    <div class="dz-top">
      <p class="eyebrow dz-eyebrow">${icon(KIND_ICON[kind], 14)}<span>${esc(t('dz.kind.' + kind))}</span>${h.region ? `<span class="dz-dot" aria-hidden="true"></span><span class="dz-region">${esc(h.region)}</span>` : ''}</p>
      <div class="dz-actions">
        ${actionBtn('fly', 'target', 'dz.fly')}${actionBtn('copy', 'link', 'dz.copy')}${kind === 'country' ? actionBtn('compare', 'compare', 'dz.compare') : ''}${actionBtn('close', 'close', 'dz.close')}
      </div>
    </div>
    <h2 class="dz-title" id="dz-title" tabindex="-1">${esc(h.title)}</h2>
    <div class="dz-meta"><div class="dz-meta-in">
      ${plate.length ? `<p class="dz-plate">${plate.join('<span class="dz-dot" aria-hidden="true"></span>')}</p>` : ''}
      ${h.badges ? `<div class="dz-badges">${h.badges}</div>` : ''}
      ${h.extra || ''}
    </div></div>
  </header>
  ${multi ? `<div class="tabs dz-tabs" role="tablist" aria-label="${esc(t('dz.sections'))}">${tabs.map((tb) => `<button type="button" role="tab" id="dz-tab-${tb.id}" data-tab="${tb.id}" aria-controls="dz-panel" aria-selected="${tb.id === active}" tabindex="${tb.id === active ? 0 : -1}"${tb.count === 0 ? ' class="is-empty"' : ''}>${esc(tb.label)}${tb.count != null ? `<span class="n">${fmtNum(tb.count)}</span>` : ''}</button>`).join('')}</div>` : ''}
  <div class="dz-body scroll" id="dz-panel"${multi ? ` role="tabpanel" aria-labelledby="dz-tab-${active}"` : ''} tabindex="0"></div>`;
}

/** Pure render for tests and tools: header + tabs + the chosen tab's body as one HTML string. */
export function dossierHtml(db, kind, id, tabId) {
  DB = db;
  const x = DB.get(kind, id);
  if (!x || !KINDS[kind]) return '';
  const h = KINDS[kind].head(x, id);
  const tabs = KINDS[kind].tabs(x, id);
  const tb = tabs.find((y) => y.id === tabId) || tabs[0];
  return frameHtml(kind, id, h, tabs, tb.id) + tb.render();
}

function renderAll({ resetScroll }) {
  const sel = state.selection;
  const x = sel && KINDS[sel.kind] && DB.get(sel.kind, sel.id);
  if (!x) { close(); return; }
  hideTip();
  setHl(null);
  const prevScroll = body?.scrollTop || 0;
  const def = KINDS[sel.kind];
  const h = def.head(x, sel.id);
  curTabs = def.tabs(x, sel.id);
  const mem = tabMem[sel.kind];
  curTab = curTabs.some((tb) => tb.id === mem) ? mem : curTabs[0].id;
  el.dataset.kind = sel.kind;
  el.innerHTML = frameHtml(sel.kind, sel.id, h, curTabs, curTab);
  body = el.querySelector('.dz-body');
  open();
  renderBody();
  if (resetScroll) el.classList.remove('is-condensed');
  else body.scrollTop = prevScroll;
  revealTab(false);
}

function renderBody() {
  const tb = curTabs.find((x) => x.id === curTab) || curTabs[0];
  uid = 0;
  body.innerHTML = tb.render();
  fitClamps(body);
}

/** Drop the "read more" control where the 4-line preview already shows the whole text. */
function fitClamps(root) {
  for (const p of root.querySelectorAll('.dz-clamp')) {
    if (p.scrollHeight <= p.clientHeight + 2) {
      p.classList.remove('dz-clamp');
      root.querySelector(`[aria-controls="${p.id}"]`)?.remove();
    }
  }
}

function selectTab(id, { focus = false, anchor = null } = {}) {
  if (!curTabs.some((tb) => tb.id === id)) return;
  const sel = state.selection;
  curTab = id;
  if (sel) tabMem[sel.kind] = id;
  for (const b of el.querySelectorAll('[role="tab"]')) {
    const on = b.dataset.tab === id;
    b.setAttribute('aria-selected', on);
    b.tabIndex = on ? 0 : -1;
  }
  if (curTabs.length > 1) body.setAttribute('aria-labelledby', `dz-tab-${id}`);
  renderBody();
  body.scrollTop = 0;
  if (anchor) {
    const a = body.querySelector(`#dz-a-${anchor}`);
    if (a) body.scrollTop = a.offsetTop - 6;
  }
  revealTab(focus);
}

/** Keep the active tab inside the horizontally scrolling tab strip (without scrollIntoView, which can move hidden-overflow ancestors). */
function revealTab(focus) {
  const list = el.querySelector('.dz-tabs');
  const b = list?.querySelector('[aria-selected="true"]');
  if (!b) return;
  if (focus) b.focus({ preventScroll: true });
  const r = b.getBoundingClientRect(), lr = list.getBoundingClientRect();
  if (r.left < lr.left) list.scrollLeft += r.left - lr.left - 16;
  else if (r.right > lr.right) list.scrollLeft += r.right - lr.right + 16;
  fadeTabs(list);
}

/** Fade the strip's edge where tabs continue out of view (scrollLeft runs negative in RTL, hence abs). */
function fadeTabs(list) {
  const x = Math.abs(list.scrollLeft), more = list.scrollWidth - list.clientWidth;
  list.classList.toggle('fade-start', x > 1);
  list.classList.toggle('fade-end', x < more - 1);
}

/* ---------------- open / close / snap ---------------- */

function open() {
  clearTimeout(leaveTimer);
  el.classList.remove('dz-leave');
  if (!el.hidden) return;
  if (!el.dataset.snap) setSnap('half');
  const ae = document.activeElement;
  opener = ae && ae !== document.body && !el.contains(ae) ? ae : null;
  el.hidden = false;
  if (reducedMotion()) return;
  el.classList.add('dz-enter');
  void el.offsetWidth;
  requestAnimationFrame(() => el.classList.remove('dz-enter'));
}

function close() {
  setHl(null);
  hideTip();
  if (el.hidden) return;
  const hadFocus = el.contains(document.activeElement);
  const finish = () => {
    el.hidden = true;
    el.classList.remove('dz-leave', 'is-condensed');
    el.innerHTML = '';
    body = null;
    delete el.dataset.snap;
  };
  if (reducedMotion()) finish();
  else { el.classList.add('dz-leave'); clearTimeout(leaveTimer); leaveTimer = setTimeout(finish, 260); }
  if (hadFocus) {
    const target = opener?.isConnected ? opener : document.getElementById('map');
    target?.focus?.({ preventScroll: true });
  }
  opener = null;
}

function setSnap(s) {
  el.dataset.snap = s;
  const hb = el.querySelector('.dz-handle');
  if (hb) {
    hb.setAttribute('aria-expanded', s === 'full');
    hb.setAttribute('aria-label', t(s === 'full' ? 'dz.shrink' : 'dz.expand'));
  }
}

const isPhone = () => matchMedia('(max-width: 760px)').matches;
const halfH = () => innerHeight * 0.58;
const fullH = () => innerHeight - (parseFloat(cssVar('--top-h')) || 52);

function onDragStart(e) {
  if (!isPhone() || el.hidden || (e.pointerType === 'mouse' && e.button !== 0)) return;
  if (!e.target.closest('.dz-grip, .dz-head')) return;
  const ctl = e.target.closest('button, a, input, [tabindex="0"]');
  if (ctl && !ctl.classList.contains('dz-handle')) return;
  drag = { y0: e.clientY, t0: performance.now(), h0: el.getBoundingClientRect().height, dy: 0, moved: false, id: e.pointerId };
}
function onDragMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const dy = e.clientY - drag.y0;
  if (!drag.moved) {
    if (Math.abs(dy) < 6) return;
    drag.moved = true;
    el.classList.add('is-dragging');
    try { el.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
  }
  drag.dy = dy;
  if (dy >= 0) { el.style.transform = `translateY(${dy}px)`; el.style.height = ''; }
  else { el.style.transform = ''; el.style.height = `${Math.min(fullH(), drag.h0 - dy)}px`; }
}
function onDragEnd(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const { dy, moved, t0, h0 } = drag;
  drag = null;
  if (!moved) return;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);
  const v = dy / Math.max(1, performance.now() - t0); // px per ms, positive = downwards
  const finalH = h0 - dy;
  el.classList.remove('is-dragging');
  el.style.height = '';
  if (dy > 0 && (finalH < halfH() * 0.55 || (v > 0.7 && el.dataset.snap !== 'full'))) {
    el.style.transform = '';
    store.select(null);
    return;
  }
  el.style.transform = '';
  const next = v < -0.5 ? 'full' : v > 0.5 ? 'half' : Math.abs(finalH - fullH()) < Math.abs(finalH - halfH()) ? 'full' : 'half';
  setSnap(next);
}

/* ---------------- interaction ---------------- */

function setHl(key) {
  if (key === hlKey) return;
  hlKey = key;
  store.highlight(key ? { iso3: key.split(' ') } : null);
}
const hlNode = (n) => { const x = n?.closest?.('[data-hl]'); return x && el.contains(x) ? x : null; };

function go(kind, id) {
  const lens = LENS_OF[kind];
  if (lens && state.lens !== lens) store.set({ lens });
  store.select(kind, id);
}

function act(name, node) {
  const sel = state.selection;
  switch (name) {
    case 'close': store.select(null); break;
    case 'fly': if (sel) store.flyTo({ kind: sel.kind, id: sel.id }); break;
    case 'copy':
      copyText(shareLink()).then((ok) => store.toast(t(ok ? 'dz.copied' : 'dz.copyFail')));
      break;
    case 'compare': if (sel?.kind === 'country') store.set({ compare: [sel.id, null], view: 'compare' }); break;
    case 'network': store.openView('network'); break;
    case 'year': {
      const e = sel?.kind === 'event' && DB.eventById.get(sel.id);
      if (e) store.set({ year: e.year, yearFilter: true });
      break;
    }
    case 'goto': selectTab(node.dataset.goto, { anchor: node.dataset.anchor || null }); break;
    case 'snap': setSnap(el.dataset.snap === 'full' ? 'half' : 'full'); break;
    case 'more': {
      const p = document.getElementById(node.getAttribute('aria-controls'));
      if (!p) break;
      const openNow = !p.classList.contains('is-open');
      p.classList.toggle('is-open', openNow);
      node.setAttribute('aria-expanded', openNow);
      node.querySelector('span').textContent = t(openNow ? 'dz.readLess' : 'dz.readMore');
      break;
    }
    default: break;
  }
}

function onClick(e) {
  if (suppressClick) { suppressClick = false; return; }
  const a = e.target.closest('[data-act]');
  if (a && el.contains(a)) { act(a.dataset.act, a); return; }
  const tabEl = e.target.closest('[role="tab"]');
  if (tabEl && el.contains(tabEl)) { selectTab(tabEl.dataset.tab); return; }
  const s = e.target.closest('[data-sel-kind]');
  if (s && el.contains(s)) go(s.dataset.selKind, s.dataset.selId);
}

function onKey(e) {
  if (e.key === 'Escape') { e.stopPropagation(); store.select(null); return; }
  const tabEl = e.target.closest?.('[role="tab"]');
  if (tabEl) {
    const tabs = [...el.querySelectorAll('[role="tab"]')];
    const n = tabs.length;
    let i = tabs.indexOf(tabEl);
    const fwd = isRTL() ? 'ArrowLeft' : 'ArrowRight', back = isRTL() ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) i = (i + 1) % n;
    else if (e.key === back) i = (i - 1 + n) % n;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    else return;
    e.preventDefault();
    selectTab(tabs[i].dataset.tab, { focus: true });
    return;
  }
  // bar-list rows are <li role="button">: give them button keys
  const rb = e.target.closest?.('[role="button"][data-sel-kind]');
  if (rb && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(rb.dataset.selKind, rb.dataset.selId); }
}

function onScroll(e) {
  if (e.target.classList?.contains('dz-tabs')) { fadeTabs(e.target); return; }
  if (!e.target.classList?.contains('dz-body')) return;
  const b = e.target, y = b.scrollTop;
  if (y > 48 && b.scrollHeight - b.clientHeight > 160) el.classList.add('is-condensed');
  else if (y < 8) el.classList.remove('is-condensed');
}

function syncYearBtn() {
  const sel = state.selection;
  const b = el.querySelector('[data-act="year"]');
  const e = sel?.kind === 'event' && DB.eventById.get(sel.id);
  if (b && e) b.setAttribute('aria-pressed', state.year === e.year && state.yearFilter);
}

export function initDossier(root, db) {
  DB = db;
  el = root;
  el.setAttribute('aria-labelledby', 'dz-title');

  addEventListener('keydown', (e) => { if (!e.ctrlKey && !e.metaKey && !e.altKey) kbd = true; }, true);
  addEventListener('pointerdown', () => { kbd = false; }, true);

  el.addEventListener('click', onClick);
  el.addEventListener('keydown', onKey);
  el.addEventListener('scroll', onScroll, true);
  // A plain mouse wheel over the tab strip scrolls it sideways (the strip overflows in English).
  el.addEventListener('wheel', (e) => {
    const list = e.target.closest?.('.dz-tabs');
    if (!list || list.scrollWidth <= list.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
    e.preventDefault();
    list.scrollLeft += (isRTL() ? -1 : 1) * e.deltaY;
  }, { passive: false });
  el.addEventListener('pointerover', (e) => setHl(hlNode(e.target)?.dataset.hl || null));
  el.addEventListener('pointerleave', () => setHl(null));
  el.addEventListener('focusin', (e) => { const n = hlNode(e.target); if (n) setHl(n.dataset.hl); });
  el.addEventListener('focusout', (e) => { if (!hlNode(e.relatedTarget)) setHl(null); });
  el.addEventListener('pointerdown', onDragStart);
  el.addEventListener('pointermove', onDragMove);
  el.addEventListener('pointerup', onDragEnd);
  el.addEventListener('pointercancel', onDragEnd);

  store.on('change', ({ keys }) => {
    if (keys.includes('selection')) {
      const wasClosed = el.hidden || el.classList.contains('dz-leave');
      const focusInside = el.contains(document.activeElement);
      renderAll({ resetScroll: true });
      if (state.selection && kbd && (wasClosed || focusInside)) el.querySelector('#dz-title')?.focus({ preventScroll: true });
    } else if ((keys.includes('lang') || keys.includes('theme')) && state.selection && !el.hidden) {
      const focusInside = el.contains(document.activeElement);
      renderAll({ resetScroll: false });
      if (focusInside) el.querySelector('#dz-title')?.focus({ preventScroll: true });
    }
    if (keys.includes('year') || keys.includes('yearFilter')) syncYearBtn();
  });

  if (state.selection) renderAll({ resetScroll: true });
}

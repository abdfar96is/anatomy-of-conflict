// Strings of the Power & industry lens: its card, the map tooltip and the power plant dossier.

import { registerStrings } from '../../i18n/strings';

registerStrings({
  ar: {
    'pw.loading': 'جارٍ تحميل محطات الكهرباء…', 'pw.failed': 'تعذّر تحميل بيانات محطات الكهرباء',
    'pw.types': 'نوع المحطة', 'pw.status': 'الحالة', 'pw.all': 'الكل', 'pw.show': 'إظهار', 'pw.halted': 'المحطات المجمّدة',
    'pw.size': 'حجم النقطة: القدرة', 'pw.s0': 'أقل من 100 ميغاواط', 'pw.s1': '100 – 500 ميغاواط', 'pw.s2': '500 – 1,000 ميغاواط',
    'pw.s3': '1 – 3 غيغاواط', 'pw.s4': '3 غيغاواط فأكثر',
    'pw.picto': 'رمز النوع للمحطات الكبرى، ولكل المحطات عند التكبير', 'pw.ring': 'الحلقة: قيد الإنشاء',
    'pw.total': '{n} محطة، قدرتها العاملة نحو {gw} غيغاواط',
    'pw.colorNote': 'الألوان تميّز الأنواع، ويكمّلها الرمز عند التكبير؛ ولعرض نوع واحد اترك زرّه وحده.',
    'pw.note': 'المصدر Global Energy Monitor: المتتبّع المتكامل لمحطات الكهرباء (سبتمبر 2026)، بترخيص CC BY 4.0، ويجمع متتبّعات GEM الثمانية: الفحم، والنفط والغاز، والنووي، والكهرومائي، والشمسي، والرياح، والطاقة الحيوية، والحراري الجوفي. تظهر المحطات العاملة وقيد الإنشاء، والمجمّدة طبقة اختيارية، ولا تظهر المقترحة أو الملغاة أو المتقاعدة. تُعرض المحطات الشمسية والريحية والحيوية من 50 ميغاواط، والبقية من 20 ميغاواط، والنووية والحرارية الجوفية كلها. وتُستبعد وحدات شمسية مصدرها جزئياً TransitionZero لأن ترخيصها غير تجاري.',
    'pw.dz.region': '{t} · {c}', 'pw.dz.type': 'النوع', 'pw.dz.status': 'الحالة', 'pw.dz.capacity': 'القدرة',
    'pw.dz.op': 'القدرة العاملة', 'pw.dz.con': 'القدرة قيد الإنشاء', 'pw.dz.mb': 'القدرة المجمّدة', 'pw.dz.units': 'الوحدات',
    'pw.dz.mix': 'القدرة حسب النوع', 'pw.dz.tech': 'التقنية', 'pw.dz.fuel': 'الوقود', 'pw.dz.start': 'أول تشغيل', 'pw.dz.expected': 'التشغيل المتوقّع',
    'pw.dz.retire': 'التقاعد المخطّط', 'pw.dz.owner': 'المالك', 'pw.dz.parent': 'الشركة الأم', 'pw.dz.river': 'النهر', 'pw.dz.location': 'الموقع',
    'pw.dz.chp': 'تولّد الكهرباء والحرارة معاً.', 'pw.dz.ccs': 'مزوّدة باحتجاز الكربون وتخزينه بحسب GEM.', 'pw.dz.captive': 'محطة خاصة بمنشأة صناعية ({v}).',
    'pw.dz.approx': 'الموقع تقريبي في المصدر.', 'pw.dz.loading': 'تُحمَّل تفاصيل المحطة…', 'pw.dz.noDetail': 'تعذّر تحميل تفاصيل المحطة.',
    'pw.dz.capNote': 'القدرة مجموع وحدات المحطة العاملة وقيد الإنشاء والمجمّدة بالميغاواط كما ينشرها GEM، ولا تشمل الوحدات المقترحة أو المتقاعدة.',
    'pw.dz.source': 'المصدر', 'pw.dz.cite': 'الاستشهاد', 'pw.dz.wiki': 'صفحة المحطة على GEM.wiki',
    'map.tip.pw.op': '{v} عاملة', 'map.tip.pw.con': '{v} قيد الإنشاء',
  },
  en: {
    'pw.loading': 'Loading power plants…', 'pw.failed': 'The power plant data could not be loaded',
    'pw.types': 'Plant type', 'pw.status': 'Status', 'pw.all': 'All', 'pw.show': 'Show', 'pw.halted': 'Mothballed plants',
    'pw.size': 'Dot size: capacity', 'pw.s0': 'Under 100 MW', 'pw.s1': '100 – 500 MW', 'pw.s2': '500 – 1,000 MW', 'pw.s3': '1 – 3 GW', 'pw.s4': '3 GW or more',
    'pw.picto': 'A symbol of the type for the largest plants, and for all when zoomed in', 'pw.ring': 'Ring: under construction',
    'pw.total': '{n} plants, about {gw} GW in operation',
    'pw.colorNote': 'Colours tell the types apart, with a symbol when zoomed in; to see one type alone, leave only its chip on.',
    'pw.note': "Source: Global Energy Monitor's Global Integrated Power Tracker (September 2026), CC BY 4.0, which brings together GEM's eight power trackers: coal, oil and gas, nuclear, hydropower, solar, wind, bioenergy and geothermal. Operating and under-construction plants are shown, with mothballed ones as an optional layer; proposed, cancelled and retired plants are not. Solar, wind and bioenergy plants are shown from 50 MW, the rest from 20 MW, and all nuclear and geothermal plants. Solar units partly sourced from TransitionZero are left out, as their licence is non-commercial.",
    'pw.dz.region': '{t} · {c}', 'pw.dz.type': 'Type', 'pw.dz.status': 'Status', 'pw.dz.capacity': 'Capacity',
    'pw.dz.op': 'Capacity in operation', 'pw.dz.con': 'Capacity under construction', 'pw.dz.mb': 'Capacity mothballed', 'pw.dz.units': 'Units',
    'pw.dz.mix': 'Capacity by type', 'pw.dz.tech': 'Technology', 'pw.dz.fuel': 'Fuel', 'pw.dz.start': 'First in service', 'pw.dz.expected': 'Expected in service',
    'pw.dz.retire': 'Planned retirement', 'pw.dz.owner': 'Owner', 'pw.dz.parent': 'Parent company', 'pw.dz.river': 'River', 'pw.dz.location': 'Location',
    'pw.dz.chp': 'It makes heat as well as power.', 'pw.dz.ccs': 'Fitted with carbon capture and storage according to GEM.', 'pw.dz.captive': 'A captive plant serving industry ({v}).',
    'pw.dz.approx': 'The location is approximate in the source.', 'pw.dz.loading': 'Loading the plant details…', 'pw.dz.noDetail': 'The plant details could not be loaded.',
    'pw.dz.capNote': "Capacity sums the plant's operating, under-construction and mothballed units in MW as GEM publishes them, leaving out proposed and retired units.",
    'pw.dz.source': 'Source', 'pw.dz.cite': 'Citation', 'pw.dz.wiki': 'Plant page on GEM.wiki',
    'map.tip.pw.op': '{v} operating', 'map.tip.pw.con': '{v} under construction',
  },
});

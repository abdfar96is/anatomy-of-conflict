// Strings of the Historical borders lens: its timeline, legend and unit dossier.

import { registerStrings } from '../../i18n/strings';

registerStrings({
  ar: {
    'bd.yearLabel': 'الحدود في', 'bd.slider': 'سنة الحدود التاريخية', 'bd.play': 'تشغيل تغيّر الحدود عبر السنوات', 'bd.pause': 'إيقاف',
    'bd.prev': 'التغيير السابق', 'bd.next': 'التغيير التالي', 'bd.loading': 'جارٍ تحميل الحدود التاريخية…', 'bd.failed': 'تعذّر تحميل الحدود التاريخية',
    'bd.units': '{n} وحدة سياسية', 'bd.changes': '{n} تغيير', 'bd.more': 'و{n} أخرى',
    'bd.k.new': 'قيام: {n}', 'bd.k.independence': 'استقلال: {n}', 'bd.k.annexed': '{n}: {s} تحت حكم {r}', 'bd.k.status': '{n}: {s} تحت حكم {r}',
    'bd.k.transfer': '{n}: انتقل إلى حكم {r}', 'bd.k.border': 'تغيّر حدود: {n}', 'bd.k.end': 'زوال أو اندماج: {n}',
    'bd.st.independent': 'دولة مستقلة', 'bd.st.colony': 'مستعمرة', 'bd.st.protectorate': 'محمية', 'bd.st.mandate': 'انتداب', 'bd.st.occupied': 'احتلال', 'bd.st.N/A': 'وضع غير مصنّف',
    'bd.lg.year': 'الحدود في 31 ديسمبر {y}', 'bd.lg.rulers': 'القوى الحاكمة وأقاليمها', 'bd.lg.own': '{n}', 'bd.lg.other': 'دول أخرى مستقلة', 'bd.lg.otherDep': 'أقاليم تابعة لدول أخرى',
    'bd.lg.shade': 'اللون الكامل أرض الدولة الحاكمة، والأفتح مستعمراتها ومحمياتها. الخط المتقطع: احتلال أو حدود غير محددة.',
    'bd.lg.changes': 'ما تغيّر في {y}', 'bd.lg.none': 'لا تغيير مسجّل في الحدود أو الوضع هذه السنة.',
    'bd.lg.note': 'المصدر CShapes 2.0 (ETH زيورخ) بترخيص CC BY-NC-SA 4.0: حدود قانونية (de jure) للدول والأقاليم التابعة، ولا تُسجَّل التغييرات الأصغر من 10 آلاف كم². تنتهي البيانات عند 2019. الخطوط مبسّطة للعرض.',
    'bd.dz.status': 'الوضع', 'bd.dz.ruler': 'تحت حكم', 'bd.dz.capital': 'العاصمة', 'bd.dz.period': 'بهذه الحدود',
    'bd.dz.undefined': 'حدود هذه الوحدة غير محددة جزئياً في المصدر.', 'bd.dz.today': 'الدول الحالية على أرضها',
    'bd.dz.todayNote': 'تقريبي: الدول التي تقع نقطة اسمها داخل حدود الوحدة.', 'bd.dz.periods': 'فترات هذه الوحدة', 'bd.dz.show': 'اعرض الخريطة في {y}',
    'bd.dz.source': 'المصدر', 'bd.dz.cite': 'الاستشهاد', 'bd.dz.missing': 'تُحمَّل الحدود التاريخية…',
  },
  en: {
    'bd.yearLabel': 'Borders in', 'bd.slider': 'Year of the historical borders', 'bd.play': 'Play border changes over the years', 'bd.pause': 'Pause',
    'bd.prev': 'Previous change', 'bd.next': 'Next change', 'bd.loading': 'Loading historical borders…', 'bd.failed': 'Could not load the historical borders',
    'bd.units': '{n} political units', 'bd.changes': '{n} changes', 'bd.more': 'and {n} more',
    'bd.k.new': 'Emerged: {n}', 'bd.k.independence': 'Independence: {n}', 'bd.k.annexed': '{n}: {s} under {r}', 'bd.k.status': '{n}: {s} under {r}',
    'bd.k.transfer': '{n}: passed to {r}', 'bd.k.border': 'Border change: {n}', 'bd.k.end': 'Ended or merged: {n}',
    'bd.st.independent': 'Independent state', 'bd.st.colony': 'Colony', 'bd.st.protectorate': 'Protectorate', 'bd.st.mandate': 'Mandate', 'bd.st.occupied': 'Occupation', 'bd.st.N/A': 'Status not classified',
    'bd.lg.year': 'Borders on 31 December {y}', 'bd.lg.rulers': 'Ruling powers and their territories', 'bd.lg.own': '{n}', 'bd.lg.other': 'Other independent states', 'bd.lg.otherDep': 'Territories of other states',
    'bd.lg.shade': 'Full colour is the ruling state itself; lighter shades are its colonies and protectorates. Dashed lines: occupation or undefined borders.',
    'bd.lg.changes': 'What changed in {y}', 'bd.lg.none': 'No border or status change recorded this year.',
    'bd.lg.note': 'Source: CShapes 2.0 (ETH Zurich), CC BY-NC-SA 4.0. De jure borders of states and dependent territories; changes under 10,000 km² are not coded. The data ends in 2019. Lines are simplified for display.',
    'bd.dz.status': 'Status', 'bd.dz.ruler': 'Ruled by', 'bd.dz.capital': 'Capital', 'bd.dz.period': 'With these borders',
    'bd.dz.undefined': 'This unit’s borders are partly undefined in the source.', 'bd.dz.today': 'Today’s states on its territory',
    'bd.dz.todayNote': 'Approximate: states whose label point falls inside the unit.', 'bd.dz.periods': 'Periods of this unit', 'bd.dz.show': 'Show the map in {y}',
    'bd.dz.source': 'Source', 'bd.dz.cite': 'Citation', 'bd.dz.missing': 'Loading historical borders…',
  },
});

// Guided tours: short stories stitched from entities that exist in the data.
// M2 ports only the tour list (for the shell's tours menu and palette); the player that runs a tour is M3.

import { atlas } from '../../app/store';
import type { LensId } from '../../config';
import type { DB, Kind } from '../../data/types';
import type { Bi, Lang } from '../../i18n/format';
import { registerStrings } from '../../i18n/strings';

registerStrings({
  ar: {
    'tr.tour': 'جولة',
    'tr.region': 'جولة: {title}',
    'tr.stepOf': 'المحطة {i} من {n}',
    'tr.prev': 'السابق',
    'tr.next': 'التالي',
    'tr.finish': 'إنهاء الجولة',
    'tr.exit': 'اخرج من الجولة',
    'tr.play': 'تشغيل تلقائي',
    'tr.playTip': 'ينتقل إلى المحطة التالية كل 9 ثوانٍ، ويتوقف ما دام المؤشر فوق البطاقة',
    'tr.playOff': 'التشغيل التلقائي متوقف لأن جهازك مضبوط على تقليل الحركة',
    'tr.more': 'اقرأ المزيد',
    'tr.less': 'اعرض أقل',
    'tr.since': 'منذ',
    'tr.unverified': 'من الأطلس الأصلي، بتاريخ {date} — لم تتحقّق منه هذه النسخة',
    'tr.mbd': 'مليون برميل يومياً',
    'kind.country': 'دولة',
    'kind.conflict': 'نزاع',
    'kind.group': 'مجموعة عرقية',
    'kind.religion': 'ديانة',
    'kind.choke': 'ممرّ',
    'kind.disputed': 'إقليم متنازع عليه',
    'kind.event': 'حدث',
    'kind.bloc': 'تكتّل',
    'kind.site': 'موقع مورد',
  },
  en: {
    'tr.tour': 'Tour',
    'tr.region': 'Tour: {title}',
    'tr.stepOf': 'Stop {i} of {n}',
    'tr.prev': 'Previous',
    'tr.next': 'Next',
    'tr.finish': 'Finish',
    'tr.exit': 'Exit the tour',
    'tr.play': 'Autoplay',
    'tr.playTip': 'Moves to the next stop every 9 seconds; pauses while the pointer is over the card',
    'tr.playOff': 'Autoplay is off because your device asks for reduced motion',
    'tr.more': 'Read more',
    'tr.less': 'Show less',
    'tr.since': 'since',
    'tr.unverified': 'From the original atlas, as of {date}; not independently verified by this edition',
    'tr.mbd': 'million barrels a day',
    'kind.country': 'Country',
    'kind.conflict': 'Conflict',
    'kind.group': 'Ethnic group',
    'kind.religion': 'Religion',
    'kind.choke': 'Chokepoint',
    'kind.disputed': 'Disputed territory',
    'kind.event': 'Event',
    'kind.bloc': 'Bloc',
    'kind.site': 'Resource site',
  },
});

export interface TourDef {
  id: string; kind: Kind; lens: LensId; icon: string; ar: string; en: string; desc: Bi; ids: readonly string[]; years?: boolean;
}
export interface TourStep { kind: Kind; id: string; lens: LensId; year: number | null }
export interface Tour extends TourDef { steps: TourStep[] }

// Each tour lists ids of one kind; ids missing from the data are skipped at runtime.
export const TOURS: readonly TourDef[] = [
  {
    id: 'energy', kind: 'choke', lens: 'chokepoints', icon: 'anchor',
    ar: 'شرايين الطاقة', en: 'Energy arteries',
    desc: { ar: 'سبعة ممرّات بحرية يعبرها معظم نفط العالم وتجارته، ومدى هشاشتها اليوم.', en: 'Seven sea lanes that carry most of the world’s oil and trade, and how exposed they are today.' },
    ids: ['hormuz', 'bab-al-mandab', 'suez', 'malacca', 'bosphorus', 'panama', 'cape-of-good-hope'],
  },
  {
    id: 'mideast', kind: 'conflict', lens: 'conflicts', icon: 'flame',
    ar: 'صدوع الشرق الأوسط', en: 'Middle East fault lines',
    desc: { ar: 'سبعة ملفّات مترابطة من غزة إلى الخليج: من يواجه من، وأين يقف كل ملف الآن.', en: 'Seven linked files from Gaza to the Gulf: who faces whom, and where each one stands now.' },
    ids: ['israel-palestine', 'lebanon-israel', 'syria-transition', 'iraq-kurdistan', 'iran-us-israel', 'yemen', 'gulf-security'],
  },
  {
    id: 'europe', kind: 'conflict', lens: 'conflicts', icon: 'flame',
    ar: 'حروب أوروبا الساخنة والمجمّدة', en: 'Europe’s hot and frozen wars',
    desc: { ar: 'من أوكرانيا إلى البلقان: حرب مفتوحة ونزاعات لم تُحسم منذ تفكّك الاتحاد السوفييتي ويوغوسلافيا.', en: 'From Ukraine to the Balkans: an open war and disputes left unsettled by the breakup of the USSR and Yugoslavia.' },
    ids: ['russia-ukraine', 'georgia-breakaway', 'transnistria', 'armenia-azerbaijan', 'kosovo-serbia', 'bosnia'],
  },
  {
    id: 'asia', kind: 'conflict', lens: 'conflicts', icon: 'flame',
    ar: 'نقاط الاشتعال في آسيا', en: 'Asia’s flashpoints',
    desc: { ar: 'مضائق وحدود وأقاليم تتقاطع فيها مصالح القوى الكبرى، من تايوان إلى كشمير.', en: 'Straits, borders and regions where great-power interests meet, from Taiwan to Kashmir.' },
    ids: ['taiwan-strait', 'south-china-sea', 'korean-peninsula', 'kashmir', 'myanmar', 'xinjiang'],
  },
  {
    id: 'africa', kind: 'conflict', lens: 'conflicts', icon: 'flame',
    ar: 'أفريقيا: الحروب المنسيّة', en: 'Africa: the forgotten wars',
    desc: { ar: 'ستّ حروب بعيدة عن العناوين رغم حجم ضحاياها ونازحيها.', en: 'Six wars far from the headlines despite their toll in lives and displacement.' },
    ids: ['sudan', 'sahel', 'drc-east', 'ethiopia', 'somalia', 'south-sudan'],
  },
  {
    id: 'century', kind: 'event', lens: 'history', icon: 'clock', years: true,
    ar: 'قرن في عشر محطات', en: 'A century in ten stops',
    desc: { ar: 'من الحرب العالمية الأولى إلى اليوم: عشرة أحداث رسمت خريطة نزاعات الحاضر.', en: 'From the First World War to today: ten events that drew the map of present-day conflicts.' },
    ids: ['wwi', 'sykes-picot', 'wwii', 'india-partition', 'israel-1948', 'africa-year', 'iran-revolution', 'soviet-collapse', 'arab-spring', 'ukraine-invasion'],
  },
];

const warned = new Set<string>();

/** Tours with their steps resolved against the model; ids that do not exist are dropped (and reported once). */
export function availableTours(db: DB): Tour[] {
  return TOURS.map((tr) => {
    const steps: TourStep[] = [];
    for (const id of tr.ids) {
      if (!db.exists(tr.kind, id)) {
        if (!warned.has(tr.id + id)) { warned.add(tr.id + id); console.warn(`[atlas] tour "${tr.id}": no ${tr.kind} "${id}" in the data, step skipped`); }
        continue;
      }
      const year = tr.years ? (db.get(tr.kind, id) as { year?: number } | undefined)?.year ?? null : null;
      steps.push({ kind: tr.kind, id, lens: tr.lens, year });
    }
    return { ...tr, steps };
  }).filter((tr) => tr.steps.length >= 2);
}

/** "7 محطات" / "7 stops" with Arabic number agreement. */
export function stepsLabel(n: number, lang: Lang = atlas.get().lang): string {
  if (lang !== 'ar') return n === 1 ? '1 stop' : `${n} stops`;
  if (n === 1) return 'محطة واحدة';
  if (n === 2) return 'محطتان';
  return n >= 3 && n <= 10 ? `${n} محطات` : `${n} محطة`;
}

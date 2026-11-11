// Shared constants. Every module imports lens/view ids, severity order and icons from here.

export const LENSES = [
  { id: 'overview',    ar: 'النظرة العامة',          en: 'Overview',               icon: 'globe',   sub: { ar: 'الدول والأقاليم والاقتصاد', en: 'States, regions and economy' } },
  { id: 'conflicts',   ar: 'النزاعات ونقاط الاشتعال', en: 'Conflicts & flashpoints', icon: 'flame',   sub: { ar: '40 ملفاً بخمس مناطق', en: '40 files across five regions' } },
  { id: 'religion',    ar: 'التوزيع الديني',          en: 'Religion',               icon: 'pie',     sub: { ar: 'التركيب الديني لـ75 دولة', en: 'Religious composition, 75 countries' } },
  { id: 'ethnic',      ar: 'المجموعات العرقية',       en: 'Ethnic groups',          icon: 'people',  sub: { ar: 'نطاقات تقريبية إرشادية', en: 'Indicative core extents' } },
  { id: 'disputed',    ar: 'الأقاليم المتنازع عليها',  en: 'Disputed territories',   icon: 'hatch',   sub: { ar: 'من Natural Earth', en: 'From Natural Earth' } },
  { id: 'powers',      ar: 'القوى والتحالفات',        en: 'Powers & alliances',     icon: 'network', sub: { ar: 'التكتلات وشبكة العلاقات', en: 'Blocs and the relations web' } },
  { id: 'nuclear',     ar: 'النووي',                 en: 'Nuclear',                icon: 'atom',    sub: { ar: 'الأسلحة والاستخدام المدني والمعاهدات', en: 'Weapons, civil use, treaties' } },
  { id: 'resources',   ar: 'الموارد الاستراتيجية',    en: 'Strategic resources',    icon: 'gem',     sub: { ar: 'الطاقة والمعادن والغذاء', en: 'Energy, minerals, food' } },
  { id: 'chokepoints', ar: 'المضائق والممرات',        en: 'Chokepoints',            icon: 'anchor',  sub: { ar: 'تدفّق النفط والمخاطر', en: 'Oil flow and risk' } },
  { id: 'history',     ar: 'الخط الزمني',             en: 'Timeline',               icon: 'clock',   sub: { ar: '1900 — اليوم', en: '1900 — today' } },
  { id: 'borders',     ar: 'الحدود التاريخية',         en: 'Historical borders',     icon: 'borders', sub: { ar: 'الدول والمستعمرات 1886–2019', en: 'States and colonies, 1886–2019' } },
  { id: 'pipelines',   ar: 'أنابيب النفط والغاز',       en: 'Oil & gas pipelines',    icon: 'pipeline', sub: { ar: 'الخطوط العاملة وقيد الإنشاء', en: 'Operating and under construction' } },
  { id: 'industry',    ar: 'الطاقة والصناعة',         en: 'Power & industry',       icon: 'bolt',    sub: { ar: 'محطات الكهرباء والمناجم والمصانع', en: 'Power plants, mines and heavy industry' } },
] as const;

// Full-panel views that open over the stage.
export const VIEWS = [
  { id: 'network',  ar: 'شبكة العلاقات',          en: 'Relations network', icon: 'network' },
  { id: 'timeline', ar: 'الخط الزمني الكامل',      en: 'Full timeline',     icon: 'clock' },
  { id: 'compare',  ar: 'قارن بين دولتين',         en: 'Compare two states', icon: 'compare' },
  { id: 'sources',  ar: 'المصادر والمنهجية',       en: 'Sources & method',  icon: 'book' },
] as const;

// Severity, most to least violent. `shape` is the map marker's secondary encoding.
export const SEVERITY = [
  { id: 'war',            ar: 'حرب نشطة',          en: 'Active war',             shape: 'pulse' },
  { id: 'armed-conflict', ar: 'نزاع مسلح',          en: 'Armed conflict',         shape: 'disc' },
  { id: 'state-collapse', ar: 'انهيار دولة',        en: 'State collapse',         shape: 'square' },
  { id: 'high-tension',   ar: 'توتّر مرتفع',        en: 'High tension',           shape: 'ring' },
  { id: 'repression',     ar: 'قمع دولة',           en: 'State repression',       shape: 'diamond' },
  { id: 'frozen',         ar: 'نزاع مجمّد',         en: 'Frozen conflict',        shape: 'dashed' },
  { id: 'post-conflict',  ar: 'ما بعد النزاع',      en: 'Post-conflict',          shape: 'dot' },
  { id: 'political',      ar: 'ملفّ سياسي بلا عنف', en: 'Political, non-violent', shape: 'hollow' },
] as const;
export const SEVERITY_RANK: Record<string, number> = Object.fromEntries(SEVERITY.map((s, i) => [s.id, SEVERITY.length - i]));

export const DIMENSIONS = {
  political:   { ar: 'سياسي',    en: 'Political' },
  territorial: { ar: 'إقليمي',   en: 'Territorial' },
  economic:    { ar: 'اقتصادي',  en: 'Economic' },
  ideological: { ar: 'أيديولوجي', en: 'Ideological' },
  identity:    { ar: 'هوياتي',   en: 'Identity' },
};

export const CONFIDENCE = {
  verified: { ar: 'تم التحقّق', en: 'Verified', tone: 'good',
    note: { ar: 'الوضع الحالي وأحدث التطوّرات دُقّقت مقابل تقارير أساسية في التاريخ المذكور.', en: 'Current status and latest developments were checked against primary reporting on the stated date.' } },
  partial: { ar: 'يحتاج تحديثاً', en: 'Needs update', tone: 'warn',
    note: { ar: 'الخلفية والأسباب موثّقة، والوضع الحالي لم يُدقّق مقابل تقارير أساسية في هذه النسخة.', en: 'Background and causes are documented; the current status was not checked against primary reporting in this edition.' } },
};

export const CHOKE_STATUS = {
  stable:   { ar: 'مستقرّ', en: 'Stable',   tone: 'good' },
  elevated: { ar: 'مرتفع',  en: 'Elevated', tone: 'warn' },
  crisis:   { ar: 'أزمة',   en: 'Crisis',   tone: 'critical' },
};

// Nuclear status of a state (curated/nuclear.json). Military status: one per state; tone drives the map colour,
// `unconfirmed` adds hatching where the status rests on claims or reports rather than confirmation.
export const NUCLEAR_STATUS = {
  'npt-nws':      { ar: 'دولة نووية بموجب معاهدة عدم الانتشار', en: 'NPT nuclear-weapon state', tone: 'critical', strength: 0.85 },
  'non-npt':      { ar: 'دولة نووية خارج المعاهدة',            en: 'Nuclear-armed outside the NPT', tone: 'critical', strength: 0.55 },
  'undeclared':   { ar: 'ترسانة غير معلنة',                   en: 'Undeclared arsenal',          tone: 'critical', strength: 0.35, unconfirmed: true },
  'host':         { ar: 'تستضيف أسلحة أمريكية (الناتو)',        en: 'Hosts US weapons (NATO)',      tone: 'warn',     strength: 0.7 },
  'host-claimed': { ar: 'استضافة معلنة لأسلحة روسية',           en: 'Announced host of Russian weapons', tone: 'warn', strength: 0.45, unconfirmed: true },
  'contested':    { ar: 'برنامج موضع نزاع دولي',               en: 'Programme under international dispute', tone: 'accent', strength: 0.55 },
  'relinquished': { ar: 'تخلّت عن أسلحة نووية',                 en: 'Gave up nuclear weapons',      tone: 'good',     strength: 0.5 },
} as const;
// Civil use: power reactors.
export const NUCLEAR_CIVIL = {
  operating:    { ar: 'تشغّل مفاعلات طاقة',         en: 'Runs power reactors',       t: 0.85 },
  building:     { ar: 'تبني محطتها الأولى',          en: 'Building its first plant',  t: 0.45 },
  'phased-out': { ar: 'أوقفت مفاعلاتها',            en: 'Phased out',                t: 0 },
} as const;
// Reactor and plant status (curated/nuclear_plants.json): map marker shape follows the status.
export const NUCLEAR_UNIT = {
  operating: { ar: 'عامل',             en: 'Operating',          shape: 'disc' },
  suspended: { ar: 'متوقف مؤقتاً',      en: 'Idle',               shape: 'dashed' },
  building:  { ar: 'قيد الإنشاء',       en: 'Under construction', shape: 'ring' },
  shutdown:  { ar: 'مغلق نهائياً',       en: 'Permanently shut',   shape: 'hollow' },
} as const;
export const NUCLEAR_NPT = {
  nws:         { ar: 'طرف، دولة نووية معترف بها', en: 'Party, recognised nuclear-weapon state' },
  party:       { ar: 'طرف',                      en: 'Party' },
  'non-party': { ar: 'ليست طرفاً',                en: 'Not a party' },
  withdrawn:   { ar: 'أعلنت الانسحاب (2003)',     en: 'Announced withdrawal (2003)' },
} as const;

// Treaties (curated/nuclear.json `treaties`): each state's status under the NPT, the CTBT and the TPNW. The map
// colours a status by tone and strength over the land colour; `hatch` marks statuses with a caveat.
export const NUCLEAR_TREATIES = {
  npt:  { ar: 'معاهدة عدم الانتشار', short: { ar: 'عدم الانتشار', en: 'NPT' }, en: 'Non-Proliferation Treaty', year: 1968 },
  ctbt: { ar: 'معاهدة الحظر الشامل للتجارب النووية', short: { ar: 'حظر التجارب', en: 'CTBT' }, en: 'Comprehensive Nuclear-Test-Ban Treaty', year: 1996 },
  tpnw: { ar: 'معاهدة حظر الأسلحة النووية', short: { ar: 'حظر الأسلحة', en: 'TPNW' }, en: 'Treaty on the Prohibition of Nuclear Weapons', year: 2017 },
} as const;
export type TreatyId = keyof typeof NUCLEAR_TREATIES;
type TreatyStatus = { ar: string; en: string; tone: 'good' | 'warn' | 'critical' | 'accent'; strength: number; hatch?: boolean };
export const TREATY_STATUS: Record<TreatyId, Record<string, TreatyStatus>> = {
  npt: {
    nws:         { ar: 'طرف، دولة نووية معترف بها', en: 'Party, recognised nuclear-weapon state', tone: 'accent', strength: 0.6 },
    party:       { ar: 'طرف',                      en: 'Party',                                  tone: 'good',   strength: 0.45 },
    abiding:     { ar: 'ليست طرفاً وتعلن التزامها', en: 'Not a party, says it abides by it',      tone: 'good',   strength: 0.25, hatch: true },
    withdrawn:   { ar: 'انسحبت',                    en: 'Withdrew',                               tone: 'critical', strength: 0.6 },
    'non-party': { ar: 'لم تنضمّ قط',               en: 'Never joined',                           tone: 'warn',   strength: 0.6 },
  },
  ctbt: {
    ratified: { ar: 'صادقت',            en: 'Ratified',                  tone: 'good',     strength: 0.45 },
    signed:   { ar: 'وقّعت ولم تصادق',   en: 'Signed, not ratified',      tone: 'warn',     strength: 0.35 },
    revoked:  { ar: 'سحبت تصديقها',      en: 'Withdrew its ratification', tone: 'critical', strength: 0.6 },
    none:     { ar: 'لم توقّع',          en: 'Not signed',                tone: 'warn',     strength: 0.65 },
  },
  tpnw: {
    party:  { ar: 'طرف',              en: 'Party',                tone: 'good', strength: 0.45 },
    signed: { ar: 'وقّعت ولم تصادق',   en: 'Signed, not ratified', tone: 'good', strength: 0.2 },
  },
};

// Religion families: traditions roll up to these for the majority map. Order is the categorical slot order.
export const RELIGION_FAMILIES = [
  { id: 'islam',        ar: 'الإسلام',            en: 'Islam',          slot: 3, members: ['sunni', 'shia', 'islam_other'] },
  { id: 'christianity', ar: 'المسيحية',           en: 'Christianity',   slot: 1, members: ['catholic', 'orthodox', 'protestant', 'christian_other'] },
  { id: 'hindu',        ar: 'الهندوسية',          en: 'Hinduism',       slot: 2, members: ['hindu'] },
  { id: 'buddhist',     ar: 'البوذية',            en: 'Buddhism',       slot: 4, members: ['buddhist'] },
  { id: 'jewish',       ar: 'اليهودية',           en: 'Judaism',        slot: 7, members: ['jewish'] },
  { id: 'minority',     ar: 'السيخية والدرزية والإيزيدية', en: 'Sikh, Druze, Yazidi', slot: 5, members: ['sikh', 'druze', 'yazidi'] },
  { id: 'folk',         ar: 'الأديان التقليدية والشعبية', en: 'Traditional & folk', slot: 8, members: ['traditional_african', 'indigenous_other', 'folk'] },
  { id: 'none',         ar: 'بلا انتماء ديني وأخرى', en: 'Unaffiliated & other', slot: 0, members: ['nonreligious', 'other'] },
];

// Relation edge types → categorical slot (fixed order, never cycled).
export const EDGE_SLOT: Record<string, number> = { alliance: 3, military: 1, economic: 4, influence: 7, proxy: 2, rivalry: 8, territorial: 5, diplomatic: 6 };

// Resource types roll up to five classes; the class carries color, the type carries the glyph letter.
export const RESOURCE_CLASSES = [
  { id: 'energy',   ar: 'الطاقة',          en: 'Energy',            slot: 2, members: ['oil', 'gas', 'oil-shale', 'uranium', 'coal', 'hydropower', 'geothermal'] },
  { id: 'critical', ar: 'المعادن الحرجة',   en: 'Critical minerals', slot: 1, members: ['rare-earths', 'cobalt', 'coltan', 'lithium', 'nickel', 'copper', 'graphite', 'manganese', 'platinum', 'chromium', 'tungsten', 'bauxite', 'iron-ore'] },
  { id: 'precious', ar: 'المعادن والأحجار الثمينة', en: 'Precious metals & stones', slot: 4, members: ['gold', 'jade', 'silver', 'diamonds'] },
  { id: 'food',     ar: 'الغذاء والماء والأسمدة', en: 'Food, water, fertiliser', slot: 3, members: ['water', 'grain', 'potash', 'phosphate', 'bromine', 'cocoa', 'coffee', 'palm-oil', 'fisheries'] },
  { id: 'tech',     ar: 'التقنية',          en: 'Technology',        slot: 7, members: ['semiconductors'] },
];

// Selection kinds and their hash prefixes: #country-SAU, #conflict-sudan, #group-kurds …
export const KINDS = ['country', 'conflict', 'group', 'religion', 'choke', 'disputed', 'event', 'bloc', 'site', 'plant', 'border', 'pipeline', 'lng', 'field', 'station', 'facility'] as const;

// 24×24 stroke icons (stroke = currentColor). Use ui.icon(name).
export const ICONS: Record<string, string> = {
  globe:   '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
  flat:    '<rect x="3" y="6" width="18" height="12" rx="6"/><path d="M3 12h18M12 6v12"/>',
  flame:   '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.3 3.8-8.3.4 2 1.6 3.2 2.7 3.6.3-2.5 1.4-4.6 3.2-6.1-.2 3 2.3 5.4 2.3 9 0 4.4-2.4 8-5.5 8z"/>',
  pie:     '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.4 6.4M12 12H3"/>',
  people:  '<circle cx="9" cy="8.5" r="3"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5M14.6 14.3c.6-.2 1.2-.3 1.9-.3 2.2 0 3.8 1.4 4.2 4"/>',
  hatch:   '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12l8-8M4 20L20 4M12 20l8-8"/>',
  network: '<circle cx="6" cy="7" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="17.5" r="2.4"/><path d="M8 7.8l2.8 7.6M16.6 7.8l-3.4 7.7M8.2 6.8l7.6-.6"/>',
  borders: '<path d="M4 5.5l5-2 6 2 5-2v15l-5 2-6-2-5 2z"/><path d="M9 3.5v15M15 5.5v15" stroke-dasharray="2 2"/>',
  pipeline: '<path d="M3 8h7a3 3 0 0 1 3 3v2a3 3 0 0 0 3 3h5"/><path d="M3 5.5v5M21 13.5v5M7.5 6v4"/>',
  lng:     '<path d="M12 3.5c3 3.6 5 6.4 5 9.2a5 5 0 0 1-10 0c0-2.8 2-5.6 5-9.2z"/><path d="M9.6 14.2c.4 1.3 1.3 2 2.6 2.2"/>',
  derrick: '<path d="M8 21l4-17 4 17M9.4 15h5.2M10.6 10h2.8M5 21h14"/>',
  bolt:    '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  list:    '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
  factory: '<path d="M3 21V10l5 3V10l5 3V10l5 3V4h3v17z"/><path d="M7 17h2M12 17h2M17 17h2"/>',
  atom:    '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-60 12 12)"/>',
  gem:     '<path d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18M9.5 4L8 9l4 11 4-11-1.5-5"/>',
  anchor:  '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M8 10h8M4.5 13.5C5 17.5 8.3 20 12 20s7-2.5 7.5-6.5"/>',
  clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  search:  '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  close:   '<path d="M6 6l12 12M18 6L6 18"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  plus:    '<path d="M12 5v14M5 12h14"/>',
  minus:   '<path d="M5 12h14"/>',
  home:    '<path d="M4 11l8-6.5 8 6.5M6.5 9.5V19h11V9.5"/>',
  layers:  '<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.3L12 20.8l8.5-4.5"/>',
  play:    '<path d="M8 5.5v13l10.5-6.5z"/>',
  pause:   '<path d="M8 5v14M16 5v14"/>',
  compare: '<rect x="3.5" y="4" width="7" height="16" rx="1.5"/><rect x="13.5" y="4" width="7" height="16" rx="1.5"/>',
  book:    '<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/>',
  route:   '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 18h7.5a3 3 0 000-6h-7a3 3 0 010-6H16"/>',
  sun:     '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  moon:    '<path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z"/>',
  auto:    '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17A8.5 8.5 0 0012 3.5z" fill="currentColor"/>',
  lang:    '<path d="M4 6h9M8.5 4v2c0 4-2 7-4.5 8.5M6 10c1.2 2 3.2 3.6 5.5 4.5M13.5 20l3.5-9 3.5 9M14.7 17h4.6"/>',
  link:    '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  info:    '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  keys:    '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.5M9.5 10h.5M13 10h.5M16.5 10h1M7 14h10"/>',
  target:  '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  filter:  '<path d="M4 5h16l-6.2 7.4V19l-3.6-1.8v-4.8z"/>',
  lock:    '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>',
  alert:   '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  check:   '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  external:'<path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5"/>',
  menu:    '<path d="M4 7h16M4 12h16M4 17h16"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  swap:    '<path d="M7 7h12l-3.5-3.5M17 17H5l3.5 3.5"/>',
  spark:   '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
};

export type LensId = (typeof LENSES)[number]['id'];
export type ViewId = (typeof VIEWS)[number]['id'];
export type SeverityId = (typeof SEVERITY)[number]['id'];
export type Kind = (typeof KINDS)[number];

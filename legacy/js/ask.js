// "Ask Claude" panel: viewers ask questions; Claude answers from the atlas data through page tools
// (search, read a record, list records, show on map) on the viewer's own Claude account.
// The feature stays hidden unless the viewer's host serves the `sample` capability.

import { state, on, set, select, highlight, toast } from './store.js';
import { t, L, Lk, registerStrings, fmtDate } from './i18n.js';
import { esc, icon } from './ui.js';
import { LENSES, SEVERITY, CONFIDENCE, CHOKE_STATUS, DIMENSIONS, KINDS } from './config.js';

registerStrings({
  ar: {
    'sh.ask': 'اسأل Claude',
    'ask.title': 'اسأل Claude عن الأطلس',
    'ask.sub': 'إجابات من بيانات الأطلس، والوضع حتى {date}',
    'ask.new': 'محادثة جديدة',
    'ask.ph': 'اكتب سؤالك… مثلاً: ما النزاعات النشطة في القرن الأفريقي؟',
    'ask.send': 'أرسل',
    'ask.stop': 'أوقف',
    'ask.you': 'أنت',
    'ask.claude': 'Claude',
    'ask.thinking': 'يفكّر…',
    'ask.searching': 'يبحث في الأطلس عن «{q}»…',
    'ask.reading': 'يقرأ ملف: {name}…',
    'ask.listing': 'يستعرض {what}…',
    'ask.showing': 'يعرض {name} على الخريطة…',
    'ask.stopped': 'أُوقفت الإجابة.',
    'ask.cut': 'الإجابة قُطعت لطولها. اطلب جزءاً أصغر.',
    'ask.retry': 'أعد المحاولة',
    'ask.foot': 'تُحتسب الأسئلة من استخدامك لحساب Claude. قد يخطئ Claude، فتحقّق من الملف المرتبط.',
    'ask.emptyH': 'اسأل عن أي دولة أو نزاع أو تحالف',
    'ask.emptyP': 'يقرأ Claude ملفات الأطلس قبل أن يجيب، ويضع روابط تفتح السجلّ على الخريطة.',
    'ask.e.denied': 'لم يُسمح للأطلس باستخدام Claude في هذا العرض.',
    'ask.e.rate': 'طلبات كثيرة أو بلغت حدّ الاستخدام. حاول بعد قليل.',
    'ask.e.session': 'انتهت الجلسة. سجّل الدخول من جديد ثم أعد المحاولة.',
    'ask.e.refused': 'لم يُجب Claude عن هذا السؤال. جرّب صياغة أخرى.',
    'ask.e.empty': 'لم تصل إجابة. جرّب سؤالاً أقصر.',
    'ask.e.large': 'المحادثة طويلة جداً. ابدأ محادثة جديدة.',
    'ask.e.tools': 'هذا العرض لا يتيح لـClaude قراءة الأطلس مباشرة. أعد إرسال السؤال ليُجيب من ملخّص الأطلس.',
    'ask.e.other': 'انقطع الاتصال قبل اكتمال الإجابة.',
    'ask.s.hot': 'أين الحروب النشطة الآن، وما الذي يجمع بينها؟',
    'ask.s.choke': 'أي المضائق في أزمة، وما أثر ذلك على النفط؟',
    'ask.s.compare': 'قارن بين السعودية وإيران في التحالفات والنزاعات.',
    'ask.s.kurds': 'أين يعيش الكرد، وما الملفات المرتبطة بهم؟',
    'ask.s.country': 'ما أهم ما يجب معرفته عن {name}؟',
    'ask.s.countryRel': 'من حلفاء {name} وخصومها؟',
    'ask.s.conflict': 'لخّص «{name}» في خمس نقاط.',
    'ask.s.conflictExt': 'من القوى الخارجية في «{name}» ولماذا؟',
    'ask.s.other': 'اشرح «{name}» وأهميته.',
  },
  en: {
    'sh.ask': 'Ask Claude',
    'ask.title': 'Ask Claude about the atlas',
    'ask.sub': 'Answers from the atlas data; status as of {date}',
    'ask.new': 'New conversation',
    'ask.ph': 'Ask a question… e.g. which conflicts are active in the Horn of Africa?',
    'ask.send': 'Send',
    'ask.stop': 'Stop',
    'ask.you': 'You',
    'ask.claude': 'Claude',
    'ask.thinking': 'Thinking…',
    'ask.searching': 'Searching the atlas for “{q}”…',
    'ask.reading': 'Reading the file on {name}…',
    'ask.listing': 'Going through {what}…',
    'ask.showing': 'Showing {name} on the map…',
    'ask.stopped': 'Answer stopped.',
    'ask.cut': 'The answer was cut short. Ask for a smaller part.',
    'ask.retry': 'Try again',
    'ask.foot': 'Questions use your own Claude account. Claude can make mistakes, so check the linked file.',
    'ask.emptyH': 'Ask about any state, conflict or alliance',
    'ask.emptyP': 'Claude reads the atlas files before answering and links each record so you can open it on the map.',
    'ask.e.denied': 'This atlas is not allowed to use Claude in this view.',
    'ask.e.rate': 'Too many requests, or your usage limit was reached. Try again in a little while.',
    'ask.e.session': 'Your session ended. Sign in again, then retry.',
    'ask.e.refused': 'Claude did not answer this question. Try rewording it.',
    'ask.e.empty': 'No answer came back. Try a shorter question.',
    'ask.e.large': 'The conversation is too long. Start a new one.',
    'ask.e.tools': 'This view does not let Claude read the atlas directly. Send the question again to get an answer from the atlas summary.',
    'ask.e.other': 'The connection dropped before the answer finished.',
    'ask.s.hot': 'Where are the active wars right now, and what do they have in common?',
    'ask.s.choke': 'Which chokepoints are in crisis, and what does that mean for oil?',
    'ask.s.compare': 'Compare Saudi Arabia and Iran on alliances and conflicts.',
    'ask.s.kurds': 'Where do the Kurds live, and which files involve them?',
    'ask.s.country': 'What are the most important things to know about {name}?',
    'ask.s.countryRel': 'Who are {name}’s allies and rivals?',
    'ask.s.conflict': 'Summarise “{name}” in five points.',
    'ask.s.conflictExt': 'Which outside powers are involved in “{name}”, and why?',
    'ask.s.other': 'Explain “{name}” and why it matters.',
  },
});

let DB, root, sample = null, toolsOk = false;
let turns = [];          // [{role, content}] sent to Claude — the page keeps the conversation; Claude remembers nothing
let log = [];            // [{who: 'me'|'ai', text}] what the panel shows
let ctl = null;          // AbortController of the running call
let live = null;         // {text, progress, error, retry} for the answer being written
const MAX_TURNS = 8;
const REF_RE = /\[\[(country|conflict|group|religion|choke|disputed|event|bloc|site):([A-Za-z0-9_\-]+)\]\]/g;

export function initAsk(el, db) {
  DB = db; root = el;
  const c = window.claude;
  if (c && typeof c.use === 'function') {
    c.use('sample').then(async (s) => {
      if (!s) return;
      sample = s;
      const lim = await s.limits().catch(() => null);
      toolsOk = !!lim?.tools;
      set({ askReady: true });
    }).catch(() => {});
  }
  on('change', ({ keys }) => {
    if (keys.includes('ask') || keys.includes('askReady')) { toggle(); return; }
    if (state.ask && keys.some((k) => ['lang', 'selection'].includes(k))) render();
  });
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  root.addEventListener('pointerover', (e) => {
    const r = e.target.closest?.('.ask-ref');
    if (r) highlight({ iso3: DB.countriesOf(r.dataset.kind, r.dataset.id) });
  });
  root.addEventListener('pointerout', (e) => { if (e.target.closest?.('.ask-ref')) highlight(null); });
}

function toggle() {
  const open = !!(state.ask && state.askReady && sample);
  root.hidden = !open;
  if (!open) { if (!state.askReady) ctl?.abort(); return; }
  render();
  requestAnimationFrame(() => root.querySelector('#ask-input')?.focus());
}

// ------------------------------------------------------------------ rendering

function render() {
  const inputVal = root.querySelector('#ask-input')?.value ?? '';
  root.innerHTML = `
    <section class="ask" role="dialog" aria-modal="false" aria-labelledby="ask-h">
      <header class="ask-head">
        <span class="ask-mark">${icon('spark', 18)}</span>
        <div class="ask-tt"><h2 id="ask-h">${esc(t('ask.title'))}</h2><p>${esc(t('ask.sub', { date: fmtDate(DB.conflictsAsOf) }))}</p></div>
        <button type="button" class="btn ghost icon" data-a="new" aria-label="${esc(t('ask.new'))}" data-tip="${esc(esc(t('ask.new')))}"${log.length || live ? '' : ' disabled'}>${icon('plus', 17)}</button>
        <button type="button" class="btn ghost icon" data-a="close" aria-label="${esc(t('close'))}">${icon('close', 17)}</button>
      </header>
      <div class="ask-log scroll" id="ask-log" aria-live="polite">${log.length || live ? logHTML() : emptyHTML()}</div>
      <form class="ask-form" id="ask-form">
        <label class="vh" for="ask-input">${esc(t('ask.title'))}</label>
        <textarea id="ask-input" rows="2" maxlength="1200" placeholder="${esc(t('ask.ph'))}"${ctl ? ' disabled' : ''}></textarea>
        ${ctl
          ? `<button type="button" class="btn ask-stop" data-a="stop">${icon('pause', 16)}<span>${esc(t('ask.stop'))}</span></button>`
          : `<button type="submit" class="btn primary ask-send"><span class="flip">${icon('chevron', 16)}</span><span>${esc(t('ask.send'))}</span></button>`}
      </form>
      <p class="ask-foot">${icon('info', 13)}<span>${esc(t('ask.foot'))}</span></p>
    </section>`;
  const ta = root.querySelector('#ask-input');
  if (ta) ta.value = inputVal;
  scrollLog();
}

function emptyHTML() {
  return `<div class="ask-empty">
      <p class="ask-empty-h">${esc(t('ask.emptyH'))}</p>
      <p class="ask-empty-p">${esc(t('ask.emptyP'))}</p>
      <ul class="ask-sugg">${suggestions().map((q) => `<li><button type="button" class="ask-s" data-q="${esc(q)}"><span class="flip">${icon('chevron', 14)}</span><span>${esc(q)}</span></button></li>`).join('')}</ul>
    </div>`;
}

function suggestions() {
  const s = state.selection;
  const name = s && DB.exists(s.kind, s.id) ? DB.nameOf(s.kind, s.id, state.lang) : null;
  const out = [];
  if (name && s.kind === 'country') out.push(t('ask.s.country', { name }), t('ask.s.countryRel', { name }));
  else if (name && s.kind === 'conflict') out.push(t('ask.s.conflict', { name }), t('ask.s.conflictExt', { name }));
  else if (name) out.push(t('ask.s.other', { name }));
  out.push(t('ask.s.hot'), t('ask.s.choke'), t('ask.s.compare'), t('ask.s.kurds'));
  return out.slice(0, 5);
}

function logHTML() {
  const rows = log.map((m) => (m.who === 'me'
    ? `<div class="ask-msg me"><span class="ask-who">${esc(t('ask.you'))}</span><p>${esc(m.text)}</p></div>`
    : `<div class="ask-msg ai"><span class="ask-who">${icon('spark', 13)}${esc(t('ask.claude'))}</span><div class="ask-md">${formatAnswer(m.text)}</div></div>`));
  if (live) {
    const body = live.text ? `<div class="ask-md">${formatAnswer(live.text)}</div>` : '';
    const prog = ctl ? `<p class="ask-prog"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>${esc(live.progress || t('ask.thinking'))}</p>` : '';
    const err = live.error ? `<p class="ask-err">${icon('alert', 14)}<span>${esc(live.error)}</span>${live.retry ? `<button type="button" class="btn ghost" data-a="retry">${esc(t('ask.retry'))}</button>` : ''}</p>` : '';
    rows.push(`<div class="ask-msg ai live"><span class="ask-who">${icon('spark', 13)}${esc(t('ask.claude'))}</span>${body}${prog}${err}</div>`);
  }
  return rows.join('');
}

/** Escaped answer text → paragraphs, bullets, bold and record links. Only [[kind:id]] that exist become links. */
function formatAnswer(text) {
  const inline = (s) => esc(s)
    .replace(REF_RE, (m, kind, id) => (DB.exists(kind, id)
      ? `<button type="button" class="ask-ref" data-kind="${kind}" data-id="${esc(id)}">${esc(DB.nameOf(kind, id, state.lang))}</button>`
      : ''))
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  const blocks = String(text).replace(/\r/g, '').split(/\n{2,}/);
  return blocks.map((b) => {
    const lines = b.split('\n').filter((l) => l.trim());
    if (!lines.length) return '';
    if (lines.every((l) => /^\s*([-•*]|\d+[.)])\s+/.test(l))) {
      const ordered = /^\s*\d/.test(lines[0]);
      const items = lines.map((l) => `<li>${inline(l.replace(/^\s*([-•*]|\d+[.)])\s+/, ''))}</li>`).join('');
      return ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
    }
    return `<p>${lines.map((l) => inline(l.replace(/^#+\s*/, ''))).join('<br>')}</p>`;
  }).join('');
}

function updateLive() {
  const log = root.querySelector('#ask-log');
  if (!log) return;
  log.innerHTML = logHTML();
  scrollLog();
}
function scrollLog() { const log = root.querySelector('#ask-log'); if (log) log.scrollTop = log.scrollHeight; }

// ------------------------------------------------------------------ events

function onClick(e) {
  const a = e.target.closest('[data-a]')?.dataset.a;
  if (a === 'close') { set({ ask: false }); return; }
  if (a === 'stop') { ctl?.abort(); return; }
  if (a === 'new') { ctl?.abort(); turns = []; log = []; live = null; render(); root.querySelector('#ask-input')?.focus(); return; }
  if (a === 'retry') { ask(null); return; }
  const s = e.target.closest('.ask-s');
  if (s) { ask(s.dataset.q); return; }
  const r = e.target.closest('.ask-ref');
  if (r) { select(r.dataset.kind, r.dataset.id); return; }
}

function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); set({ ask: false }); return; }
  if (e.target.id === 'ask-input' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    const q = e.target.value.trim();
    if (q && !ctl) ask(q);
  }
}

addEventListener('submit', (e) => {
  if (e.target.id !== 'ask-form') return;
  e.preventDefault();
  const q = root.querySelector('#ask-input')?.value.trim();
  if (q && !ctl) ask(q);
});

// ------------------------------------------------------------------ asking

/** Ask a new question, or (q = null) resend the conversation after a failure. */
async function ask(q) {
  if (!sample || ctl) return;
  if (q) {
    turns.push({ role: 'user', content: contextFor(q), q });
    log.push({ who: 'me', text: q });
    while (turns.length > MAX_TURNS) turns.shift();
    while (turns.length && turns[0].role !== 'user') turns.shift();
  }
  if (!turns.length || turns[turns.length - 1].role !== 'user') return;
  const last = turns[turns.length - 1];
  if (!q && last.q) last.content = contextFor(last.q); // a retry rebuilds the context (it may now need the atlas index)
  ctl = new AbortController();
  const mine = ctl;
  live = { text: '', progress: '', error: '', retry: false };
  render();
  const input = [{ role: 'user', content: rules() }, ...turns.map(({ role, content }) => ({ role, content }))];
  const opts = {
    signal: mine.signal,
    modelTier: 'default',
    onText: ({ text }) => { if (live) { live.text = text; live.progress = ''; updateLive(); } },
  };
  if (toolsOk) opts.tools = TOOLS; else opts.cache = false;
  try {
    const res = await sample(input, opts);
    turns.push({ role: 'assistant', content: res.text });
    log.push({ who: 'ai', text: res.text });
    live = res.truncated ? { text: '', progress: '', error: t('ask.cut'), retry: false } : null;
  } catch (err) {
    handleError(err);
  } finally {
    if (ctl === mine) ctl = null;
    if (state.ask) render();
  }
}

function handleError(err) {
  const code = err?.code || 'upstream_error';
  const kept = err?.text || '';
  const fail = (msg, retry = false, text = kept) => { live = { text, progress: '', error: msg, retry }; };
  switch (code) {
    case 'cancelled':
      if (kept) { turns.push({ role: 'assistant', content: kept }); log.push({ who: 'ai', text: kept }); }
      live = { text: '', progress: '', error: t('ask.stopped'), retry: false };
      break;
    case 'not_granted': case 'sampling_disabled': case 'not_declared': case 'capability_disabled': case 'capability_removed':
      live = null; turns = []; log = [];
      toast(t('ask.e.denied'));
      set({ ask: false, askReady: false });
      break;
    case 'tools_unavailable': toolsOk = false; fail(t('ask.e.tools'), true, ''); break;
    case 'rate_limited': fail(t('ask.e.rate'), true); break;
    case 'session_expired': fail(t('ask.e.session'), true); break;
    case 'refused': fail(t('ask.e.refused'), false, ''); dropLastQuestion(); break;
    case 'empty_completion': fail(t('ask.e.empty'), false, ''); dropLastQuestion(); break;
    case 'prompt_too_large': fail(t('ask.e.large'), false, ''); break;
    default: fail(t('ask.e.other'), true);
  }
}

/** A question Claude declined stays on screen but leaves the conversation, so the next question starts clean. */
function dropLastQuestion() {
  if (turns[turns.length - 1]?.role === 'user') turns.pop();
}

// ------------------------------------------------------------------ prompt

function rules() {
  const ar = state.lang === 'ar';
  return `You are the question-and-answer assistant inside «أطلس خطوط الصدع / Fault Lines Atlas», an interactive atlas of the world's political, ethnic and religious fault lines.
Its data: ${DB.stats.countries} countries and territories (Natural Earth), ${DB.stats.conflicts} conflict files, ${DB.stats.groups} ethnic groups (indicative areas, not boundaries), religious composition for ${DB.stats.religionCountries} countries, ${DB.stats.edges} typed relations between states and ${DB.stats.blocs} blocs, ${DB.stats.chokepoints} maritime chokepoints, strategic resources and ${DB.stats.sites} resource sites, ${DB.stats.disputed} disputed areas, and ${DB.stats.events} timeline events since 1900. The data was compiled by the original «الأطلس الجيوسياسي والعرقي الديني العالمي» (CC-BY-4.0). Conflict status and latest developments are as of ${DB.conflictsAsOf}; this edition did not independently verify them, and records with "unverified": true contain developments after mid-2026.

How to answer:
- Ground every factual claim in the atlas.${toolsOk ? ' Use the tools to search and read the relevant records before you answer.' : ' Use the atlas index and records included with the question.'} Do not rely on memory for current events. You may add brief general background (definitions, well-established history) when it helps, but never invent current developments, figures or quotes.
- If the atlas has nothing on the question, say so in one sentence and point to the closest records it does have.
- When you give a current status, give its as-of date. When a record is flagged unverified, say the atlas has not been independently checked on that point.
- Stay neutral: present contested claims as the position of whoever holds them. Do not take sides.
- Reply in ${ar ? 'Arabic' : 'English'}, unless the question is written in another language; then reply in that language.
- Be brief: 2 to 5 short paragraphs or a short list, under about 220 words, unless the viewer asks for more.
- Mention atlas records with tokens such as [[country:SAU]], [[conflict:sudan]], [[choke:hormuz]] (kinds: ${KINDS.join(', ')}), using only refs that appear in the atlas data you were given; the page turns each token into a link showing the record's name, so do not repeat the name next to the token. Use a token the first time a record comes up, not on every mention.
- Format: plain text, "- " bullets, **bold** sparingly. No headings, tables or code blocks.${toolsOk ? '\n- If the viewer asks to see something on the map, call show_on_map.' : ''}`;
}

function contextFor(q) {
  const lens = LENSES.find((l) => l.id === state.lens);
  const s = state.selection && DB.exists(state.selection.kind, state.selection.id) ? state.selection : null;
  let ctx = `[Viewer context — interface language: ${state.lang === 'ar' ? 'Arabic' : 'English'}; map lens: ${lens?.en || state.lens}; selected on the map: ${s ? `${s.kind}:${s.id} (${DB.nameOf(s.kind, s.id, 'en')})` : 'nothing'}]`;
  if (!toolsOk) {
    ctx += `\n[Atlas index]\n${JSON.stringify(atlasIndex())}`;
    if (s) ctx += `\n[Selected record]\n${JSON.stringify(record(s.kind, s.id))}`;
  }
  return `${ctx}\n\nQuestion: ${q}`;
}

// ------------------------------------------------------------------ tools (run in the page)

const cut = (s, n = 1400) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n) + '…' : s; };
const ref = (kind, id) => `${kind}:${id}`;
const nm = (kind, id) => DB.nameOf(kind, id, state.lang);
const sevLabel = (id) => SEVERITY.find((x) => x.id === id)?.en || id;

function parseRef(r) {
  const m = /^(\w+):(.+)$/.exec(String(r || '').trim());
  if (!m || !KINDS.includes(m[1])) throw new Error('ref must look like "kind:id", e.g. "country:SAU" or "conflict:sudan"');
  if (!DB.exists(m[1], m[2])) throw new Error(`no atlas record ${m[1]}:${m[2]} — search first`);
  return [m[1], m[2]];
}

/** Compact, current-language record for Claude. */
function record(kind, id) {
  const x = DB.get(kind, id);
  const unverified = DB.isUnverified(kind, id) || undefined;
  if (kind === 'country') {
    const r = x.religion;
    return {
      ref: ref(kind, id), name_ar: x.nameAr, name_en: x.nameEn, type: x.type, region: `${x.continent} · ${x.subregion}`,
      population: x.pop && { value: x.pop, year: x.popYear }, gdp_million_usd: x.gdp && { value: x.gdp, year: x.gdpYear },
      gdp_per_capita_usd: x.gdpPerCap && Math.round(x.gdpPerCap), area_km2: Math.round(x.areaKm2), income_group: x.income,
      political_system: x.intel && L(x.intel.system), languages: x.intel && L(x.intel.langs),
      separatist_or_autonomy_movements: x.intel?.separatists?.map(L), territorial_disputes: x.intel?.disputes?.map(L),
      religion: r ? { source: r.source, year: r.year, contested: !!r.contested, note: L(r.note),
        shares_pct: Object.fromEntries(r.sorted.map(([tid, p]) => [DB.religion.traditionById.get(tid)?.en || tid, p])) } : 'no estimate in this edition',
      ethnic_groups: x.groups.map((g) => ref('group', g)),
      conflicts_party_to: x.conflicts.map((c) => ({ ref: ref('conflict', c), severity: sevLabel(DB.conflictById.get(c)?.severity) })),
      involved_as_external_power: x.external.map((c) => ({ ref: ref('conflict', c), role: L(DB.conflictById.get(c)?.externalPowers?.find((e) => e.iso3 === id)?.role) })),
      blocs: x.blocs.filter((b) => DB.relations.blocById.has(b)).map((b) => ref('bloc', b)),
      relations: x.edges.map((eid) => DB.edgeById.get(eid)).filter(Boolean).slice(0, 24)
        .map((e) => ({ partner: ref('country', e.a === id ? e.b : e.a), type: e.type, kind: e.kind, contested: e.contested || undefined, note: cut(L(e), 240) })),
      resources: x.resources.map((e) => ({ type: e.type, world_rank: e.rank, year: e.year, note: cut(L(e), 240) })),
      chokepoints_bordered: x.chokepoints.map((c) => ref('choke', c)),
      timeline_events: x.events.slice(-12).map((e) => ({ ref: ref('event', e), date: DB.eventById.get(e)?.date })),
      unverified,
    };
  }
  if (kind === 'conflict') {
    return {
      ref: ref(kind, id), name: L(x.name), region: L(x.regionName), severity: sevLabel(x.severity), started: x.started,
      current_phase_since: x.currentPhaseStarted, countries: x.countries.map((c) => ref('country', c)),
      dimensions: x.dimensions.map((d) => DIMENSIONS[d]?.en || d), dimension_note: cut(L(x.dimensionNote)),
      parties: L(x.parties), ethno_religious: cut(L(x.ethnoReligious)), history: cut(L(x.history), 1800),
      political_causes: cut(L(x.politicalCauses)), territorial_claims: cut(L(x.territorialClaims)),
      strategic_interests: cut(L(x.strategicInterests)),
      external_powers: (x.externalPowers || []).map((e) => ({ country: ref('country', e.iso3), role: L(e.role), kind: e.kind })),
      status: cut(L(x.status), 1800), status_as_of: x.statusAsOf || DB.conflictsAsOf,
      recent: (x.recent || []).slice(0, 6).map((r) => ({ date: r.date, text: cut(L(r), 500), source: r.source })),
      confidence: CONFIDENCE[x.confidence]?.en || x.confidence,
      related_events: (x.events || []).map((e) => ref('event', e)), related_chokepoints: (x.chokepoints || []).map((c) => ref('choke', c)),
      sources: (x.sourceRefs || []).map((s) => L(DB.referenceById.get(s)?.name) || s),
      unverified,
    };
  }
  if (kind === 'group') return { ref: ref(kind, id), name: Lk(x, 'name'), family: x.family, language: Lk(x, 'lang'), region: Lk(x, 'region'), countries: x.countries.map((c) => ref('country', c)), note: Lk(x, 'note'), caveat: Lk(DB.ethnic.meta, 'warning') };
  if (kind === 'religion') {
    const rows = Object.entries(DB.religion.countries).map(([iso, v]) => [iso, v.groups[id] || 0]).filter(([, p]) => p >= 1).sort((a, b) => b[1] - a[1]).slice(0, 25);
    return { ref: ref(kind, id), name: L(x), family: x.parent, countries_by_share_pct: rows.map(([iso, p]) => ({ country: ref('country', iso), pct: p })), coverage: L(DB.religion.coverageNote) };
  }
  if (kind === 'choke') {
    return { ref: ref(kind, id), name: L(x), status: CHOKE_STATUS[x.status]?.en || x.status, width: Lk(x, 'widthKm'), oil_flow_mb_per_day: x.oilFlowMbd, flow_year: x.flowYear,
      importance: Lk(x, 'shareNote'), border_states: (x.borderStates || []).map((c) => ref('country', c)), alternatives: Lk(x, 'alternatives'), current_risk: Lk(x, 'risk'),
      related_conflicts: (x.conflictIds || []).map((c) => ref('conflict', c)), unverified };
  }
  if (kind === 'disputed') return { ref: ref(kind, id), name_ar: x.nameAr, name_en: x.nameEn, administered_by: x.admin, natural_earth_note: x.note || undefined };
  if (kind === 'event') {
    return { ref: ref(kind, id), title: L(x), date: x.date, categories: (x.cat || []).map((c) => DB.timeline.catById.get(c)?.en || c),
      countries: (x.countries || []).map((c) => ref('country', c)), summary: Lk(x, 'sum'), related_conflicts: (x.conflictIds || []).map((c) => ref('conflict', c)), unverified };
  }
  if (kind === 'bloc') return { ref: ref(kind, id), name: L(x), members: x.members.map((c) => ref('country', c)), note: x.note ? L(x.note) : undefined };
  if (kind === 'site') return { ref: ref(kind, id), name: L(x), type: DB.resources.typeById.get(x.type)?.en || x.type, country: ref('country', x.iso3), note: Lk(x, 'note') };
  return { ref: ref(kind, id) };
}

/** Small index sent with every question when this view cannot run page tools. */
function atlasIndex() {
  return {
    conflicts: DB.conflicts.map((c) => [ref('conflict', c.id), c.name.en, sevLabel(c.severity)]),
    chokepoints: DB.chokepoints.map((p) => [ref('choke', p.id), p.en, p.status]),
    blocs: DB.relations.blocs.map((b) => [ref('bloc', b.id), b.en]),
    ethnic_groups: [...DB.ethnic.groups.values()].map((g) => [ref('group', g.id), g.nameEn]),
  };
}

const LISTABLE = ['conflict', 'choke', 'bloc', 'group', 'religion', 'event', 'disputed', 'site'];

const TOOLS = [
  {
    name: 'search_atlas',
    description: 'Search atlas records by name in Arabic or English (countries, conflicts, ethnic groups, religions, chokepoints, disputed areas, events, blocs, resource sites). Returns up to 12 matches as {ref, name_ar, name_en}. Use it to find the ref of anything the viewer mentions.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'A name or part of one, e.g. "Hormuz", "الكرد", "Sudan"' } }, required: ['query'] },
    execute(input) {
      const q = String(input?.query || '').trim();
      progress(t('ask.searching', { q: q.slice(0, 40) }));
      const hits = DB.search(q, 12);
      if (!hits.length) return { matches: [], hint: 'No match. Try a shorter name, the other language, or list_records.' };
      return { matches: hits.map((e) => ({ ref: ref(e.kind, e.id), name_ar: e.ar, name_en: e.en })) };
    },
  },
  {
    name: 'get_record',
    description: 'Read one atlas record in full (facts, status with its as-of date, causes, parties, relations, religion shares, related records). Input: ref like "country:SAU" (ISO3), "conflict:sudan", "choke:hormuz", "group:kurds", "bloc:nato", "event:wwi". Returns a JSON object; "unverified": true means its latest developments were not independently checked.',
    inputSchema: { type: 'object', properties: { ref: { type: 'string' } }, required: ['ref'] },
    execute(input) {
      const [kind, id] = parseRef(input?.ref);
      progress(t('ask.reading', { name: nm(kind, id) }));
      return record(kind, id);
    },
  },
  {
    name: 'list_records',
    description: `List every record of one kind with a short label, optionally filtered. kind: ${LISTABLE.join(', ')}. For conflicts, severity is one of ${SEVERITY.map((s) => s.id).join(', ')} and region one of middle-east, europe, asia, africa, americas. For events, from_year/to_year filter by year.`,
    inputSchema: {
      type: 'object',
      properties: { kind: { type: 'string', enum: LISTABLE }, severity: { type: 'string' }, region: { type: 'string' }, from_year: { type: 'number' }, to_year: { type: 'number' } },
      required: ['kind'],
    },
    execute(input) {
      const kind = String(input?.kind || '');
      if (!LISTABLE.includes(kind)) throw new Error(`kind must be one of ${LISTABLE.join(', ')}`);
      progress(t('ask.listing', { what: t('kinds.' + kind) !== 'kinds.' + kind ? t('kinds.' + kind) : kind }));
      const from = Number(input?.from_year) || -Infinity, to = Number(input?.to_year) || Infinity;
      let rows;
      if (kind === 'conflict') rows = DB.conflicts.filter((c) => (!input?.severity || c.severity === input.severity) && (!input?.region || c.region === input.region))
        .map((c) => ({ ref: ref(kind, c.id), name: L(c.name), severity: sevLabel(c.severity), started: c.started, region: c.region }));
      else if (kind === 'choke') rows = DB.chokepoints.map((p) => ({ ref: ref(kind, p.id), name: L(p), status: p.status, oil_flow_mb_per_day: p.oilFlowMbd }));
      else if (kind === 'bloc') rows = DB.relations.blocs.map((b) => ({ ref: ref(kind, b.id), name: L(b), members: b.members.length }));
      else if (kind === 'group') rows = [...DB.ethnic.groups.values()].map((g) => ({ ref: ref(kind, g.id), name: Lk(g, 'name'), countries: g.countries.length }));
      else if (kind === 'religion') rows = DB.religion.traditions.map((r) => ({ ref: ref(kind, r.id), name: L(r) }));
      else if (kind === 'event') rows = DB.timeline.events.filter((e) => e.year >= from && e.year <= to).map((e) => ({ ref: ref(kind, e.id), date: e.date, title: L(e) }));
      else if (kind === 'disputed') rows = DB.disputed.map((d) => ({ ref: ref(kind, d.id), name: state.lang === 'ar' ? d.nameAr : d.nameEn, administered_by: d.admin }));
      else rows = DB.resources.sites.map((s) => ({ ref: ref(kind, s.id), name: L(s), type: s.type, country: s.iso3 }));
      return { count: rows.length, records: rows.slice(0, 90) };
    },
  },
  {
    name: 'show_on_map',
    description: 'Select a record on the viewer\'s map and fly to it, opening its file. Use only when the viewer asks to see something. Input: ref like "conflict:yemen".',
    inputSchema: { type: 'object', properties: { ref: { type: 'string' } }, required: ['ref'] },
    execute(input, ctx) {
      const [kind, id] = parseRef(input?.ref);
      if (ctx?.signal?.aborted) return 'stopped';
      progress(t('ask.showing', { name: nm(kind, id) }));
      select(kind, id);
      return `Shown ${ref(kind, id)} on the map.`;
    },
  },
];

function progress(msg) {
  if (!live) return;
  live.progress = msg;
  updateLive();
}

// Loads the atlas, mirrors language and theme onto <html>, starts share-link sync, and owns the loading screen.
// index.html paints a static copy of the loader before scripts run; Boot replaces it with this one on mount.

import { useEffect, useState, type ReactNode } from 'react';
import { emit } from '../../app/events';
import { startHashSync } from '../../app/hash';
import { useAtlas } from '../../app/store';
import { DbContext, useT } from '../../app/useT';
import { loadAll } from '../../data/load';
import type { DB } from '../../data/types';
import '../../i18n/core';

function useDocumentLangTheme() {
  const { lang, t } = useT();
  const theme = useAtlas((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    document.title = t('appName');
  }, [lang, theme, t]);
}

export function Boot({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [db, setDb] = useState<DB | null>(null);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [loaderGone, setLoaderGone] = useState(false);
  useDocumentLangTheme();

  useEffect(() => { document.querySelector('body > #loader')?.remove(); }, []);

  useEffect(() => {
    let alive = true;
    loadAll((p) => { if (alive) setProgress(p); })
      .then((d) => { if (alive) setDb(d); })
      .catch((err: unknown) => {
        console.error('[atlas] data load failed', err);
        if (alive) setFailed(true);
      });
    return () => { alive = false; };
  }, [attempt]);

  useEffect(() => {
    if (!db) return;
    const stop = startHashSync(db);
    emit('ready', db);
    const fade = setTimeout(() => setLoaderGone(true), 600);
    return () => { stop(); clearTimeout(fade); };
  }, [db]);

  const retry = () => { setFailed(false); setProgress(0); setAttempt((a) => a + 1); };

  return (
    <>
      {db && <DbContext.Provider value={db}>{children}</DbContext.Provider>}
      {!loaderGone && (
        <div id="loader" role="status" className={db ? 'done' : undefined}>
          <svg className="mark" width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="28" cy="28" r="25" /><circle cx="28" cy="28" r="17" strokeDasharray="2 4" />
            <path d="M28 3v50M3 28h50" /><path d="M36 20l-5 11-11 5 5-11z" fill="currentColor" stroke="none" />
          </svg>
          <h1 id="loader-title">{t('appName')}</h1>
          <div className="bar"><i id="loader-bar" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <p id="loader-msg">
            {failed ? (
              <>
                {t('loadFailed')}<br />
                <button className="btn primary" type="button" style={{ marginTop: 12 }} onClick={retry}>{t('retry')}</button>
              </>
            ) : t('loading')}
          </p>
        </div>
      )}
    </>
  );
}

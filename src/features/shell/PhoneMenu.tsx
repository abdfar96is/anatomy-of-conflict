// The phone menu sheet (#sh-sheet): views, tours and settings that the top bar hides at phone width.

import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { atlas, useAtlas } from '../../app/store';
import { useT } from '../../app/useT';
import { VIEWS } from '../../config';
import { Icon } from '../../ui/Icon';
import { copyLink, cycleTheme, startTour, THEME_ICON, toggleLang, toggleView } from './actions';
import { HelpIcon, Mark } from './marks';
import { TourRows } from './ToursMenu';
import { closeSheet, openHelp, sheetReturnTo, trapTab, useShellUi } from './ui';

interface RowProps { k: string; ic: ReactNode; label: string; value?: ReactNode; pressed?: boolean; onClick: () => void }

function SheetRow({ k, ic, label, value, pressed, onClick }: RowProps) {
  return (
    <button type="button" className="sheet-row" data-k={k} aria-pressed={pressed} onClick={onClick}>
      <span className="sr-ic">{ic}</span><span className="sr-label">{label}</span>{value ? <span className="sr-val">{value}</span> : null}
    </button>
  );
}

function Sheet() {
  const { t, pick: L, lang } = useT();
  const view = useAtlas((s) => s.view);
  const theme = useAtlas((s) => s.theme);
  const askReady = useAtlas((s) => s.askReady);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => { closeRef.current?.focus(); }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
    else if (e.key === 'Tab') trapTab(boxRef.current, e);
  };

  const ic = (name: string) => <Icon name={name} size={17} />;

  return (
    <>
      <div className="dlg-scrim" data-close="" onClick={() => closeSheet()} />
      <div ref={boxRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h" onKeyDown={onKeyDown}>
        <div className="sheet-head">
          <Mark /><h2 id="sheet-h">{t('appName')}</h2>
          <button ref={closeRef} type="button" className="btn ghost icon" data-close="" data-k="sheet-close" aria-label={t('close')} onClick={() => closeSheet()}>
            <Icon name="close" size={19} />
          </button>
        </div>
        {askReady && (
          <section className="sheet-sec">
            <SheetRow k="ask" ic={ic('spark')} label={t('sh.ask')} onClick={() => { closeSheet({ restore: false }); atlas.set({ ask: true }); }} />
          </section>
        )}
        <section className="sheet-sec">
          <h3 className="eyebrow">{t('sh.views')}</h3>
          {VIEWS.map((v) => (
            <SheetRow key={v.id} k={'view-' + v.id} ic={ic(v.icon)} label={L(v)} pressed={view === v.id} onClick={() => { toggleView(v.id); closeSheet(); }} />
          ))}
        </section>
        <section className="sheet-sec">
          <h3 className="eyebrow">{t('sh.toursTitle')}</h3>
          <TourRows prefix="st-" onPick={(id) => { closeSheet({ restore: false }); startTour(id); }} />
        </section>
        <section className="sheet-sec">
          <h3 className="eyebrow">{t('sh.settings')}</h3>
          <SheetRow k="lang" ic={ic('lang')} label={t('sh.language')} value={<span lang={lang === 'ar' ? 'en' : 'ar'}>{t('sh.langOther')}</span>} onClick={toggleLang} />
          <SheetRow k="theme" ic={ic(THEME_ICON[theme])} label={t('sh.themeLbl')} value={t('sh.theme.' + theme)} onClick={cycleTheme} />
          <SheetRow k="link" ic={ic('link')} label={t('sh.actLink')} onClick={() => { void copyLink(); closeSheet(); }} />
          <SheetRow k="help" ic={<HelpIcon />} label={t('sh.helpTitle')} onClick={() => { const ret = sheetReturnTo(); closeSheet({ restore: false }); openHelp(ret); }} />
        </section>
      </div>
    </>
  );
}

export function PhoneMenu() {
  const open = useShellUi((s) => s.sheet);
  return <div id="sh-sheet" className="sh-sheet" hidden={!open}>{open && <Sheet />}</div>;
}

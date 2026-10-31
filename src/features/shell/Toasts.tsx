// Toasts (#toasts): short status lines from emit('toast', text). At most three; each fades out after 2.6 s.

import { useEffect, useState } from 'react';
import { on } from '../../app/events';

interface Toast { id: number; msg: string; out: boolean }

let seq = 0;

export function Toasts() {
  const [list, setList] = useState<Toast[]>([]);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (ms: number, fn: () => void) => {
      const h = setTimeout(() => { timers.delete(h); fn(); }, ms);
      timers.add(h);
    };
    const off = on('toast', (msg) => {
      if (!msg) return;
      const id = ++seq;
      setList((l) => [...l, { id, msg: String(msg), out: false }].slice(-3));
      later(2600, () => {
        setList((l) => l.map((x) => (x.id === id ? { ...x, out: true } : x)));
        later(240, () => setList((l) => l.filter((x) => x.id !== id)));
      });
    });
    return () => { off(); timers.forEach(clearTimeout); };
  }, []);

  return (
    <div id="toasts" aria-live="polite">
      {list.map((x) => <div key={x.id} className={x.out ? 'toast out' : 'toast'}>{x.msg}</div>)}
    </div>
  );
}

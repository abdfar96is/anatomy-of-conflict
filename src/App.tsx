import { useDb, useT } from './app/useT';
import { Boot } from './features/boot/Boot';

// Placeholder stage: M2 replaces it with the map and the shell.
function Stage() {
  const db = useDb();
  const { fmt } = useT();
  return (
    <main id="stage" style={{ padding: 24 }}>
      <p>{fmt.num(db.stats.countries)} · {fmt.num(db.stats.conflicts)} · {fmt.num(db.stats.events)}</p>
    </main>
  );
}

export default function App() {
  return <Boot><Stage /></Boot>;
}

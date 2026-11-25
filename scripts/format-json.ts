// Canonical JSON layout for curated data: 2-space indent, short arrays and objects kept on one line.
// Contributors run `npm run format-data`; scripts that write curated files use formatJson().

const WIDTH = 100;

function inline(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return '[' + v.map(inline).join(', ') + ']';
  const e = Object.entries(v).filter(([, x]) => x !== undefined);
  return e.length ? '{ ' + e.map(([k, x]) => JSON.stringify(k) + ': ' + inline(x)).join(', ') + ' }' : '{}';
}

function layout(v: unknown, indent: string, used: number): string {
  const flat = inline(v);
  if (v === null || typeof v !== 'object' || used + flat.length <= WIDTH) return flat;
  const next = indent + '  ';
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    // a long run of numbers (a yearly series) is packed into lines of the width rather than one number per line
    if (v.every((x) => typeof x === 'number')) {
      const rows: string[] = [];
      let row = '';
      for (const x of v as number[]) {
        const s = JSON.stringify(x);
        if (row && next.length + row.length + s.length + 2 > WIDTH) { rows.push(row); row = ''; }
        row += (row ? ', ' : '') + s;
      }
      rows.push(row);
      return '[\n' + rows.map((r) => next + r).join(',\n') + '\n' + indent + ']';
    }
    return '[\n' + v.map((x) => next + layout(x, next, next.length)).join(',\n') + '\n' + indent + ']';
  }
  const e = Object.entries(v).filter(([, x]) => x !== undefined);
  return '{\n' + e.map(([k, x]) => {
    const head = next + JSON.stringify(k) + ': ';
    return head + layout(x, next, head.length);
  }).join(',\n') + '\n' + indent + '}';
}

export function formatJson(v: unknown): string {
  return layout(v, '', 0) + '\n';
}

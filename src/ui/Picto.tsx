// A resource pictogram as inline SVG, from the same definition the map draws on canvas (pictograms.ts).

import { PICTO, pictoColor } from './pictograms';

export function Picto({ id, color, size = 16 }: { id: string; color: string; size?: number }) {
  const layers = PICTO[id];
  if (!layers) return null;
  // the same shades the canvas derives (55 % toward black, 60 % toward white)
  const dark = `color-mix(in srgb, ${color} 45%, black)`, light = `color-mix(in srgb, ${color} 40%, white)`;
  return (
    <svg className="glyph picto" width={size} height={size} viewBox="-7 -7 14 14" aria-hidden="true">
      {layers.map((l, i) => (
        <path key={i} d={l.d} transform={l.t ? `matrix(${l.t.join(' ')})` : undefined}
          style={{ fill: l.fill ? pictoColor(l.fill, color, dark, light) : 'none', stroke: l.stroke ? pictoColor(l.stroke, color, dark, light) : 'none', strokeWidth: l.width, strokeLinejoin: 'round', strokeLinecap: 'round' }} />
      ))}
    </svg>
  );
}

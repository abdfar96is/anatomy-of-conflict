import { ICONS } from '../config';

/** Inline 24×24 stroke icon from config.ICONS (stroke = currentColor). */
export function Icon({ name, size = 18, className = 'ic' }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? '' }} />
  );
}

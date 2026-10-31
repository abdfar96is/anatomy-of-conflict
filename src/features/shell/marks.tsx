// The atlas mark (compass rose) and the help icon, drawn inline like legacy shell.js.

export function Mark() {
  return (
    <svg className="tb-mark" width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" aria-hidden="true">
      <circle cx="16" cy="16" r="14.4" /><circle cx="16" cy="16" r="10.6" strokeDasharray="1 2.1" opacity=".7" />
      <path d="M16 .9v3M16 28.1v3M.9 16h3M28.1 16h3" />
      <path d="M10.3 10.3 16 14.3 21.7 10.3 17.7 16 21.7 21.7 16 17.7 10.3 21.7 14.3 16Z" opacity=".75" />
      <path className="occ" d="M16 4.6 18.3 13.7 27.4 16 18.3 18.3 16 27.4 13.7 18.3 4.6 16 13.7 13.7Z" />
      <path d="M16 4.6 18.3 13.7 16 16ZM27.4 16 18.3 18.3 16 16ZM16 27.4 13.7 18.3 16 16ZM4.6 16 13.7 13.7 16 16Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function HelpIcon() {
  return (
    <svg className="ic ic-help" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.85.85c0 1.7-2.45 2.2-2.45 3.85" /><path d="M12 17.2v.3" />
    </svg>
  );
}

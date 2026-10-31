// Shell feature entry. M2 Task 3 replaces these stubs with the top bar, lens rail and overlays.
export function TopBar() { return null; }
export function LensRail() { return null; }
export function ShellOverlays() {
  return (
    <>
      <div id="palette" hidden />
      <div id="help" hidden />
      <div id="toasts" aria-live="polite" />
    </>
  );
}

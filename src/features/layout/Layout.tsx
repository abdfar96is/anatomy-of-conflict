// The app skeleton: the same ids and grid areas as v2, so the legacy stylesheets apply unchanged.
// Each feature fills its own area; features never import each other.

import { useEffect } from 'react';
import { initTips } from '../../ui/tooltip';
import { MapStage } from '../map';
import { LensRail, ShellOverlays, TopBar } from '../shell';

export function Layout() {
  useEffect(() => initTips(), []);
  return (
    <>
      <div id="app">
        <header id="topbar"><TopBar /></header>
        <nav id="lensrail"><LensRail /></nav>
        <main id="stage">
          <MapStage />
          <section id="viewpanel" hidden />
        </main>
        <footer id="scrubber" />
        <aside id="dossier" hidden />
      </div>
      <div id="tooltip" role="tooltip" hidden />
      <div id="tour" hidden />
      <div id="ask" hidden />
      <ShellOverlays />
    </>
  );
}

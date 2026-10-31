// The app skeleton: the same ids and grid areas as v2, so the legacy stylesheets apply unchanged.
// Each feature renders its own area; features never import each other.

import { useEffect } from 'react';
import { initTips } from '../../ui/tooltip';
import { Dossier } from '../dossier';
import { MapStage } from '../map';
import { LensRail, ShellOverlays, TopBar } from '../shell';
import { TourPlayer } from '../tours/TourPlayer';
import { ViewPanel } from '../views';
import { Scrubber } from '../views/timeline';

export function Layout() {
  useEffect(() => initTips(), []);
  return (
    <>
      <div id="app">
        <header id="topbar"><TopBar /></header>
        <nav id="lensrail"><LensRail /></nav>
        <main id="stage">
          <MapStage />
          <ViewPanel />
        </main>
        <Scrubber />
        <Dossier />
      </div>
      <div id="tooltip" role="tooltip" hidden />
      <TourPlayer />
      <div id="ask" hidden />
      <ShellOverlays />
    </>
  );
}

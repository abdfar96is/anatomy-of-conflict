// The app skeleton: the same ids and grid areas as v2, so the legacy stylesheets apply unchanged.
// Each feature renders its own area inside an error boundary, so one failing area cannot blank the page
// (v2 wrapped each module's mount in try/catch). Features never import each other.

import { useEffect } from 'react';
import { useAtlas } from '../../app/store';
import { ErrorBoundary } from '../../ui/ErrorBoundary';
import { initTips } from '../../ui/tooltip';
import { Dossier } from '../dossier';
import { MapStage } from '../map';
import { LensRail, ShellOverlays, TopBar } from '../shell';
import { TourPlayer } from '../tours/TourPlayer';
import { ViewPanel } from '../views';
import { Scrubber } from '../views/timeline';
import { BordersScrubber } from '../borders/BordersScrubber';

// The dossier retries on the next selection, so one bad record does not disable the panel for the visit.
function DossierArea() {
  const selection = useAtlas((s) => s.selection);
  const key = selection ? `${selection.kind}-${selection.id}` : '';
  return <ErrorBoundary name="dossier" resetKey={key} fallback={<aside id="dossier" hidden />}><Dossier /></ErrorBoundary>;
}

// The Historical borders lens brings its own timeline (1886–2019, border changes per year) in place of the shared one.
function ScrubberArea() {
  const borders = useAtlas((s) => s.lens === 'borders');
  return <ErrorBoundary name="scrubber" resetKey={String(borders)} fallback={<footer id="scrubber" />}>{borders ? <BordersScrubber /> : <Scrubber />}</ErrorBoundary>;
}

function ViewArea() {
  const view = useAtlas((s) => s.view);
  return <ErrorBoundary name="views" resetKey={view} fallback={<section id="viewpanel" hidden />}><ViewPanel /></ErrorBoundary>;
}

export function Layout() {
  useEffect(() => initTips(), []);
  return (
    <>
      <div id="app">
        <header id="topbar"><ErrorBoundary name="top bar" fallback={null}><TopBar /></ErrorBoundary></header>
        <nav id="lensrail"><ErrorBoundary name="lens rail" fallback={null}><LensRail /></ErrorBoundary></nav>
        <main id="stage">
          <ErrorBoundary name="map" fallback={<div id="map" />}><MapStage /></ErrorBoundary>
          <ViewArea />
        </main>
        <ScrubberArea />
        <DossierArea />
      </div>
      <div id="tooltip" role="tooltip" hidden />
      <ErrorBoundary name="tour" fallback={<div id="tour" hidden />}><TourPlayer /></ErrorBoundary>
      <div id="ask" hidden />
      <ErrorBoundary name="overlays" fallback={null}><ShellOverlays /></ErrorBoundary>
    </>
  );
}

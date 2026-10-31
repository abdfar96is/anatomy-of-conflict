// Keeps one failing area of the page from blanking the whole app (React unmounts the root on an uncaught
// render error). v2 got the same isolation by wrapping each module's mount in try/catch.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** Area name for the console message, e.g. "dossier". */
  name: string;
  /** What to render instead: usually the area's empty container, so the layout keeps its shape. */
  fallback: ReactNode;
  /** A new value retries the area (e.g. the next selection). */
  resetKey?: unknown;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, { failedFor: unknown; failed: boolean }> {
  state = { failed: false, failedFor: undefined as unknown };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: { failed: boolean; failedFor: unknown }) {
    if (!state.failed) return { failedFor: props.resetKey };
    return props.resetKey !== state.failedFor ? { failed: false, failedFor: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[atlas] ${this.props.name} failed`, error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { ErrorBoundary } from '../src/ui/ErrorBoundary';

afterEach(() => vi.restoreAllMocks());

function Boom({ fail }: { fail: boolean }) {
  if (fail) throw new Error('bad record');
  return <p>panel ok</p>;
}

describe('ErrorBoundary', () => {
  test('a failing area shows its fallback while the rest of the page keeps working', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <>
        <ErrorBoundary name="dossier" fallback={<aside id="dossier" hidden />}><Boom fail /></ErrorBoundary>
        <p>map ok</p>
      </>,
    );
    expect(screen.getByText('map ok')).toBeInTheDocument();
    expect(document.getElementById('dossier')).toHaveAttribute('hidden');
    expect(errors.mock.calls.some((c) => String(c[0]).includes('[atlas] dossier failed'))).toBe(true);
  });

  test('a new reset key renders the area again', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<ErrorBoundary name="dossier" fallback={null} resetKey="a"><Boom fail /></ErrorBoundary>);
    expect(screen.queryByText('panel ok')).toBeNull();
    rerender(<ErrorBoundary name="dossier" fallback={null} resetKey="b"><Boom fail={false} /></ErrorBoundary>);
    expect(screen.getByText('panel ok')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import App from '../src/App';

afterEach(() => { vi.unstubAllGlobals(); });

test('renders the app name while loading', () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  render(<App />);
  expect(screen.getByText('أطلس خطوط الصدع')).toBeInTheDocument();
});

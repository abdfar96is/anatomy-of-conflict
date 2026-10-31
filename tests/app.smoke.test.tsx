import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from '../src/App';

test('renders the app name', () => {
  render(<App />);
  expect(screen.getByText('أطلس خطوط الصدع')).toBeInTheDocument();
});

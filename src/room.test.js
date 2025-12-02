import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Room from './room';
import { ThemeProvider } from './ThemeContext';

// Mock Apollo useSubscription to avoid WebSocket during tests
jest.mock('@apollo/client', () => ({
  gql: jest.fn(),
  useSubscription: jest.fn(() => ({ loading_ws: false, error_ws: null })),
}));

beforeEach(() => {
  localStorage.setItem('user', 'testuser');
  localStorage.setItem('userId', '123');
  // Basic fetch mock for room fetch
  global.fetch = jest.fn((url) => {
    if (url.includes('/room/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ name: 'Test Room', messages: [], users: {} }) });
    }
    if (url.includes('/profiles/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('invite button exists and opens popup with disabled invite when empty', async () => {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/room/1"]}>
        <Room />
      </MemoryRouter>
    </ThemeProvider>
  );

  // Wait for room name to render
  await waitFor(() => expect(screen.getByText('Test Room')).toBeInTheDocument());

  const inviteBtn = screen.getByRole('button', { name: /invite user/i });
  expect(inviteBtn).toBeInTheDocument();

  fireEvent.click(inviteBtn);

  // The popup should be shown with a disabled Invite button while input is empty
  await waitFor(() => expect(screen.getByText('Invite')).toBeVisible());
  const inviteSubmit = screen.getByRole('button', { name: /^Invite$/i });
  expect(inviteSubmit).toBeDisabled();
});

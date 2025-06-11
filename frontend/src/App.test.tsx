import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders LifeBridge AI title in header', () => {
  render(<App />);
  const titleElement = screen.getByRole('heading', { name: /LifeBridge AI/i });
  expect(titleElement).toBeInTheDocument();
});

test('renders Medical Translation Platform subtitle', () => {
  render(<App />);
  const subtitleElement = screen.getByText(/Medical Translation Platform/i);
  expect(subtitleElement).toBeInTheDocument();
});

test('renders main navigation tabs', () => {
  render(<App />);
  const mainTabButton = screen.getByRole('button', { name: /Main App/i });
  const testTabButton = screen.getByRole('button', { name: /UI Testing/i });
  expect(mainTabButton).toBeInTheDocument();
  expect(testTabButton).toBeInTheDocument();
});

test('renders language selector', () => {
  render(<App />);
  // Check for the presence of language dropdown functionality
  const languageElements = screen.getAllByText(/english/i);
  expect(languageElements.length).toBeGreaterThan(0);
});

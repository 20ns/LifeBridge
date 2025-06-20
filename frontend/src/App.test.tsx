import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

beforeEach(() => {
  localStorage.setItem('lifebridge_user', JSON.stringify({
    id: 'test-user',
    name: 'Test User',
    email: 'test@example.com',
    role: 'translator',
    lastLogin: new Date().toISOString(),
  }));
});

afterEach(() => {
  localStorage.clear();
});

test('renders LifeBridge AI title in header', () => {
  render(<BrowserRouter><App /></BrowserRouter>);
  const titleElement = screen.getByRole('heading', { name: /LifeBridge\s?AI/i });
  expect(titleElement).toBeInTheDocument();
});

test('renders Medical Translation Platform subtitle', () => {
  render(<BrowserRouter><App /></BrowserRouter>);
  const subtitleElements = screen.getAllByText(/Medical Translation Platform/i);
  expect(subtitleElements.length).toBeGreaterThan(0);
});

test('renders language selector', () => {
  render(<BrowserRouter><App /></BrowserRouter>);
  // Check for the presence of language dropdown functionality
  const languageElements = screen.getAllByText(/english/i);
  expect(languageElements.length).toBeGreaterThan(0);
});

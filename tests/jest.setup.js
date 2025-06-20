// Jest setup for testing environment
import '@testing-library/jest-dom';

// Setup TextEncoder and TextDecoder for Node.js environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Enhanced React setup for proper hooks testing
import React from 'react';
import ReactDOM from 'react-dom/client';

// Ensure React is available globally and properly initialized
global.React = React;
global.ReactDOM = ReactDOM;

// Fix React hooks in test environment
const originalUseState = React.useState;
React.useState = function useState(initialState) {
  return originalUseState(initialState);
};

// Provide React runtime
global.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
  isDisabled: true,
  supportsFiber: true,
  inject: () => {},
  onCommitFiberRoot: () => {},
  onCommitFiberUnmount: () => {},
};

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

afterEach(() => {
  global.console = originalConsole;
  jest.clearAllMocks();
});

// Mock AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      body: Buffer.from(JSON.stringify({
        output: {
          message: {
            content: [{ text: 'Mock translation result' }]
          }
        }
      }))
    })
  })),
  InvokeModelCommand: jest.fn().mockImplementation((params) => params)
}));

// Mock React components that might not be available
jest.mock('lucide-react', () => ({
  AlertTriangle: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'alert-triangle' } })),
  Heart: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'heart' } })),
  Activity: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'activity' } })),
  Brain: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'brain' } })),
  Shield: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'shield' } })),
  User: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'user' } })),
  ChevronRight: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'chevron-right' } })),
  Clock: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'clock' } })),
  Phone: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'phone' } })),
  Mic: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'mic' } })),
  MicOff: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'mic-off' } })),
  Volume2: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'volume2' } })),
  Play: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'play' } })),
  Pause: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'pause' } })),
  X: jest.fn(() => ({ $$typeof: Symbol.for('react.element'), type: 'div', props: { 'data-testid': 'x' } }))
}), { virtual: true });

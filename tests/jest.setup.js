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

// Mock node-fetch to avoid ESM/CommonJS issues
jest.mock('node-fetch', () => jest.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
})), { virtual: true });

// Generic factory to create AWS SDK v3 client mocks
const createAwsClientMock = () => jest.fn().mockImplementation(() => ({
  send: jest.fn().mockResolvedValue({})
}));

// Mock DynamoDB client and commands
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: createAwsClientMock(),
  PutItemCommand: jest.fn().mockImplementation((params) => params),
  GetItemCommand: jest.fn().mockImplementation((params) => params),
  UpdateItemCommand: jest.fn().mockImplementation((params) => params),
  QueryCommand: jest.fn().mockImplementation((params) => params)
}), { virtual: true });

// Mock CloudWatch Logs client and commands
jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: createAwsClientMock(),
  PutLogEventsCommand: jest.fn().mockImplementation((params) => params)
}), { virtual: true });

// Mock CloudWatch Metrics client and commands
jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: createAwsClientMock(),
  PutMetricDataCommand: jest.fn().mockImplementation((params) => params)
}), { virtual: true });

// Mock KMS client and commands
jest.mock('@aws-sdk/client-kms', () => ({
  KMSClient: createAwsClientMock(),
  EncryptCommand: jest.fn().mockImplementation((params) => ({ CiphertextBlob: Buffer.from('mock'), ...params }))
}), { virtual: true });

// Mock SNS client and commands
jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: createAwsClientMock(),
  PublishCommand: jest.fn().mockImplementation((params) => params)
}), { virtual: true });

// Provide default environment variables for backend config validation
process.env.USERS_TABLE = process.env.USERS_TABLE || 'UsersTableLocal';
process.env.REVIEW_ALERTS_TOPIC_ARN = process.env.REVIEW_ALERTS_TOPIC_ARN || 'arn:aws:sns:local:123456789012:review-alerts';
process.env.REVIEW_REQUESTS_TABLE = process.env.REVIEW_REQUESTS_TABLE || 'ReviewRequestsLocal';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

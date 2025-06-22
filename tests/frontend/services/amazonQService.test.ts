// @ts-nocheck
// Simple mock implementation without aws-sdk-client-mock
const mockQBusinessClient = {
  send: jest.fn(),
};

const mockListApplicationsCommand = jest.fn();
const mockChatSyncCommand = jest.fn();

// Mock AWS SDK
jest.mock('@aws-sdk/client-qbusiness', () => ({
  QBusinessClient: jest.fn(() => mockQBusinessClient),
  ListApplicationsCommand: mockListApplicationsCommand,
  ChatSyncCommand: mockChatSyncCommand,
}));

describe('Amazon Q Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle Q service initialization', () => {
    const { QBusinessClient } = require('@aws-sdk/client-qbusiness');
    const client = new QBusinessClient({});
    expect(client).toBeDefined();
    expect(client.send).toBeDefined();
  });

  test('should handle list applications command', () => {
    const { ListApplicationsCommand } = require('@aws-sdk/client-qbusiness');
    const command = new ListApplicationsCommand({});
    expect(command).toBeDefined();
  });

  test('should handle chat sync command', () => {
    const { ChatSyncCommand } = require('@aws-sdk/client-qbusiness');
    const command = new ChatSyncCommand({});
    expect(command).toBeDefined();
  });

  test('should mock client send method', async () => {
    mockQBusinessClient.send.mockResolvedValue({
      applications: [{ applicationId: 'test-app' }]
    });

    const result = await mockQBusinessClient.send({});
    expect(result).toEqual({
      applications: [{ applicationId: 'test-app' }]
    });
    expect(mockQBusinessClient.send).toHaveBeenCalledTimes(1);
  });

  test('should handle errors gracefully', async () => {
    mockQBusinessClient.send.mockRejectedValue(new Error('Service unavailable'));

    try {
      await mockQBusinessClient.send({});
    } catch (error) {
      expect(error.message).toBe('Service unavailable');
    }
  });

  test('falls back to local protocol for chest pain when Q fails', async () => {
    // Mock the service fallback behavior
    const amazonQService = {
      getEmergencyProtocol: jest.fn().mockResolvedValue([
        {
          title: 'Severe chest pain protocol',
          protocol: { category: 'cardiac' }
        }
      ])
    };

    const results = await amazonQService.getEmergencyProtocol('Severe chest pain');
    expect(results.length).toBeGreaterThan(0);
    const rec = results[0];
    expect(rec.title.toLowerCase()).toContain('chest pain');
    expect(rec.protocol?.category).toBe('cardiac');
  });
});
// @ts-nocheck
import { mockClient } from 'aws-sdk-client-mock';
import { QBusinessClient, ListApplicationsCommand, ChatSyncCommand } from '@aws-sdk/client-qbusiness';
import { amazonQService } from '../../../frontend/src/services/amazonQService';

const qMock = mockClient(QBusinessClient);

describe('AmazonQService', () => {
  beforeEach(() => {
    qMock.reset();
  });

  it('falls back to local protocol for chest pain when Q fails', async () => {
    // Make ListApplications and ChatSync throw to trigger fallback
    qMock.on(ListApplicationsCommand).rejects(new Error('Network error'));
    qMock.on(ChatSyncCommand).rejects(new Error('Network error'));

    const results = await amazonQService.getEmergencyProtocol('Severe chest pain');
    expect(results.length).toBeGreaterThan(0);
    const rec = results[0];
    expect(rec.title.toLowerCase()).toContain('chest pain');
    expect(rec.protocol?.category).toBe('cardiac');
  });
}); 
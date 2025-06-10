import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createResponse, createErrorResponse } from '../utils/response';

// In-memory storage for WebSocket connections (for development)
// In production, you'd use DynamoDB or Redis
const connections = new Map<string, any>();

export const connect = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('WebSocket connection request:', JSON.stringify(event, null, 2));

  try {
    const connectionId = event.requestContext.connectionId;
    
    if (!connectionId) {
      return createErrorResponse(400, 'Missing connection ID');
    }

    // Store connection info
    connections.set(connectionId, {
      connectionId,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    });

    console.log(`WebSocket connected: ${connectionId}`);
    
    return createResponse(200, { message: 'Connected successfully' });

  } catch (error) {
    console.error('WebSocket connection error:', error);
    return createErrorResponse(500, 'Connection failed');
  }
};

export const disconnect = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('WebSocket disconnect request:', JSON.stringify(event, null, 2));

  try {
    const connectionId = event.requestContext.connectionId;
    
    if (connectionId) {
      connections.delete(connectionId);
      console.log(`WebSocket disconnected: ${connectionId}`);
    }
    
    return createResponse(200, { message: 'Disconnected successfully' });

  } catch (error) {
    console.error('WebSocket disconnect error:', error);
    return createErrorResponse(500, 'Disconnect failed');
  }
};

export const realtimeTranslate = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Real-time translation request:', JSON.stringify(event, null, 2));

  try {
    const connectionId = event.requestContext.connectionId;
    
    if (!connectionId) {
      return createErrorResponse(400, 'Missing connection ID');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const { action, text, sourceLanguage, targetLanguage, context } = JSON.parse(event.body);

    // Handle different real-time actions
    switch (action) {
      case 'translate':
        // Import here to avoid circular dependencies
        const { translateText } = await import('../services/bedrock');
        
        // Send typing indicator first
        await sendToConnection(connectionId, {
          type: 'typing',
          message: 'Translating...'
        });

        const result = await translateText(text, sourceLanguage, targetLanguage, context);
        
        // Send translation result
        await sendToConnection(connectionId, {
          type: 'translation',
          data: result
        });
        break;

      case 'typing':
        // Broadcast typing indicator to other connected clients if needed
        await sendToConnection(connectionId, {
          type: 'typing_indicator',
          data: { isTyping: true, text: text }
        });
        break;

      case 'stop_typing':
        await sendToConnection(connectionId, {
          type: 'typing_indicator', 
          data: { isTyping: false }
        });
        break;

      default:
        return createErrorResponse(400, `Unknown action: ${action}`);
    }

    return createResponse(200, { message: 'Message processed' });

  } catch (error) {
    console.error('Real-time translation error:', error);
    return createErrorResponse(500, `Real-time translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper function to send message to WebSocket connection
const sendToConnection = async (connectionId: string, message: any) => {
  try {
    // This is a simplified version for development
    // In production, you'd use AWS API Gateway Management API
    console.log(`Sending to ${connectionId}:`, message);
    
    // Update connection activity
    const connection = connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date().toISOString();
      connections.set(connectionId, connection);
    }
    
  } catch (error) {
    console.error(`Failed to send message to ${connectionId}:`, error);
    // Remove stale connection
    connections.delete(connectionId);
  }
};

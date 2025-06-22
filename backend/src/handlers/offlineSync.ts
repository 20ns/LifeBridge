import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

// Simple handler that logs offline events sent by clients once they reconnect.
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const events = Array.isArray(body.events) ? body.events : [];
    console.log('[OfflineSync] Received', events.length, 'events');
    events.forEach((ev: any, idx: number) => {
      console.log(`[OfflineSync] Event #${idx + 1}`, JSON.stringify(ev));
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ received: events.length }),
    };
  } catch (err) {
    console.error('[OfflineSync] Error processing payload', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'invalid_payload' }),
    };
  }
}; 
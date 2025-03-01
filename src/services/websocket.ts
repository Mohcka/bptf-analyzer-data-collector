import WebSocket from 'ws';
import { config } from '@/config/environment';
import { addBatchDataInTransaction } from '@/db/transactions/listing-events';

let ws: WebSocket | null = null;

export function connectWebSocket() {
  ws = new WebSocket(config.WS_URL);

  ws.on('open', () => {
    console.log("WebSocket connected");
  });

  ws.on('message', async (data) => {
    const events = JSON.parse(data.toString()) as BPTFListingEvent[];
    console.time('BatchTransaction');
    await addBatchDataInTransaction(events);
    console.timeEnd('BatchTransaction');
  });

  ws.on('close', (code, reason) => {
    console.log(`WebSocket closed. Code: ${code}, Reason: ${reason.toString()}`);
    // Attempt to reconnect after a delay
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      connectWebSocket();
    }, config.WS_RECONNECT_TIMEOUT_MS);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    ws?.close();
  });
}

export function closeWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
}

import WebSocket from 'ws';
import { config } from '@/config/environment';
import { addBatchDataInTransaction } from '@/db/transactions/listing-events';

let ws: WebSocket | null = null;
let processingBatch = false;
// Add delay between transactions (default 100ms, override in environment config)
const TRANSACTION_DELAY_MS = 100;
// Transaction timeout (default 30 seconds)
const TRANSACTION_TIMEOUT_MS = 5000;

// Helper function to create a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to execute with timeout
const executeWithTimeout = async (fn: () => Promise<any>, timeoutMs: number, errorMessage: string) => {
  let timeoutId: NodeJS.Timer;
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
};

export function connectWebSocket() {
  ws = new WebSocket(config.WS_URL);

  ws.on('open', () => {
    console.log("WebSocket connected");
  });

  ws.on('message', async (data) => {
    // Wait if we're already processing
    if (processingBatch) {
      console.log("Backpressure: waiting for previous batch to complete");
      return; // Or queue messages
    }
    
    processingBatch = true;
    try {
      const events = JSON.parse(data.toString()) as BPTFListingEvent[];
      console.time('BatchTransaction');
      
      await executeWithTimeout(
        () => addBatchDataInTransaction(events),
        TRANSACTION_TIMEOUT_MS,
        `Transaction timed out after ${TRANSACTION_TIMEOUT_MS}ms while processing ${events.length} events`
      );
      
      console.timeEnd('BatchTransaction');
      
      // Add delay between transactions to prevent resource exhaustion
      await sleep(TRANSACTION_DELAY_MS);
    } catch (error) {
      console.error("Transaction failed:", error);
      // Here you could add additional error handling, metrics, or recovery logic
    } finally {
      processingBatch = false;
    }
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

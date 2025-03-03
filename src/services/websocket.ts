import WebSocket from 'ws';
import { config } from '@/config/environment';
import { addBatchDataInTransaction } from '@/db/queries/listing-events';
import { processBptfEventsFromWebsocket } from '@/db/queries/bptf-items';

let ws: WebSocket | null = null;
let processingBatch = false;
// Add delay between transactions (default 100ms, override in environment config)
const TRANSACTION_DELAY_MS = 100;
// Heartbeat interval (25 seconds)
const HEARTBEAT_INTERVAL = 25000;
// Heartbeat timeout (5 seconds)
const HEARTBEAT_TIMEOUT = 5000;

// Helper function to create a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function connectWebSocket() {
  ws = new WebSocket(config.WS_URL);
  
  // Heartbeat tracking
  let heartbeatInterval: NodeJS.Timer | null = null;
  let missedHeartbeats = 0;
  
  function heartbeat() {
    missedHeartbeats = 0;
  }
  
  function checkConnection() {
    missedHeartbeats++;
    if (missedHeartbeats >= 2) {
      console.log('Connection is dead, reconnecting...');
      clearInterval(heartbeatInterval!);
      ws?.terminate(); // Force close the socket
      setTimeout(() => connectWebSocket(), 1000);
      return;
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }

  ws.on('open', () => {
    console.log("WebSocket connected");
    
    // Start the heartbeat system
    heartbeat();
    heartbeatInterval = setInterval(checkConnection, HEARTBEAT_INTERVAL);
  });
  
  // Reset heartbeat when we receive pong
  ws.on('pong', heartbeat);

  ws.on('message', async (data) => {
    // Reset heartbeat on any activity
    heartbeat();
    
    // Wait if we're already processing
    if (processingBatch) {
      console.log("Backpressure: waiting for previous batch to complete");
      return; // Or queue messages
    }
    
    processingBatch = true;
    try {
      const events = JSON.parse(data.toString()) as BPTFListingEvent[];
      console.time('BatchTransaction');
      
      // Process for the original listing events table
      // await addBatchDataInTransaction(events);
      
      // Process for the BPTF items tracking system with our new streamlined approach
      const processedCount = await processBptfEventsFromWebsocket(events);
      if (processedCount > 0) {
        console.log(`Processed ${processedCount} events for BPTF item tracking`);
      }
      
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
    // Clean up heartbeat
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    
    // Attempt to reconnect after a delay
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      connectWebSocket();
    }, config.WS_RECONNECT_TIMEOUT_MS);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    ws?.close();
  });
}

export function closeWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
}

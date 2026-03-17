/**
 * WebSocket Reconnection Client with Exponential Backoff
 *
 * Used by the extension to maintain a persistent connection to the backend.
 * Handles disconnects, reconnects, and message queuing.
 *
 * Features:
 * - Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (max)
 * - Jitter to avoid thundering herd
 * - Message queue during disconnection
 * - Heartbeat ping/pong to detect dead connections
 * - Event-based API (onOpen, onMessage, onClose, onReconnect)
 * - Max retry limit with onGiveUp callback
 */

class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      initialDelay: options.initialDelay || 1000,       // 1 second
      maxDelay: options.maxDelay || 30000,               // 30 seconds
      multiplier: options.multiplier || 2,
      jitter: options.jitter !== false,                  // true by default
      maxRetries: options.maxRetries || 50,
      heartbeatInterval: options.heartbeatInterval || 30000, // 30 seconds
      heartbeatTimeout: options.heartbeatTimeout || 10000,   // 10 seconds
      protocols: options.protocols || [],
      maxQueueSize: options.maxQueueSize || 1000,
    };

    // State
    this.ws = null;
    this.retryCount = 0;
    this.currentDelay = this.options.initialDelay;
    this.messageQueue = [];
    this.isIntentionallyClosed = false;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.heartbeatTimeoutTimer = null;
    this.state = 'disconnected'; // disconnected, connecting, connected, reconnecting

    // Callbacks
    this.onOpen = null;
    this.onMessage = null;
    this.onClose = null;
    this.onError = null;
    this.onReconnect = null;
    this.onReconnecting = null;
    this.onGiveUp = null;
    this.onStateChange = null;
  }

  // ─── Connection ──────────────────────────────────────────────────────

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isIntentionallyClosed = false;
    this._setState('connecting');
    this._createConnection();
  }

  _createConnection() {
    try {
      this.ws = new WebSocket(this.url, this.options.protocols);
    } catch (err) {
      this._handleError(err);
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this._setState('connected');
      this.retryCount = 0;
      this.currentDelay = this.options.initialDelay;

      // Flush queued messages
      this._flushQueue();

      // Start heartbeat
      this._startHeartbeat();

      if (this.onOpen) this.onOpen();
      if (this.retryCount > 0 && this.onReconnect) {
        this.onReconnect(this.retryCount);
      }
    };

    this.ws.onmessage = (event) => {
      // Reset heartbeat on any incoming message
      this._resetHeartbeat();

      // Handle pong
      if (event.data === '__pong__') return;

      if (this.onMessage) this.onMessage(event);
    };

    this.ws.onclose = (event) => {
      this._stopHeartbeat();

      if (this.onClose) this.onClose(event);

      if (!this.isIntentionallyClosed) {
        this._scheduleReconnect();
      } else {
        this._setState('disconnected');
      }
    };

    this.ws.onerror = (err) => {
      this._handleError(err);
    };
  }

  // ─── Send ────────────────────────────────────────────────────────────

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }

    // Queue message for when we reconnect
    if (this.messageQueue.length < this.options.maxQueueSize) {
      this.messageQueue.push(data);
      return false;
    }

    // Queue full — drop oldest
    this.messageQueue.shift();
    this.messageQueue.push(data);
    return false;
  }

  _flushQueue() {
    while (this.messageQueue.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = this.messageQueue.shift();
      this.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }

  // ─── Reconnection ───────────────────────────────────────────────────

  _scheduleReconnect() {
    if (this.isIntentionallyClosed) return;

    if (this.retryCount >= this.options.maxRetries) {
      this._setState('disconnected');
      if (this.onGiveUp) this.onGiveUp(this.retryCount);
      return;
    }

    this._setState('reconnecting');
    this.retryCount++;

    // Exponential backoff with optional jitter
    let delay = this.currentDelay;
    if (this.options.jitter) {
      // Add ±25% jitter
      const jitter = delay * 0.25;
      delay = delay - jitter + (Math.random() * jitter * 2);
    }

    if (this.onReconnecting) {
      this.onReconnecting(this.retryCount, Math.round(delay));
    }

    this.reconnectTimer = setTimeout(() => {
      this._createConnection();
    }, delay);

    // Increase delay for next attempt
    this.currentDelay = Math.min(
      this.currentDelay * this.options.multiplier,
      this.options.maxDelay,
    );
  }

  // ─── Heartbeat ───────────────────────────────────────────────────────

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('__ping__');

        // Set timeout for pong response
        this.heartbeatTimeoutTimer = setTimeout(() => {
          // No pong received — connection is dead
          console.warn('[WS] Heartbeat timeout — closing connection');
          this.ws.close(4000, 'Heartbeat timeout');
        }, this.options.heartbeatTimeout);
      }
    }, this.options.heartbeatInterval);
  }

  _resetHeartbeat() {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  _stopHeartbeat() {
    this._resetHeartbeat();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ─── Close ───────────────────────────────────────────────────────────

  close(code = 1000, reason = 'Client closed') {
    this.isIntentionallyClosed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this._stopHeartbeat();

    if (this.ws) {
      this.ws.close(code, reason);
    }

    this._setState('disconnected');
  }

  // ─── State ───────────────────────────────────────────────────────────

  _setState(state) {
    const prev = this.state;
    this.state = state;
    if (prev !== state && this.onStateChange) {
      this.onStateChange(state, prev);
    }
  }

  _handleError(err) {
    if (this.onError) this.onError(err);
  }

  // ─── Getters ─────────────────────────────────────────────────────────

  get readyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  get isConnected() {
    return this.state === 'connected';
  }

  get queueSize() {
    return this.messageQueue.length;
  }

  get retries() {
    return this.retryCount;
  }

  getStats() {
    return {
      state: this.state,
      retryCount: this.retryCount,
      currentDelay: this.currentDelay,
      queueSize: this.messageQueue.length,
      url: this.url,
    };
  }
}

// Export for both module and script contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReconnectingWebSocket };
}

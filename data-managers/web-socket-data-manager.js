/**
 * WebSocketDataManager - Handles real-time data via WebSocket connections
 * Supports path-based URLs, authentication tokens, reconnection, message queuing, and event-driven data updates
 */

class WebSocketDataManager {
    constructor(config = {}) {
        this.config = {
            path: '',               // WebSocket path (e.g., '/live', '/notifications')
            protocols: [],
            reconnect: true,
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            timeout: 30000,
            heartbeatInterval: 30000,
            heartbeatMessage: { type: 'ping' },
            autoParseJSON: true,
            queueMessages: true,
            maxQueueSize: 100,
            baseURL: null,          // Override default WebSocket base URL
            token: null,            // Auth token
            tokenType: 'Bearer',    // Token type
            ...config
        };

        // Handle legacy 'url' parameter for backward compatibility
        if (config.url && !config.path) {
            this.config.path = config.url;
        }

        this.ws = null;
        this.readyState = WebSocket.CLOSED;
        this.loadCount = 0;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.messageQueue = [];
        this.pendingPromises = new Map();
        this.eventListeners = new Map();
        this.lastData = null;
        this.connectionId = 0;

        // Bind methods to preserve context
        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleClose = this.handleClose.bind(this);
    }

    /**
     * Get WebSocket URL from environment and path
     */
    getWebSocketURL() {
        // Priority: 1. Explicit config, 2. Environment variable, 3. Derived from API base, 4. Default
        let baseURL = this.config.baseURL ||
                      window.WS_BASE_URL ||
                      process?.env?.WS_BASE_URL;

        // If no WebSocket base URL, derive from API base URL
        if (!baseURL && (window.API_BASE_URL || process?.env?.API_BASE_URL)) {
            const apiBase = window.API_BASE_URL || process?.env?.API_BASE_URL;
            baseURL = apiBase.replace(/^https?:/, 'ws:').replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
        }

        // Default fallback
        if (!baseURL) {
            baseURL = window.location.protocol === 'https:' ? 'wss://localhost:3001' : 'ws://localhost:3001';
        }

        // Remove trailing slash and add path
        baseURL = baseURL.replace(/\/$/, '');
        const path = this.config.path.startsWith('/') ? this.config.path : `/${this.config.path}`;

        return `${baseURL}${path}`;
    }

    /**
     * Add authentication to WebSocket URL if token available
     */
    addAuthToURL(wsURL) {
        if (!this.config.token) return wsURL;

        try {
            const url = new URL(wsURL);
            url.searchParams.append('token', this.config.token);
            return url.toString();
        } catch (error) {
            // Fallback: add as query parameter
            const separator = wsURL.includes('?') ? '&' : '?';
            return `${wsURL}${separator}token=${encodeURIComponent(this.config.token)}`;
        }
    }

    /**
     * Set authentication token for WebSocket connection
     */
    setAuth(token, type = 'Bearer') {
        this.config.token = token;
        this.config.tokenType = type;

        // If already connected, send auth message
        if (this.isConnected()) {
            this.send({
                type: 'auth',
                token: `${type} ${token}`
            });
        }

        return this;
    }

    /**
     * Remove authentication
     */
    removeAuth() {
        this.config.token = null;
        this.config.tokenType = 'Bearer';
        return this;
    }

    /**
     * Load data by establishing WebSocket connection
     */
    async load() {
        this.loadCount++;

        return new Promise((resolve, reject) => {
            // If already connected, resolve with last data
            if (this.readyState === WebSocket.OPEN && this.lastData !== null) {
                resolve(this.lastData);
                return;
            }

            // Store promise for resolution when data arrives
            const promiseId = `load_${Date.now()}_${Math.random()}`;
            this.pendingPromises.set(promiseId, { resolve, reject, type: 'load' });

            // Set timeout for load operation
            setTimeout(() => {
                if (this.pendingPromises.has(promiseId)) {
                    this.pendingPromises.delete(promiseId);
                    reject(new Error(`WebSocket load timeout after ${this.config.timeout}ms`));
                }
            }, this.config.timeout);

            // Connect if not already connected
            if (this.readyState === WebSocket.CLOSED) {
                this.connect();
            }
        });
    }

    /**
     * Establish WebSocket connection
     */
    connect() {
        if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            this.connectionId++;
            this.readyState = WebSocket.CONNECTING;

            // Build WebSocket URL with token if available
            const wsURL = this.getWebSocketURL();
            const urlWithAuth = this.addAuthToURL(wsURL);

            // Create WebSocket connection
            if (this.config.protocols.length > 0) {
                this.ws = new WebSocket(urlWithAuth, this.config.protocols);
            } else {
                this.ws = new WebSocket(urlWithAuth);
            }

            // Set up event listeners
            this.ws.addEventListener('open', this.handleOpen);
            this.ws.addEventListener('message', this.handleMessage);
            this.ws.addEventListener('error', this.handleError);
            this.ws.addEventListener('close', this.handleClose);

            this.emit('connecting', { url: urlWithAuth, attempt: this.reconnectAttempts + 1 });

        } catch (error) {
            this.handleError({ error });
        }
    }

    /**
     * Handle WebSocket open event
     */
    handleOpen(event) {
        this.readyState = WebSocket.OPEN;
        this.reconnectAttempts = 0;

        this.emit('connected', { event, connectionId: this.connectionId });

        // Send authentication if token available
        if (this.config.token) {
            this.send({
                type: 'auth',
                token: `${this.config.tokenType} ${this.config.token}`
            });
        }

        // Start heartbeat
        this.startHeartbeat();

        // Send queued messages
        this.sendQueuedMessages();

        // Send initial message if configured
        if (this.config.message) {
            this.send(this.config.message);
        }
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(event) {
        try {
            let data = event.data;

            // Auto-parse JSON if enabled
            if (this.config.autoParseJSON && typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (parseError) {
                    // Keep as string if JSON parsing fails
                }
            }

            // Store as last received data
            this.lastData = data;

            this.emit('message', { data, raw: event.data, event });

            // Resolve pending load promises
            this.resolvePendingPromises('load', data);

            // Handle heartbeat responses
            if (this.isHeartbeatResponse(data)) {
                this.emit('heartbeat', { data });
                return;
            }

            // Handle specific message types
            this.handleSpecificMessage(data);

        } catch (error) {
            this.emit('error', { error, event });
        }
    }

    /**
     * Handle WebSocket error event
     */
    handleError(event) {
        const error = event.error || new Error('WebSocket error occurred');

        this.emit('error', { error, event });

        // Reject pending promises
        this.rejectPendingPromises('load', error);
    }

    /**
     * Handle WebSocket close event
     */
    handleClose(event) {
        this.readyState = WebSocket.CLOSED;

        // Clear heartbeat
        this.stopHeartbeat();

        this.emit('disconnected', {
            event,
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            connectionId: this.connectionId
        });

        // Attempt reconnection if enabled and not intentionally closed
        if (this.config.reconnect && !event.wasClean && event.code !== 1000) {
            this.attemptReconnect();
        } else {
            // Reject pending promises if not reconnecting
            this.rejectPendingPromises('load', new Error('WebSocket connection closed'));
        }
    }

    /**
     * Attempt to reconnect
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            this.emit('reconnect_failed', {
                attempts: this.reconnectAttempts,
                maxAttempts: this.config.maxReconnectAttempts
            });
            this.rejectPendingPromises('load', new Error('Max reconnection attempts reached'));
            return;
        }

        this.reconnectAttempts++;

        this.emit('reconnecting', {
            attempt: this.reconnectAttempts,
            maxAttempts: this.config.maxReconnectAttempts,
            delay: this.config.reconnectInterval
        });

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, this.config.reconnectInterval);
    }

    /**
     * Send message through WebSocket
     */
    send(message) {
        if (this.readyState === WebSocket.OPEN) {
            try {
                const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
                this.ws.send(messageStr);
                this.emit('sent', { message, messageStr });
                return true;
            } catch (error) {
                this.emit('error', { error, context: 'send' });
                return false;
            }
        } else {
            // Queue message if connection is not open
            if (this.config.queueMessages) {
                this.queueMessage(message);
            }
            return false;
        }
    }

    /**
     * Queue message for later sending
     */
    queueMessage(message) {
        if (this.messageQueue.length >= this.config.maxQueueSize) {
            this.messageQueue.shift(); // Remove oldest message
        }

        this.messageQueue.push({
            message,
            timestamp: Date.now()
        });

        this.emit('message_queued', { message, queueSize: this.messageQueue.length });
    }

    /**
     * Send all queued messages
     */
    sendQueuedMessages() {
        while (this.messageQueue.length > 0) {
            const { message } = this.messageQueue.shift();
            this.send(message);
        }
    }

    /**
     * Start heartbeat mechanism
     */
    startHeartbeat() {
        if (this.config.heartbeatInterval > 0) {
            this.heartbeatTimer = setInterval(() => {
                if (this.readyState === WebSocket.OPEN) {
                    this.send(this.config.heartbeatMessage);
                }
            }, this.config.heartbeatInterval);
        }
    }

    /**
     * Stop heartbeat mechanism
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Check if message is a heartbeat response
     */
    isHeartbeatResponse(data) {
        if (typeof data === 'object' && data.type) {
            return data.type === 'pong' || data.type === 'heartbeat';
        }
        return false;
    }

    /**
     * Handle specific message types
     */
    handleSpecificMessage(data) {
        if (typeof data === 'object' && data.type) {
            this.emit(`message:${data.type}`, { data });
        }
    }

    /**
     * Resolve pending promises of a specific type
     */
    resolvePendingPromises(type, data) {
        for (const [id, promise] of this.pendingPromises.entries()) {
            if (promise.type === type) {
                promise.resolve(data);
                this.pendingPromises.delete(id);
            }
        }
    }

    /**
     * Reject pending promises of a specific type
     */
    rejectPendingPromises(type, error) {
        for (const [id, promise] of this.pendingPromises.entries()) {
            if (promise.type === type) {
                promise.reject(error);
                this.pendingPromises.delete(id);
            }
        }
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
        return this;
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        return this;
    }

    /**
     * Emit event to listeners
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in WebSocket event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Disconnect WebSocket
     */
    disconnect(code = 1000, reason = '') {
        if (this.ws && this.readyState !== WebSocket.CLOSED) {
            this.config.reconnect = false; // Prevent reconnection
            this.ws.close(code, reason);
        }

        this.cleanup();
        return this;
    }

    /**
     * Get current connection state
     */
    getReadyState() {
        return this.readyState;
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.readyState === WebSocket.OPEN;
    }

    /**
     * Get last received data
     */
    getLastData() {
        return this.lastData;
    }

    /**
     * Update configuration
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        return this;
    }

    /**
     * Set heartbeat configuration
     */
    setHeartbeat(interval, message = { type: 'ping' }) {
        this.config.heartbeatInterval = interval;
        this.config.heartbeatMessage = message;

        // Restart heartbeat if connected
        if (this.isConnected()) {
            this.stopHeartbeat();
            this.startHeartbeat();
        }

        return this;
    }

    /**
     * Set reconnection configuration
     */
    setReconnect(enabled, interval = 5000, maxAttempts = 10) {
        this.config.reconnect = enabled;
        this.config.reconnectInterval = interval;
        this.config.maxReconnectAttempts = maxAttempts;
        return this;
    }

    /**
     * Clear message queue
     */
    clearQueue() {
        this.messageQueue = [];
        return this;
    }

    /**
     * Get manager statistics
     */
    getStats() {
        return {
            type: 'websocket',
            loadCount: this.loadCount,
            readyState: this.readyState,
            reconnectAttempts: this.reconnectAttempts,
            queueSize: this.messageQueue.length,
            pendingPromises: this.pendingPromises.size,
            eventListeners: this.eventListeners.size,
            connectionId: this.connectionId,
            config: {
                path: this.config.path,
                baseURL: this.getWebSocketURL(),
                reconnect: this.config.reconnect,
                heartbeatInterval: this.config.heartbeatInterval,
                maxReconnectAttempts: this.config.maxReconnectAttempts,
                hasToken: !!this.config.token
            }
        };
    }

    /**
     * Create a new WebSocketDataManager with the same config
     */
    clone() {
        return new WebSocketDataManager({ ...this.config });
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Clear timers
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.stopHeartbeat();

        // Clear queues and promises
        this.messageQueue = [];
        this.rejectPendingPromises('load', new Error('WebSocket manager destroyed'));

        // Clear event listeners
        this.eventListeners.clear();
    }

    /**
     * Destroy the WebSocket manager
     */
    destroy() {
        this.disconnect();
        this.cleanup();

        this.ws = null;
        this.config = null;
        this.lastData = null;
    }

    /**
     * String representation
     */
    toString() {
        const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
        const stateName = stateNames[this.readyState] || 'UNKNOWN';
        const wsURL = this.getWebSocketURL();
        return `WebSocketDataManager(${wsURL}, ${stateName}, loads: ${this.loadCount})`;
    }
}

// ========================================
// EXPORT AND GLOBAL ASSIGNMENT
// ========================================

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketDataManager;
}

if (typeof window !== 'undefined') {
    window.WebSocketDataManager = WebSocketDataManager;
    console.log('✅ WebSocketDataManager loaded');
}

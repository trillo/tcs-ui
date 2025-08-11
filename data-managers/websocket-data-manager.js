/**
 * WebSocketDataManager - Enhanced real-time data via WebSocket connections
 * Supports Utils integration, API versioning, and improved configuration merging
 */

class WebSocketDataManager {
    constructor(config = {}) {
        // Default configuration
        const defaultConfig = {
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
            apiVersion: null,       // Override default API version if needed
            useGlobalConfig: true,  // Whether to use global API configuration
            token: null,            // Auth token
            tokenType: 'Bearer'     // Token type
        };

        // Handle legacy 'url' parameter for backward compatibility
        if (config.url && !config.path) {
            config.path = config.url;
            delete config.url; // Clean up legacy property
        }

        // Use Utils.deepMerge for proper configuration merging
        this.config = Utils.deepMerge(defaultConfig, config);

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

        Utils.log('WebSocketDataManager', 'log', 'Initialized with config:', this.config);
    }

    /**
     * Get default configuration for WebSocketDataManager
     */
    static getDefaultConfig() {
        return {
            path: '',
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
            baseURL: null,
            apiVersion: null,
            useGlobalConfig: true,
            token: null,
            tokenType: 'Bearer'
        };
    }

    /**
     * Get WebSocket base URL from global configuration or fallback
     */
    getBaseURL() {
        if (this.config.baseURL) {
            return this.config.baseURL;
        }

        if (this.config.useGlobalConfig) {
            // Priority: 1. Global WS variable, 2. Environment variable, 3. Derived from API base, 4. Default
            let baseURL = window.WS_BASE_URL ||
                          (typeof process !== 'undefined' && process.env?.WS_BASE_URL);

            // If no WebSocket base URL, derive from API base URL
            if (!baseURL && (window.API_BASE_URL || (typeof process !== 'undefined' && process.env?.API_BASE_URL))) {
                const apiBase = window.API_BASE_URL || process.env?.API_BASE_URL;
                baseURL = apiBase.replace(/^https?:/, 'ws:').replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
            }

            // Default fallback
            if (!baseURL) {
                baseURL = window.location.protocol === 'https:' ? 'wss://localhost:3001' : 'ws://localhost:3001';
            }

            return baseURL;
        }

        // Fallback when not using global config
        return window.location.protocol === 'https:' ? 'wss://localhost:3001' : 'ws://localhost:3001';
    }

    /**
     * Get API version from global configuration or fallback
     */
    getApiVersion() {
        if (this.config.apiVersion !== null) {
            return this.config.apiVersion;
        }

        if (this.config.useGlobalConfig) {
            return window.API_VERSION || '';
        }

        return ''; // No version by default for WebSocket
    }

    /**
     * Build WebSocket URL with API versioning support
     */
    getWebSocketURL() {
        const baseURL = this.getBaseURL().replace(/\/$/, ''); // Remove trailing slash
        const apiVersion = this.getApiVersion();

        let path = this.config.path;

        // Ensure path starts with /
        if (!path.startsWith('/')) {
            path = `/${path}`;
        }

        // Build URL with versioning
        if (apiVersion) {
            // Clean version (remove leading/trailing slashes)
            const cleanVersion = apiVersion.replace(/^\/|\/$/g, '');
            return `${baseURL}/${cleanVersion}${path}`;
        } else {
            return `${baseURL}${path}`;
        }
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

        Utils.log('WebSocketDataManager', 'log', 'Authentication token set');
        return this;
    }

    /**
     * Remove authentication
     */
    removeAuth() {
        this.config.token = null;
        this.config.tokenType = 'Bearer';
        Utils.log('WebSocketDataManager', 'log', 'Authentication token removed');
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
                Utils.log('WebSocketDataManager', 'log', 'Returning cached data from existing connection');
                resolve(this.lastData);
                return;
            }

            // Store promise for resolution when data arrives
            const promiseId = Utils.generateId ? Utils.generateId('load') : `load_${Date.now()}_${Math.random()}`;
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

            Utils.log('WebSocketDataManager', 'log', 'Connecting to:', urlWithAuth.replace(/token=[^&]*/, 'token=***'));

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

            this.emit('connecting', {
                url: wsURL, // Don't include token in event data
                attempt: this.reconnectAttempts + 1,
                connectionId: this.connectionId
            });

        } catch (error) {
            Utils.log('WebSocketDataManager', 'error', 'Connection error:', error.message);
            this.handleError({ error });
        }
    }

    /**
     * Handle WebSocket open event
     */
    handleOpen(event) {
        this.readyState = WebSocket.OPEN;
        this.reconnectAttempts = 0;

        Utils.log('WebSocketDataManager', 'log', 'Connected successfully');
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
                    Utils.log('WebSocketDataManager', 'warn', 'Failed to parse JSON message:', parseError.message);
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
            Utils.log('WebSocketDataManager', 'error', 'Message handling error:', error.message);
            this.emit('error', { error, event });
        }
    }

    /**
     * Handle WebSocket error event
     */
    handleError(event) {
        const error = event.error || new Error('WebSocket error occurred');

        Utils.log('WebSocketDataManager', 'error', 'WebSocket error:', error.message);
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

        Utils.log('WebSocketDataManager', 'log', 'Disconnected:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
        });

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
     * Attempt to reconnect with exponential backoff
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            Utils.log('WebSocketDataManager', 'error', 'Max reconnection attempts reached');
            this.emit('reconnect_failed', {
                attempts: this.reconnectAttempts,
                maxAttempts: this.config.maxReconnectAttempts
            });
            this.rejectPendingPromises('load', new Error('Max reconnection attempts reached'));
            return;
        }

        this.reconnectAttempts++;

        // Exponential backoff with jitter
        const baseDelay = this.config.reconnectInterval;
        const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
        const jitter = Math.random() * 1000; // Add up to 1 second of jitter
        const delay = Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds

        Utils.log('WebSocketDataManager', 'log', `Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

        this.emit('reconnecting', {
            attempt: this.reconnectAttempts,
            maxAttempts: this.config.maxReconnectAttempts,
            delay: delay
        });

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
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
                Utils.log('WebSocketDataManager', 'error', 'Send error:', error.message);
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
            Utils.log('WebSocketDataManager', 'warn', 'Message queue full, removing oldest message');
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
        const queueSize = this.messageQueue.length;
        if (queueSize > 0) {
            Utils.log('WebSocketDataManager', 'log', `Sending ${queueSize} queued messages`);

            while (this.messageQueue.length > 0) {
                const { message } = this.messageQueue.shift();
                this.send(message);
            }
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

            Utils.log('WebSocketDataManager', 'log', 'Heartbeat started:', this.config.heartbeatInterval + 'ms');
        }
    }

    /**
     * Stop heartbeat mechanism
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
            Utils.log('WebSocketDataManager', 'log', 'Heartbeat stopped');
        }
    }

    /**
     * Check if message is a heartbeat response
     */
    isHeartbeatResponse(data) {
        if (typeof data === 'object' && data && data.type) {
            return data.type === 'pong' || data.type === 'heartbeat';
        }
        return false;
    }

    /**
     * Handle specific message types
     */
    handleSpecificMessage(data) {
        if (typeof data === 'object' && data && data.type) {
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
                    Utils.log('WebSocketDataManager', 'error', `Error in event listener for ${event}:`, error.message);
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
     * Update configuration using Utils.deepMerge
     */
    configure(newConfig) {
        this.config = Utils.deepMerge(this.config, newConfig);
        Utils.log('WebSocketDataManager', 'log', 'Configuration updated:', newConfig);
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
     * Set API version for this instance
     */
    setApiVersion(version) {
        this.config.apiVersion = version;
        return this;
    }

    /**
     * Enable/disable global configuration usage
     */
    setUseGlobalConfig(enabled) {
        this.config.useGlobalConfig = enabled;
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
                baseURL: this.getBaseURL(),
                apiVersion: this.getApiVersion(),
                fullURL: this.getWebSocketURL(),
                reconnect: this.config.reconnect,
                heartbeatInterval: this.config.heartbeatInterval,
                maxReconnectAttempts: this.config.maxReconnectAttempts,
                useGlobalConfig: this.config.useGlobalConfig,
                hasToken: !!this.config.token
            }
        };
    }

    /**
     * Create a new WebSocketDataManager with the same config
     */
    clone() {
        return new WebSocketDataManager(Utils.deepClone(this.config));
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

        Utils.log('WebSocketDataManager', 'log', 'Destroyed');
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
    console.log('✅ Enhanced WebSocketDataManager with Utils integration and API versioning loaded');
}

/**
 * TrilloHTTPClient - API Client Library for TrilloAI Framework
 * Provides HTTP utilities with built-in error handling, retries, caching, and mock support
 *
 * Usage:
 * - Include in HTML: <script src="http.js"></script>
 * - Use: TrilloHTTPClient.get('/api/users'), TrilloHTTPClient.post('/api/users', data)
 */

class TrilloHTTPClient {
    constructor() {
        this.baseURL = '';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        this.timeout = 30000; // 30 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.mockMode = false;
        this.mockData = new Map();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.interceptors = {
            request: [],
            response: [],
            error: []
        };

        // Request queue for managing concurrent requests
        this.requestQueue = new Map();
        this.maxConcurrentRequests = 10;
        this.activeRequests = 0;

        // Debug mode
        this.debug = false;

        this.log('TrilloHTTPClient initialized');
    }

    // === CONFIGURATION METHODS ===

    /**
     * Configure the HTTP client
     */
    configure(config) {
        if (config.baseURL) this.baseURL = config.baseURL.replace(/\/$/, '');
        if (config.headers) this.defaultHeaders = { ...this.defaultHeaders, ...config.headers };
        if (config.timeout) this.timeout = config.timeout;
        if (config.retryAttempts) this.retryAttempts = config.retryAttempts;
        if (config.retryDelay) this.retryDelay = config.retryDelay;
        if (config.debug !== undefined) this.debug = config.debug;

        this.log('Configuration updated:', config);
        return this;
    }

    /**
     * Set authentication token
     */
    setAuthToken(token, type = 'Bearer') {
        if (token) {
            this.defaultHeaders['Authorization'] = `${type} ${token}`;
        } else {
            delete this.defaultHeaders['Authorization'];
        }
        this.log('Auth token updated');
        return this;
    }

    /**
     * Enable/disable mock mode
     */
    setMockMode(enabled, mockData = {}) {
        this.mockMode = enabled;
        if (mockData && typeof mockData === 'object') {
            Object.entries(mockData).forEach(([key, value]) => {
                this.mockData.set(key, value);
            });
        }
        this.log('Mock mode:', enabled ? 'enabled' : 'disabled');
        return this;
    }

    /**
     * Add mock data for specific endpoints
     */
    addMockData(endpoint, data, method = 'GET') {
        const key = `${method.toUpperCase()}:${endpoint}`;
        this.mockData.set(key, data);
        this.log('Mock data added for:', key);
        return this;
    }

    // === INTERCEPTOR METHODS ===

    /**
     * Add request interceptor
     */
    addRequestInterceptor(fn) {
        this.interceptors.request.push(fn);
        return this;
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(fn) {
        this.interceptors.response.push(fn);
        return this;
    }

    /**
     * Add error interceptor
     */
    addErrorInterceptor(fn) {
        this.interceptors.error.push(fn);
        return this;
    }

    // === CACHE METHODS ===

    /**
     * Clear cache
     */
    clearCache(pattern) {
        if (pattern) {
            const regex = new RegExp(pattern);
            Array.from(this.cache.keys()).forEach(key => {
                if (regex.test(key)) {
                    this.cache.delete(key);
                }
            });
        } else {
            this.cache.clear();
        }
        this.log('Cache cleared:', pattern || 'all');
        return this;
    }

    /**
     * Get cache key
     */
    getCacheKey(url, method, params) {
        const paramStr = params ? JSON.stringify(params) : '';
        return `${method}:${url}:${paramStr}`;
    }

    // === HTTP METHODS ===

    /**
     * GET request
     */
    async get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    }

    /**
     * POST request
     */
    async post(url, data, options = {}) {
        return this.request(url, { ...options, method: 'POST', data });
    }

    /**
     * PUT request
     */
    async put(url, data, options = {}) {
        return this.request(url, { ...options, method: 'PUT', data });
    }

    /**
     * PATCH request
     */
    async patch(url, data, options = {}) {
        return this.request(url, { ...options, method: 'PATCH', data });
    }

    async json(url, options = {}) {
      const response = await this.get(url, options);

      // If data is a string (raw JSON), try to parse it
      if (typeof response.data === 'string') {
          try {
              return JSON.parse(response.data);
          } catch (error) {
              this.log('Failed to parse JSON string:', error.message);
              throw new Error('Invalid JSON response');
          }
      }

      // If data is null or undefined, there might have been a parsing error
      if (response.data === null || response.data === undefined) {
          throw new Error('No data received or failed to parse response');
      }

      return response.data;
    };

    async postJson(url, data, options = {}) {
        const response = await this.post(url, data, options);
        return response.data;
    };

    async putJson(url, data, options = {}) {
        const response = await this.put(url, data, options);
        return response.data;
    };

    /**
     * DELETE request
     */
    async delete(url, options = {}) {
        return this.request(url, { ...options, method: 'DELETE' });
    }

    /**
     * Upload file
     */
    async upload(url, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);

        if (options.additionalData) {
            Object.entries(options.additionalData).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }

        return this.request(url, {
            ...options,
            method: 'POST',
            data: formData,
            headers: {
                // Don't set Content-Type for FormData, let browser set it
                ...this.defaultHeaders,
                ...options.headers
            }
        });
    }

    /**
     * Download file
     */
    async download(url, filename, options = {}) {
        try {
            const response = await this.request(url, {
                ...options,
                responseType: 'blob'
            });

            // Create download link
            const blob = new Blob([response.data]);
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            return response;
        } catch (error) {
            throw new Error(`Download failed: ${error.message}`);
        }
    }

    // === MAIN REQUEST METHOD ===

    /**
     * Main request method
     */
    async request(url, options = {}) {
        const startTime = Date.now();
        let attempt = 0;

        // Normalize options
        const config = {
            method: 'GET',
            headers: { ...this.defaultHeaders },
            cache: true,
            timeout: this.timeout,
            retries: this.retryAttempts,
            ...options
        };

        // Build full URL
        const fullUrl = this.buildUrl(url, config.params);

        // Check cache for GET requests
        if (config.method === 'GET' && config.cache) {
            const cached = this.getFromCache(fullUrl, config.method, config.params);
            if (cached) {
                this.log('Cache hit:', fullUrl);
                return cached;
            }
        }

        // Check mock mode
        if (this.mockMode) {
            return this.handleMockRequest(fullUrl, config);
        }

        // Retry logic
        while (attempt <= config.retries) {
            try {
                // Wait for available slot if too many concurrent requests
                await this.waitForAvailableSlot();

                this.activeRequests++;
                const response = await this.makeHttpRequest(fullUrl, config);
                this.activeRequests--;

                // Cache successful GET requests
                if (config.method === 'GET' && config.cache && response.status >= 200 && response.status < 300) {
                    this.setCache(fullUrl, config.method, config.params, response);
                }

                const duration = Date.now() - startTime;
                this.log(`Request completed in ${duration}ms:`, config.method, fullUrl);

                return response;

            } catch (error) {
                this.activeRequests--;
                attempt++;

                // Don't retry certain errors
                if (this.shouldNotRetry(error) || attempt > config.retries) {
                    this.log('Request failed:', error.message);

                    // Run error interceptors
                    for (const interceptor of this.interceptors.error) {
                        try {
                            await interceptor(error, config);
                        } catch (interceptorError) {
                            this.log('Error interceptor failed:', interceptorError.message);
                        }
                    }

                    throw this.createErrorResponse(error, fullUrl, config);
                }

                // Wait before retry
                const delay = config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                this.log(`Retrying in ${delay}ms (attempt ${attempt}/${config.retries}):`, fullUrl);
                await this.sleep(delay);
            }
        }
    }

    /**
     * Make the actual HTTP request
     */
    async makeHttpRequest(url, config) {
        // Run request interceptors
        for (const interceptor of this.interceptors.request) {
            try {
                config = await interceptor(config) || config;
            } catch (error) {
                throw new Error(`Request interceptor failed: ${error.message}`);
            }
        }

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        try {
            // Prepare fetch options
            const fetchOptions = {
                method: config.method,
                headers: config.headers,
                signal: controller.signal
            };

            // Add body for non-GET requests
            if (config.data && config.method !== 'GET') {
                if (config.data instanceof FormData) {
                    fetchOptions.body = config.data;
                    // Remove Content-Type for FormData
                    delete fetchOptions.headers['Content-Type'];
                } else {
                    fetchOptions.body = JSON.stringify(config.data);
                }
            }

            this.log('Making request:', config.method, url, fetchOptions);

            // Make the request
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            // Create response object
            const responseObj = await this.createResponseObject(response, config);

            // Run response interceptors
            for (const interceptor of this.interceptors.response) {
                try {
                    await interceptor(responseObj, config);
                } catch (error) {
                    this.log('Response interceptor failed:', error.message);
                }
            }

            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return responseObj;

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${config.timeout}ms`);
            }

            throw error;
        }
    }

    /**
     * Create response object
     */
     /**
  * Create response object
  */
 async createResponseObject(response, config) {
     const responseObj = {
         status: response.status,
         statusText: response.statusText,
         headers: this.responseHeadersToObject(response.headers),
         config: config,
         url: response.url
     };

     // Parse response data based on content type
     const contentType = response.headers.get('content-type') || '';

     try {
         if (config.responseType === 'blob') {
             responseObj.data = await response.blob();
         } else if (contentType.includes('application/json')) {
             const textResponse = await response.text();
             // Try to parse as JSON, if it fails, store the raw text
             try {
                 responseObj.data = JSON.parse(textResponse);
             } catch (jsonError) {
                 this.log('JSON parse failed, storing raw text:', textResponse.substring(0, 100));
                 responseObj.data = textResponse;
             }
         } else if (contentType.includes('text/')) {
             responseObj.data = await response.text();
         } else {
             responseObj.data = await response.arrayBuffer();
         }
     } catch (error) {
         this.log('Failed to parse response:', error.message);
         // Try to get the raw response as text as a fallback
         try {
             responseObj.data = await response.text();
         } catch (fallbackError) {
             this.log('Failed to get response as text:', fallbackError.message);
             responseObj.data = null;
         }
     }

     return responseObj;
   }

    /**
     * Handle mock requests
     */
    async handleMockRequest(url, config) {
        const mockKey = `${config.method}:${url}`;
        const mockData = this.mockData.get(mockKey);

        if (mockData) {
            // Simulate network delay
            await this.sleep(Math.random() * 500 + 100);

            this.log('Mock response for:', mockKey);

            return {
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
                data: typeof mockData === 'function' ? mockData(config) : mockData,
                config: config,
                url: url
            };
        }

        // Default mock response
        return {
            status: 404,
            statusText: 'Not Found',
            headers: {},
            data: { error: 'Mock data not found for: ' + mockKey },
            config: config,
            url: url
        };
    }

    // === UTILITY METHODS ===

    /**
     * Build URL with query parameters
     */
    buildUrl(url, params) {
        // Handle relative URLs
        const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

        if (!params) return fullUrl;

        const urlObj = new URL(fullUrl);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                urlObj.searchParams.append(key, value);
            }
        });

        return urlObj.toString();
    }

    /**
     * Wait for available request slot
     */
    async waitForAvailableSlot() {
        while (this.activeRequests >= this.maxConcurrentRequests) {
            await this.sleep(50);
        }
    }

    /**
     * Check if error should not be retried
     */
    shouldNotRetry(error) {
        const noRetryStatuses = [400, 401, 403, 404, 422];
        const status = error.status || (error.message.includes('HTTP') ?
            parseInt(error.message.match(/HTTP (\d+)/)?.[1]) : null);

        return status && noRetryStatuses.includes(status);
    }

    /**
     * Create error response object
     */
    createErrorResponse(error, url, config) {
        return {
            name: 'HTTPError',
            message: error.message,
            status: error.status || 0,
            statusText: error.statusText || 'Unknown Error',
            url: url,
            config: config,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Convert response headers to object
     */
    responseHeadersToObject(headers) {
        const headersObj = {};
        for (const [key, value] of headers.entries()) {
            headersObj[key] = value;
        }
        return headersObj;
    }

    /**
     * Get from cache
     */
    getFromCache(url, method, params) {
        const key = this.getCacheKey(url, method, params);
        const cached = this.cache.get(key);

        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        if (cached) {
            this.cache.delete(key);
        }

        return null;
    }

    /**
     * Set cache
     */
    setCache(url, method, params, data) {
        const key = this.getCacheKey(url, method, params);
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Logging utility
     */
    log(...args) {
        if (this.debug) {
            console.log('[TrilloHTTPClient]', ...args);
        }
    }

    // === BATCH OPERATIONS ===

    /**
     * Execute multiple requests in parallel
     */
    async batch(requests) {
        this.log('Executing batch requests:', requests.length);

        try {
            const promises = requests.map(req => {
                if (typeof req === 'string') {
                    return this.get(req);
                } else {
                    return this.request(req.url, req.options);
                }
            });

            const results = await Promise.allSettled(promises);

            return results.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return { success: true, data: result.value, index };
                } else {
                    return { success: false, error: result.reason, index };
                }
            });

        } catch (error) {
            throw new Error(`Batch request failed: ${error.message}`);
        }
    }

    /**
     * Execute requests sequentially
     */
    async sequence(requests) {
        this.log('Executing sequential requests:', requests.length);

        const results = [];

        for (let i = 0; i < requests.length; i++) {
            try {
                const req = requests[i];
                let result;

                if (typeof req === 'string') {
                    result = await this.get(req);
                } else {
                    result = await this.request(req.url, req.options);
                }

                results.push({ success: true, data: result, index: i });

            } catch (error) {
                results.push({ success: false, error: error, index: i });
            }
        }

        return results;
    }

    // === HEALTH CHECK ===

    /**
     * Check API health
     */
    async healthCheck(endpoint = '/health') {
        try {
            const response = await this.get(endpoint, { cache: false, retries: 0 });
            return {
                healthy: true,
                status: response.status,
                data: response.data,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // === STATS ===

    /**
     * Get request statistics
     */
    getStats() {
        return {
            activeRequests: this.activeRequests,
            cacheSize: this.cache.size,
            mockMode: this.mockMode,
            mockDataCount: this.mockData.size,
            interceptors: {
                request: this.interceptors.request.length,
                response: this.interceptors.response.length,
                error: this.interceptors.error.length
            }
        };
    }
}

function setupHttpClients() {
    try {
        // Metadata Server Client
        window.MetadataClient = new TrilloHTTPClient();
        window.MetadataClient.configure({
            baseURL: 'http://localhost:8080',
            debug: this.debug,
            timeout: 15000
        });

        // Application Data Client (use main instance)
        window.ApiClient = new TrilloHTTPClient();
        window.ApiClient.configure({
            baseURL: 'https://localhost:9020',
            debug: this.debug,
            timeout: 30000
        });

        console.log('HTTP clients configured successfully and made globally available');

    } catch (error) {
        console.log('Error setting up HTTP clients:', error);
    }
}

// Usage Examples:
/*

// Basic configuration
TrilloHTTPClient.configure({
    baseURL: 'https://api.example.com',
    debug: true,
    timeout: 10000
});

// Set auth token
TrilloHTTPClient.setAuthToken('your-jwt-token');

// Basic requests
const users = await TrilloHTTPClient.get('/users');
const newUser = await TrilloHTTPClient.post('/users', { name: 'John', email: 'john@example.com' });

// With parameters
const filteredUsers = await TrilloHTTPClient.get('/users', {
    params: { role: 'admin', active: true }
});

// Mock mode for testing
TrilloHTTPClient.setMockMode(true);
TrilloHTTPClient.addMockData('/users', [
    { id: 1, name: 'John Doe', email: 'john@example.com' }
]);

// Batch requests
const results = await TrilloHTTPClient.batch([
    '/users',
    '/orders',
    { url: '/stats', options: { cache: false } }
]);

// File upload
const fileInput = document.getElementById('file');
const response = await TrilloHTTPClient.upload('/upload', fileInput.files[0]);

// File download
await TrilloHTTPClient.download('/export/users.csv', 'users.csv');

// Add interceptors
TrilloHTTPClient.addRequestInterceptor(async (config) => {
    config.headers['X-Request-ID'] = generateRequestId();
    return config;
});

TrilloHTTPClient.addErrorInterceptor(async (error) => {
    if (error.status === 401) {
        // Handle authentication error
        window.location.href = '/login';
    }
});

*/

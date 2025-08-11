/**
 * HTTPClient - Enhanced API Client Library with Versioning Support
 * Provides HTTP utilities with built-in error handling, retries, caching, and mock support
 */

class HTTPClient {
    constructor() {
        this.config = {};
        this.baseURL = '';
        this.apiVersion = ''; // New: API version support
        this.defaultHeaders = {
        };
        this.timeout = 30000; // 30 seconds
        this.retryAttempts = 1;
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

        this.log('HTTPClient initialized');
    }

    // === CONFIGURATION METHODS ===

    /**
     * Configure the HTTP client
     */
    configure(baseURL, config) {
        this.config = config;
        if (baseURL) this.baseURL = baseURL.replace(/\/$/, '');
        if (config.apiVersion) this.apiVersion = config.apiVersion.replace(/^\/|\/$/g, ''); // Clean leading/trailing slashes
        if (config.headers) this.defaultHeaders = { ...this.defaultHeaders, ...config.headers };
        if (config.timeout) this.timeout = config.timeout;
        if (config.retryAttempts !== undefined) this.retryAttempts = config.retryAttempts;
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
     * @param {string} urlOrPath - Full URL or path (if relative, will be combined with baseURL and apiVersion)
     * @param {object} options - Request options
     */
    async get(urlOrPath, options = {}) {
        return this.request(urlOrPath, { ...options, method: 'GET' });
    }

    /**
     * POST request
     * @param {string} urlOrPath - Full URL or path (if relative, will be combined with baseURL and apiVersion)
     * @param {*} data - Request body data
     * @param {object} options - Request options
     */
    async post(urlOrPath, data, options = {}) {
        return this.request(urlOrPath, { ...options, method: 'POST', data });
    }

    /**
     * PUT request
     * @param {string} urlOrPath - Full URL or path (if relative, will be combined with baseURL and apiVersion)
     * @param {*} data - Request body data
     * @param {object} options - Request options
     */
    async put(urlOrPath, data, options = {}) {
        return this.request(urlOrPath, { ...options, method: 'PUT', data });
    }

    /**
     * PATCH request
     * @param {string} urlOrPath - Full URL or path (if relative, will be combined with baseURL and apiVersion)
     * @param {*} data - Request body data
     * @param {object} options - Request options
     */
    async patch(urlOrPath, data, options = {}) {
        return this.request(urlOrPath, { ...options, method: 'PATCH', data });
    }

    /**
     * DELETE request
     * @param {string} urlOrPath - Full URL or path (if relative, will be combined with baseURL and apiVersion)
     * @param {object} options - Request options
     */
    async delete(urlOrPath, options = {}) {
        return this.request(urlOrPath, { ...options, method: 'DELETE' });
    }

    /**
     * Get JSON data directly
     * @param {string} urlOrPath - Full URL or path
     * @param {object} options - Request options
     */
    async json(urlOrPath, options = {}) {
        options.headers = { ...this.headers, 'Content-Type': 'application/json' };
        const response = await this.get(urlOrPath, options);

        // If data is a string (raw JSON), try to parse it
        if (typeof response.data === 'string') {
            try {
                response.data = JSON.parse(response.data);
            } catch (error) {
                this.log('Failed to parse JSON string:', error.message);
                throw new Error('Invalid JSON response');
            }
        }

        // If data is null or undefined, there might have been a parsing error
        if (response.data === null || response.data === undefined) {
            throw new Error('No data received or failed to parse response');
        }

        return response;
    }

    /**
     * POST JSON data and return JSON response
     * @param {string} urlOrPath - Full URL or path
     * @param {*} data - Request body data
     * @param {object} options - Request options
     */
    async postJson(urlOrPath, data, options = {}) {
        options.headers = { ...this.headers, 'Content-Type': 'application/json' };
        const response = await this.post(urlOrPath, data, options);
        return response;
    }

    /**
     * PUT JSON data and return JSON response
     * @param {string} urlOrPath - Full URL or path
     * @param {*} data - Request body data
     * @param {object} options - Request options
     */
    async putJson(urlOrPath, data, options = {}) {
        options.headers = { ...this.headers, 'Content-Type': 'application/json' };
        const response = await this.put(urlOrPath, data, options);
        return response;
    }

    /**
     * Load template by component name
     * @param {string} componentName - Name of the component
     */
    async loadTemplate(componentName) {
        const response = await this.json(`/templates/${componentName}`);
        return response;
    }

    /**
     * Upload file
     * @param {string} urlOrPath - Full URL or path
     * @param {File} file - File to upload
     * @param {object} options - Request options
     */
    async upload(urlOrPath, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);

        if (options.additionalData) {
            Object.entries(options.additionalData).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }

        return this.request(urlOrPath, {
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
     * @param {string} urlOrPath - Full URL or path
     * @param {string} filename - Filename for download
     * @param {object} options - Request options
     */
    async download(urlOrPath, filename, options = {}) {
        try {
            const response = await this.request(urlOrPath, {
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
     * @param {string} urlOrPath - Full URL or path
     * @param {object} options - Request options
     */
    async request(urlOrPath, options = {}) {
        const startTime = Date.now();
        let attempt = 0;

        // Normalize options
        const config = {
            method: 'GET',
            cache: true,
            timeout: this.timeout,
            retries: this.retryAttempts,
            ...options
        };

        config.headers = { ...this.defaultHeaders, ...config.headers };

        // Build full URL with API versioning
        const fullUrl = this.buildUrl(urlOrPath, config.params);

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

                    // Return error object with success=false instead of throwing
                    return {
                        success: false,
                        error: error.message,
                        status: error.status || 0,
                        statusText: error.statusText || 'Unknown Error',
                        url: fullUrl,
                        timestamp: new Date().toISOString()
                    };
                }

                // Wait before retry
                const delay = config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                this.log(`Retrying in ${delay}ms (attempt ${attempt}/${config.retries}):`, fullUrl);
                await this.sleep(delay);
            }
        }
    }

    // === UTILITY METHODS ===

    /**
     * Enhanced URL building with API versioning support
     * @param {string} urlOrPath - Full URL or path
     * @param {object} params - Query parameters
     * @returns {string} - Complete URL
     */
    buildUrl(urlOrPath, params) {
        let fullUrl;

        // Check if it's a full URL (starts with http/https or protocol-relative //)
        if (this.isFullUrl(urlOrPath)) {
            fullUrl = urlOrPath;
        } else {
            // It's a relative path, build with baseURL and apiVersion
            const cleanPath = urlOrPath.startsWith('/') ? urlOrPath.substring(1) : urlOrPath;

            if (this.apiVersion) {
                fullUrl = `${this.baseURL}/${this.apiVersion}/${cleanPath}`;
            } else {
                fullUrl = `${this.baseURL}/${cleanPath}`;
            }
        }

        // Add query parameters if present
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
     * Check if URL is a full URL
     * @param {string} url - URL to check
     * @returns {boolean} - True if it's a full URL
     */
    isFullUrl(url) {
        return url.startsWith('http://') ||
               url.startsWith('https://') ||
               url.startsWith('//') ||
               url.startsWith('file://') ||
               url.startsWith('data:');
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
            if (!responseObj.data) {
                const error = {};
                error.success = false;
                error.message = response.statusText;
                return error;
            }

            // SUCCESS: Return unwrapped data instead of responseObj
            return responseObj.data;

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
            console.log('[HTTPClient]', ...args);
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
            baseURL: this.baseURL,
            apiVersion: this.apiVersion,
            interceptors: {
                request: this.interceptors.request.length,
                response: this.interceptors.response.length,
                error: this.interceptors.error.length
            }
        };
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HTTPClient, API };
}

if (typeof window !== 'undefined') {
    window.HTTPClient = HTTPClient;
    console.log('✅ Enhanced HTTPClient with API versioning loaded');
}


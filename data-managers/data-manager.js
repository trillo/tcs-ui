/**
 * DataManager - Enhanced API data fetching and management
 * Supports Utils integration, API versioning, and improved configuration merging
 */

class DataManager {
    constructor(config = {}) {
        // Default configuration
        const defaultConfig = {
            path: '',           // API path (e.g., '/users', '/auth/login')
            method: 'GET',
            params: {},
            body: {},
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
            cache: false,
            cacheTimeout: 300000, // 5 minutes
            baseURL: null,      // Override default base URL if needed
            apiVersion: null,   // Override default API version if needed
            useGlobalConfig: true // Whether to use global API configuration
        };

        // Handle legacy 'url' parameter for backward compatibility
        if (config.url && !config.path) {
            config.path = config.url;
            delete config.url; // Clean up legacy property
        }

        // Use Utils.deepMerge for proper configuration merging
        this.config = Utils.deepMerge(defaultConfig, config);

        this.loadCount = 0;
        this.cache = new Map();
        this.abortController = null;

        Utils.log('DataManager', 'log', 'Initialized with config:', this.config);
    }

    /**
     * Get default configuration for DataManager
     */
    static getDefaultConfig() {
        return {
            path: '',
            method: 'GET',
            params: {},
            body: {},
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
            cache: false,
            cacheTimeout: 300000,
            baseURL: null,
            apiVersion: null,
            useGlobalConfig: true
        };
    }

    /**
     * Set authentication token for all requests
     */
    setAuth(token, type = 'Bearer') {
        if (token) {
            this.config.headers = Utils.deepMerge(this.config.headers, {
                'Authorization': `${type} ${token}`
            });
        } else {
            const headers = { ...this.config.headers };
            delete headers['Authorization'];
            this.config.headers = headers;
        }
        return this;
    }

    /**
     * Remove authentication
     */
    removeAuth() {
        const headers = { ...this.config.headers };
        delete headers['Authorization'];
        this.config.headers = headers;
        return this;
    }

    /**
     * Get base URL from global configuration or fallback
     */
    getBaseURL() {
        if (this.config.baseURL) {
            return this.config.baseURL;
        }

        if (this.config.useGlobalConfig) {
            // Priority: 1. Global window variable, 2. Environment variable, 3. Fallbacks
            return window.API_BASE_URL ||
                   (typeof process !== 'undefined' && process.env?.API_BASE_URL) ||
                   window.location.origin ||
                   'http://localhost:3000';
        }

        // Fallback when not using global config
        return window.location.origin || 'http://localhost:3000';
    }

    /**
     * Get API version from global configuration or fallback
     */
    getApiVersion() {
        if (this.config.apiVersion !== null) {
            return this.config.apiVersion;
        }

        if (this.config.useGlobalConfig) {
            return window.API_VERSION || 'v1.0';
        }

        return ''; // No version by default
    }

    /**
     * Build full URL with API versioning support
     */
    buildFullURL() {
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
     * Load data from API endpoint
     */
    async load() {
        this.loadCount++;

        // Check cache first
        if (this.config.cache) {
            const cached = this.getCachedData();
            if (cached) {
                Utils.log('DataManager', 'log', 'Cache hit for:', this.config.path);
                return cached;
            }
        }

        let lastError;

        // Retry logic with exponential backoff
        for (let attempt = 1; attempt <= this.config.retries; attempt++) {
            try {
                const data = await this.fetchData();

                // Cache the result
                if (this.config.cache) {
                    this.setCachedData(data);
                }

                Utils.log('DataManager', 'log', `Load successful (attempt ${attempt}):`, this.config.path);
                return data;

            } catch (error) {
                lastError = error;

                // Don't retry on certain errors
                if (this.isNonRetryableError(error)) {
                    Utils.log('DataManager', 'warn', 'Non-retryable error:', error.message);
                    throw error;
                }

                // Wait before retry (except on last attempt) with exponential backoff
                if (attempt < this.config.retries) {
                    const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                    Utils.log('DataManager', 'warn', `Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
                    await this.delay(delay);
                }
            }
        }

        Utils.log('DataManager', 'error', 'All retry attempts failed:', lastError.message);
        throw lastError;
    }

    /**
     * Perform the actual HTTP request
     */
    async fetchData() {
        const { method, params, body, headers, timeout } = this.config;

        // Build full URL with parameters and versioning
        const fullURL = this.buildFullURL();
        const requestUrl = this.buildURLWithParams(fullURL, params);

        // Create abort controller for timeout
        this.abortController = new AbortController();
        const timeoutId = setTimeout(() => {
            this.abortController.abort();
        }, timeout);

        try {
            // Prepare fetch options
            const options = {
                method: method.toUpperCase(),
                headers: { ...headers },
                signal: this.abortController.signal
            };

            // Add body for non-GET requests
            if (body && Object.keys(body).length > 0 && method.toUpperCase() !== 'GET') {
                if (headers['Content-Type'] === 'application/json') {
                    options.body = JSON.stringify(body);
                } else if (headers['Content-Type'] === 'application/x-www-form-urlencoded') {
                    options.body = new URLSearchParams(body).toString();
                } else {
                    options.body = body;
                }
            }

            Utils.log('DataManager', 'log', 'Making request:', method.toUpperCase(), requestUrl);

            // Make the request
            const response = await fetch(requestUrl, options);

            // Clear timeout
            clearTimeout(timeoutId);

            // Handle response
            return await this.handleResponse(response);

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout}ms`);
            }

            throw error;
        }
    }

    /**
     * Handle HTTP response
     */
    async handleResponse(response) {
        // Check if response is ok
        if (!response.ok) {
            const errorMessage = await this.getErrorMessage(response);
            const error = new Error(errorMessage);
            error.status = response.status;
            error.statusText = response.statusText;
            error.response = response;
            throw error;
        }

        // Parse response based on content type
        const contentType = response.headers.get('content-type') || '';

        try {
            if (contentType.includes('application/json')) {
                return await response.json();
            } else if (contentType.includes('text/')) {
                return await response.text();
            } else if (contentType.includes('application/xml')) {
                return await response.text();
            } else {
                return await response.blob();
            }
        } catch (parseError) {
            Utils.log('DataManager', 'warn', 'Failed to parse response:', parseError.message);
            throw new Error(`Failed to parse response: ${parseError.message}`);
        }
    }

    /**
     * Get error message from response using Utils
     */
    async getErrorMessage(response) {
        try {
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                const errorData = await response.json();

                // Use Utils.extractErrorMessage for consistent error extraction
                return Utils.extractErrorMessage ?
                       Utils.extractErrorMessage(errorData) :
                       (errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            } else {
                const errorText = await response.text();
                return errorText || `HTTP ${response.status}: ${response.statusText}`;
            }
        } catch (parseError) {
            return `HTTP ${response.status}: ${response.statusText}`;
        }
    }

    /**
     * Build URL with query parameters
     */
    buildURLWithParams(baseURL, params) {
        if (!params || Object.keys(params).length === 0) {
            return baseURL;
        }

        try {
            const url = new URL(baseURL);

            Object.keys(params).forEach(key => {
                const value = params[key];
                if (value !== null && value !== undefined) {
                    url.searchParams.append(key, String(value));
                }
            });

            return url.toString();
        } catch (error) {
            // Fallback for invalid URLs
            const queryString = Object.keys(params)
                .filter(key => params[key] !== null && params[key] !== undefined)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join('&');

            return baseURL + (baseURL.includes('?') ? '&' : '?') + queryString;
        }
    }

    /**
     * Check if error should not be retried
     */
    isNonRetryableError(error) {
        // Don't retry client errors (400-499) except 408 (timeout), 429 (rate limit)
        if (error.status >= 400 && error.status < 500) {
            return ![408, 429].includes(error.status);
        }

        // Don't retry abort errors
        if (error.name === 'AbortError') {
            return true;
        }

        return false;
    }

    /**
     * Delay utility for retries
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get cached data if available and not expired
     */
    getCachedData() {
        const cacheKey = this.getCacheKey();
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
            return cached.data;
        }

        // Remove expired cache
        if (cached) {
            this.cache.delete(cacheKey);
        }

        return null;
    }

    /**
     * Set data in cache
     */
    setCachedData(data) {
        const cacheKey = this.getCacheKey();
        this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Generate cache key based on config
     */
    getCacheKey() {
        const { path, method, params, body } = this.config;
        const fullURL = this.buildFullURL();
        return JSON.stringify({ url: fullURL, method, params, body });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        return this;
    }

    /**
     * Update configuration using Utils.deepMerge
     */
    configure(newConfig) {
        this.config = Utils.deepMerge(this.config, newConfig);
        Utils.log('DataManager', 'log', 'Configuration updated:', newConfig);
        return this;
    }

    /**
     * Set request headers using Utils.deepMerge
     */
    setHeaders(headers) {
        this.config.headers = Utils.deepMerge(this.config.headers, headers);
        return this;
    }

    /**
     * Set request timeout
     */
    setTimeout(timeout) {
        this.config.timeout = timeout;
        return this;
    }

    /**
     * Enable/disable caching
     */
    setCache(enabled, timeout = 300000) {
        this.config.cache = enabled;
        this.config.cacheTimeout = timeout;
        return this;
    }

    /**
     * Set retry configuration
     */
    setRetries(retries, delay = 1000) {
        this.config.retries = retries;
        this.config.retryDelay = delay;
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
     * Abort current request
     */
    abort() {
        if (this.abortController) {
            this.abortController.abort();
        }
        return this;
    }

    /**
     * Get manager statistics
     */
    getStats() {
        return {
            type: 'api',
            loadCount: this.loadCount,
            cacheSize: this.cache.size,
            config: {
                path: this.config.path,
                method: this.config.method,
                baseURL: this.getBaseURL(),
                apiVersion: this.getApiVersion(),
                fullURL: this.buildFullURL(),
                timeout: this.config.timeout,
                retries: this.config.retries,
                cache: this.config.cache,
                useGlobalConfig: this.config.useGlobalConfig
            }
        };
    }

    /**
     * Create a new DataManager with the same config
     */
    clone() {
        return new DataManager(Utils.deepClone(this.config));
    }

    /**
     * Static factory methods with API versioning support
     */

    /**
     * Make a GET request
     */
    static async get(path, params = {}, options = {}) {
        const manager = new DataManager(Utils.deepMerge({
            path,
            method: 'GET',
            params
        }, options));
        return await manager.load();
    }

    /**
     * Make a POST request
     */
    static async post(path, body = {}, options = {}) {
        const manager = new DataManager(Utils.deepMerge({
            path,
            method: 'POST',
            body
        }, options));
        return await manager.load();
    }

    /**
     * Make a PUT request
     */
    static async put(path, body = {}, options = {}) {
        const manager = new DataManager(Utils.deepMerge({
            path,
            method: 'PUT',
            body
        }, options));
        return await manager.load();
    }

    /**
     * Make a DELETE request
     */
    static async delete(path, options = {}) {
        const manager = new DataManager(Utils.deepMerge({
            path,
            method: 'DELETE'
        }, options));
        return await manager.load();
    }

    /**
     * Make a PATCH request
     */
    static async patch(path, body = {}, options = {}) {
        const manager = new DataManager(Utils.deepMerge({
            path,
            method: 'PATCH',
            body
        }, options));
        return await manager.load();
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.abort();
        this.clearCache();
        this.config = null;
        this.abortController = null;
        Utils.log('DataManager', 'log', 'Destroyed');
    }

    /**
     * String representation
     */
    toString() {
        const fullURL = this.buildFullURL();
        return `DataManager(${this.config.method} ${fullURL}, loads: ${this.loadCount})`;
    }
}

// ========================================
// EXPORT AND GLOBAL ASSIGNMENT
// ========================================

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}

if (typeof window !== 'undefined') {
    window.DataManager = DataManager;
    console.log('✅ Enhanced DataManager with Utils integration and API versioning loaded');
}

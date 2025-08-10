/**
 * DataManager - Handles API data fetching and management
 * Simplified to work with environment-based base URLs and path-based requests
 */

class DataManager {
    constructor(config = {}) {
        this.config = {
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
            ...config
        };

        // Handle legacy 'url' parameter for backward compatibility
        if (config.url && !config.path) {
            this.config.path = config.url;
        }

        this.loadCount = 0;
        this.cache = new Map();
        this.abortController = null;
    }

    /**
     * Set authentication token for all requests
     */
    setAuth(token, type = 'Bearer') {
        if (token) {
            this.config.headers['Authorization'] = `${type} ${token}`;
        } else {
            delete this.config.headers['Authorization'];
        }
        return this;
    }

    /**
     * Remove authentication
     */
    removeAuth() {
        delete this.config.headers['Authorization'];
        return this;
    }
    
    /**
     * Get base URL from environment or configuration
     */
    getBaseURL() {
        // Priority: 1. Explicit config, 2. Environment variable, 3. Current origin, 4. Default
        return this.config.baseURL ||
               window.API_BASE_URL ||
               process?.env?.API_BASE_URL ||
               window.location.origin ||
               'http://localhost:3000';
    }

    /**
     * Build full URL from base URL and path
     */
    buildFullURL() {
        const baseURL = this.getBaseURL().replace(/\/$/, ''); // Remove trailing slash
        const path = this.config.path.startsWith('/') ? this.config.path : `/${this.config.path}`;
        return `${baseURL}${path}`;
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
                return cached;
            }
        }

        let lastError;

        // Retry logic
        for (let attempt = 1; attempt <= this.config.retries; attempt++) {
            try {
                const data = await this.fetchData();

                // Cache the result
                if (this.config.cache) {
                    this.setCachedData(data);
                }

                return data;

            } catch (error) {
                lastError = error;

                // Don't retry on certain errors
                if (this.isNonRetryableError(error)) {
                    throw error;
                }

                // Wait before retry (except on last attempt)
                if (attempt < this.config.retries) {
                    await this.delay(this.config.retryDelay * attempt);
                }
            }
        }

        throw lastError;
    }

    /**
     * Perform the actual HTTP request
     */
    async fetchData() {
        const { method, params, body, headers, timeout } = this.config;

        // Build full URL with parameters
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
            throw error;
        }

        // Parse response based on content type
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            return await response.json();
        } else if (contentType.includes('text/')) {
            return await response.text();
        } else if (contentType.includes('application/xml')) {
            return await response.text();
        } else {
            return await response.blob();
        }
    }

    /**
     * Get error message from response
     */
    async getErrorMessage(response) {
        try {
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                const errorData = await response.json();
                return errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
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
        // Don't retry client errors (400-499)
        if (error.status >= 400 && error.status < 500) {
            return true;
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
     * Update configuration
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        return this;
    }

    /**
     * Set request headers
     */
    setHeaders(headers) {
        this.config.headers = { ...this.config.headers, ...headers };
        return this;
    }

    /**
     * Set authentication header
     */
    setAuth(token, type = 'Bearer') {
        this.config.headers['Authorization'] = `${type} ${token}`;
        return this;
    }

    /**
     * Remove authentication header
     */
    removeAuth() {
        delete this.config.headers['Authorization'];
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
                timeout: this.config.timeout,
                retries: this.config.retries,
                cache: this.config.cache
            }
        };
    }

    /**
     * Create a new DataManager with the same config
     */
    clone() {
        return new DataManager({ ...this.config });
    }

    /**
     * Make a GET request
     */
    static async get(path, params = {}, options = {}) {
        const manager = new DataManager({
            path,
            method: 'GET',
            params,
            ...options
        });
        return await manager.load();
    }

    /**
     * Make a POST request
     */
    static async post(path, body = {}, options = {}) {
        const manager = new DataManager({
            path,
            method: 'POST',
            body,
            ...options
        });
        return await manager.load();
    }

    /**
     * Make a PUT request
     */
    static async put(path, body = {}, options = {}) {
        const manager = new DataManager({
            path,
            method: 'PUT',
            body,
            ...options
        });
        return await manager.load();
    }

    /**
     * Make a DELETE request
     */
    static async delete(path, options = {}) {
        const manager = new DataManager({
            path,
            method: 'DELETE',
            ...options
        });
        return await manager.load();
    }

    /**
     * Make a PATCH request
     */
    static async patch(path, body = {}, options = {}) {
        const manager = new DataManager({
            path,
            method: 'PATCH',
            body,
            ...options
        });
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
    console.log('✅ DataManager loaded');
}

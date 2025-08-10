/**
 * FunctionDataManager - Handles data loading via custom functions
 * Useful for complex data loading logic, aggregation, or custom APIs
 */

class FunctionDataManager {
    constructor(loaderFunction, options = {}) {
        if (typeof loaderFunction !== 'function') {
            throw new Error('Loader must be a function');
        }

        this.loaderFunction = loaderFunction;
        this.options = {
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
            cache: false,
            cacheTimeout: 300000, // 5 minutes
            context: null, // Context to bind the function to
            ...options
        };

        this.loadCount = 0;
        this.cache = new Map();
        this.abortController = null;
        this.isLoading = false;
    }

    /**
     * Load data using the provided function
     */
    async load(...args) {
        this.loadCount++;

        // Prevent concurrent loads
        if (this.isLoading) {
            throw new Error('Load operation already in progress');
        }

        // Check cache first
        if (this.options.cache) {
            const cached = this.getCachedData(args);
            if (cached) {
                return cached;
            }
        }

        this.isLoading = true;
        let lastError;

        try {
            // Retry logic
            for (let attempt = 1; attempt <= this.options.retries; attempt++) {
                try {
                    const data = await this.executeFunction(args);

                    // Cache the result
                    if (this.options.cache) {
                        this.setCachedData(args, data);
                    }

                    return data;

                } catch (error) {
                    lastError = error;

                    // Don't retry on certain errors
                    if (this.isNonRetryableError(error)) {
                        throw error;
                    }

                    // Wait before retry (except on last attempt)
                    if (attempt < this.options.retries) {
                        await this.delay(this.options.retryDelay * attempt);
                    }
                }
            }

            throw lastError;

        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Execute the loader function with timeout and abort handling
     */
    async executeFunction(args) {
        // Create abort controller for timeout
        this.abortController = new AbortController();

        // Setup timeout
        const timeoutId = setTimeout(() => {
            this.abortController.abort();
        }, this.options.timeout);

        try {
            // Execute the function with context and abort signal
            const context = this.options.context || this;
            const functionArgs = [...args, { signal: this.abortController.signal }];

            let result;
            if (this.options.context) {
                result = await this.loaderFunction.apply(context, functionArgs);
            } else {
                result = await this.loaderFunction(...functionArgs);
            }

            // Clear timeout
            clearTimeout(timeoutId);

            return result;

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error(`Function execution timeout after ${this.options.timeout}ms`);
            }

            throw error;
        }
    }

    /**
     * Check if error should not be retried
     */
    isNonRetryableError(error) {
        // Don't retry validation errors
        if (error.message.includes('validation') || error.message.includes('invalid')) {
            return true;
        }

        // Don't retry abort errors
        if (error.name === 'AbortError') {
            return true;
        }

        // Don't retry permission errors
        if (error.message.includes('permission') || error.message.includes('unauthorized')) {
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
    getCachedData(args) {
        const cacheKey = this.getCacheKey(args);
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.options.cacheTimeout) {
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
    setCachedData(args, data) {
        const cacheKey = this.getCacheKey(args);
        this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Generate cache key based on arguments
     */
    getCacheKey(args) {
        try {
            return JSON.stringify(args);
        } catch (error) {
            // Fallback for non-serializable arguments
            return args.map((arg, index) => `${index}:${typeof arg}`).join('|');
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        return this;
    }

    /**
     * Update loader function
     */
    setLoader(loaderFunction) {
        if (typeof loaderFunction !== 'function') {
            throw new Error('Loader must be a function');
        }
        this.loaderFunction = loaderFunction;
        return this;
    }

    /**
     * Update options
     */
    configure(newOptions) {
        this.options = { ...this.options, ...newOptions };
        return this;
    }

    /**
     * Set function context
     */
    setContext(context) {
        this.options.context = context;
        return this;
    }

    /**
     * Set timeout
     */
    setTimeout(timeout) {
        this.options.timeout = timeout;
        return this;
    }

    /**
     * Enable/disable caching
     */
    setCache(enabled, timeout = 300000) {
        this.options.cache = enabled;
        this.options.cacheTimeout = timeout;
        return this;
    }

    /**
     * Set retry configuration
     */
    setRetries(retries, delay = 1000) {
        this.options.retries = retries;
        this.options.retryDelay = delay;
        return this;
    }

    /**
     * Abort current execution
     */
    abort() {
        if (this.abortController) {
            this.abortController.abort();
        }
        return this;
    }

    /**
     * Check if currently loading
     */
    isCurrentlyLoading() {
        return this.isLoading;
    }

    /**
     * Get manager statistics
     */
    getStats() {
        return {
            type: 'function',
            loadCount: this.loadCount,
            isLoading: this.isLoading,
            cacheSize: this.cache.size,
            functionName: this.loaderFunction.name || 'anonymous',
            options: {
                timeout: this.options.timeout,
                retries: this.options.retries,
                cache: this.options.cache,
                hasContext: !!this.options.context
            }
        };
    }

    /**
     * Create a wrapper function that can be used directly
     */
    createWrapper() {
        return (...args) => this.load(...args);
    }

    /**
     * Create a new FunctionDataManager with the same config
     */
    clone() {
        return new FunctionDataManager(this.loaderFunction, { ...this.options });
    }

    /**
     * Create a composed function from multiple loaders
     */
    static compose(...managers) {
        if (!managers.every(m => m instanceof FunctionDataManager)) {
            throw new Error('All arguments must be FunctionDataManager instances');
        }

        const composedFunction = async (...args) => {
            const results = [];
            for (const manager of managers) {
                const result = await manager.load(...args);
                results.push(result);
            }
            return results;
        };

        return new FunctionDataManager(composedFunction);
    }

    /**
     * Create a parallel execution function
     */
    static parallel(...managers) {
        if (!managers.every(m => m instanceof FunctionDataManager)) {
            throw new Error('All arguments must be FunctionDataManager instances');
        }

        const parallelFunction = async (...args) => {
            const promises = managers.map(manager => manager.load(...args));
            return await Promise.all(promises);
        };

        return new FunctionDataManager(parallelFunction);
    }

    /**
     * Create a conditional execution function
     */
    static conditional(conditionFn, trueManager, falseManager = null) {
        if (typeof conditionFn !== 'function') {
            throw new Error('Condition must be a function');
        }

        if (!(trueManager instanceof FunctionDataManager)) {
            throw new Error('True manager must be a FunctionDataManager instance');
        }

        if (falseManager && !(falseManager instanceof FunctionDataManager)) {
            throw new Error('False manager must be a FunctionDataManager instance');
        }

        const conditionalFunction = async (...args) => {
            const condition = await conditionFn(...args);

            if (condition) {
                return await trueManager.load(...args);
            } else if (falseManager) {
                return await falseManager.load(...args);
            } else {
                return null;
            }
        };

        return new FunctionDataManager(conditionalFunction);
    }

    /**
     * Create a function with built-in transformation
     */
    transform(transformFn) {
        if (typeof transformFn !== 'function') {
            throw new Error('Transform function must be a function');
        }

        const transformedFunction = async (...args) => {
            const data = await this.load(...args);
            return transformFn(data);
        };

        return new FunctionDataManager(transformedFunction, { ...this.options });
    }

    /**
     * Create a function with built-in validation
     */
    validate(validationFn) {
        if (typeof validationFn !== 'function') {
            throw new Error('Validation function must be a function');
        }

        const validatedFunction = async (...args) => {
            const data = await this.load(...args);

            if (!validationFn(data)) {
                throw new Error('Data validation failed');
            }

            return data;
        };

        return new FunctionDataManager(validatedFunction, { ...this.options });
    }

    /**
     * Create a memoized version of the function
     */
    memoize(keyGenerator = null) {
        const memoized = new FunctionDataManager(this.loaderFunction, {
            ...this.options,
            cache: true
        });

        if (keyGenerator) {
            const originalGetCacheKey = memoized.getCacheKey.bind(memoized);
            memoized.getCacheKey = (args) => keyGenerator(...args) || originalGetCacheKey(args);
        }

        return memoized;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.abort();
        this.clearCache();
        this.loaderFunction = null;
        this.options = null;
        this.abortController = null;
        this.isLoading = false;
    }

    /**
     * String representation
     */
    toString() {
        const fnName = this.loaderFunction.name || 'anonymous';
        return `FunctionDataManager(${fnName}, loads: ${this.loadCount})`;
    }
}

// ========================================
// EXPORT AND GLOBAL ASSIGNMENT
// ========================================

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FunctionDataManager;
}

if (typeof window !== 'undefined') {
    window.FunctionDataManager = FunctionDataManager;
    console.log('✅ FunctionDataManager loaded');
}

/**
 * AppConfig - Centralized application configuration and initialization
 * Manages HttpClient setup, Data Managers, environment variables, authentication, and API versioning
 */

class AppConfig {
    constructor(config = {}) {
        // Default configuration
        const defaultConfig = {
            // Environment configuration
            environment: 'development', // 'development', 'staging', 'production'
            debug: true,

            // API configuration
            apiBaseURL: null,
            apiVersion: 'v2.0', // NEW: API versioning support
            wsBaseURL: null,
            metadataBaseURL: null,

            // HttpClient configuration
            httpClient: {
                timeout: 30000,
                retries: 1,
                retryDelay: 1000,
                mockMode: false
            },

            // Authentication configuration
            auth: {
                tokenKey: 'authToken',
                autoTokenRefresh: true,
                loginRedirect: '/login',
                logoutRedirect: '/login'
            }
        };

        // Use Utils.deepMerge for proper configuration merging
        this.config = Utils.deepMerge(Utils.deepClone(defaultConfig), config);

        this.initialized = false;
        this.eventListeners = [];

        // Bind methods
        this.handleStorageChange = this.handleStorageChange.bind(this);

        Utils.log('AppConfig', 'log', 'Configuration initialized:', this.config);
    }

    /**
     * Get default configuration for different environments
     * @param {string} environment - Environment name
     * @returns {object} - Default configuration
     */
    static getDefaultConfig(environment = 'development') {
        const baseConfig = {
            environment: environment,
            debug: environment !== 'production',
            apiVersion: 'v2.0'
        };

        const environmentConfigs = {
            development: {
                ...baseConfig,
                httpClient: {
                    timeout: 30000,
                    retries: 1,
                    mockMode: true // Enable mock mode in development
                }
            },
            staging: {
                ...baseConfig,
                debug: true,
                httpClient: {
                    timeout: 20000,
                    retries: 2,
                    mockMode: false
                }
            },
            production: {
                ...baseConfig,
                debug: false,
                httpClient: {
                    timeout: 15000,
                    retries: 3,
                    mockMode: false
                }
            }
        };

        return environmentConfigs[environment] || environmentConfigs.development;
    }

    /**
     * Create AppConfig for specific environment
     * @param {string} environment - Environment name
     * @param {object} overrides - Configuration overrides
     * @returns {AppConfig} - Configured AppConfig instance
     */
    static forEnvironment(environment, overrides = {}) {
        const defaultConfig = AppConfig.getDefaultConfig(environment);
        return new AppConfig(Utils.deepMerge(defaultConfig, overrides));
    }

    /**
     * Initialize the application configuration
     */
    async init() {
        if (this.initialized) {
            Utils.log('AppConfig', 'warn', 'Already initialized');
            return this;
        }

        try {
            Utils.log('AppConfig', 'log', 'Initializing...');

            // 1. Validate dependencies
            this.validateDependencies();

            // 2. Setup environment
            this.setupEnvironment();

            // 3. Configure HttpClient
            await this.configureHttpClient();

            // 4. Configure Data Managers
            this.configureDataManagers();

            // 5. Setup authentication
            this.setupAuthentication();

            // 6. Setup event listeners
            this.setupEventListeners();

            this.initialized = true;
            Utils.log('AppConfig', 'log', 'Initialization complete');

            // Emit initialization event
            this.emitEvent('initialized', this.getStatus());

            return this;

        } catch (error) {
            Utils.log('AppConfig', 'error', 'Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Validate required dependencies
     */
    validateDependencies() {
        const requiredGlobals = ['Utils', 'HTTPClient'];
        const missing = requiredGlobals.filter(name => typeof window[name] === 'undefined');

        if (missing.length > 0) {
            throw new Error(`Missing required dependencies: ${missing.join(', ')}`);
        }

        Utils.log('AppConfig', 'log', 'Dependencies validated');
    }

    /**
     * Setup environment variables and global settings
     */
    setupEnvironment() {
        // Get environment-specific URLs
        const envUrls = this.getEnvironmentURLs();

        // Set global environment variables
        window.API_BASE_URL = this.config.apiBaseURL || envUrls.api;
        window.API_VERSION = this.config.apiVersion;
        window.WS_BASE_URL = this.config.wsBaseURL || envUrls.ws;
        window.METADATA_BASE_URL = this.config.metadataBaseURL || envUrls.metadata;

        // Set debug mode
        window.debugMode = this.config.debug;

        Utils.log('AppConfig', 'log', 'Environment setup:', {
            environment: this.config.environment,
            apiBaseURL: window.API_BASE_URL,
            apiVersion: window.API_VERSION,
            wsBaseURL: window.WS_BASE_URL,
            metadataBaseURL: window.METADATA_BASE_URL,
            debug: window.debugMode
        });
    }

    /**
     * Get environment-specific URLs
     */
    getEnvironmentURLs() {
        const environments = {
            development: {
                api: 'https://localhost:9020',
                ws: 'ws://localhost:9021',
                metadata: 'https://localhost:9020'
            },
            staging: {
                api: 'https://staging-api.yourapp.com',
                ws: 'wss://staging-api.yourapp.com',
                metadata: 'https://staging-metadata.yourapp.com'
            },
            production: {
                api: 'https://api.yourapp.com',
                ws: 'wss://api.yourapp.com',
                metadata: 'https://metadata.yourapp.com'
            }
        };

        return environments[this.config.environment] || environments.development;
    }

    /**
     * Configure HttpClient with API versioning
     */
    async configureHttpClient() {
        // Create and configure global API instance
        window.API = new HTTPClient();
        window.API.configure({
            baseURL: window.API_BASE_URL,
            apiVersion: window.API_VERSION, // NEW: API versioning
            timeout: this.config.httpClient.timeout,
            retryAttempts: this.config.httpClient.retries,
            retryDelay: this.config.httpClient.retryDelay,
            debug: this.config.debug
        });

        // Setup mock mode if enabled
        if (this.config.httpClient.mockMode) {
            this.setupMockData();
        }

        // Setup authentication token if available
        const token = this.getStoredToken();
        if (token) {
            window.API.setAuthToken(token);
        }

        // Add error interceptor for global error handling
        window.API.addErrorInterceptor(async (error, config) => {
            this.handleApiError(error, config);
        });

        // Add request interceptor for debugging
        if (this.config.debug) {
            window.API.addRequestInterceptor(async (config) => {
                Utils.log('API', 'log', 'Request:', config.method, config.url || config.urlOrPath);
                return config;
            });
        }

        Utils.log('AppConfig', 'log', 'HttpClient configured with API version:', window.API_VERSION);
    }

    /**
     * Configure Data Managers
     */
    configureDataManagers() {
        // Data managers are ready to use with environment URLs and API versioning
        // Individual components will create their own instances as needed

        Utils.log('AppConfig', 'log', 'Data Managers configured');
    }

    /**
     * Setup authentication handling
     */
    setupAuthentication() {
        // Listen for storage changes (token updates)
        window.addEventListener('storage', this.handleStorageChange);
        this.eventListeners.push({
            element: window,
            event: 'storage',
            listener: this.handleStorageChange
        });

        // Check for expired tokens on initialization
        this.validateStoredToken();

        Utils.log('AppConfig', 'log', 'Authentication setup complete');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            Utils.log('AppConfig', 'error', 'Unhandled promise rejection:', event.reason);
            this.emitEvent('error', { type: 'unhandledrejection', error: event.reason });
        });

        // Listen for errors
        window.addEventListener('error', (event) => {
            Utils.log('AppConfig', 'error', 'Global error:', event.error);
            this.emitEvent('error', { type: 'error', error: event.error });
        });

        Utils.log('AppConfig', 'log', 'Event listeners setup');
    }

    /**
     * Handle localStorage changes (token updates, etc.)
     */
    handleStorageChange(event) {
        if (event.key === this.config.auth.tokenKey) {
            if (event.newValue) {
                // Token updated
                window.API.setAuthToken(event.newValue);
                this.onTokenUpdated(event.newValue);
            } else {
                // Token removed
                window.API.setAuthToken(null);
                this.onTokenRemoved();
            }
        }
    }

    /**
     * Handle API errors globally
     * @param {Error} error - API error
     * @param {object} config - Request configuration
     */
    handleApiError(error, config) {
        // Handle 401 Unauthorized
        if (error.status === 401) {
            Utils.log('AppConfig', 'warn', 'Unauthorized request, clearing token');
            this.setAuthToken(null);
            this.emitEvent('unauthorized', { error, config });
            return;
        }

        // Handle 403 Forbidden
        if (error.status === 403) {
            Utils.log('AppConfig', 'warn', 'Forbidden request');
            this.emitEvent('forbidden', { error, config });
            return;
        }

        // Handle network errors
        if (error.message && error.message.includes('network')) {
            Utils.log('AppConfig', 'warn', 'Network error detected');
            this.emitEvent('networkError', { error, config });
            return;
        }

        // Emit general API error event
        this.emitEvent('apiError', { error, config });
    }

    /**
     * Setup mock data for development
     */
    setupMockData() {
        window.API.setMockMode(true);

        // Add common mock endpoints with versioning
        const mockData = {
            // Authentication endpoints
            [`POST:/auth/login`]: {
                success: true,
                data: {
                    token: 'mock-jwt-token-' + Date.now(),
                    user: {
                        id: 1,
                        userIdOrEmail: 'demo@example.com',
                        name: 'Demo User',
                        role: 'admin'
                    }
                }
            },
            [`POST:/auth/logout`]: {
                success: true,
                message: 'Logged out successfully'
            },
            [`GET:/auth/me`]: {
                success: true,
                data: {
                    id: 1,
                    userIdOrEmail: 'demo@example.com',
                    name: 'Demo User',
                    role: 'admin'
                }
            },
            // Template endpoints
            [`GET:/templates/Login`]: {
                success: true,
                data: {
                    componentName: 'Login',
                    template: '<div>Mock Login Template</div>',
                    styles: '.login { /* mock styles */ }'
                }
            }
        };

        // Add mock data to API client
        Object.entries(mockData).forEach(([key, data]) => {
            const [method, endpoint] = key.split(':');
            window.API.addMockData(endpoint, data, method);
        });

        Utils.log('AppConfig', 'log', 'Mock data configured for', Object.keys(mockData).length, 'endpoints');
    }

    /**
     * Validate stored authentication token
     */
    validateStoredToken() {
        const token = this.getStoredToken();
        if (!token) return;

        // Simple JWT expiration check (without verification)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp && payload.exp < Date.now() / 1000) {
                Utils.log('AppConfig', 'warn', 'Stored token expired, clearing');
                this.setAuthToken(null);
            }
        } catch (error) {
            Utils.log('AppConfig', 'warn', 'Invalid stored token format, clearing');
            this.setAuthToken(null);
        }
    }

    /**
     * Get stored authentication token
     */
    getStoredToken() {
        return localStorage.getItem(this.config.auth.tokenKey);
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        if (token) {
            localStorage.setItem(this.config.auth.tokenKey, token);
            window.API.setAuthToken(token);
        } else {
            localStorage.removeItem(this.config.auth.tokenKey);
            window.API.setAuthToken(null);
        }
    }

    /**
     * Handle token update
     */
    onTokenUpdated(token) {
        this.emitEvent('tokenUpdated', { token });
        Utils.log('AppConfig', 'log', 'Authentication token updated');
    }

    /**
     * Handle token removal
     */
    onTokenRemoved() {
        this.emitEvent('tokenRemoved');
        Utils.log('AppConfig', 'log', 'Authentication token removed');
    }

    /**
     * Navigate to a different page/view
     */
    navigate(path) {
        // Simple navigation - can be enhanced with routing library
        window.location.href = path;
    }

    /**
     * Handle login success
     */
    handleLoginSuccess(response, formData) {
        // Extract data from response
        const { token, user } = response.data || response;

        // Set authentication token
        if (token) {
            this.setAuthToken(token);
        }

        // Store user data
        if (user) {
            localStorage.setItem('userData', JSON.stringify(user));
        }

        // Navigate to dashboard or redirect URL
        const redirectUrl = Utils.getNestedValue(
            Utils.queryStringToObject(window.location.search),
            'redirect',
            '/dashboard'
        );

        this.navigate(redirectUrl);

        Utils.log('AppConfig', 'log', 'Login successful, redirecting to:', redirectUrl);
        this.emitEvent('loginSuccess', { user, redirectUrl });
    }

    /**
     * Handle login error
     */
    handleLoginError(error, formData) {
        Utils.log('AppConfig', 'warn', 'Login failed:', error.message || error);
        this.emitEvent('loginError', { error, formData });
    }

    /**
     * Handle logout
     */
    logout() {
        // Clear authentication
        this.setAuthToken(null);

        // Clear user data
        localStorage.removeItem('userData');

        // Navigate to login
        this.navigate(this.config.auth.logoutRedirect);

        Utils.log('AppConfig', 'log', 'User logged out');
        this.emitEvent('logout');
    }

    /**
     * Switch API version
     * @param {string} version - New API version
     */
    switchApiVersion(version) {
        this.config.apiVersion = version;
        window.API_VERSION = version;
        window.API.configure({ apiVersion: version });

        Utils.log('AppConfig', 'log', 'API version switched to:', version);
        this.emitEvent('apiVersionChanged', { version });
    }

    /**
     * Emit custom event
     */
    emitEvent(eventName, data = {}) {
        const event = new CustomEvent(`appConfig:${eventName}`, {
            detail: data
        });
        window.dispatchEvent(event);
    }

    /**
     * Listen for custom events
     */
    addEventListener(eventName, callback) {
        const fullEventName = `appConfig:${eventName}`;
        window.addEventListener(fullEventName, callback);
        this.eventListeners.push({
            element: window,
            event: fullEventName,
            listener: callback
        });
    }

    /**
     * Get configuration
     */
    getConfig() {
        return Utils.deepClone(this.config);
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = Utils.deepMerge(this.config, newConfig);

        // Re-configure HTTPClient if relevant settings changed
        if (newConfig.apiVersion || newConfig.httpClient || newConfig.apiBaseURL) {
            this.configureHttpClient();
        }

        Utils.log('AppConfig', 'log', 'Configuration updated');
        this.emitEvent('configUpdated', { config: this.getConfig() });

        return this;
    }

    /**
     * Get initialization status
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Get current user data
     */
    getCurrentUser() {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getStoredToken();
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            environment: this.config.environment,
            apiVersion: this.config.apiVersion,
            hasAuthToken: !!this.getStoredToken(),
            apiBaseURL: window.API_BASE_URL,
            wsBaseURL: window.WS_BASE_URL,
            metadataBaseURL: window.METADATA_BASE_URL,
            currentUser: this.getCurrentUser(),
            debug: this.config.debug
        };
    }

    /**
     * Cleanup and destroy configurator
     */
    destroy() {
        // Remove event listeners
        this.eventListeners.forEach(({ element, event, listener }) => {
            element.removeEventListener(event, listener);
        });
        this.eventListeners = [];

        this.initialized = false;
        Utils.log('AppConfig', 'log', 'Destroyed');
        this.emitEvent('destroyed');
    }

    /**
     * Extract error message using Utils (if BaseComponent is not available)
     */
    extractErrorMessage(errorOrResponse) {
        if (!errorOrResponse) {
            return 'An unknown error occurred';
        }

        // API response patterns
        if (errorOrResponse.response && errorOrResponse.response.data) {
            const data = errorOrResponse.response.data;
            if (data.message) return data.message;
            if (data.error) return data.error;
            if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                return data.errors[0].message || data.errors[0];
            }
        }

        if (errorOrResponse.message) return errorOrResponse.message;
        if (errorOrResponse.error) return errorOrResponse.error;

        // Network errors
        if (errorOrResponse.name === 'TypeError' && errorOrResponse.message &&
            errorOrResponse.message.indexOf('fetch') !== -1) {
            return 'Network error. Please check your connection and try again.';
        }

        if (typeof errorOrResponse === 'string') return errorOrResponse;

        return 'An error occurred. Please try again.';
    }
}

// ========================================
// EXPORT AND GLOBAL ASSIGNMENT
// ========================================

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}

if (typeof window !== 'undefined') {
    window.AppConfig = AppConfig;
    console.log('✅ Enhanced AppConfig with API versioning loaded');
}

/*
Usage Examples:

// Basic initialization
const appConfig = new AppConfig({
    environment: 'development',
    apiVersion: 'v2.0',
    debug: true
});
await appConfig.init();

// Environment-specific initialization
const stagingConfig = AppConfig.forEnvironment('staging', {
    apiVersion: 'v1.0',
    httpClient: { timeout: 25000 }
});
await stagingConfig.init();

// Switch API version at runtime
appConfig.switchApiVersion('v3.0');

// Listen to events
appConfig.addEventListener('unauthorized', (event) => {
    console.log('User unauthorized:', event.detail);
});

// Get status
console.log('App Status:', appConfig.getStatus());
*/

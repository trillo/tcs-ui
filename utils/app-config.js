/**
 * AppConfig - Centralized application configuration and initialization
 * Manages HttpClient setup, Data Managers, environment variables, authentication, and API versioning
 */

class AppConfig {

    static httpConfigsByEnvironment = {
        development: {
            api: 'https://localhost:9020',
            ws: 'ws://localhost:9021',
            metadata: 'https://localhost:9020',
            apiVersion: 'api/v2.0',
            debug : true,
            timeout: 30000,
            retryAttempts: 1,
            retryDelay : 1000,
            mockMode: false
        },
        staging: {
            api: 'https://staging-api.yourapp.com',
            ws: 'wss://staging-api.yourapp.com',
            metadata: 'https://staging-metadata.yourapp.com',
            apiVersion: 'api/v2.0',
            debug : true,
            timeout: 10000,
            retryAttempts: 1,
            retryDelay : 1000,
            mockMode: false
        },
        production: {
            api: 'https://api.yourapp.com',
            ws: 'wss://api.yourapp.com',
            metadata: 'https://metadata.yourapp.com',
            apiVersion: 'api/v2.0',
            debug : false,
            timeout: 10000,
            retryAttempts: 2,
            retryDelay : 2000,
            mockMode: false
        }
    };

    static tokenKey = "_tillo_ai_at_";

    static logoutRedirect = "";

    constructor() {
        this.token = '';
        this.initialized = false;
        this.eventListeners = [];

        // Bind methods
        this.handleStorageChange = this.handleStorageChange.bind(this);
    }

    /**
     * Initialize the application configuration
     */
    async init(environment = 'development', mockMode = false) {
        if (this.initialized) {
            Utils.log('AppConfig', 'warn', 'Already initialized');
            return this;
        }

        try {
            Utils.log('AppConfig', 'log', 'Initializing...');

            // 1. Validate dependencies
            this.validateDependencies();

            // 2. Configure HttpClient
            await this.configureHttpClient();

            // 3. Setup authentication
            this.setupAuthentication();

            // 4. Setup event listeners
            this.setupEventListeners();

            // 5. Initialize component manager
            this.componentManager = new ComponentManager(this);

            this.initialized = true;
            Utils.log('AppConfig', 'log', 'Initialization complete');

            // Emit initialization event
            this.emitEvent('initialized', this.getStatus(environment));

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
     * Configure HttpClient with API versioning
     */
    async configureHttpClient(environment = 'development', mockMode = false) {
        // Create and configure global API instance
        window.API = new HTTPClient();
        const httpConfig = AppConfig.httpConfigsByEnvironment[environment];
        this.httpConfig = httpConfig;
        httpConfig.mockMode = mockMode;
        window.API.configure(httpConfig.api, httpConfig);

        // Setup mock mode if enabled
        if (mockMode) {
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
        if (httpConfig.debug) {
            window.API.addRequestInterceptor(async (config) => {
                Utils.log('API', 'log', 'Request:', config.method, config.url || config.urlOrPath);
                return config;
            });
        }

        Utils.log('AppConfig', 'log', 'HttpClient configured with API version:', window.API_VERSION);
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
        if (event.key === AppConfig.auth.tokenKey) {
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
        return localStorage.getItem(AppConfig.tokenKey);
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        if (token) {
            localStorage.setItem(AppConfig.tokenKey, token);
            window.API.setAuthToken(token);
        } else {
            localStorage.removeItem(AppConfig.tokenKey);
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
        this.navigate(AppConfig.logoutRedirect);

        Utils.log('AppConfig', 'log', 'User logged out');
        this.emitEvent('logout');
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
    getStatus(environment) {
        const httpConfig = this.httpConfig;
        return {
            initialized: this.initialized,
            environment: environment,
            apiVersion: httpConfig.apiVersion,
            hasAuthToken: !!this.getStoredToken(),
            apiBaseURL: httpConfig.api,
            wsBaseURL: httpConfig.ws,
            metadataBaseURL: httpConfig.metadata,
            currentUser: this.getCurrentUser(),
            debug: httpConfig.debug
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
        if (this.componentManager) {
            this.componentManager.destroy();
        }
        this.initialized = false;
        Utils.log('AppConfig', 'log', 'Destroyed');
        this.emitEvent('destroyed');
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


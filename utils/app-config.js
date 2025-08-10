/**
 * AppConfig - Centralized application configuration and initialization
 * Manages HttpClient setup, Data Managers, environment variables, and authentication
 */

class AppConfig {
    constructor(config = {}) {
        this.config = {
            // Environment configuration
            environment: 'development', // 'development', 'staging', 'production'
            debug: true,

            // API configuration
            apiBaseURL: null,
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
            },

            // Override defaults with provided config
            ...config
        };

        this.initialized = false;
        this.eventListeners = [];

        // Bind methods
        this.handleStorageChange = this.handleStorageChange.bind(this);
    }

    /**
     * Initialize the application configuration
     */
    async init() {
        if (this.initialized) {
            console.warn('[AppConfig] Already initialized');
            return this;
        }

        try {
            console.log('[AppConfig] Initializing...');

            // 1. Setup environment
            this.setupEnvironment();

            // 2. Configure HttpClient
            await this.configureHttpClient();

            // 3. Configure Data Managers
            this.configureDataManagers();

            // 4. Setup authentication
            this.setupAuthentication();

            // 5. Setup event listeners
            this.setupEventListeners();

            this.initialized = true;
            console.log('[AppConfig] Initialization complete');

            return this;

        } catch (error) {
            console.error('[AppConfig] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup environment variables and global settings
     */
    setupEnvironment() {
        // Set environment-based URLs
        const envUrls = this.getEnvironmentURLs();

        window.API_BASE_URL = this.config.apiBaseURL || envUrls.api;
        window.WS_BASE_URL = this.config.wsBaseURL || envUrls.ws;
        window.METADATA_BASE_URL = this.config.metadataBaseURL || envUrls.metadata;

        // Set debug mode
        window.debugMode = this.config.debug;

        console.log('[AppConfig] Environment setup:', {
            environment: this.config.environment,
            apiBaseURL: window.API_BASE_URL,
            wsBaseURL: window.WS_BASE_URL,
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
     * Configure HttpClient
     */
    async configureHttpClient() {
        if (typeof HTTPClient === 'undefined') {
            throw new Error('HTTPClient not found. Make sure http-client.js is loaded.');
        }

        // Create and configure global API instance
        window.API = new HTTPClient();
        window.API.configure({
            baseURL: window.API_BASE_URL,
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

        console.log('[AppConfig] HttpClient configured');
    }

    /**
     * Configure Data Managers
     */
    configureDataManagers() {
        // Data managers are ready to use with environment URLs
        // Individual components will create their own instances as needed

        console.log('[AppConfig] Data Managers configured');
    }

    /**
     * Setup authentication handling
     */
    setupAuthentication() {
        // Listen for storage changes (token updates)
        window.addEventListener('storage', this.handleStorageChange);
        this.eventListeners.push({ element: window, event: 'storage', listener: this.handleStorageChange });

        console.log('[AppConfig] Authentication setup complete');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add any global event listeners here
        console.log('[AppConfig] Event listeners setup');
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
     * Setup mock data for development
     */
    setupMockData() {
        window.API.setMockMode(true);

        // Add common mock endpoints
        window.API.addMockData('/auth/login', {
            token: 'mock-jwt-token-' + Date.now(),
            user: {
                id: 1,
                userIdOrEmail: 'demo@example.com',
                name: 'Demo User',
                role: 'admin'
            }
        }, 'POST');

        console.log('[AppConfig] Mock data configured');
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
        // Emit event for ComponentManager to handle component updates
        this.emitEvent('tokenUpdated', { token });
        console.log('[AppConfig] Authentication token updated');
    }

    /**
     * Handle token removal
     */
    onTokenRemoved() {
        // Emit event for ComponentManager to handle component updates
        this.emitEvent('tokenRemoved');
        console.log('[AppConfig] Authentication token removed');
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
        // Set authentication token
        if (response.token) {
            this.setAuthToken(response.token);
        }

        // Store user data
        if (response.user) {
            localStorage.setItem('userData', JSON.stringify(response.user));
        }

        // Navigate to dashboard or redirect URL
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
        this.navigate(redirectUrl);

        console.log('[AppConfig] Login successful, redirecting to:', redirectUrl);
    }

    /**
     * Handle login error
     */
    handleLoginError(error, formData) {
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

        console.log('[AppConfig] User logged out');
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
        this.eventListeners.push({ element: window, event: fullEventName, listener: callback });
    }

    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
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
            hasAuthToken: !!this.getStoredToken(),
            apiBaseURL: window.API_BASE_URL,
            wsBaseURL: window.WS_BASE_URL,
            currentUser: this.getCurrentUser()
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
        console.log('[AppConfig] Destroyed');
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
    console.log('✅ AppConfig loaded');
}

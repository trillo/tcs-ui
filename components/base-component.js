/**
 * BaseComponent - Foundation class for all TrilloAI Framework components
 * Provides data management, CSS loading, and lifecycle management
 */

class BaseComponent {
    static cssInjected = new Set();
    static cssNamespace = '';
    static cssFile = '';

    constructor(container, options = {}) {
        this.container = container;
        this.options = this.mergeDefaultOptions(options);
        this.state = {
            loading: false,
            error: null,
            data: null,
            initialized: false
        };

        // Data management
        this.dataManager = null;
        this.refreshTimer = null;

        // Event listeners storage for cleanup
        this.eventListeners = [];

        this.init();
    }

    /**
     * Merge user options with defaults
     */
    mergeDefaultOptions(options) {
        return {
            cssFile: options.cssFile || this.constructor.cssFile || '',

            dataSource: {
                type: 'static',        // 'static', 'api', 'function', 'websocket'
                data: null,
                url: '',
                method: 'GET',
                params: {},
                body: {},
                headers: {},
                ...options.dataSource
            },

            ui: {
                showLoading: true,
                showError: true,
                retryOnError: true,
                refreshInterval: 0,    // 0 = no auto-refresh
                loadingText: 'Loading...',
                errorRetryText: 'Retry',
                ...options.ui
            },

            events: {
                onDataLoaded: null,
                onError: null,
                onRetry: null,
                onDestroy: null,
                ...options.events
            },

            // Backward compatibility
            data: options.data || null,
            url: options.url || '',
            params: options.params || {},
            body: options.body || {}
        };
    }

    /**
     * Initialize component
     */
    async init() {
        try {
            // Ensure Font Awesome is loaded
            await this.ensureFontAwesome();

            // Load CSS
            await this.loadCSS();

            // Setup data source
            this.setupDataSource();

            // Load initial data
            await this.loadData();

            // Render component
            this.render();

            // Setup auto-refresh if configured
            this.setupAutoRefresh();

            this.state.initialized = true;
            this.log('Component initialized successfully');

        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Ensure Font Awesome is loaded
     */
    async ensureFontAwesome() {
        // Check if Font Awesome is already loaded
        if (document.querySelector('link[href*="font-awesome"]') ||
            document.querySelector('script[src*="font-awesome"]')) {
            return;
        }

        // Load Font Awesome CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        link.crossOrigin = 'anonymous';

        return new Promise((resolve, reject) => {
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    /**
     * Setup data source based on configuration
     */
    setupDataSource() {
        const { dataSource } = this.options;

        // Backward compatibility - convert old format to new
        if (this.options.data) {
            dataSource.type = 'static';
            dataSource.data = this.options.data;
        } else if (this.options.url) {
            dataSource.type = 'api';
            dataSource.url = this.options.url;
            dataSource.params = this.options.params;
            dataSource.body = this.options.body;
        }

        // Create appropriate data manager
        switch (dataSource.type) {
            case 'static':
                this.dataManager = new StaticDataManager(dataSource.data);
                break;
            case 'api':
                this.dataManager = new DataManager(dataSource);
                break;
            case 'function':
                this.dataManager = new FunctionDataManager(dataSource.loader);
                break;
            case 'websocket':
                this.dataManager = new WebSocketDataManager(dataSource);
                break;
            default:
                this.log(`Unknown data source type: ${dataSource.type}, using static`);
                this.dataManager = new StaticDataManager(null);
        }
    }

    /**
     * Load data using the configured data manager
     */
    async loadData() {
        if (!this.dataManager) {
            this.log('No data manager configured');
            return;
        }

        try {
            this.setState({ loading: true, error: null });

            if (this.options.ui.showLoading) {
                this.renderLoading();
            }

            const data = await this.dataManager.load();

            this.setState({
                data: data,
                loading: false,
                error: null
            });

            // Trigger callback
            if (this.options.events.onDataLoaded) {
                this.options.events.onDataLoaded(data);
            }

            this.log('Data loaded successfully', data);

        } catch (error) {
            this.setState({
                loading: false,
                error: error
            });

            this.handleError(error);
        }
    }

    /**
     * Load CSS (external or inline fallback)
     */
    async loadCSS() {
        const componentName = this.constructor.name;

        if (BaseComponent.cssInjected.has(componentName)) {
            return; // Already loaded
        }

        try {
            if (this.options.cssFile) {
                await this.loadExternalCSS();
            } else {
                this.loadInlineCSS();
            }

            BaseComponent.cssInjected.add(componentName);
            this.log('CSS loaded successfully');

        } catch (error) {
            this.log('External CSS failed, using inline fallback');
            this.loadInlineCSS();
            BaseComponent.cssInjected.add(componentName);
        }
    }

    /**
     * Load external CSS file
     */
    async loadExternalCSS() {
        const cssPath = this.options.cssFile;
        const componentName = this.constructor.name;

        // Check if already loaded
        const existingLink = document.querySelector(`link[data-component="${componentName}"]`);
        if (existingLink) return;

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssPath;
            link.setAttribute('data-component', componentName);

            link.onload = resolve;
            link.onerror = reject;

            document.head.appendChild(link);
        });
    }

    /**
     * Load inline CSS as fallback
     */
    loadInlineCSS() {
        const componentName = this.constructor.name;
        const styleId = `style-${componentName}`;

        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.setAttribute('data-component', componentName);
        style.textContent = this.getInlineCSS();
        document.head.appendChild(style);
    }

    /**
     * Render component based on current state
     */
    render() {
        if (this.state.loading && this.options.ui.showLoading) {
            this.renderLoading();
        } else if (this.state.error && this.options.ui.showError) {
            this.renderError();
        } else if (this.state.data) {
            this.renderContent();
        } else {
            this.renderEmpty();
        }
    }

    /**
     * Render loading state
     */
    renderLoading() {
        this.container.innerHTML = `
            <div class="${this.constructor.cssNamespace}__loading">
                <div class="loading-spinner"></div>
                <span class="loading-text">${this.options.ui.loadingText}</span>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError() {
        const canRetry = this.options.ui.retryOnError && this.dataManager;

        this.container.innerHTML = `
            <div class="${this.constructor.cssNamespace}__error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${this.state.error.message}</div>
                ${canRetry ? `
                    <button class="btn btn-secondary btn-sm error-retry-btn" data-action="retry">
                        ${this.options.ui.errorRetryText}
                    </button>
                ` : ''}
            </div>
        `;

        if (canRetry) {
            this.addRetryListener();
        }
    }

    /**
     * Render main content
     */
    renderContent() {
        this.container.innerHTML = this.generateHTML();
        this.addEventListeners();
        this.initialize();
    }

    /**
     * Render empty state
     */
    renderEmpty() {
        this.container.innerHTML = `
            <div class="${this.constructor.cssNamespace}__empty">
                No data available
            </div>
        `;
    }

    /**
     * Add retry functionality
     */
    addRetryListener() {
        const retryBtn = this.container.querySelector('.error-retry-btn');
        if (retryBtn) {
            const listener = () => this.retry();
            retryBtn.addEventListener('click', listener);
            this.eventListeners.push({ element: retryBtn, event: 'click', listener });
        }
    }

    /**
     * Retry loading data
     */
    async retry() {
        if (this.options.events.onRetry) {
            this.options.events.onRetry();
        }

        await this.loadData();
        this.render();
    }

    /**
     * Setup auto-refresh timer
     */
    setupAutoRefresh() {
        const interval = this.options.ui.refreshInterval;
        if (interval > 0 && this.dataManager) {
            this.refreshTimer = setInterval(() => {
                this.refresh();
            }, interval);
            this.log(`Auto-refresh enabled: ${interval}ms`);
        }
    }

    /**
     * Refresh component data
     */
    async refresh() {
        await this.loadData();
        this.render();
    }

    /**
     * Update component state
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
    }

    /**
     * Update component data and re-render
     */
    update(newData) {
        this.setState({ data: newData });
        this.render();
    }

    /**
     * Handle errors
     */
    handleError(error) {
        this.log('Error:', error);

        if (this.options.events.onError) {
            this.options.events.onError(error);
        }

        if (this.options.ui.showError) {
            this.render();
        }
    }

    /**
     * Cleanup component
     */
    destroy() {
        // Clear auto-refresh timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        // Remove event listeners
        this.eventListeners.forEach(({ element, event, listener }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, listener);
            }
        });
        this.eventListeners = [];

        // Clear container
        this.container.innerHTML = '';

        // Cleanup data manager
        if (this.dataManager && this.dataManager.destroy) {
            this.dataManager.destroy();
        }

        // Trigger callback
        if (this.options.events.onDestroy) {
            this.options.events.onDestroy();
        }

        this.log('Component destroyed');
    }

    /**
     * Get current component data
     */
    getData() {
        return this.state.data;
    }

    /**
     * Get component status
     */
    getStatus() {
        return {
            initialized: this.state.initialized,
            loading: this.state.loading,
            hasError: !!this.state.error,
            hasData: !!this.state.data,
            dataSourceType: this.options.dataSource.type
        };
    }

    // ========================================
    // ABSTRACT METHODS - Override in subclasses
    // ========================================

    /**
     * Generate component HTML - MUST be implemented by subclasses
     */
    generateHTML() {
        throw new Error(`${this.constructor.name} must implement generateHTML() method`);
    }

    /**
     * Get inline CSS fallback - SHOULD be implemented by subclasses
     */
    getInlineCSS() {
        return `/* Default CSS for ${this.constructor.name} */`;
    }

    /**
     * Add event listeners - SHOULD be implemented by subclasses
     */
    addEventListeners() {
        // Override in subclasses
    }

    /**
     * Initialize component after render - SHOULD be implemented by subclasses
     */
    initialize() {
        // Override in subclasses
    }

    /**
     * Logging utility
     */
    log(...args) {
        if (this.options.debug || window.debugMode) {
            console.log(`[${this.constructor.name}]`, ...args);
        }
    }
}

// ========================================
// EXPORT AND GLOBAL ASSIGNMENT
// ========================================

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseComponent;
}

if (typeof window !== 'undefined') {
    window.BaseComponent = BaseComponent;
    console.log('✅ BaseComponent loaded');
}

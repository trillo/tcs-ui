/**
 * BaseComponent - Foundation class for all TrilloAI Framework components
 * Provides data management, CSS loading, modal infrastructure, and lifecycle management
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
                modalErrorType: 'inline', // 'inline' or 'modal'
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

            // Setup data source only if needed
            if (this.needsDataManager()) {
                this.setupDataSource();
                await this.loadData();
            }

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
     * Determine if component needs data manager
     * Override in subclasses that don't need data management
     */
    needsDataManager() {
        return this.options.dataSource.type !== 'static' ||
               this.options.data !== null ||
               this.options.url !== '';
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
        } else if (this.state.data || !this.needsDataManager()) {
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
     * Extract error message from response or error object
     */
    extractErrorMessage(errorOrResponse) {
        return Utils.extractErrorMessage(errorOrResponse);
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

    // ========================================
    // MODAL INFRASTRUCTURE
    // ========================================

    /**
     * Show error modal or inline error
     */
    showErrorMessage(message, options = {}) {
        const config = {
            type: this.options.ui.modalErrorType,
            title: 'Error',
            showRetry: false,
            showClose: true,
            onRetry: null,
            onClose: null,
            ...options
        };

        if (config.type === 'modal') {
            this.showErrorModal(message, config);
        } else {
            this.showInlineError(message, config);
        }
    }

    /**
     * Show success message
     */
    showSuccessMessage(message, options = {}) {
        const config = {
            type: 'modal',
            title: 'Success',
            autoClose: 3000,
            showClose: true,
            onClose: null,
            ...options
        };

        this.showSuccessModal(message, config);
    }

    /**
     * Show confirmation dialog
     */
    showConfirmationDialog(message, options = {}) {
        const config = {
            title: 'Confirm',
            confirmText: 'Yes',
            cancelText: 'No',
            onConfirm: null,
            onCancel: null,
            ...options
        };

        return this.showConfirmModal(message, config);
    }

    /**
     * Show error modal
     */
    showErrorModal(message, config = {}) {
        this.createModal('error', {
            title: config.title || 'Error',
            message: message,
            showRetry: config.showRetry || false,
            onRetry: config.onRetry,
            onClose: config.onClose
        });
    }

    /**
     * Show success modal
     */
    showSuccessModal(message, config = {}) {
        this.createModal('success', {
            title: config.title || 'Success',
            message: message,
            autoClose: config.autoClose,
            onClose: config.onClose
        });
    }

    /**
     * Show confirmation modal
     */
    showConfirmModal(message, config = {}) {
        return new Promise((resolve) => {
            this.createModal('confirm', {
                title: config.title || 'Confirm',
                message: message,
                confirmText: config.confirmText || 'Yes',
                cancelText: config.cancelText || 'No',
                onConfirm: () => {
                    this.hideModal();
                    resolve(true);
                    if (config.onConfirm) config.onConfirm();
                },
                onCancel: () => {
                    this.hideModal();
                    resolve(false);
                    if (config.onCancel) config.onCancel();
                }
            });
        });
    }

    /**
     * Create and show modal
     */
    createModal(type, config) {
        // Remove existing modal
        this.hideModal();

        const modalId = `${this.constructor.cssNamespace || 'base'}-modal`;
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = `base-modal base-modal--${type}`;

        modal.innerHTML = `
            <div class="base-modal__backdrop"></div>
            <div class="base-modal__content">
                <div class="base-modal__header">
                    <div class="base-modal__icon">
                        ${this.getModalIcon(type)}
                    </div>
                    <h3 class="base-modal__title">${config.title}</h3>
                    <button class="base-modal__close" type="button" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="base-modal__body">
                    <p class="base-modal__message">${config.message}</p>
                </div>
                <div class="base-modal__footer">
                    ${this.getModalFooter(type, config)}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Add event listeners
        this.addModalEventListeners(modal, type, config);

        // Show modal with animation
        requestAnimationFrame(() => {
            modal.classList.add('base-modal--visible');
        });

        // Auto-close for success modals
        if (type === 'success' && config.autoClose) {
            setTimeout(() => {
                this.hideModal();
                if (config.onClose) config.onClose();
            }, config.autoClose);
        }
    }

    /**
     * Get modal icon based on type
     */
    getModalIcon(type) {
        const icons = {
            error: '<i class="fas fa-exclamation-triangle"></i>',
            success: '<i class="fas fa-check-circle"></i>',
            confirm: '<i class="fas fa-question-circle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }

    /**
     * Get modal footer based on type
     */
    getModalFooter(type, config) {
        switch (type) {
            case 'error':
                return `
                    ${config.showRetry ? `
                        <button class="btn btn-primary base-modal__retry">
                            <i class="fas fa-redo"></i>
                            Try Again
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary base-modal__close-btn">
                        Close
                    </button>
                `;
            case 'success':
                return `
                    <button class="btn btn-primary base-modal__close-btn">
                        OK
                    </button>
                `;
            case 'confirm':
                return `
                    <button class="btn btn-secondary base-modal__cancel">
                        ${config.cancelText}
                    </button>
                    <button class="btn btn-primary base-modal__confirm">
                        ${config.confirmText}
                    </button>
                `;
            default:
                return `
                    <button class="btn btn-primary base-modal__close-btn">
                        OK
                    </button>
                `;
        }
    }

    /**
     * Add modal event listeners
     */
    addModalEventListeners(modal, type, config) {
        // Close button
        const closeBtn = modal.querySelector('.base-modal__close');
        const closeBtnFooter = modal.querySelector('.base-modal__close-btn');
        const backdrop = modal.querySelector('.base-modal__backdrop');

        const closeHandler = () => {
            this.hideModal();
            if (config.onClose) config.onClose();
        };

        if (closeBtn) closeBtn.addEventListener('click', closeHandler);
        if (closeBtnFooter) closeBtnFooter.addEventListener('click', closeHandler);
        if (backdrop) backdrop.addEventListener('click', closeHandler);

        // Retry button
        const retryBtn = modal.querySelector('.base-modal__retry');
        if (retryBtn && config.onRetry) {
            retryBtn.addEventListener('click', () => {
                this.hideModal();
                config.onRetry();
            });
        }

        // Confirm/Cancel buttons
        const confirmBtn = modal.querySelector('.base-modal__confirm');
        const cancelBtn = modal.querySelector('.base-modal__cancel');

        if (confirmBtn && config.onConfirm) {
            confirmBtn.addEventListener('click', config.onConfirm);
        }

        if (cancelBtn && config.onCancel) {
            cancelBtn.addEventListener('click', config.onCancel);
        }

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeHandler();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * Hide modal
     */
    hideModal() {
        const modal = document.querySelector('.base-modal');
        if (modal) {
            modal.classList.add('base-modal--hiding');
            setTimeout(() => {
                modal.remove();
                document.body.style.overflow = '';
            }, 200);
        }
    }

    /**
     * Show inline error (for components that prefer inline errors)
     */
    showInlineError(message, config = {}) {
        // This method can be overridden by subclasses
        // Default implementation shows modal
        this.showErrorModal(message, config);
    }

    /**
     * Hide inline error
     */
    hideInlineError() {
        // Override in subclasses that implement inline errors
    }

    /**
     * Get modal CSS (included in getInlineCSS)
     */
    getModalCSS() {
        return `
            /* Modal Infrastructure */
            .base-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: var(--z-modal);
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .base-modal--visible {
                opacity: 1;
            }

            .base-modal--hiding {
                opacity: 0;
            }

            .base-modal__backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(2px);
            }

            .base-modal__content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--color-surface);
                border-radius: var(--radius-xl);
                box-shadow: var(--shadow-xl);
                max-width: 400px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                animation: modalSlideIn 0.3s ease-out;
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }

            .base-modal__header {
                display: flex;
                align-items: center;
                gap: var(--spacing-md);
                padding: var(--spacing-lg);
                border-bottom: 1px solid var(--color-border);
            }

            .base-modal__icon {
                font-size: 24px;
                flex-shrink: 0;
            }

            .base-modal--error .base-modal__icon {
                color: var(--color-error);
            }

            .base-modal--success .base-modal__icon {
                color: var(--color-success);
            }

            .base-modal--confirm .base-modal__icon {
                color: var(--color-warning);
            }

            .base-modal--info .base-modal__icon {
                color: var(--color-info);
            }

            .base-modal__title {
                flex: 1;
                margin: 0;
                font-size: var(--font-size-lg);
                font-weight: var(--font-weight-semibold);
                color: var(--color-text-primary);
            }

            .base-modal__close {
                background: none;
                border: none;
                color: var(--color-text-secondary);
                cursor: pointer;
                padding: var(--spacing-xs);
                border-radius: var(--radius-sm);
                transition: all var(--transition-normal);
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .base-modal__close:hover {
                background: var(--color-surface-variant);
                color: var(--color-text-primary);
            }

            .base-modal__body {
                padding: var(--spacing-lg);
            }

            .base-modal__message {
                margin: 0;
                color: var(--color-text-secondary);
                line-height: var(--line-height-normal);
            }

            .base-modal__footer {
                display: flex;
                gap: var(--spacing-sm);
                justify-content: flex-end;
                padding: var(--spacing-lg);
                border-top: 1px solid var(--color-border);
            }

            @media (max-width: 480px) {
                .base-modal__content {
                    width: 95%;
                    margin: var(--spacing-md);
                }

                .base-modal__footer {
                    flex-direction: column-reverse;
                }

                .base-modal__footer .btn {
                    width: 100%;
                }
            }
        `;
    }

    /**
     * Cleanup component
     */
    destroy() {
        // Hide any open modals
        this.hideModal();

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

        // Restore body overflow
        document.body.style.overflow = '';

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
        return `
            /* Default CSS for ${this.constructor.name} */
            ${this.getModalCSS()}
        `;
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
    
    /**
     * Get default options for component - MUST be implemented by subclasses
     */
    static getDefaultOptions() {
        throw new Error(`${this.name} must implement static getDefaultOptions() method for normal mode`);
    }

    /**
     * Get preview options for component - MUST be implemented by subclasses
     */
    static getPreviewOptions() {
        throw new Error(`${this.name} must implement static getPreviewOptions() method for preview mode`);
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
    console.log('✅ Enhanced BaseComponent with modal infrastructure loaded');
}

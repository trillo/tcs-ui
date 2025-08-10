/**
 * Login Component - Enhanced with proper error handling and display
 * Handles its own error display responsibility instead of relying on external callbacks
 */

class Login {
    static cssNamespace = 'login-c9k2';
    static cssInjected = false;

    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            ui: {
                title: 'Welcome Back',
                subtitle: 'Sign in to your account',
                showRememberMe: true,
                showForgotPassword: true,
                showSignUpLink: true,
                errorDisplayType: 'inline' // 'inline' or 'modal'
            },
            events: {
                onLoginSuccess: null,
                onLoginError: null, // Still available but Login handles display first
                onForgotPassword: null,
                onSignUp: null
            },
            ...options
        };

        this.formData = {
            userIdOrEmail: '',
            password: '',
            rememberMe: false
        };

        this.validationErrors = {};
        this.eventListeners = [];
        this.isLoading = false;
        this.loginAttempts = 0;
        this.maxAttempts = 5;

        this.init();
    }

    /**
     * Initialize component
     */
    async init() {
        try {
            await this.loadCSS();
            this.render();
            this.addEventListeners();
            this.initialize();
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Load CSS (inline)
     */
    async loadCSS() {
        if (Login.cssInjected) return;

        const style = document.createElement('style');
        style.id = 'style-Login';
        style.setAttribute('data-component', 'Login');
        style.textContent = this.getInlineCSS();
        document.head.appendChild(style);

        Login.cssInjected = true;
    }

    /**
     * Render component
     */
    render() {
        this.container.innerHTML = this.generateHTML();
    }

    /**
     * Generate HTML with enhanced error display
     */
    generateHTML() {
        const { title, subtitle, showRememberMe, showForgotPassword, showSignUpLink } = this.options.ui;

        return `
            <div class="${Login.cssNamespace}">
                <div class="${Login.cssNamespace}__container">
                    <div class="${Login.cssNamespace}__header">
                        <div class="${Login.cssNamespace}__logo">
                            <i class="fas fa-cube"></i>
                        </div>
                        <h1 class="${Login.cssNamespace}__title">${title}</h1>
                        <p class="${Login.cssNamespace}__subtitle text-secondary">${subtitle}</p>
                    </div>

                    <!-- Enhanced Error Display Area -->
                    <div class="${Login.cssNamespace}__error-container" id="${Login.cssNamespace}-error-container" style="display: none;">
                        <div class="${Login.cssNamespace}__error-content">
                            <div class="${Login.cssNamespace}__error-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="${Login.cssNamespace}__error-message">
                                <div class="${Login.cssNamespace}__error-title">Login Failed</div>
                                <div class="${Login.cssNamespace}__error-text"></div>
                            </div>
                            <button class="${Login.cssNamespace}__error-close" type="button" aria-label="Close error">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="${Login.cssNamespace}__error-actions">
                            <button class="${Login.cssNamespace}__error-retry btn btn-sm btn-primary" type="button">
                                <i class="fas fa-redo"></i>
                                Try Again
                            </button>
                            <button class="${Login.cssNamespace}__error-forgot btn btn-sm btn-outline" type="button">
                                <i class="fas fa-key"></i>
                                Forgot Password?
                            </button>
                        </div>
                    </div>

                    <form class="${Login.cssNamespace}__form" id="${Login.cssNamespace}-form">
                        <!-- User ID or Email Field -->
                        <div class="form-group">
                            <label class="form-label" for="${Login.cssNamespace}-userIdOrEmail">
                                <i class="fas fa-user"></i>
                                User ID or Email
                            </label>
                            <input
                                type="text"
                                id="${Login.cssNamespace}-userIdOrEmail"
                                name="userIdOrEmail"
                                class="form-control ${Login.cssNamespace}__input"
                                placeholder="Enter your user ID or email"
                                value="${this.formData.userIdOrEmail}"
                                required
                                autocomplete="username"
                            >
                            <div class="${Login.cssNamespace}__error" id="${Login.cssNamespace}-userIdOrEmail-error"></div>
                        </div>

                        <!-- Password Field -->
                        <div class="form-group">
                            <label class="form-label" for="${Login.cssNamespace}-password">
                                <i class="fas fa-lock"></i>
                                Password
                            </label>
                            <div class="${Login.cssNamespace}__password-wrapper">
                                <input
                                    type="password"
                                    id="${Login.cssNamespace}-password"
                                    name="password"
                                    class="form-control ${Login.cssNamespace}__input"
                                    placeholder="Enter your password"
                                    value="${this.formData.password}"
                                    required
                                    autocomplete="current-password"
                                >
                                <button
                                    type="button"
                                    class="${Login.cssNamespace}__password-toggle"
                                    data-action="toggle-password"
                                    aria-label="Toggle password visibility"
                                >
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <div class="${Login.cssNamespace}__error" id="${Login.cssNamespace}-password-error"></div>
                        </div>

                        <!-- Remember Me & Forgot Password -->
                        <div class="${Login.cssNamespace}__form-options">
                            ${showRememberMe ? `
                                <label class="${Login.cssNamespace}__checkbox">
                                    <input
                                        type="checkbox"
                                        name="rememberMe"
                                        ${this.formData.rememberMe ? 'checked' : ''}
                                    >
                                    <span class="${Login.cssNamespace}__checkmark"></span>
                                    Remember me
                                </label>
                            ` : ''}

                            ${showForgotPassword ? `
                                <button
                                    type="button"
                                    class="${Login.cssNamespace}__link"
                                    data-action="forgot-password"
                                >
                                    Forgot password?
                                </button>
                            ` : ''}
                        </div>

                        <!-- Submit Button -->
                        <button
                            type="submit"
                            class="btn btn-primary ${Login.cssNamespace}__submit"
                            ${this.isLoading ? 'disabled' : ''}
                        >
                            ${this.isLoading ? `
                                <div class="loading-spinner" style="width: 16px; height: 16px;"></div>
                                Signing in...
                            ` : `
                                <i class="fas fa-sign-in-alt"></i>
                                Sign In
                            `}
                        </button>

                        <!-- Sign Up Link -->
                        ${showSignUpLink ? `
                            <div class="${Login.cssNamespace}__signup">
                                <span class="text-secondary">Don't have an account?</span>
                                <button
                                    type="button"
                                    class="${Login.cssNamespace}__link"
                                    data-action="sign-up"
                                >
                                    Sign up
                                </button>
                            </div>
                        ` : ''}
                    </form>

                    <!-- Security Info for Multiple Failed Attempts -->
                    <div class="${Login.cssNamespace}__security-info" id="${Login.cssNamespace}-security-info" style="display: none;">
                        <div class="${Login.cssNamespace}__security-content">
                            <i class="fas fa-shield-alt"></i>
                            <div>
                                <strong>Account Security Notice</strong>
                                <p>Multiple failed login attempts detected. Please verify your credentials or reset your password.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Error Modal (Alternative Display) -->
                <div class="${Login.cssNamespace}__error-modal" id="${Login.cssNamespace}-error-modal" style="display: none;">
                    <div class="${Login.cssNamespace}__error-modal-backdrop"></div>
                    <div class="${Login.cssNamespace}__error-modal-content">
                        <div class="${Login.cssNamespace}__error-modal-header">
                            <div class="${Login.cssNamespace}__error-modal-icon">
                                <i class="fas fa-exclamation-circle"></i>
                            </div>
                            <h3>Login Failed</h3>
                            <button class="${Login.cssNamespace}__error-modal-close" type="button">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="${Login.cssNamespace}__error-modal-body">
                            <p class="${Login.cssNamespace}__error-modal-text"></p>
                        </div>
                        <div class="${Login.cssNamespace}__error-modal-footer">
                            <button class="${Login.cssNamespace}__error-modal-retry btn btn-primary" type="button">
                                Try Again
                            </button>
                            <button class="${Login.cssNamespace}__error-modal-forgot btn btn-outline" type="button">
                                Forgot Password?
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Enhanced CSS with error display styles
     */
    getInlineCSS() {
        return `
            /* Login Component Styles */
            .${Login.cssNamespace} {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: var(--spacing-lg);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                position: relative;
            }

            .${Login.cssNamespace}__container {
                width: 100%;
                max-width: 400px;
                background: var(--color-surface);
                border-radius: var(--radius-xl);
                box-shadow: var(--shadow-xl);
                padding: var(--spacing-xxl);
                animation: slideUp 0.4s ease-out;
                position: relative;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Header */
            .${Login.cssNamespace}__header {
                text-align: center;
                margin-bottom: var(--spacing-xl);
            }

            .${Login.cssNamespace}__logo {
                width: 64px;
                height: 64px;
                background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
                border-radius: var(--radius-full);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto var(--spacing-lg) auto;
                color: white;
                font-size: 28px;
                box-shadow: var(--shadow-md);
            }

            .${Login.cssNamespace}__title {
                font-size: var(--font-size-xxl);
                font-weight: var(--font-weight-bold);
                color: var(--color-text-primary);
                margin: 0 0 var(--spacing-sm) 0;
            }

            .${Login.cssNamespace}__subtitle {
                font-size: var(--font-size-md);
                margin: 0;
            }

            /* Enhanced Error Display */
            .${Login.cssNamespace}__error-container {
                background: linear-gradient(135deg, rgba(244, 67, 54, 0.08) 0%, rgba(244, 67, 54, 0.12) 100%);
                border: 1px solid rgba(244, 67, 54, 0.2);
                border-radius: var(--radius-lg);
                padding: var(--spacing-lg);
                margin-bottom: var(--spacing-lg);
                animation: errorSlideIn 0.3s ease-out;
                box-shadow: 0 4px 12px rgba(244, 67, 54, 0.1);
            }

            @keyframes errorSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                    max-height: 0;
                    padding-top: 0;
                    padding-bottom: 0;
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                    max-height: 200px;
                    padding-top: var(--spacing-lg);
                    padding-bottom: var(--spacing-lg);
                }
            }

            .${Login.cssNamespace}__error-content {
                display: flex;
                align-items: flex-start;
                gap: var(--spacing-md);
                margin-bottom: var(--spacing-md);
            }

            .${Login.cssNamespace}__error-icon {
                color: #d32f2f;
                font-size: 18px;
                flex-shrink: 0;
                margin-top: 2px;
                width: 20px;
                text-align: center;
            }

            .${Login.cssNamespace}__error-message {
                flex: 1;
            }

            .${Login.cssNamespace}__error-title {
                font-weight: var(--font-weight-semibold);
                color: #d32f2f;
                margin-bottom: var(--spacing-xs);
                font-size: var(--font-size-sm);
            }

            .${Login.cssNamespace}__error-text {
                color: #b71c1c;
                font-size: var(--font-size-sm);
                line-height: 1.4;
            }

            .${Login.cssNamespace}__error-close {
                background: none;
                border: none;
                color: #d32f2f;
                cursor: pointer;
                padding: var(--spacing-xs);
                border-radius: var(--radius-sm);
                transition: all var(--transition-normal);
                flex-shrink: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .${Login.cssNamespace}__error-close:hover {
                background: rgba(244, 67, 54, 0.1);
                color: #b71c1c;
            }

            .${Login.cssNamespace}__error-actions {
                display: flex;
                gap: var(--spacing-sm);
                justify-content: flex-start;
                flex-wrap: wrap;
            }

            .${Login.cssNamespace}__error-retry,
            .${Login.cssNamespace}__error-forgot {
                font-size: var(--font-size-xs);
                padding: var(--spacing-xs) var(--spacing-sm);
                border-radius: var(--radius-md);
                font-weight: var(--font-weight-medium);
                transition: all var(--transition-normal);
                border: 1px solid transparent;
                display: inline-flex;
                align-items: center;
                gap: var(--spacing-xs);
            }

            .${Login.cssNamespace}__error-retry {
                background: #1976d2;
                color: white;
                border-color: #1976d2;
            }

            .${Login.cssNamespace}__error-retry:hover {
                background: #1565c0;
                border-color: #1565c0;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
            }

            .${Login.cssNamespace}__error-forgot {
                background: transparent;
                color: #1976d2;
                border-color: #1976d2;
            }

            .${Login.cssNamespace}__error-forgot:hover {
                background: rgba(25, 118, 210, 0.1);
                color: #1565c0;
                border-color: #1565c0;
            }

            /* Security Info */
            .${Login.cssNamespace}__security-info {
                background: linear-gradient(135deg, #fff3cd, #ffeaa7);
                border: 1px solid #ffeaa7;
                border-radius: var(--radius-md);
                padding: var(--spacing-md);
                margin-top: var(--spacing-md);
                animation: errorSlideIn 0.3s ease-out;
            }

            .${Login.cssNamespace}__security-content {
                display: flex;
                align-items: flex-start;
                gap: var(--spacing-md);
                color: #856404;
            }

            .${Login.cssNamespace}__security-content i {
                color: #856404;
                font-size: 18px;
                margin-top: 2px;
            }

            .${Login.cssNamespace}__security-content strong {
                display: block;
                margin-bottom: var(--spacing-xs);
            }

            .${Login.cssNamespace}__security-content p {
                margin: 0;
                font-size: var(--font-size-sm);
                line-height: 1.4;
            }

            /* Error Modal */
            .${Login.cssNamespace}__error-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 1000;
                animation: modalFadeIn 0.2s ease-out;
            }

            @keyframes modalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .${Login.cssNamespace}__error-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(2px);
            }

            .${Login.cssNamespace}__error-modal-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: var(--radius-xl);
                box-shadow: var(--shadow-xl);
                max-width: 400px;
                width: 90%;
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

            .${Login.cssNamespace}__error-modal-header {
                display: flex;
                align-items: center;
                gap: var(--spacing-md);
                padding: var(--spacing-lg);
                border-bottom: 1px solid var(--color-border);
            }

            .${Login.cssNamespace}__error-modal-icon {
                color: var(--color-error);
                font-size: 24px;
            }

            .${Login.cssNamespace}__error-modal-header h3 {
                flex: 1;
                margin: 0;
                color: var(--color-text-primary);
                font-size: var(--font-size-lg);
            }

            .${Login.cssNamespace}__error-modal-close {
                background: none;
                border: none;
                color: var(--color-text-secondary);
                cursor: pointer;
                padding: var(--spacing-xs);
                border-radius: var(--radius-sm);
                transition: all var(--transition-normal);
            }

            .${Login.cssNamespace}__error-modal-close:hover {
                background: var(--color-background);
                color: var(--color-text-primary);
            }

            .${Login.cssNamespace}__error-modal-body {
                padding: var(--spacing-lg);
            }

            .${Login.cssNamespace}__error-modal-text {
                margin: 0;
                color: var(--color-text-secondary);
                line-height: 1.5;
            }

            .${Login.cssNamespace}__error-modal-footer {
                display: flex;
                gap: var(--spacing-sm);
                justify-content: flex-end;
                padding: var(--spacing-lg);
                border-top: 1px solid var(--color-border);
            }

            /* Form Styles */
            .${Login.cssNamespace}__form {
                margin-bottom: var(--spacing-lg);
            }

            .${Login.cssNamespace}__input {
                transition: all var(--transition-normal);
                border-radius: var(--radius-lg);
            }

            .${Login.cssNamespace}__input:focus {
                border-color: var(--color-primary);
                box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
                transform: translateY(-1px);
            }

            /* Password Field */
            .${Login.cssNamespace}__password-wrapper {
                position: relative;
            }

            .${Login.cssNamespace}__password-toggle {
                position: absolute;
                right: var(--spacing-md);
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: var(--color-text-secondary);
                cursor: pointer;
                padding: var(--spacing-xs);
                border-radius: var(--radius-sm);
                transition: all var(--transition-normal);
            }

            .${Login.cssNamespace}__password-toggle:hover {
                color: var(--color-primary);
                background: rgba(25, 118, 210, 0.1);
            }

            /* Form Options */
            .${Login.cssNamespace}__form-options {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--spacing-lg);
                flex-wrap: wrap;
                gap: var(--spacing-sm);
            }

            /* Custom Checkbox */
            .${Login.cssNamespace}__checkbox {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
                cursor: pointer;
                font-size: var(--font-size-sm);
                color: var(--color-text-secondary);
                user-select: none;
            }

            .${Login.cssNamespace}__checkbox input {
                display: none;
            }

            .${Login.cssNamespace}__checkmark {
                width: 18px;
                height: 18px;
                border: 2px solid var(--color-border);
                border-radius: var(--radius-sm);
                position: relative;
                transition: all var(--transition-normal);
            }

            .${Login.cssNamespace}__checkbox input:checked + .${Login.cssNamespace}__checkmark {
                background: var(--color-primary);
                border-color: var(--color-primary);
            }

            .${Login.cssNamespace}__checkbox input:checked + .${Login.cssNamespace}__checkmark::after {
                content: '✓';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 12px;
                font-weight: bold;
            }

            /* Links */
            .${Login.cssNamespace}__link {
                background: none;
                border: none;
                color: var(--color-primary);
                font-size: var(--font-size-sm);
                cursor: pointer;
                text-decoration: none;
                transition: all var(--transition-normal);
                padding: var(--spacing-xs);
                border-radius: var(--radius-sm);
            }

            .${Login.cssNamespace}__link:hover {
                background: rgba(25, 118, 210, 0.1);
                text-decoration: underline;
            }

            /* Submit Button */
            .${Login.cssNamespace}__submit {
                width: 100%;
                height: 48px;
                font-size: var(--font-size-md);
                font-weight: var(--font-weight-semibold);
                border-radius: var(--radius-lg);
                margin-bottom: var(--spacing-lg);
                transition: all var(--transition-normal);
            }

            .${Login.cssNamespace}__submit:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: var(--shadow-lg);
            }

            .${Login.cssNamespace}__submit:disabled {
                transform: none;
            }

            /* Sign Up */
            .${Login.cssNamespace}__signup {
                text-align: center;
                font-size: var(--font-size-sm);
            }

            /* Field Error Messages */
            .${Login.cssNamespace}__error {
                color: var(--color-error);
                font-size: var(--font-size-xs);
                margin-top: var(--spacing-xs);
                min-height: 16px;
                display: flex;
                align-items: center;
                gap: var(--spacing-xs);
            }

            /* Responsive */
            @media (max-width: 480px) {
                .${Login.cssNamespace} {
                    padding: var(--spacing-md);
                }

                .${Login.cssNamespace}__container {
                    padding: var(--spacing-lg);
                }

                .${Login.cssNamespace}__form-options {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .${Login.cssNamespace}__error-actions {
                    flex-direction: column;
                }

                .${Login.cssNamespace}__error-modal-content {
                    width: 95%;
                }
            }

            /* Loading state for submit button */
            .${Login.cssNamespace}__submit .loading-spinner {
                border-top-color: currentColor;
            }
        `;
    }

    /**
     * Enhanced event listeners with error handling
     */
    addEventListeners() {
        const form = this.container.querySelector(`#${Login.cssNamespace}-form`);
        const passwordToggle = this.container.querySelector('[data-action="toggle-password"]');
        const forgotPasswordBtn = this.container.querySelector('[data-action="forgot-password"]');
        const signUpBtn = this.container.querySelector('[data-action="sign-up"]');

        // Form submission
        if (form) {
            const submitListener = (e) => this.handleSubmit(e);
            form.addEventListener('submit', submitListener);
            this.eventListeners.push({ element: form, event: 'submit', listener: submitListener });
        }

        // Real-time form validation
        const userIdOrEmailInput = this.container.querySelector(`#${Login.cssNamespace}-userIdOrEmail`);
        const passwordInput = this.container.querySelector(`#${Login.cssNamespace}-password`);

        if (userIdOrEmailInput) {
            const userIdOrEmailInputListener = () => this.validateUserIdOrEmail();
            const userIdOrEmailBlurListener = () => this.validateUserIdOrEmail();
            userIdOrEmailInput.addEventListener('input', userIdOrEmailInputListener);
            userIdOrEmailInput.addEventListener('blur', userIdOrEmailBlurListener);
            this.eventListeners.push({ element: userIdOrEmailInput, event: 'input', listener: userIdOrEmailInputListener });
            this.eventListeners.push({ element: userIdOrEmailInput, event: 'blur', listener: userIdOrEmailBlurListener });
        }

        if (passwordInput) {
            const passwordInputListener = () => this.validatePassword();
            const passwordBlurListener = () => this.validatePassword();
            passwordInput.addEventListener('input', passwordInputListener);
            passwordInput.addEventListener('blur', passwordBlurListener);
            this.eventListeners.push({ element: passwordInput, event: 'input', listener: passwordInputListener });
            this.eventListeners.push({ element: passwordInput, event: 'blur', listener: passwordBlurListener });
        }

        // Password toggle
        if (passwordToggle) {
            const toggleListener = () => this.togglePassword();
            passwordToggle.addEventListener('click', toggleListener);
            this.eventListeners.push({ element: passwordToggle, event: 'click', listener: toggleListener });
        }

        // Forgot password
        if (forgotPasswordBtn) {
            const forgotListener = () => this.handleForgotPassword();
            forgotPasswordBtn.addEventListener('click', forgotListener);
            this.eventListeners.push({ element: forgotPasswordBtn, event: 'click', listener: forgotListener });
        }

        // Sign up
        if (signUpBtn) {
            const signUpListener = () => this.handleSignUp();
            signUpBtn.addEventListener('click', signUpListener);
            this.eventListeners.push({ element: signUpBtn, event: 'click', listener: signUpListener });
        }

        // Remember me checkbox
        const rememberMeCheckbox = this.container.querySelector('input[name="rememberMe"]');
        if (rememberMeCheckbox) {
            const checkboxListener = (e) => {
                this.formData.rememberMe = e.target.checked;
            };
            rememberMeCheckbox.addEventListener('change', checkboxListener);
            this.eventListeners.push({ element: rememberMeCheckbox, event: 'change', listener: checkboxListener });
        }

        // Error display event listeners
        this.addErrorEventListeners();
    }

    /**
     * Add error-specific event listeners
     */
    addErrorEventListeners() {
        // Error close button
        const errorClose = this.container.querySelector(`.${Login.cssNamespace}__error-close`);
        if (errorClose) {
            const closeListener = () => this.hideError();
            errorClose.addEventListener('click', closeListener);
            this.eventListeners.push({ element: errorClose, event: 'click', listener: closeListener });
        }

        // Error retry button
        const errorRetry = this.container.querySelector(`.${Login.cssNamespace}__error-retry`);
        if (errorRetry) {
            const retryListener = () => this.retryLogin();
            errorRetry.addEventListener('click', retryListener);
            this.eventListeners.push({ element: errorRetry, event: 'click', listener: retryListener });
        }

        // Error forgot password button
        const errorForgot = this.container.querySelector(`.${Login.cssNamespace}__error-forgot`);
        if (errorForgot) {
            const forgotListener = () => this.handleForgotPassword();
            errorForgot.addEventListener('click', forgotListener);
            this.eventListeners.push({ element: errorForgot, event: 'click', listener: forgotListener });
        }

        // Modal error handlers
        const modalClose = this.container.querySelector(`.${Login.cssNamespace}__error-modal-close`);
        const modalBackdrop = this.container.querySelector(`.${Login.cssNamespace}__error-modal-backdrop`);
        const modalRetry = this.container.querySelector(`.${Login.cssNamespace}__error-modal-retry`);
        const modalForgot = this.container.querySelector(`.${Login.cssNamespace}__error-modal-forgot`);

        if (modalClose) {
            const modalCloseListener = () => this.hideErrorModal();
            modalClose.addEventListener('click', modalCloseListener);
            this.eventListeners.push({ element: modalClose, event: 'click', listener: modalCloseListener });
        }

        if (modalBackdrop) {
            const backdropListener = () => this.hideErrorModal();
            modalBackdrop.addEventListener('click', backdropListener);
            this.eventListeners.push({ element: modalBackdrop, event: 'click', listener: backdropListener });
        }

        if (modalRetry) {
            const modalRetryListener = () => this.retryLogin();
            modalRetry.addEventListener('click', modalRetryListener);
            this.eventListeners.push({ element: modalRetry, event: 'click', listener: modalRetryListener });
        }

        if (modalForgot) {
            const modalForgotListener = () => this.handleForgotPassword();
            modalForgot.addEventListener('click', modalForgotListener);
            this.eventListeners.push({ element: modalForgot, event: 'click', listener: modalForgotListener });
        }
    }

    /**
     * Enhanced form submission with proper error handling
     */
    async handleSubmit(e) {
        e.preventDefault();

        // Hide any existing errors
        this.hideError();
        this.hideErrorModal();

        // Collect form data
        const formData = new FormData(e.target);
        this.formData = {
            userIdOrEmail: formData.get('userIdOrEmail'),
            password: formData.get('password'),
            rememberMe: formData.get('rememberMe') === 'on'
        };

        // Validate form
        if (!this.validateForm()) {
            return;
        }

        try {
            this.setLoading(true);
            this.loginAttempts++;

            // Make API call using global API instance
            const response = await API.post('/api/v2.0/auth/login', this.formData);

            this.setLoading(false);

            // Check if login was successful
            if (response && response.success) {
                // Reset login attempts on success
                this.loginAttempts = 0;
                this.hideSecurityInfo();

                // Success callback
                if (this.options.events.onLoginSuccess) {
                    this.options.events.onLoginSuccess(response.data, this.formData);
                } else {
                    console.log('Login successful:', response);
                    // Default success behavior - could redirect or show success message
                    this.showSuccessMessage('Login successful!');
                }
            } else {
                // Handle API response that indicates failure
                const errorMessage = this.extractErrorMessage(response);
                this.handleLoginError(errorMessage, response);
            }

        } catch (error) {
            this.setLoading(false);

            // Extract meaningful error message
            const errorMessage = this.extractErrorMessage(error);
            this.handleLoginError(errorMessage, error);
        }
    }

    /**
     * Extract error message from response or error object
     */
    extractErrorMessage(errorOrResponse) {
        // Handle null/undefined safely
        if (!errorOrResponse) {
            return 'Login failed. Please try again.';
        }

        // Common API error response patterns
        if (errorOrResponse.response && errorOrResponse.response.data) {
            const data = errorOrResponse.response.data;
            if (data.message) return data.message;
            if (data.error) return data.error;
            if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                return data.errors[0].message || data.errors[0];
            }
        }

        // Direct response with error info
        if (errorOrResponse.message) {
            return errorOrResponse.message;
        }

        if (errorOrResponse.error) {
            return errorOrResponse.error;
        }

        // Network or other errors
        if (errorOrResponse.name === 'TypeError' && errorOrResponse.message && errorOrResponse.message.indexOf('fetch') !== -1) {
            return 'Network error. Please check your connection and try again.';
        }

        // Handle string errors
        if (typeof errorOrResponse === 'string') {
            return errorOrResponse;
        }

        // Default fallback
        return 'Login failed. Please check your credentials and try again.';
    }

    /**
     * Handle login error with appropriate display
     */
    handleLoginError(errorMessage, originalError) {
        // Show security info for multiple failed attempts
        if (this.loginAttempts >= 3) {
            this.showSecurityInfo();
        }

        // Choose display method
        if (this.options.ui.errorDisplayType === 'modal') {
            this.showErrorModal(errorMessage);
        } else {
            this.showError(errorMessage);
        }

        // Still call the error callback if provided
        if (this.options.events.onLoginError) {
            this.options.events.onLoginError(originalError, this.formData);
        }

        // Clear password field for security
        const passwordInput = this.container.querySelector(`#${Login.cssNamespace}-password`);
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    /**
     * Show inline error message
     */
    showError(message) {
        const errorContainer = this.container.querySelector(`#${Login.cssNamespace}-error-container`);
        const errorText = this.container.querySelector(`.${Login.cssNamespace}__error-text`);

        if (errorContainer && errorText) {
            errorText.textContent = message;
            errorContainer.style.display = 'block';
        }
    }

    /**
     * Hide inline error message
     */
    hideError() {
        const errorContainer = this.container.querySelector(`#${Login.cssNamespace}-error-container`);
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    }

    /**
     * Show error modal
     */
    showErrorModal(message) {
        const modal = this.container.querySelector(`#${Login.cssNamespace}-error-modal`);
        const modalText = this.container.querySelector(`.${Login.cssNamespace}__error-modal-text`);

        if (modal && modalText) {
            modalText.textContent = message;
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        }
    }

    /**
     * Hide error modal
     */
    hideErrorModal() {
        const modal = this.container.querySelector(`#${Login.cssNamespace}-error-modal`);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    /**
     * Show security info for multiple failed attempts
     */
    showSecurityInfo() {
        const securityInfo = this.container.querySelector(`#${Login.cssNamespace}-security-info`);
        if (securityInfo) {
            securityInfo.style.display = 'block';
        }
    }

    /**
     * Hide security info
     */
    hideSecurityInfo() {
        const securityInfo = this.container.querySelector(`#${Login.cssNamespace}-security-info`);
        if (securityInfo) {
            securityInfo.style.display = 'none';
        }
    }

    /**
     * Retry login (clear errors and focus on form)
     */
    retryLogin() {
        this.hideError();
        this.hideErrorModal();

        // Focus on the first input field
        const firstInput = this.container.querySelector(`#${Login.cssNamespace}-userIdOrEmail`);
        if (firstInput) {
            firstInput.focus();
        }
    }

    /**
     * Show success message (placeholder for success handling)
     */
    showSuccessMessage(message) {
        // This could be enhanced with a success notification
        console.log('Success:', message);
        // For now, just use an alert, but this could be a nice toast notification
        alert(message);
    }

    // ... rest of the existing methods (setLoading, validateForm, etc.) remain the same

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;

        const submitBtn = this.container.querySelector(`.${Login.cssNamespace}__submit`);
        if (submitBtn) {
            submitBtn.disabled = loading;
            submitBtn.innerHTML = loading ? `
                <div class="loading-spinner" style="width: 16px; height: 16px;"></div>
                Signing in...
            ` : `
                <i class="fas fa-sign-in-alt"></i>
                Sign In
            `;
        }
    }

    /**
     * Validate form
     */
    validateForm() {
        const isUserIdOrEmailValid = this.validateUserIdOrEmail();
        const isPasswordValid = this.validatePassword();

        return isUserIdOrEmailValid && isPasswordValid;
    }

    /**
     * Validate userIdOrEmail field
     */
    validateUserIdOrEmail() {
        const userIdOrEmailInput = this.container.querySelector(`#${Login.cssNamespace}-userIdOrEmail`);

        if (!userIdOrEmailInput) return true;

        const userIdOrEmail = userIdOrEmailInput.value ? userIdOrEmailInput.value.trim() : '';

        if (!userIdOrEmail) {
            this.showFieldError('userIdOrEmail', 'User ID or Email is required');
            return false;
        }

        // Check if it contains @ symbol (indicating it's an email)
        if (userIdOrEmail.indexOf('@') !== -1) {
            // Validate as email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userIdOrEmail)) {
                this.showFieldError('userIdOrEmail', 'Please enter a valid email address');
                return false;
            }
        } else {
            // Validate as user ID (basic validation - no spaces, minimum length)
            if (userIdOrEmail.length < 3) {
                this.showFieldError('userIdOrEmail', 'User ID must be at least 3 characters');
                return false;
            }
            if (/\s/.test(userIdOrEmail)) {
                this.showFieldError('userIdOrEmail', 'User ID cannot contain spaces');
                return false;
            }
        }

        this.clearFieldError('userIdOrEmail');
        return true;
    }

    /**
     * Validate password field
     */
    validatePassword() {
        const passwordInput = this.container.querySelector(`#${Login.cssNamespace}-password`);

        if (!passwordInput) return true;

        const password = passwordInput.value;

        if (!password) {
            this.showFieldError('password', 'Password is required');
            return false;
        } else if (password.length < 6) {
            this.showFieldError('password', 'Password must be at least 6 characters');
            return false;
        } else {
            this.clearFieldError('password');
            return true;
        }
    }

    /**
     * Show field-specific error
     */
    showFieldError(field, message) {
        const errorElement = this.container.querySelector(`#${Login.cssNamespace}-${field}-error`);
        const inputElement = this.container.querySelector(`#${Login.cssNamespace}-${field}`);

        if (errorElement) {
            errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        }

        if (inputElement) {
            inputElement.style.borderColor = 'var(--color-error)';
        }

        this.validationErrors[field] = message;
    }

    /**
     * Clear field-specific error
     */
    clearFieldError(field) {
        const errorElement = this.container.querySelector(`#${Login.cssNamespace}-${field}-error`);
        const inputElement = this.container.querySelector(`#${Login.cssNamespace}-${field}`);

        if (errorElement) {
            errorElement.innerHTML = '';
        }

        if (inputElement) {
            inputElement.style.borderColor = '';
        }

        delete this.validationErrors[field];
    }

    /**
     * Toggle password visibility
     */
    togglePassword() {
        const passwordInput = this.container.querySelector(`#${Login.cssNamespace}-password`);
        const toggleIcon = this.container.querySelector('[data-action="toggle-password"] i');

        if (passwordInput && toggleIcon) {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                toggleIcon.className = 'fas fa-eye';
            }
        }
    }

    /**
     * Handle forgot password
     */
    handleForgotPassword() {
        // Hide any error displays first
        this.hideError();
        this.hideErrorModal();

        if (this.options.events.onForgotPassword) {
            this.options.events.onForgotPassword();
        } else {
            alert('Forgot password functionality not implemented');
        }
    }

    /**
     * Handle sign up
     */
    handleSignUp() {
        if (this.options.events.onSignUp) {
            this.options.events.onSignUp();
        } else {
            alert('Sign up functionality not implemented');
        }
    }

    /**
     * Initialize component after render
     */
    initialize() {
        // Focus on userIdOrEmail input when component loads
        const userIdOrEmailInput = this.container.querySelector(`#${Login.cssNamespace}-userIdOrEmail`);
        if (userIdOrEmailInput) {
            userIdOrEmailInput.focus();
        }
    }

    /**
     * Handle errors
     */
    handleError(error) {
        console.error('[Login] Error:', error);
        this.showError('Failed to initialize login form');
    }

    /**
     * Cleanup component
     */
    destroy() {
        // Remove event listeners
        this.eventListeners.forEach(({ element, event, listener }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, listener);
            }
        });
        this.eventListeners = [];

        // Restore body overflow if modal was open
        document.body.style.overflow = '';

        // Clear container
        this.container.innerHTML = '';
    }
}

// ========================================
// EXPORT AND GLOBAL ASSIGNMENT
// ========================================

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Login;
}

if (typeof window !== 'undefined') {
    window.Login = Login;
    console.log('✅ Enhanced Login component loaded');
}

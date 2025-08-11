/**
 * Login Component - Extends BaseComponent
 * Handles authentication with proper error display using inherited modal infrastructure
 */

class Login extends BaseComponent {
    static cssNamespace = 'login-c9k2';
    static cssFile = ''; // Can be set to external CSS file path

    constructor(container, options = {}) {
        // Merge login-specific options
        const loginDefaults = {
            ui: {
                title: 'Welcome Back',
                subtitle: 'Sign in to your account',
                showRememberMe: true,
                showForgotPassword: true,
                showSignUpLink: true,
                modalErrorType: 'inline', // Use inline errors for login
                showLoading: false, // Login handles its own loading state
                showError: false   // Login handles its own errors
            },
            events: {
                onLoginSuccess: null,
                onLoginError: null,
                onForgotPassword: null,
                onSignUp: null
            },
            // No data source needed for login form
            dataSource: {
                type: 'static',
                data: null
            }
        };

        // Merge login defaults with user options first
        const mergedOptions = Utils.deepMerge(loginDefaults, options);

        // Then call parent with merged options
        super(container, mergedOptions);

        // Login-specific state
        this.formData = {
            userIdOrEmail: '',
            password: '',
            rememberMe: false
        };

        this.validationErrors = {};
        this.isLoading = false;
        this.loginAttempts = 0;
        this.maxAttempts = 5;
    }

    /**
     * Override needsDataManager since Login doesn't need data management
     */
    needsDataManager() {
        return false;
    }

    /**
     * Generate login form HTML
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
                            <button class="${Login.cssNamespace}__error-forgot btn btn-sm btn-secondary" type="button">
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
                            <div class="${Login.cssNamespace}__field-error" id="${Login.cssNamespace}-userIdOrEmail-error"></div>
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
                            <div class="${Login.cssNamespace}__field-error" id="${Login.cssNamespace}-password-error"></div>
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
            </div>
        `;
    }

    /**
     * Login-specific CSS
     */
    getInlineCSS() {
        return `
            ${super.getInlineCSS()}

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

            .${Login.cssNamespace}__error-retry:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
            }

            .${Login.cssNamespace}__error-forgot:hover {
                background: rgba(25, 118, 210, 0.1);
                color: var(--color-primary-dark);
                border-color: var(--color-primary-dark);
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
            .${Login.cssNamespace}__field-error {
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
            }

            /* Loading state for submit button */
            .${Login.cssNamespace}__submit .loading-spinner {
                border-top-color: currentColor;
            }
        `;
    }

    /**
     * Add login-specific event listeners
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
            const inputListener = () => this.validateUserIdOrEmail();
            const blurListener = () => this.validateUserIdOrEmail();
            userIdOrEmailInput.addEventListener('input', inputListener);
            userIdOrEmailInput.addEventListener('blur', blurListener);
            this.eventListeners.push({ element: userIdOrEmailInput, event: 'input', listener: inputListener });
            this.eventListeners.push({ element: userIdOrEmailInput, event: 'blur', listener: blurListener });
        }

        if (passwordInput) {
            const inputListener = () => this.validatePassword();
            const blurListener = () => this.validatePassword();
            passwordInput.addEventListener('input', inputListener);
            passwordInput.addEventListener('blur', blurListener);
            this.eventListeners.push({ element: passwordInput, event: 'input', listener: inputListener });
            this.eventListeners.push({ element: passwordInput, event: 'blur', listener: blurListener });
        }

        // Password toggle
        if (passwordToggle) {
            const toggleListener = () => this.togglePassword();
            passwordToggle.addEventListener('click', toggleListener);
            this.eventListeners.push({ element: passwordToggle, event: 'click', listener: toggleListener });
        }

        // Action buttons
        if (forgotPasswordBtn) {
            const forgotListener = () => this.handleForgotPassword();
            forgotPasswordBtn.addEventListener('click', forgotListener);
            this.eventListeners.push({ element: forgotPasswordBtn, event: 'click', listener: forgotListener });
        }

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
            const closeListener = () => this.hideInlineError();
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
    }

    /**
     * Handle form submission with direct API call
     */
    async handleSubmit(e) {
        e.preventDefault();

        // Hide any existing errors
        this.hideInlineError();

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

            // Direct API call - no DataManager needed
            const response = await API.post('/api/v2.0/auth/login', this.formData);

            this.setLoading(false);

            if (response && response.success) {
                // Reset login attempts on success
                this.loginAttempts = 0;
                this.hideSecurityInfo();

                // Success - use inherited success modal or callback
                if (this.options.events.onLoginSuccess) {
                    this.options.events.onLoginSuccess(response.data, this.formData);
                } else {
                    this.showSuccessMessage('Login successful!', {
                        autoClose: 2000,
                        onClose: () => {
                            // Default behavior: could redirect
                            console.log('Login completed successfully');
                        }
                    });
                }
            } else {
                // Handle failure
                const errorMessage = this.extractErrorMessage(response);
                this.handleLoginError(errorMessage, response);
            }

        } catch (error) {
            this.setLoading(false);
            const errorMessage = this.extractErrorMessage(error);
            this.handleLoginError(errorMessage, error);
        }
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
          // Use inline error for login (better UX than modal)
          this.showInlineError(errorMessage, {
              showRetry: true,
              onRetry: () => this.retryLogin()
          });
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
     * Override showInlineError to use login-specific error display
     */
    showInlineError(message, config = {}) {
        const errorContainer = this.container.querySelector(`#${Login.cssNamespace}-error-container`);
        const errorText = this.container.querySelector(`.${Login.cssNamespace}__error-text`);

        if (errorContainer && errorText) {
            errorText.textContent = message;
            errorContainer.style.display = 'block';
        }
    }

    /**
     * Hide inline error
     */
    hideInlineError() {
        const errorContainer = this.container.querySelector(`#${Login.cssNamespace}-error-container`);
        if (errorContainer) {
            errorContainer.style.display = 'none';
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
        this.hideInlineError();

        // Focus on the first input field
        const firstInput = this.container.querySelector(`#${Login.cssNamespace}-userIdOrEmail`);
        if (firstInput) {
            firstInput.focus();
        }
    }

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
        const input = this.container.querySelector(`#${Login.cssNamespace}-userIdOrEmail`);
        if (!input) return true;

        const value = input.value ? input.value.trim() : '';

        if (!value) {
            this.showFieldError('userIdOrEmail', 'User ID or Email is required');
            return false;
        }

        if (value.indexOf('@') !== -1) {
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                this.showFieldError('userIdOrEmail', 'Please enter a valid email address');
                return false;
            }
        } else {
            // User ID validation
            if (value.length < 3) {
                this.showFieldError('userIdOrEmail', 'User ID must be at least 3 characters');
                return false;
            }
            if (/\s/.test(value)) {
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
        const input = this.container.querySelector(`#${Login.cssNamespace}-password`);
        if (!input) return true;

        const value = input.value;

        if (!value) {
            this.showFieldError('password', 'Password is required');
            return false;
        } else if (value.length < 6) {
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
        this.hideInlineError();

        if (this.options.events.onForgotPassword) {
            this.options.events.onForgotPassword();
        } else {
            // Use inherited modal for forgot password
            this.showConfirmationDialog(
                'Would you like to reset your password? You will receive an email with instructions.',
                {
                    title: 'Reset Password',
                    confirmText: 'Send Reset Email',
                    cancelText: 'Cancel',
                    onConfirm: () => {
                        // Could implement password reset here
                        this.showSuccessMessage('Password reset instructions have been sent to your email.');
                    }
                }
            );
        }
    }

    /**
     * Handle sign up
     */
    handleSignUp() {
        if (this.options.events.onSignUp) {
            this.options.events.onSignUp();
        } else {
            // Use inherited modal for sign up info
            this.showErrorMessage(
                'Sign up functionality is not implemented yet. Please contact your administrator.',
                {
                    title: 'Sign Up',
                    type: 'modal'
                }
            );
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
     * Override destroy to handle login-specific cleanup
     */
    destroy() {
        // Hide any open inline errors
        this.hideInlineError();

        // Call parent destroy
        super.destroy();
    }

    /**
     * Get default options for normal mode
     */
    static getDefaultOptions() {
        return {
            events: {
                onLoginSuccess: (userData) => {
                    window.location.href = '/dashboard';
                },
                onForgotPassword: () => {
                    // Custom forgot password handling
                }
            },
            ui: {
                errorDisplayType: 'inline' // Use modal instead of inline errors
            }
        };
    }

    /**
     * Get default options for preview mode
     */
    static getPreviewOptions() {
        return {
            ui: {
                title: 'Welcome Back',
                subtitle: 'Sign in to your account',
                showRememberMe: true,
                showForgotPassword: true,
                showSignUpLink: true,
                modalErrorType: 'inline'
            },
            events: {
                onLoginSuccess: (data) => {
                    console.log('Preview: Login successful', data);
                    alert('Login successful! (Preview Mode)');
                },
                onLoginError: (error) => {
                    console.log('Preview: Login error', error);
                },
                onForgotPassword: () => {
                    alert('Preview: Forgot password functionality');
                },
                onSignUp: () => {
                    alert('Preview: Sign up functionality');
                }
            }
        };
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
    console.log('✅ Refactored Login component (extends BaseComponent) loaded');
}

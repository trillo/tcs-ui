/**
 * Login Component - Simple class for authentication
 * Does NOT extend BaseComponent - handles its own form logic and API calls
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
                showSignUpLink: true
            },
            events: {
                onLoginSuccess: null,
                onLoginError: null,
                onForgotPassword: null,
                onSignUp: null
            },
            ...options
        };

        this.formData = {
            email: '',
            password: '',
            rememberMe: false
        };

        this.validationErrors = {};
        this.eventListeners = [];
        this.isLoading = false;

        this.init();
    }

    /**
     * Initialize component
     */
    async init() {
        try {
            // Inject CSS once
            await this.loadCSS();

            // Render component
            this.render();

            // Setup event listeners
            this.addEventListeners();

            // Initialize (focus on email input)
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
     * Generate HTML
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

                    <form class="${Login.cssNamespace}__form" id="${Login.cssNamespace}-form">
                        <!-- Email Field -->
                        <div class="form-group">
                            <label class="form-label" for="${Login.cssNamespace}-email">
                                <i class="fas fa-envelope"></i>
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="${Login.cssNamespace}-email"
                                name="email"
                                class="form-control ${Login.cssNamespace}__input"
                                placeholder="Enter your email"
                                value="${this.formData.email}"
                                required
                                autocomplete="email"
                            >
                            <div class="${Login.cssNamespace}__error" id="${Login.cssNamespace}-email-error"></div>
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

                    <!-- General Error Message -->
                    <div class="${Login.cssNamespace}__general-error" id="${Login.cssNamespace}-general-error" style="display: none;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span class="error-text"></span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get inline CSS
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
            }

            .${Login.cssNamespace}__container {
                width: 100%;
                max-width: 400px;
                background: var(--color-surface);
                border-radius: var(--radius-xl);
                box-shadow: var(--shadow-xl);
                padding: var(--spacing-xxl);
                animation: slideUp 0.4s ease-out;
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

            /* Form */
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

            /* Error Messages */
            .${Login.cssNamespace}__error {
                color: var(--color-error);
                font-size: var(--font-size-xs);
                margin-top: var(--spacing-xs);
                min-height: 16px;
                display: flex;
                align-items: center;
                gap: var(--spacing-xs);
            }

            .${Login.cssNamespace}__general-error {
                background: rgba(244, 67, 54, 0.1);
                border: 1px solid rgba(244, 67, 54, 0.3);
                border-radius: var(--radius-md);
                padding: var(--spacing-md);
                color: var(--color-error);
                font-size: var(--font-size-sm);
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
                margin-top: var(--spacing-md);
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
            }

            /* Loading state for submit button */
            .${Login.cssNamespace}__submit .loading-spinner {
                border-top-color: currentColor;
            }
        `;
    }

    /**
     * Add event listeners
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
        const emailInput = this.container.querySelector(`#${Login.cssNamespace}-email`);
        const passwordInput = this.container.querySelector(`#${Login.cssNamespace}-password`);

        if (emailInput) {
            const emailInputListener = () => this.validateEmail();
            const emailBlurListener = () => this.validateEmail();
            emailInput.addEventListener('input', emailInputListener);
            emailInput.addEventListener('blur', emailBlurListener);
            this.eventListeners.push({ element: emailInput, event: 'input', listener: emailInputListener });
            this.eventListeners.push({ element: emailInput, event: 'blur', listener: emailBlurListener });
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
    }

    /**
     * Handle form submission
     */
    async handleSubmit(e) {
        e.preventDefault();

        // Collect form data
        const formData = new FormData(e.target);
        this.formData = {
            email: formData.get('email'),
            password: formData.get('password'),
            rememberMe: formData.get('rememberMe') === 'on'
        };

        // Validate form
        if (!this.validateForm()) {
            return;
        }

        try {
            this.setLoading(true);
            this.hideGeneralError();

            // Make API call using global API instance
            const response = await API.post('/auth/login', this.formData);

            this.setLoading(false);

            // Success callback
            if (this.options.events.onLoginSuccess) {
                this.options.events.onLoginSuccess(response, this.formData);
            } else {
                console.log('Login successful:', response);
                alert('Login successful!');
            }

        } catch (error) {
            this.setLoading(false);

            // Error callback
            if (this.options.events.onLoginError) {
                this.options.events.onLoginError(error, this.formData);
            } else {
                this.showGeneralError(error.message || 'Login failed. Please try again.');
            }
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
     * Show general error message
     */
    showGeneralError(message) {
        const errorElement = this.container.querySelector(`#${Login.cssNamespace}-general-error`);
        if (errorElement) {
            errorElement.querySelector('.error-text').textContent = message;
            errorElement.style.display = 'flex';
        }
    }

    /**
     * Hide general error message
     */
    hideGeneralError() {
        const errorElement = this.container.querySelector(`#${Login.cssNamespace}-general-error`);
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * Validate form
     */
    validateForm() {
        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();

        return isEmailValid && isPasswordValid;
    }

    /**
     * Validate email field
     */
    validateEmail() {
        const emailInput = this.container.querySelector(`#${Login.cssNamespace}-email`);

        if (!emailInput) return true;

        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            this.showFieldError('email', 'Email is required');
            return false;
        } else if (!emailRegex.test(email)) {
            this.showFieldError('email', 'Please enter a valid email address');
            return false;
        } else {
            this.clearFieldError('email');
            return true;
        }
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
        // Focus on email input when component loads
        const emailInput = this.container.querySelector(`#${Login.cssNamespace}-email`);
        if (emailInput) {
            emailInput.focus();
        }
    }

    /**
     * Handle errors
     */
    handleError(error) {
        console.error('[Login] Error:', error);
        this.showGeneralError('Failed to initialize login form');
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
    console.log('✅ Login component loaded');
}

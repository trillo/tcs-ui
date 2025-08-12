/**
 * Signup Component - Extends BaseComponent
 * Handles user registration with proper error display using inherited modal infrastructure
 */

class Signup extends BaseComponent {
    static cssNamespace = 'signup-r8j1';
    static cssFile = ''; // Can be set to external CSS file path

    constructor(container, options = {}) {
        // Call parent with merged options
        super(container, options);

        // Signup-specific state
        this.formData = {
            userId: '',
            email: '',
            password: '',
            repeatPassword: '',
            firstName: '',
            lastName: ''
        };

        this.validationErrors = {};
        this.isLoading = false;
        this.signupAttempts = 0;
        this.maxAttempts = 5;
    }

    /**
     * Override needsDataManager since Signup doesn't need data management
     */
    needsDataManager() {
        return false;
    }

    /**
     * Generate signup form HTML
     */
    generateHTML() {
        const { title, subtitle, showLoginLink } = this.options.ui;

        return `
            <div class="${Signup.cssNamespace}">
                <div class="${Signup.cssNamespace}__container">
                    <div class="${Signup.cssNamespace}__header">
                        <div class="${Signup.cssNamespace}__logo">
                            <i class="fas fa-user-plus"></i>
                        </div>
                        <h1 class="${Signup.cssNamespace}__title">${title}</h1>
                        <p class="${Signup.cssNamespace}__subtitle text-secondary">${subtitle}</p>
                    </div>

                    <!-- Enhanced Error Display Area -->
                    <div class="${Signup.cssNamespace}__error-container" id="${Signup.cssNamespace}-error-container" style="display: none;">
                        <div class="${Signup.cssNamespace}__error-content">
                            <div class="${Signup.cssNamespace}__error-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="${Signup.cssNamespace}__error-message">
                                <div class="${Signup.cssNamespace}__error-title">Registration Failed</div>
                                <div class="${Signup.cssNamespace}__error-text"></div>
                            </div>
                            <button class="${Signup.cssNamespace}__error-close" type="button" aria-label="Close error">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="${Signup.cssNamespace}__error-actions">
                            <button class="${Signup.cssNamespace}__error-retry btn btn-sm btn-primary" type="button">
                                <i class="fas fa-redo"></i>
                                Try Again
                            </button>
                        </div>
                    </div>

                    <form class="${Signup.cssNamespace}__form" id="${Signup.cssNamespace}-form">
                        <!-- Row 1: User ID and Email -->
                        <div class="${Signup.cssNamespace}__form-row">
                            <!-- User ID Field -->
                            <div class="form-group ${Signup.cssNamespace}__form-col">
                                <label class="form-label" for="${Signup.cssNamespace}-userId">
                                    <i class="fas fa-user"></i>
                                    User ID <span class="text-color-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="${Signup.cssNamespace}-userId"
                                    name="userId"
                                    class="form-control ${Signup.cssNamespace}__input"
                                    placeholder="Choose a unique user ID"
                                    value="${this.formData.userId}"
                                    required
                                    autocomplete="username"
                                >
                                <div class="${Signup.cssNamespace}__field-error" id="${Signup.cssNamespace}-userId-error"></div>
                            </div>

                            <!-- Email Field -->
                            <div class="form-group ${Signup.cssNamespace}__form-col">
                                <label class="form-label" for="${Signup.cssNamespace}-email">
                                    <i class="fas fa-envelope"></i>
                                    Email Address <span class="text-color-error">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="${Signup.cssNamespace}-email"
                                    name="email"
                                    class="form-control ${Signup.cssNamespace}__input"
                                    placeholder="Enter your email address"
                                    value="${this.formData.email}"
                                    required
                                    autocomplete="email"
                                >
                                <div class="${Signup.cssNamespace}__field-error" id="${Signup.cssNamespace}-email-error"></div>
                            </div>
                        </div>

                        <!-- Row 2: Password and Confirm Password -->
                        <div class="${Signup.cssNamespace}__form-row">
                            <!-- Password Field -->
                            <div class="form-group ${Signup.cssNamespace}__form-col">
                                <label class="form-label" for="${Signup.cssNamespace}-password">
                                    <i class="fas fa-lock"></i>
                                    Password <span class="text-color-error">*</span>
                                </label>
                                <div class="${Signup.cssNamespace}__password-wrapper">
                                    <input
                                        type="password"
                                        id="${Signup.cssNamespace}-password"
                                        name="password"
                                        class="form-control ${Signup.cssNamespace}__input"
                                        placeholder="Create a strong password"
                                        value="${this.formData.password}"
                                        required
                                        autocomplete="new-password"
                                    >
                                    <button
                                        type="button"
                                        class="${Signup.cssNamespace}__password-toggle"
                                        data-action="toggle-password"
                                        aria-label="Toggle password visibility"
                                    >
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                                <div class="${Signup.cssNamespace}__field-error" id="${Signup.cssNamespace}-password-error"></div>
                            </div>

                            <!-- Repeat Password Field -->
                            <div class="form-group ${Signup.cssNamespace}__form-col">
                                <label class="form-label" for="${Signup.cssNamespace}-repeatPassword">
                                    <i class="fas fa-lock"></i>
                                    Confirm Password <span class="text-color-error">*</span>
                                </label>
                                <div class="${Signup.cssNamespace}__password-wrapper">
                                    <input
                                        type="password"
                                        id="${Signup.cssNamespace}-repeatPassword"
                                        name="repeatPassword"
                                        class="form-control ${Signup.cssNamespace}__input"
                                        placeholder="Confirm your password"
                                        value="${this.formData.repeatPassword}"
                                        required
                                        autocomplete="new-password"
                                    >
                                    <button
                                        type="button"
                                        class="${Signup.cssNamespace}__password-toggle"
                                        data-action="toggle-repeat-password"
                                        aria-label="Toggle confirm password visibility"
                                    >
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                                <div class="${Signup.cssNamespace}__field-error" id="${Signup.cssNamespace}-repeatPassword-error"></div>
                            </div>
                        </div>

                        <!-- Row 3: First Name and Last Name -->
                        <div class="${Signup.cssNamespace}__form-row">
                            <!-- First Name Field (Optional) -->
                            <div class="form-group ${Signup.cssNamespace}__form-col">
                                <label class="form-label" for="${Signup.cssNamespace}-firstName">
                                    <i class="fas fa-user"></i>
                                    First Name <span class="text-secondary">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    id="${Signup.cssNamespace}-firstName"
                                    name="firstName"
                                    class="form-control ${Signup.cssNamespace}__input"
                                    placeholder="Enter your first name"
                                    value="${this.formData.firstName}"
                                    autocomplete="given-name"
                                >
                                <div class="${Signup.cssNamespace}__field-error" id="${Signup.cssNamespace}-firstName-error"></div>
                            </div>

                            <!-- Last Name Field (Optional) -->
                            <div class="form-group ${Signup.cssNamespace}__form-col">
                                <label class="form-label" for="${Signup.cssNamespace}-lastName">
                                    <i class="fas fa-user"></i>
                                    Last Name <span class="text-secondary">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    id="${Signup.cssNamespace}-lastName"
                                    name="lastName"
                                    class="form-control ${Signup.cssNamespace}__input"
                                    placeholder="Enter your last name"
                                    value="${this.formData.lastName}"
                                    autocomplete="family-name"
                                >
                                <div class="${Signup.cssNamespace}__field-error" id="${Signup.cssNamespace}-lastName-error"></div>
                            </div>
                        </div>

                        <!-- Submit Button -->
                        <button
                            type="submit"
                            class="btn btn-primary ${Signup.cssNamespace}__submit"
                            ${this.isLoading ? 'disabled' : ''}
                        >
                            ${this.isLoading ? `
                                <div class="loading-spinner" style="width: 16px; height: 16px;"></div>
                                Creating Account...
                            ` : `
                                <i class="fas fa-user-plus"></i>
                                Create Account
                            `}
                        </button>

                        <!-- Navigation Links -->
                        <div class="${Signup.cssNamespace}__navigation">
                            <div class="${Signup.cssNamespace}__nav-link">
                                <span class="text-secondary">Already have an account?</span>
                                <button
                                    type="button"
                                    class="${Signup.cssNamespace}__link"
                                    data-action="login"
                                >
                                    Sign in
                                </button>
                            </div>
                            
                            <div class="${Signup.cssNamespace}__nav-link">
                                <button
                                    type="button"
                                    class="${Signup.cssNamespace}__link"
                                    data-action="forgot-password"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        </div>
                    </form>

                    <!-- Security Info for Multiple Failed Attempts -->
                    <div class="${Signup.cssNamespace}__security-info" id="${Signup.cssNamespace}-security-info" style="display: none;">
                        <div class="${Signup.cssNamespace}__security-content">
                            <i class="fas fa-shield-alt"></i>
                            <div>
                                <strong>Registration Security Notice</strong>
                                <p>Multiple registration attempts detected. Please ensure your information is correct or contact support.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Signup-specific CSS (inherits styles from Login component pattern)
     */
    getInlineCSS() {
        const { borderRadius, borderWidth, borderColor, borderBox, innerPadding } = this.options.ui;

        return `
            ${super.getInlineCSS()}

            /* Signup Component Styles */
            .${Signup.cssNamespace} {
                width: 100%;
                height: 100%;
                padding: 0; /* REMOVED: Let container control all padding */
                background: #fafafa;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            }

            .${Signup.cssNamespace}__container {
                background: var(--color-surface);
                border-radius: ${borderRadius};
                border: ${borderWidth} solid ${borderColor};
                box-shadow: ${borderBox};
                padding: ${innerPadding};
                animation: slideUp 0.4s ease-out;
                position: relative;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: flex-start; 
                flex-grow: 1
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
            .${Signup.cssNamespace}__header {
                text-align: center;
                margin-bottom: var(--spacing-xl);
            }

            .${Signup.cssNamespace}__logo {
                width: 64px;
                height: 64px;
                background: linear-gradient(135deg, var(--color-success), var(--color-success-light));
                border-radius: var(--radius-full);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto var(--spacing-lg) auto;
                color: white;
                font-size: 28px;
                box-shadow: var(--shadow-md);
            }

            .${Signup.cssNamespace}__title {
                font-size: var(--font-size-xxl);
                font-weight: var(--font-weight-bold);
                color: var(--color-text-primary);
                margin: 0 0 var(--spacing-sm) 0;
            }

            .${Signup.cssNamespace}__subtitle {
                font-size: var(--font-size-md);
                margin: 0;
            }

            /* Enhanced Error Display */
            .${Signup.cssNamespace}__error-container {
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

            .${Signup.cssNamespace}__error-content {
                display: flex;
                align-items: flex-start;
                gap: var(--spacing-md);
                margin-bottom: var(--spacing-md);
            }

            .${Signup.cssNamespace}__error-icon {
                color: #d32f2f;
                font-size: 18px;
                flex-shrink: 0;
                margin-top: 2px;
                width: 20px;
                text-align: center;
            }

            .${Signup.cssNamespace}__error-message {
                flex: 1;
            }

            .${Signup.cssNamespace}__error-title {
                font-weight: var(--font-weight-semibold);
                color: #d32f2f;
                margin-bottom: var(--spacing-xs);
                font-size: var(--font-size-sm);
            }

            .${Signup.cssNamespace}__error-text {
                color: #b71c1c;
                font-size: var(--font-size-sm);
                line-height: 1.4;
            }

            .${Signup.cssNamespace}__error-close {
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

            .${Signup.cssNamespace}__error-close:hover {
                background: rgba(244, 67, 54, 0.1);
                color: #b71c1c;
            }

            .${Signup.cssNamespace}__error-actions {
                display: flex;
                gap: var(--spacing-sm);
                justify-content: flex-start;
            }

            .${Signup.cssNamespace}__error-retry {
                font-size: var(--font-size-xs);
                padding: var(--spacing-xs) var(--spacing-sm);
                border-radius: var(--radius-md);
                font-weight: var(--font-weight-medium);
                transition: all var(--transition-normal);
                display: inline-flex;
                align-items: center;
                gap: var(--spacing-xs);
            }

            .${Signup.cssNamespace}__error-retry:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
            }

            /* Security Info */
            .${Signup.cssNamespace}__security-info {
                background: linear-gradient(135deg, #fff3cd, #ffeaa7);
                border: 1px solid #ffeaa7;
                border-radius: var(--radius-md);
                padding: var(--spacing-md);
                margin-top: var(--spacing-md);
                animation: errorSlideIn 0.3s ease-out;
            }

            .${Signup.cssNamespace}__security-content {
                display: flex;
                align-items: flex-start;
                gap: var(--spacing-md);
                color: #856404;
            }

            .${Signup.cssNamespace}__security-content i {
                color: #856404;
                font-size: 18px;
                margin-top: 2px;
            }

            .${Signup.cssNamespace}__security-content strong {
                display: block;
                margin-bottom: var(--spacing-xs);
            }

            .${Signup.cssNamespace}__security-content p {
                margin: 0;
                font-size: var(--font-size-sm);
                line-height: 1.4;
            }

            /* Form Styles */
            .${Signup.cssNamespace}__form {
                margin-bottom: var(--spacing-lg);
            }

            /* Form Row Layout */
            .${Signup.cssNamespace}__form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--spacing-md);
                margin-bottom: var(--spacing-sm);
            }

            .${Signup.cssNamespace}__form-col {
                min-width: 0; /* Prevents grid overflow */
            }

            .${Signup.cssNamespace}__input {
                transition: all var(--transition-normal);
                border-radius: var(--radius-lg);
            }

            .${Signup.cssNamespace}__input:focus {
                border-color: var(--color-primary);
                box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
                transform: translateY(-1px);
            }

            /* Password Field */
            .${Signup.cssNamespace}__password-wrapper {
                position: relative;
            }

            .${Signup.cssNamespace}__password-toggle {
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

            .${Signup.cssNamespace}__password-toggle:hover {
                color: var(--color-primary);
                background: rgba(25, 118, 210, 0.1);
            }

            /* Submit Button */
            .${Signup.cssNamespace}__submit {
                width: 100%;
                height: 48px;
                font-size: var(--font-size-md);
                font-weight: var(--font-weight-semibold);
                border-radius: var(--radius-lg);
                margin-bottom: var(--spacing-lg);
                transition: all var(--transition-normal);
            }

            .${Signup.cssNamespace}__submit:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: var(--shadow-lg);
            }

            .${Signup.cssNamespace}__submit:disabled {
                transform: none;
            }

            /* Navigation Links */
            .${Signup.cssNamespace}__navigation {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-sm);
                text-align: center;
            }

            .${Signup.cssNamespace}__nav-link {
                font-size: var(--font-size-sm);
            }

            .${Signup.cssNamespace}__link {
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

            .${Signup.cssNamespace}__link:hover {
                background: rgba(25, 118, 210, 0.1);
                text-decoration: underline;
            }

            /* Field Error Messages */
            .${Signup.cssNamespace}__field-error {
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
                .${Signup.cssNamespace} {
                    padding: var(--spacing-md);
                }

                .${Signup.cssNamespace}__container {
                    padding: var(--spacing-lg);
                    max-width: none;
                }

                .${Signup.cssNamespace}__error-actions {
                    flex-direction: column;
                }

                /* Stack form columns on mobile */
                .${Signup.cssNamespace}__form-row {
                    grid-template-columns: 1fr;
                    gap: 0;
                }
            }

            /* Loading state for submit button */
            .${Signup.cssNamespace}__submit .loading-spinner {
                border-top-color: currentColor;
            }
        `;
    }

    /**
     * Add signup-specific event listeners
     */
    addEventListeners() {
        const form = this.container.querySelector(`#${Signup.cssNamespace}-form`);
        const passwordToggle = this.container.querySelector('[data-action="toggle-password"]');
        const repeatPasswordToggle = this.container.querySelector('[data-action="toggle-repeat-password"]');
        const loginBtn = this.container.querySelector('[data-action="login"]');
        const forgotPasswordBtn = this.container.querySelector('[data-action="forgot-password"]');

        // Form submission
        if (form) {
            const submitListener = (e) => this.handleSubmit(e);
            form.addEventListener('submit', submitListener);
            this.eventListeners.push({ element: form, event: 'submit', listener: submitListener });
        }

        // Real-time form validation
        const fields = ['userId', 'email', 'password', 'repeatPassword', 'firstName', 'lastName'];
        fields.forEach(field => {
            const input = this.container.querySelector(`#${Signup.cssNamespace}-${field}`);
            if (input) {
                const inputListener = () => this.validateField(field);
                const blurListener = () => this.validateField(field);
                input.addEventListener('input', inputListener);
                input.addEventListener('blur', blurListener);
                this.eventListeners.push({ element: input, event: 'input', listener: inputListener });
                this.eventListeners.push({ element: input, event: 'blur', listener: blurListener });
            }
        });

        // Password toggles
        if (passwordToggle) {
            const toggleListener = () => this.togglePassword('password');
            passwordToggle.addEventListener('click', toggleListener);
            this.eventListeners.push({ element: passwordToggle, event: 'click', listener: toggleListener });
        }

        if (repeatPasswordToggle) {
            const toggleListener = () => this.togglePassword('repeatPassword');
            repeatPasswordToggle.addEventListener('click', toggleListener);
            this.eventListeners.push({ element: repeatPasswordToggle, event: 'click', listener: toggleListener });
        }

        // Navigation buttons
        if (loginBtn) {
            const loginListener = () => this.handleLogin();
            loginBtn.addEventListener('click', loginListener);
            this.eventListeners.push({ element: loginBtn, event: 'click', listener: loginListener });
        }

        if (forgotPasswordBtn) {
            const forgotListener = () => this.handleForgotPassword();
            forgotPasswordBtn.addEventListener('click', forgotListener);
            this.eventListeners.push({ element: forgotPasswordBtn, event: 'click', listener: forgotListener });
        }

        // Error display event listeners
        this.addErrorEventListeners();
    }

    /**
     * Add error-specific event listeners
     */
    addErrorEventListeners() {
        // Error close button
        const errorClose = this.container.querySelector(`.${Signup.cssNamespace}__error-close`);
        if (errorClose) {
            const closeListener = () => this.hideInlineError();
            errorClose.addEventListener('click', closeListener);
            this.eventListeners.push({ element: errorClose, event: 'click', listener: closeListener });
        }

        // Error retry button
        const errorRetry = this.container.querySelector(`.${Signup.cssNamespace}__error-retry`);
        if (errorRetry) {
            const retryListener = () => this.retrySignup();
            errorRetry.addEventListener('click', retryListener);
            this.eventListeners.push({ element: errorRetry, event: 'click', listener: retryListener });
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
            userId: formData.get('userId'),
            email: formData.get('email'),
            password: formData.get('password'),
            repeatPassword: formData.get('repeatPassword'),
            firstName: formData.get('firstName') || '',
            lastName: formData.get('lastName') || ''
        };

        // Validate form
        if (!this.validateForm()) {
            return;
        }

        try {
            this.setLoading(true);
            this.signupAttempts++;

            // Prepare data for API (exclude repeatPassword)
            const { repeatPassword, ...apiData } = this.formData;

            // Direct API call - no DataManager needed
            const response = await API.postJson('/auth/register', apiData);

            this.setLoading(false);

            if (response && response.success) {
                // Reset signup attempts on success
                this.signupAttempts = 0;
                this.hideSecurityInfo();

                // Success - use inherited success modal or callback
                if (this.options.events.onSignupSuccess) {
                    this.options.events.onSignupSuccess(response.data, this.formData);
                } else {
                    this.showSuccessMessage('Account created successfully!', {
                        autoClose: 3000,
                        onClose: () => {
                            // Default behavior: could redirect to login
                            console.log('Signup completed successfully');
                        }
                    });
                }
            } else {
                // Handle failure
                const errorMessage = this.extractErrorMessage(response);
                this.handleSignupError(errorMessage, response);
            }

        } catch (error) {
            this.setLoading(false);
            const errorMessage = this.extractErrorMessage(error);
            this.handleSignupError(errorMessage, error);
        }
    }

    /**
     * Handle signup error with appropriate display
     */
    handleSignupError(errorMessage, originalError) {
        // Show security info for multiple failed attempts
        if (this.signupAttempts >= 3) {
            this.showSecurityInfo();
        }

        // Use inline error for signup (better UX than modal)
        this.showInlineError(errorMessage, {
            showRetry: true,
            onRetry: () => this.retrySignup()
        });

        // Still call the error callback if provided
        if (this.options.events.onSignupError) {
            this.options.events.onSignupError(originalError, this.formData);
        }

        // Clear password fields for security
        const passwordInput = this.container.querySelector(`#${Signup.cssNamespace}-password`);
        const repeatPasswordInput = this.container.querySelector(`#${Signup.cssNamespace}-repeatPassword`);
        if (passwordInput) passwordInput.value = '';
        if (repeatPasswordInput) repeatPasswordInput.value = '';
    }

    /**
     * Override showInlineError to use signup-specific error display
     */
    showInlineError(message, config = {}) {
        const errorContainer = this.container.querySelector(`#${Signup.cssNamespace}-error-container`);
        const errorText = this.container.querySelector(`.${Signup.cssNamespace}__error-text`);

        if (errorContainer && errorText) {
            errorText.textContent = message;
            errorContainer.style.display = 'block';
        }
    }

    /**
     * Hide inline error
     */
    hideInlineError() {
        const errorContainer = this.container.querySelector(`#${Signup.cssNamespace}-error-container`);
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    }

    /**
     * Show security info for multiple failed attempts
     */
    showSecurityInfo() {
        const securityInfo = this.container.querySelector(`#${Signup.cssNamespace}-security-info`);
        if (securityInfo) {
            securityInfo.style.display = 'block';
        }
    }

    /**
     * Hide security info
     */
    hideSecurityInfo() {
        const securityInfo = this.container.querySelector(`#${Signup.cssNamespace}-security-info`);
        if (securityInfo) {
            securityInfo.style.display = 'none';
        }
    }

    /**
     * Retry signup (clear errors and focus on form)
     */
    retrySignup() {
        this.hideInlineError();

        // Focus on the first input field
        const firstInput = this.container.querySelector(`#${Signup.cssNamespace}-userId`);
        if (firstInput) {
            firstInput.focus();
        }
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;

        const submitBtn = this.container.querySelector(`.${Signup.cssNamespace}__submit`);
        if (submitBtn) {
            submitBtn.disabled = loading;
            submitBtn.innerHTML = loading ? `
                <div class="loading-spinner" style="width: 16px; height: 16px;"></div>
                Creating Account...
            ` : `
                <i class="fas fa-user-plus"></i>
                Create Account
            `;
        }
    }

    /**
     * Validate entire form
     */
    validateForm() {
        const validations = [
            this.validateField('userId'),
            this.validateField('email'),
            this.validateField('password'),
            this.validateField('repeatPassword'),
            this.validateField('firstName'),
            this.validateField('lastName')
        ];

        return validations.every(isValid => isValid);
    }

    /**
     * Validate individual field
     */
    validateField(fieldName) {
        const input = this.container.querySelector(`#${Signup.cssNamespace}-${fieldName}`);
        if (!input) return true;

        const value = input.value ? input.value.trim() : '';

        switch (fieldName) {
            case 'userId':
                return this.validateUserId(value);
            case 'email':
                return this.validateEmail(value);
            case 'password':
                return this.validatePassword(value);
            case 'repeatPassword':
                return this.validateRepeatPassword(value);
            case 'firstName':
            case 'lastName':
                return this.validateOptionalName(fieldName, value);
            default:
                return true;
        }
    }

    /**
     * Validate userId field
     */
    validateUserId(value) {
        if (!value) {
            this.showFieldError('userId', 'User ID is required');
            return false;
        }

        if (value.length < 3) {
            this.showFieldError('userId', 'User ID must be at least 3 characters');
            return false;
        }

        if (value.length > 20) {
            this.showFieldError('userId', 'User ID must be 20 characters or less');
            return false;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            this.showFieldError('userId', 'User ID can only contain letters, numbers, underscores and hyphens');
            return false;
        }

        this.clearFieldError('userId');
        return true;
    }

    /**
     * Validate email field
     */
    validateEmail(value) {
        if (!value) {
            this.showFieldError('email', 'Email address is required');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            this.showFieldError('email', 'Please enter a valid email address');
            return false;
        }

        this.clearFieldError('email');
        return true;
    }

    /**
     * Validate password field
     */
    validatePassword(value) {
        if (!value) {
            this.showFieldError('password', 'Password is required');
            return false;
        }

        if (value.length < 8) {
            this.showFieldError('password', 'Password must be at least 8 characters');
            return false;
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
            this.showFieldError('password', 'Password must contain at least one lowercase letter, one uppercase letter, and one number');
            return false;
        }

        this.clearFieldError('password');

        // Also validate repeat password if it has a value
        const repeatPasswordInput = this.container.querySelector(`#${Signup.cssNamespace}-repeatPassword`);
        if (repeatPasswordInput && repeatPasswordInput.value) {
            this.validateRepeatPassword(repeatPasswordInput.value);
        }

        return true;
    }

    /**
     * Validate repeat password field
     */
    validateRepeatPassword(value) {
        const passwordInput = this.container.querySelector(`#${Signup.cssNamespace}-password`);
        const passwordValue = passwordInput ? passwordInput.value : '';

        if (!value) {
            this.showFieldError('repeatPassword', 'Please confirm your password');
            return false;
        }

        if (value !== passwordValue) {
            this.showFieldError('repeatPassword', 'Passwords do not match');
            return false;
        }

        this.clearFieldError('repeatPassword');
        return true;
    }

    /**
     * Validate optional name fields
     */
    validateOptionalName(fieldName, value) {
        // Optional fields - only validate if value is provided
        if (value && value.length > 50) {
            this.showFieldError(fieldName, `${fieldName === 'firstName' ? 'First' : 'Last'} name must be 50 characters or less`);
            return false;
        }

        this.clearFieldError(fieldName);
        return true;
    }

    /**
     * Show field-specific error
     */
    showFieldError(field, message) {
        const errorElement = this.container.querySelector(`#${Signup.cssNamespace}-${field}-error`);
        const inputElement = this.container.querySelector(`#${Signup.cssNamespace}-${field}`);

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
        const errorElement = this.container.querySelector(`#${Signup.cssNamespace}-${field}-error`);
        const inputElement = this.container.querySelector(`#${Signup.cssNamespace}-${field}`);

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
    togglePassword(field) {
        const passwordInput = this.container.querySelector(`#${Signup.cssNamespace}-${field}`);
        const toggleIcon = this.container.querySelector(`[data-action="toggle-${field === 'password' ? 'password' : 'repeat-password'}"] i`);

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
     * Handle navigation to login
     */
    handleLogin() {
        if (this.options.events.onLogin) {
            this.options.events.onLogin();
        } else {
            // Default behavior - could redirect to /login
            console.log('Navigate to login');
        }
    }

    /**
     * Handle forgot password
     */
    handleForgotPassword() {
        if (this.options.events.onForgotPassword) {
            this.options.events.onForgotPassword();
        } else {
            // Default behavior - could redirect to /forgot
            console.log('Navigate to forgot password');
        }
    }

    /**
     * Initialize component after render
     */
    initialize() {
        // Focus on userId input when component loads
        const userIdInput = this.container.querySelector(`#${Signup.cssNamespace}-userId`);
        if (userIdInput) {
            userIdInput.focus();
        }
    }

    /**
     * Override destroy to handle signup-specific cleanup
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
            ui: {
                title: 'Create Account',
                subtitle: 'Sign up to get started',
                showLoginLink: true,
                modalErrorType: 'inline', // Use inline errors for signup
                showLoading: false, // Signup handles its own loading state
                showError: false,   // Signup handles its own errors
                borderRadius: '0px',
                borderWidth: '0px',
                borderColor: '#e0e0e0',
                borderBox : "none",
                innerPadding: '32px',
                preferredWidth: '780px',
                preferredHeight: '650px'
            }
        };
    }
}

// ========================================
// EXPORT AND GLOBAL ASSIGNMENT
// ========================================

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Signup;
}

if (typeof window !== 'undefined') {
    window.Signup = Signup;
    console.log('✅ Signup component (extends BaseComponent) loaded');
}

/* __START_OF_JSON_SPECIFICATION__
{
  "name": "Signup",
  "type": "signup",
  "options": {
    "ui": {
      "title": "Create Account",
      "subtitle": "Sign up to get started",
      "showLoginLink": true,
      "modalErrorType": "inline",
      "showLoading": false,
      "showError": false,
      "borderRadius": "0px",
      "borderWidth": "0px",
      "borderColor": "#e0e0e0",
      "borderBox" : "none",
      "innerPadding": "32px",
      "preferredWidth": "780px",
      "preferredHeight": "650px"
    }
  }
}
__END_OF_JSON_SPECIFICATION__ */
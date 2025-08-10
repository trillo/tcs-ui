// ============================================================================
// FILE: header.js
// ============================================================================

class Header {
    constructor() {
        this.container = null;
        this.componentName = null;
        this.cssId = null;
        this.cssNamespace = null;
        this.userDropdownOpen = false;
        this.isScrolling = false;
        this.lastScrollTop = 0;
        this.eventListeners = [];
    }

    render(componentName, css, html, container) {
        this.componentName = componentName;
        this.container = container;
        this.cssId = `tai-` + componentName + `-styles`;
        this.cssNamespace = `tai-` + componentName;

        try {
            // Generate and inject CSS
            this.injectCSS(css);

            // Generate and inject HTML
            container.innerHTML = html;

            // Initialize functionality
            this.initAll(container);

            return true;
        } catch (error) {
            console.error('Error rendering header:', error);
            container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            return false;
        }
    }

    /**
     * Initialize all functionality
     * @param {HTMLElement} container - Container element
     */
    initAll(container) {
        console.log('Initializing Header');

        this.setupEventListeners();
        this.applyBehaviors();
    }

    /**
     * Cleanup and destroy the component
     */
    destroy() {
        console.log('Destroying Header');

        // Remove all event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];

        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }

        // Reset state
        this.container = null;
        this.componentName = null;
        this.cssId = null;
        this.cssNamespace = null;
        this.userDropdownOpen = false;
        this.isScrolling = false;
        this.lastScrollTop = 0;
    }

    injectCSS(css) {
        const existingStyle = document.getElementById(this.cssId);
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = this.cssId;
        style.textContent = css;
        document.head.appendChild(style);
    }

    // === EVENT HANDLING ===
    setupEventListeners() {
        // Main click handler using event delegation
        this.addEventListenerWithCleanup(this.container, 'click', this.handleClick.bind(this));

        // Search input handler
        const searchInput = this.container.querySelector(`[data-action="search"]`);
        if (searchInput) {
            this.addEventListenerWithCleanup(searchInput, 'input', this.handleSearchInput.bind(this));
        }

        // Close dropdowns when clicking outside
        this.addEventListenerWithCleanup(document, 'click', this.handleOutsideClick.bind(this));
    }

    applyBehaviors() {
        const ns = this.cssNamespace;
        const header = this.container.querySelector(`.${ns}-header`);
        if (!header) return;

        // Apply sticky behavior (if needed - would come from metadata)
        // This would need to be determined from the JSON data passed to render

        // Setup scroll behavior (if needed - would come from metadata)
        // This would need to be determined from the JSON data passed to render
    }

    addEventListenerWithCleanup(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    handleClick(e) {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        e.preventDefault();
        e.stopPropagation();

        switch (action) {
            case 'toggle-sidebar':
                this.toggleSidebar();
                break;
            case 'toggle-user-dropdown':
                this.toggleUserDropdown();
                break;
            case 'showNotifications':
                this.showNotifications();
                break;
            case 'showMessages':
                this.showMessages();
                break;
            case 'showQuickSettings':
                this.showQuickSettings();
                break;
            case 'showProfile':
                this.showProfile();
                break;
            case 'showAccountSettings':
                this.showAccountSettings();
                break;
            case 'showBilling':
                this.showBilling();
                break;
            case 'showHelp':
                this.showHelp();
                break;
            case 'logout':
                this.logout();
                break;
            default:
                // Handle custom actions
                this.handleCustomAction(action);
                break;
        }
    }

    handleSearchInput(e) {
        this.globalSearch(e.target.value);
    }

    handleOutsideClick(e) {
        const ns = this.cssNamespace;
        if (!e.target.closest(`.${ns}-user`)) {
            this.closeUserDropdown();
        }
    }

    handleScroll() {
        const ns = this.cssNamespace;
        const header = this.container.querySelector(`.${ns}-header`);
        if (!header) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > this.lastScrollTop && scrollTop > 100) {
            // Scrolling down
            header.classList.add('hidden');
        } else {
            // Scrolling up
            header.classList.remove('hidden');
        }

        this.lastScrollTop = scrollTop;
    }

    // === PUBLIC API ===

    // Sidebar integration
    toggleSidebar() {
        // Try to find global sidebar instance
        if (window.sidebarInstance && typeof window.sidebarInstance.toggle === 'function') {
            window.sidebarInstance.toggle();
            return;
        }

        // Fallback: try to find sidebar element and toggle collapsed class
        //const sidebar = document.querySelector('[class*="-sidebar"]');
        const sidebar = document.getElementById('tai-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        } else {
            console.log('Sidebar toggle - no sidebar found');
        }
    }

    // User dropdown
    toggleUserDropdown() {
        if (this.userDropdownOpen) {
            this.closeUserDropdown();
        } else {
            this.openUserDropdown();
        }
    }

    openUserDropdown() {
        const ns = this.cssNamespace;
        const dropdown = this.container.querySelector(`#${ns}-user-dropdown`);
        const user = this.container.querySelector(`.${ns}-user`);

        if (dropdown && user) {
            dropdown.classList.add('show');
            user.classList.add('open');
            this.userDropdownOpen = true;
        }
    }

    closeUserDropdown() {
        const ns = this.cssNamespace;
        const dropdown = this.container.querySelector(`#${ns}-user-dropdown`);
        const user = this.container.querySelector(`.${ns}-user`);

        if (dropdown && user) {
            dropdown.classList.remove('show');
            user.classList.remove('open');
            this.userDropdownOpen = false;
        }
    }

    // Search functionality
    globalSearch(query) {
        console.log('Global search:', query);
        // Implement global search logic
        // Could emit a custom event that the application listens to
        window.dispatchEvent(new CustomEvent('headerSearch', { detail: { query } }));
    }

    // Action handlers
    showNotifications() {
        console.log('Show notifications triggered');
        this.handleCustomAction('showNotifications');
    }

    showMessages() {
        console.log('Show messages triggered');
        this.handleCustomAction('showMessages');
    }

    showQuickSettings() {
        console.log('Show quick settings triggered');
        this.handleCustomAction('showQuickSettings');
    }

    // User dropdown actions
    showProfile() {
        console.log('Show profile triggered');
        this.closeUserDropdown();
        this.handleCustomAction('showProfile');
    }

    showAccountSettings() {
        console.log('Show account settings triggered');
        this.closeUserDropdown();
        this.handleCustomAction('showAccountSettings');
    }

    showBilling() {
        console.log('Show billing triggered');
        this.closeUserDropdown();
        this.handleCustomAction('showBilling');
    }

    showHelp() {
        console.log('Show help triggered');
        this.closeUserDropdown();
        this.handleCustomAction('showHelp');
    }

    logout() {
        console.log('Logout triggered');
        this.closeUserDropdown();

        if (confirm('Are you sure you want to sign out?')) {
            this.handleCustomAction('logout');
        }
    }

    // Generic custom action handler
    handleCustomAction(actionName) {
        // Emit custom event that the application can listen to
        window.dispatchEvent(new CustomEvent('headerAction', {
            detail: {
                action: actionName,
                componentName: this.componentName,
                timestamp: Date.now()
            }
        }));
    }

    // Theme switching
    setTheme(theme) {
        const ns = this.cssNamespace;
        const header = this.container.querySelector(`.${ns}-header`);
        if (header) {
            header.classList.remove('light', 'dark', 'custom');
            if (theme !== 'light') {
                header.classList.add(theme);
            }
        }
    }

    // Update user info
    updateUser(userInfo) {
        const ns = this.cssNamespace;
        const nameEl = this.container.querySelector(`.${ns}-user-name`);
        const roleEl = this.container.querySelector(`.${ns}-user-role`);
        const avatarEl = this.container.querySelector(`.${ns}-user-avatar`);

        if (nameEl && userInfo.name) nameEl.textContent = userInfo.name;
        if (roleEl && userInfo.role) roleEl.textContent = userInfo.role;
        if (avatarEl && userInfo.avatar) avatarEl.src = userInfo.avatar;
    }

    // Update action badge
    updateActionBadge(actionId, count) {
        const ns = this.cssNamespace;
        const action = this.container.querySelector(`[data-action="${actionId}"]`);
        if (!action) return;

        let badge = action.querySelector(`.${ns}-action-badge`);

        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = `${ns}-action-badge primary`;
                action.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
        } else if (badge) {
            badge.remove();
        }
    }

    // Show/hide header
    show() {
        const ns = this.cssNamespace;
        const header = this.container.querySelector(`.${ns}-header`);
        if (header) {
            header.classList.remove('hidden');
        }
    }

    hide() {
        const ns = this.cssNamespace;
        const header = this.container.querySelector(`.${ns}-header`);
        if (header) {
            header.classList.add('hidden');
        }
    }

    // Enable scroll behavior
    enableScrollBehavior() {
        this.addEventListenerWithCleanup(window, 'scroll', this.handleScroll.bind(this));
    }

    // Disable scroll behavior
    disableScrollBehavior() {
        // Remove scroll listener
        this.eventListeners = this.eventListeners.filter(({ element, event, handler }) => {
            if (element === window && event === 'scroll') {
                element.removeEventListener(event, handler);
                return false;
            }
            return true;
        });
    }

    // Get current state
    getState() {
        return {
            userDropdownOpen: this.userDropdownOpen,
            isScrolling: this.isScrolling,
            lastScrollTop: this.lastScrollTop,
            componentName: this.componentName,
            cssNamespace: this.cssNamespace
        };
    }

    // Set state
    setState(state) {
        if (state.userDropdownOpen !== undefined) {
            this.userDropdownOpen = state.userDropdownOpen;

            if (this.userDropdownOpen) {
                this.openUserDropdown();
            } else {
                this.closeUserDropdown();
            }
        }

        if (state.lastScrollTop !== undefined) {
            this.lastScrollTop = state.lastScrollTop;
        }
    }
}

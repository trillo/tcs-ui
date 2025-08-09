class Sidebar {
    constructor() {
        this.container = null;
        this.componentName = null;
        this.cssId = null;
        this.cssNamespace = null;
        this.isCollapsed = false;
        this.expandedItems = new Set();
        this.userDropdownOpen = false;
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

            return true
        } catch (error) {
            console.error('Error rendering sidebar:', error);
            container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            return false
        }
    }

    /**
     * Initialize all functionality
     * @param {HTMLElement} container - Container element
     */
    initAll(container) {
        console.log('Initializing SidebarNavigation');

        this.loadState();
        this.applyState();
        this.setupEventListeners();
    }

    /**
     * Cleanup and destroy the component
     */
    destroy() {
        console.log('Destroying SidebarNavigation');

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
        this.isCollapsed = false;
        this.expandedItems = new Set();
        this.userDropdownOpen = false;
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

        // Close dropdowns when clicking outside
        this.addEventListenerWithCleanup(document, 'click', this.handleOutsideClick.bind(this));
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
            case 'toggle':
                this.toggle();
                break;
            case 'toggle-submenu':
                const itemId = e.target.closest('[data-item-id]')?.dataset.itemId;
                if (itemId) this.toggleSubmenu(itemId);
                break;
            case 'toggle-user-dropdown':
                this.toggleUserDropdown();
                break;
            case 'showProfile':
                this.showProfile();
                break;
            case 'showSettings':
                this.showSettings();
                break;
            case 'logout':
                this.logout();
                break;
        }
    }

    handleOutsideClick(e) {
        const ns = this.cssNamespace;
        if (!e.target.closest(`.${ns}-user-info`)) {
            this.closeUserDropdown();
        }
    }

    handleResize() {
        if (window.innerWidth <= 768 && !this.isCollapsed) {
            this.collapse();
        }
    }

    // === STATE MANAGEMENT ===
    saveState() {
      const ns = this.cssNamespace;
      localStorage.setItem(`${ns}-sidebar-collapsed`, this.isCollapsed);
      localStorage.setItem(`${ns}-sidebar-expanded`, JSON.stringify(Array.from(this.expandedItems)));
    }

    loadState() {
      const ns = this.cssNamespace;
      const savedCollapsed = localStorage.getItem(`${ns}-sidebar-collapsed`);
      const savedExpanded = localStorage.getItem(`${ns}-sidebar-expanded`);

      if (savedCollapsed !== null) {
          this.isCollapsed = savedCollapsed === 'true';
      }

      if (savedExpanded) {
          this.expandedItems = new Set(JSON.parse(savedExpanded));
      }
    }

    applyState() {
        const ns = this.cssNamespace;
        const sidebar = this.container.querySelector(`.${ns}-sidebar`);
        if (!sidebar) return;

        if (this.isCollapsed) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
        }

        // Apply expanded submenu states
        this.expandedItems.forEach(itemId => {
            const link = this.container.querySelector(`#${ns}-nav-${itemId}`);
            const submenu = this.container.querySelector(`#${ns}-submenu-${itemId}`);

            if (link && submenu) {
                link.classList.add('expanded');
                submenu.classList.add('expanded');
            }
        });

        // Update main content margin if available
        this.updateMainContentMargin();
    }

    updateMainContentMargin() {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            if (this.isCollapsed) {
                mainContent.classList.add('sidebar-collapsed');
            } else {
                mainContent.classList.remove('sidebar-collapsed');
            }
        }
    }

    // === PUBLIC API ===
    toggle() {
        if (this.isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    collapse() {
        const ns = this.cssNamespace;
        const sidebar = this.container.querySelector(`.${ns}-sidebar`);
        if (sidebar) {
            sidebar.classList.add('collapsed');
            this.isCollapsed = true;
            this.saveState();
            this.closeAllSubmenus();
            this.closeUserDropdown();
            this.updateMainContentMargin();
        }
    }

    expand() {
        const ns = this.cssNamespace;
        const sidebar = this.container.querySelector(`.${ns}-sidebar`);
        if (sidebar) {
            sidebar.classList.remove('collapsed');
            this.isCollapsed = false;
            this.saveState();
            this.updateMainContentMargin();
        }
    }

    toggleSubmenu(itemId) {
        const ns = this.cssNamespace;
        const link = this.container.querySelector(`#${ns}-nav-${itemId}`);
        const submenu = this.container.querySelector(`#${ns}-submenu-${itemId}`);

        if (!link || !submenu) return;

        const isExpanded = this.expandedItems.has(itemId);

        if (isExpanded) {
            link.classList.remove('expanded');
            submenu.classList.remove('expanded');
            this.expandedItems.delete(itemId);
        } else {
            link.classList.add('expanded');
            submenu.classList.add('expanded');
            this.expandedItems.add(itemId);
        }

        this.saveState();
    }

    closeAllSubmenus() {
      
        const ns = this.cssNamespace;
        this.expandedItems.clear();

        this.container.querySelectorAll(`.${ns}-nav-link`).forEach(link => {
            link.classList.remove('expanded');
        });

        this.container.querySelectorAll(`.${ns}-nav-submenu`).forEach(submenu => {
            submenu.classList.remove('expanded');
        });
    }

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
        if (dropdown) {
            dropdown.classList.add('show');
            this.userDropdownOpen = true;
        }
    }

    closeUserDropdown() {
        const ns = this.cssNamespace;
        const dropdown = this.container.querySelector(`#${ns}-user-dropdown`);
        if (dropdown) {
            dropdown.classList.remove('show');
            this.userDropdownOpen = false;
        }
    }

    setActive(itemId) {
        const ns = this.cssNamespace;

        this.container.querySelectorAll(`.${ns}-nav-link`).forEach(link => {
            link.classList.remove('active');
        });

        const activeItem = this.container.querySelector(`#${ns}-nav-${itemId}`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    // User dropdown actions
    showProfile() {
        console.log('Show profile');
        this.closeUserDropdown();
        alert('Profile functionality would be implemented here');
    }

    showSettings() {
        console.log('Show settings');
        this.closeUserDropdown();
        alert('Settings functionality would be implemented here');
    }

    logout() {
        console.log('Logout');
        this.closeUserDropdown();

        if (confirm('Are you sure you want to logout?')) {
            const ns = this.cssNamespace;
            localStorage.removeItem(`${ns}-sidebar-collapsed`);
            localStorage.removeItem(`${ns}-sidebar-expanded`);
            alert('Logout functionality would be implemented here');
        }
    }

    // Mobile show/hide
    show() {
        const ns = this.cssNamespace;
        const sidebar = this.container.querySelector(`.${ns}-sidebar`);
        if (sidebar) {
            sidebar.classList.add('show');
        }
    }

    hide() {
        const ns = this.cssNamespace;
        const sidebar = this.container.querySelector(`.${ns}-sidebar`);
        if (sidebar) {
            sidebar.classList.remove('show');
        }
    }

    // Theme switching
    setTheme(theme) {
        const ns = this.cssNamespace;
        const sidebar = this.container.querySelector(`.${ns}-sidebar`);
        if (sidebar) {
            sidebar.classList.remove('light', 'dark', 'custom');
            if (theme !== 'light') {
                sidebar.classList.add(theme);
            }
        }
    }

    // State getters/setters
    getState() {
        return {
            isCollapsed: this.isCollapsed,
            expandedItems: Array.from(this.expandedItems),
            userDropdownOpen: this.userDropdownOpen
        };
    }

    setState(state) {
        if (state.isCollapsed !== undefined) {
            this.isCollapsed = state.isCollapsed;
        }

        if (state.expandedItems) {
            this.expandedItems = new Set(state.expandedItems);
        }

        if (state.userDropdownOpen !== undefined) {
            this.userDropdownOpen = state.userDropdownOpen;
        }

        this.applyState();
    }

    // Update navigation badge/count
    updateBadge(itemId, badge) {
        const ns = this.cssNamespace;
        const item = this.container.querySelector(`#${ns}-nav-${itemId}`);
        if (!item) return;

        const existingBadge = item.querySelector(`.${ns}-nav-badge`);
        const existingCount = item.querySelector(`.${ns}-nav-count`);

        if (existingBadge) existingBadge.remove();
        if (existingCount) existingCount.remove();

        if (badge.type === 'count' && badge.value) {
            const countEl = document.createElement('span');
            countEl.className = `${ns}-nav-count`;
            countEl.textContent = badge.value;
            item.appendChild(countEl);
        } else if (badge.type === 'badge' && badge.text) {
            const badgeEl = document.createElement('span');
            badgeEl.className = `${ns}-nav-badge ${badge.color || 'success'}`;
            badgeEl.textContent = badge.text;
            item.appendChild(badgeEl);
        }
    }

    // Update notification indicator
    updateNotification(itemId, show) {
        const ns = this.cssNamespace;
        const navItem = this.container.querySelector(`#${ns}-nav-${itemId}`)?.parentElement;
        if (!navItem) return;

        let notification = navItem.querySelector(`.${ns}-nav-notification`);

        if (show && !notification) {
            notification = document.createElement('div');
            notification.className = `${ns}-nav-notification`;
            navItem.appendChild(notification);
        } else if (!show && notification) {
            notification.remove();
        }
    }
}

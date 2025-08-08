class SidebarNavigationGenerator {
    constructor() {
        this.metadata = null;
        this.container = null;
        this.isCollapsed = false;
        this.expandedItems = new Set();
        this.userDropdownOpen = false;
        this.eventListeners = [];
    }

    /**
     * Render sidebar navigation from metadata
     * @param {Object} metadata - Sidebar metadata
     * @param {HTMLElement} container - Container element
     */
    render(metadata, container) {
        this.metadata = metadata;
        this.container = container;

        try {
            // Generate and inject CSS
            this.injectCSS();

            // Generate and inject HTML
            container.innerHTML = this.generateHTML();

            // Initialize functionality
            this.initAll(container);

            return {
                success: true,
                namespace: metadata.cssNamespace,
                componentName: metadata.componentName
            };
        } catch (error) {
            console.error('Error rendering sidebar:', error);
            container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            return {
                success: false,
                error: error.message
            };
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

        // Auto-collapse on mobile
        if (this.metadata.behavior.autoCollapse) {
            this.handleResize();
            this.addEventListenerWithCleanup(window, 'resize', this.handleResize.bind(this));
        }
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
        this.metadata = null;
        this.container = null;
        this.isCollapsed = false;
        this.expandedItems = new Set();
        this.userDropdownOpen = false;
    }

    // === CSS GENERATION ===
    injectCSS() {
        const existingStyle = document.getElementById(`${this.metadata.cssNamespace}-styles`);
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = `${this.metadata.cssNamespace}-styles`;
        style.textContent = this.generateCSS();
        document.head.appendChild(style);
    }

    generateCSS() {
        const ns = this.metadata.cssNamespace;
        const sidebar = this.metadata.sidebar;
        const colors = this.metadata.colors;

        return `
/* === SIDEBAR NAVIGATION STYLES === */
.${ns}-sidebar {
width: ${sidebar.width};
height: 100vh;
background-color: ${colors.background};
border-right: 1px solid ${colors.border};
display: flex;
flex-direction: column;
position: ${sidebar.position};
top: 0;
left: 0;
z-index: 100;
transition: all 0.3s ease;
overflow: hidden;
}

.${ns}-sidebar.collapsed {
width: ${sidebar.collapsedWidth};
}

.${ns}-sidebar.collapsed .${ns}-nav-text,
.${ns}-sidebar.collapsed .${ns}-nav-arrow,
.${ns}-sidebar.collapsed .${ns}-nav-count,
.${ns}-sidebar.collapsed .${ns}-nav-badge,
.${ns}-sidebar.collapsed .${ns}-brand-text,
.${ns}-sidebar.collapsed .${ns}-separator-label,
.${ns}-sidebar.collapsed .${ns}-user-details {
opacity: 0;
visibility: hidden;
}

/* Brand Section */
.${ns}-brand {
padding: 16px;
display: flex;
align-items: center;
gap: 12px;
border-bottom: 1px solid ${colors.border};
min-height: 64px;
}

.${ns}-brand-logo {
width: ${sidebar.branding.logo.width};
height: ${sidebar.branding.logo.height};
border-radius: 8px;
flex-shrink: 0;
}

.${ns}-brand-text {
transition: opacity 0.3s ease, visibility 0.3s ease;
}

.${ns}-brand-title {
font-size: 1.125rem;
font-weight: 600;
color: ${colors.text};
line-height: 1.2;
}

.${ns}-brand-subtitle {
font-size: 0.75rem;
color: ${colors.textSecondary};
}

/* Toggle Button */
.${ns}-toggle {
position: absolute;
top: 20px;
right: -12px;
width: 24px;
height: 24px;
background: ${colors.background};
border: 1px solid ${colors.border};
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
cursor: pointer;
font-size: 12px;
color: ${colors.textSecondary};
transition: all 0.2s ease;
z-index: 101;
}

.${ns}-toggle:hover {
background: ${colors.hover};
color: ${colors.text};
}

/* Navigation */
.${ns}-nav {
flex: 1;
overflow-y: auto;
overflow-x: hidden;
padding: 8px 0;
}

.${ns}-nav::-webkit-scrollbar {
width: 4px;
}

.${ns}-nav::-webkit-scrollbar-track {
background: transparent;
}

.${ns}-nav::-webkit-scrollbar-thumb {
background: ${colors.border};
border-radius: 2px;
}

/* Navigation Items */
.${ns}-nav-item {
position: relative;
margin: 2px 8px;
}

.${ns}-nav-link {
display: flex;
align-items: center;
padding: 12px 16px;
color: ${colors.text};
text-decoration: none;
border-radius: 8px;
transition: all 0.2s ease;
cursor: pointer;
border: none;
background: none;
width: 100%;
text-align: left;
font-size: 0.875rem;
font-weight: 500;
gap: 12px;
}

.${ns}-nav-link:hover {
background-color: ${colors.hover};
color: ${colors.accent};
}

.${ns}-nav-link.active {
background-color: ${colors.active};
color: ${colors.accent};
}

.${ns}-nav-icon {
width: 20px;
text-align: center;
flex-shrink: 0;
font-size: 16px;
}

.${ns}-nav-text {
flex: 1;
transition: opacity 0.3s ease, visibility 0.3s ease;
}

.${ns}-nav-arrow {
font-size: 12px;
transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;
color: ${colors.textSecondary};
}

.${ns}-nav-link.expanded .${ns}-nav-arrow {
transform: rotate(90deg);
}

.${ns}-nav-count {
background: ${colors.textSecondary};
color: white;
padding: 2px 8px;
border-radius: 12px;
font-size: 0.75rem;
min-width: 20px;
text-align: center;
line-height: 1.4;
transition: opacity 0.3s ease, visibility 0.3s ease;
}

.${ns}-nav-badge {
padding: 2px 8px;
border-radius: 12px;
font-size: 0.65rem;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.5px;
transition: opacity 0.3s ease, visibility 0.3s ease;
}

.${ns}-nav-badge.success {
background: #e8f5e8;
color: #2e7d32;
}

.${ns}-nav-badge.warning {
background: #fff3e0;
color: #f57c00;
}

.${ns}-nav-badge.error {
background: #ffebee;
color: #c62828;
}

.${ns}-nav-notification {
width: 8px;
height: 8px;
background: #f44336;
border-radius: 50%;
position: absolute;
top: 8px;
right: 8px;
}

/* Submenu */
.${ns}-nav-submenu {
max-height: 0;
overflow: hidden;
transition: max-height 0.3s ease;
background: rgba(0, 0, 0, 0.02);
margin-top: 4px;
border-radius: 8px;
}

.${ns}-nav-submenu.expanded {
max-height: 400px;
}

.${ns}-nav-submenu .${ns}-nav-link {
padding: 10px 16px 10px 52px;
font-size: 0.8125rem;
font-weight: 400;
}

.${ns}-nav-submenu .${ns}-nav-submenu .${ns}-nav-link {
padding-left: 68px;
font-size: 0.75rem;
}

/* Separators */
.${ns}-separator {
margin: 16px 8px;
position: relative;
}

.${ns}-separator-line {
height: 1px;
background: ${colors.separator};
}

.${ns}-separator-label {
position: absolute;
top: -8px;
left: 8px;
background: ${colors.background};
padding: 0 8px;
font-size: 0.7rem;
color: ${colors.textSecondary};
text-transform: uppercase;
font-weight: 600;
letter-spacing: 0.5px;
transition: opacity 0.3s ease, visibility 0.3s ease;
}

/* Footer */
.${ns}-footer {
border-top: 1px solid ${colors.border};
padding: 12px;
}

.${ns}-user-info {
display: flex;
align-items: center;
gap: 12px;
padding: 8px 12px;
border-radius: 8px;
cursor: pointer;
transition: background-color 0.2s ease;
position: relative;
}

.${ns}-user-info:hover {
background-color: ${colors.hover};
}

.${ns}-user-avatar {
width: 32px;
height: 32px;
border-radius: 50%;
flex-shrink: 0;
}

.${ns}-user-details {
flex: 1;
min-width: 0;
transition: opacity 0.3s ease, visibility 0.3s ease;
}

.${ns}-user-name {
font-size: 0.875rem;
font-weight: 500;
color: ${colors.text};
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
}

.${ns}-user-email {
font-size: 0.75rem;
color: ${colors.textSecondary};
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
}

/* User Dropdown */
.${ns}-user-dropdown {
position: absolute;
bottom: 100%;
left: 12px;
right: 12px;
background: white;
border: 1px solid ${colors.border};
border-radius: 8px;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
padding: 8px 0;
display: none;
z-index: 102;
}

.${ns}-user-dropdown.show {
display: block;
}

.${ns}-dropdown-item {
display: flex;
align-items: center;
gap: 12px;
padding: 10px 16px;
color: ${colors.text};
text-decoration: none;
font-size: 0.875rem;
transition: background-color 0.2s ease;
cursor: pointer;
border: none;
background: none;
width: 100%;
text-align: left;
}

.${ns}-dropdown-item:hover {
background-color: ${colors.hover};
}

.${ns}-dropdown-separator {
height: 1px;
background: ${colors.border};
margin: 4px 0;
}

/* Responsive */
@media (max-width: 768px) {
.${ns}-sidebar {
transform: translateX(-100%);
z-index: 1000;
}

.${ns}-sidebar.show {
transform: translateX(0);
}

.${ns}-sidebar.collapsed {
transform: translateX(-100%);
}

.${ns}-toggle {
display: none;
}
}

/* Dark theme */
.${ns}-sidebar.dark {
background-color: #1a1a1a;
color: #ffffff;
border-right-color: #333333;
}

.${ns}-sidebar.dark .${ns}-brand {
border-bottom-color: #333333;
}

.${ns}-sidebar.dark .${ns}-brand-title {
color: #ffffff;
}

.${ns}-sidebar.dark .${ns}-brand-subtitle {
color: #b0b0b0;
}

.${ns}-sidebar.dark .${ns}-nav-link {
color: #ffffff;
}

.${ns}-sidebar.dark .${ns}-nav-link:hover {
background-color: #2a2a2a;
}

.${ns}-sidebar.dark .${ns}-nav-link.active {
background-color: #0d47a1;
}

.${ns}-sidebar.dark .${ns}-toggle {
background: #1a1a1a;
border-color: #333333;
color: #b0b0b0;
}

.${ns}-sidebar.dark .${ns}-toggle:hover {
background: #2a2a2a;
color: #ffffff;
}

.${ns}-sidebar.dark .${ns}-user-dropdown {
background: #1a1a1a;
border-color: #333333;
}

.${ns}-sidebar.dark .${ns}-separator-label {
background: #1a1a1a;
}
        `.trim();
    }

    // === HTML GENERATION ===
    generateHTML() {
        const ns = this.metadata.cssNamespace;
        const sidebar = this.metadata.sidebar;

        return `
<aside class="${ns}-sidebar" id="${ns}-sidebar">
${sidebar.showToggle ? `
<button class="${ns}-toggle" data-action="toggle">
<i class="fas fa-chevron-left"></i>
</button>
` : ''}

${this.generateBranding()}

<nav class="${ns}-nav">
${this.generateNavigation(sidebar.navigation)}
</nav>

${sidebar.footer.enabled ? this.generateFooter() : ''}
</aside>
        `.trim();
    }

    generateBranding() {
        const ns = this.metadata.cssNamespace;
        const branding = this.metadata.sidebar.branding;

        return `
<div class="${ns}-brand">
<img src="${branding.logo.src}" alt="${branding.logo.alt}" class="${ns}-brand-logo">
<div class="${ns}-brand-text">
<div class="${ns}-brand-title">${branding.title}</div>
${branding.subtitle ? `<div class="${ns}-brand-subtitle">${branding.subtitle}</div>` : ''}
</div>
</div>
        `;
    }

    generateNavigation(items, level = 0) {
        const ns = this.metadata.cssNamespace;

        return items.map(item => {
            if (item.type === 'separator') {
                return `
<div class="${ns}-separator">
<div class="${ns}-separator-line"></div>
${item.label ? `<div class="${ns}-separator-label">${item.label}</div>` : ''}
</div>
                `;
            }

            const hasChildren = item.children && item.children.length > 0;
            const itemId = `${ns}-nav-${item.id}`;
            const submenuId = `${ns}-submenu-${item.id}`;

            return `
<div class="${ns}-nav-item">
${item.notification ? `<div class="${ns}-nav-notification"></div>` : ''}

<${item.url ? 'a href="' + item.url + '"' : 'button'}
 class="${ns}-nav-link ${item.active ? 'active' : ''}"
 id="${itemId}"
 ${hasChildren ? `data-action="toggle-submenu" data-item-id="${item.id}"` : ''}
 ${item.external ? 'target="_blank"' : ''}>

<i class="fas ${item.icon} ${ns}-nav-icon"></i>
<span class="${ns}-nav-text">${item.label}</span>

${item.count ? `<span class="${ns}-nav-count">${item.count}</span>` : ''}
${item.badge ? `<span class="${ns}-nav-badge ${item.badge.color}">${item.badge.text}</span>` : ''}
${hasChildren ? `<i class="fas fa-chevron-right ${ns}-nav-arrow"></i>` : ''}
</${item.url ? 'a' : 'button'}>

${hasChildren ? `
<div class="${ns}-nav-submenu" id="${submenuId}">
${this.generateNavigation(item.children, level + 1)}
</div>
` : ''}
</div>
            `;
        }).join('');
    }

    generateFooter() {
        const ns = this.metadata.cssNamespace;
        const footer = this.metadata.sidebar.footer;

        return footer.content.map(item => {
            if (item.type === 'user-info') {
                return `
<div class="${ns}-footer">
<div class="${ns}-user-info" data-action="toggle-user-dropdown">
<img src="${item.user.avatar}" alt="${item.user.name}" class="${ns}-user-avatar">
<div class="${ns}-user-details">
<div class="${ns}-user-name">${item.user.name}</div>
<div class="${ns}-user-email">${item.user.email}</div>
</div>

${item.showDropdown ? `
<div class="${ns}-user-dropdown" id="${ns}-user-dropdown">
${item.dropdownItems.map(dropItem => {
                    if (dropItem.type === 'separator') {
                        return `<div class="${ns}-dropdown-separator"></div>`;
                    }
                    return `
  <button class="${ns}-dropdown-item" data-action="${dropItem.action}">
    <i class="fas ${dropItem.icon}"></i>
    ${dropItem.label}
  </button>
                    `;
                }).join('')}
</div>
` : ''}
</div>
</div>
                `;
            }
            return '';
        }).join('');
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
        const ns = this.metadata.cssNamespace;
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
        if (this.metadata.behavior.rememberState) {
            const ns = this.metadata.cssNamespace;
            localStorage.setItem(`${ns}-sidebar-collapsed`, this.isCollapsed);
            localStorage.setItem(`${ns}-sidebar-expanded`, JSON.stringify(Array.from(this.expandedItems)));
        }
    }

    loadState() {
        if (this.metadata.behavior.rememberState) {
            const ns = this.metadata.cssNamespace;
            const savedCollapsed = localStorage.getItem(`${ns}-sidebar-collapsed`);
            const savedExpanded = localStorage.getItem(`${ns}-sidebar-expanded`);

            if (savedCollapsed !== null) {
                this.isCollapsed = savedCollapsed === 'true';
            }

            if (savedExpanded) {
                this.expandedItems = new Set(JSON.parse(savedExpanded));
            }
        }
    }

    applyState() {
        const ns = this.metadata.cssNamespace;
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
        const ns = this.metadata.cssNamespace;
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
        const ns = this.metadata.cssNamespace;
        const sidebar = this.container.querySelector(`.${ns}-sidebar`);
        if (sidebar) {
            sidebar.classList.remove('collapsed');
            this.isCollapsed = false;
            this.saveState();
            this.updateMainContentMargin();
        }
    }

    toggleSubmenu(itemId) {
        const ns = this.metadata.cssNamespace;
        const link = this.container.querySelector(`#${ns}-nav-${itemId}`);
        const submenu = this.container.querySelector(`#${ns}-submenu-${itemId}`);

        if (!link || !submenu) return;

        const isExpanded = this.expandedItems.has(itemId);

        if (isExpanded) {
            link.classList.remove('expanded');
            submenu.classList.remove('expanded');
            this.expandedItems.delete(itemId);
        } else {
            if (this.metadata.behavior.accordion) {
                this.closeAllSubmenus();
            }

            link.classList.add('expanded');
            submenu.classList.add('expanded');
            this.expandedItems.add(itemId);
        }

        this.saveState();
    }

    closeAllSubmenus() {
        if (!this.metadata.behavior.accordion) return;

        const ns = this.metadata.cssNamespace;
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
        const ns = this.metadata.cssNamespace;
        const dropdown = this.container.querySelector(`#${ns}-user-dropdown`);
        if (dropdown) {
            dropdown.classList.add('show');
            this.userDropdownOpen = true;
        }
    }

    closeUserDropdown() {
        const ns = this.metadata.cssNamespace;
        const dropdown = this.container.querySelector(`#${ns}-user-dropdown`);
        if (dropdown) {
            dropdown.classList.remove('show');
            this.userDropdownOpen = false;
        }
    }

    setActive(itemId) {
        const ns = this.metadata.cssNamespace;

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
            const ns = this.metadata.cssNamespace;
            localStorage.removeItem(`${ns}-sidebar-collapsed`);
            localStorage.removeItem(`${ns}-sidebar-expanded`);
            alert('Logout functionality would be implemented here');
        }
    }

    // Mobile show/hide
    show() {
        const ns = this.metadata.cssNamespace;
        const sidebar = this.container.querySelector(`.${ns}-sidebar`);
        if (sidebar) {
            sidebar.classList.add('show');
        }
    }

    hide() {
        const ns = this.metadata.cssNamespace;
        const sidebar = this.container.querySelector(`.${ns}-sidebar`);
        if (sidebar) {
            sidebar.classList.remove('show');
        }
    }

    // Theme switching
    setTheme(theme) {
        const ns = this.metadata.cssNamespace;
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
        const ns = this.metadata.cssNamespace;
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
        const ns = this.metadata.cssNamespace;
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

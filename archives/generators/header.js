class HeaderGenerator {
    constructor() {
        this.metadata = null;
        this.container = null;
        this.userDropdownOpen = false;
        this.isScrolling = false;
        this.lastScrollTop = 0;
        this.eventListeners = [];
    }

    /**
     * Render header component from metadata
     * @param {Object} metadata - Header metadata
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
            console.error('Error rendering header:', error);
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
        console.log('Initializing HeaderNavigation');

        this.setupEventListeners();
        this.applyBehaviors();
    }

    /**
     * Cleanup and destroy the component
     */
    destroy() {
        console.log('Destroying HeaderNavigation');

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
        this.userDropdownOpen = false;
        this.isScrolling = false;
        this.lastScrollTop = 0;
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
        const header = this.metadata.header;
        const colors = this.metadata.colors;

        return `
/* === HEADER COMPONENT STYLES === */
.${ns}-header {
width: 100%;
height: ${header.height};
background-color: ${colors.background};
border-bottom: 1px solid ${colors.border};
display: flex;
align-items: center;
justify-content: space-between;
padding: 0 24px;
position: ${header.position};
top: 0;
left: 0;
z-index: ${header.zIndex};
transition: all 0.3s ease;
}

.${ns}-header.sticky {
position: sticky;
}

.${ns}-header.shadow {
box-shadow: 0 2px 8px ${colors.shadow};
}

.${ns}-header.hidden {
transform: translateY(-100%);
}

/* Left Section */
.${ns}-left {
display: flex;
align-items: center;
gap: 16px;
flex-shrink: 0;
}

.${ns}-sidebar-toggle {
width: 40px;
height: 40px;
border: none;
background: none;
color: ${colors.text};
cursor: pointer;
border-radius: 8px;
display: flex;
align-items: center;
justify-content: center;
font-size: 18px;
transition: all 0.2s ease;
}

.${ns}-sidebar-toggle:hover {
background-color: ${colors.hover};
color: ${colors.accent};
}

.${ns}-branding {
display: flex;
align-items: center;
gap: 12px;
text-decoration: none;
color: inherit;
}

.${ns}-logo {
width: ${header.left.branding.logo.width};
height: ${header.left.branding.logo.height};
border-radius: 8px;
flex-shrink: 0;
}

.${ns}-brand-text {
display: flex;
flex-direction: column;
}

.${ns}-brand-title {
font-size: 1.25rem;
font-weight: 600;
color: ${colors.text};
line-height: 1.2;
}

.${ns}-brand-subtitle {
font-size: 0.75rem;
color: ${colors.textSecondary};
line-height: 1;
}

/* Center Section */
.${ns}-center {
flex: 1;
display: flex;
justify-content: center;
padding: 0 24px;
}

.${ns}-search-container {
position: relative;
max-width: 400px;
width: 100%;
}

.${ns}-search-input {
width: 100%;
padding: 8px 16px 8px 40px;
border: 1px solid ${colors.border};
border-radius: 20px;
font-size: 0.875rem;
background: ${colors.hover};
transition: all 0.2s ease;
}

.${ns}-search-input:focus {
outline: none;
border-color: ${colors.accent};
background: ${colors.background};
box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.${ns}-search-icon {
position: absolute;
left: 12px;
top: 50%;
transform: translateY(-50%);
color: ${colors.textSecondary};
font-size: 14px;
}

/* Right Section */
.${ns}-right {
display: flex;
align-items: center;
gap: 8px;
flex-shrink: 0;
}

/* Action Icons */
.${ns}-action {
position: relative;
width: 40px;
height: 40px;
border: none;
background: none;
color: ${colors.text};
cursor: pointer;
border-radius: 8px;
display: flex;
align-items: center;
justify-content: center;
font-size: 16px;
transition: all 0.2s ease;
}

.${ns}-action:hover {
background-color: ${colors.hover};
color: ${colors.accent};
}

.${ns}-action-badge {
position: absolute;
top: 4px;
right: 4px;
min-width: 18px;
height: 18px;
border-radius: 9px;
font-size: 0.7rem;
font-weight: 600;
display: flex;
align-items: center;
justify-content: center;
color: white;
line-height: 1;
}

.${ns}-action-badge.primary {
background: ${colors.accent};
}

.${ns}-action-badge.error {
background: #f44336;
}

.${ns}-action-badge.success {
background: #4caf50;
}

.${ns}-action-badge.warning {
background: #ff9800;
}

.${ns}-action-badge.secondary {
background: #757575;
}

/* User Section */
.${ns}-user {
position: relative;
display: flex;
align-items: center;
gap: 12px;
padding: 6px 12px;
border-radius: 20px;
cursor: pointer;
transition: background-color 0.2s ease;
margin-left: 8px;
}

.${ns}-user:hover {
background-color: ${colors.hover};
}

.${ns}-user-avatar {
width: 32px;
height: 32px;
border-radius: 50%;
object-fit: cover;
flex-shrink: 0;
}

.${ns}-user-avatar-fallback {
width: 32px;
height: 32px;
border-radius: 50%;
background: ${colors.accent};
color: white;
display: flex;
align-items: center;
justify-content: center;
font-size: 0.875rem;
font-weight: 600;
flex-shrink: 0;
}

.${ns}-user-info {
display: flex;
flex-direction: column;
min-width: 0;
}

.${ns}-user-name {
font-size: 0.875rem;
font-weight: 500;
color: ${colors.text};
line-height: 1.2;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
}

.${ns}-user-role {
font-size: 0.75rem;
color: ${colors.textSecondary};
line-height: 1;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
}

.${ns}-user-dropdown-icon {
color: ${colors.textSecondary};
font-size: 12px;
transition: transform 0.2s ease;
}

.${ns}-user.open .${ns}-user-dropdown-icon {
transform: rotate(180deg);
}

/* User Dropdown */
.${ns}-user-dropdown {
position: absolute;
top: 100%;
right: 0;
margin-top: 8px;
background: ${colors.background};
border: 1px solid ${colors.border};
border-radius: 12px;
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
min-width: 220px;
padding: 8px 0;
display: none;
z-index: 1001;
}

.${ns}-user-dropdown.show {
display: block;
}

.${ns}-user-dropdown::before {
content: '';
position: absolute;
top: -6px;
right: 24px;
width: 12px;
height: 12px;
background: ${colors.background};
border: 1px solid ${colors.border};
border-bottom: none;
border-right: none;
transform: rotate(45deg);
}

.${ns}-dropdown-item {
display: flex;
align-items: center;
gap: 12px;
padding: 12px 16px;
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

.${ns}-dropdown-item.logout {
color: #f44336;
}

.${ns}-dropdown-item.logout:hover {
background-color: rgba(244, 67, 54, 0.04);
}

.${ns}-dropdown-separator {
height: 1px;
background: ${colors.border};
margin: 8px 0;
}

/* Tooltip */
.${ns}-tooltip {
position: absolute;
bottom: -32px;
left: 50%;
transform: translateX(-50%);
background: rgba(0, 0, 0, 0.8);
color: white;
padding: 4px 8px;
border-radius: 4px;
font-size: 0.75rem;
white-space: nowrap;
pointer-events: none;
opacity: 0;
visibility: hidden;
transition: all 0.2s ease;
z-index: 1002;
}

.${ns}-action:hover .${ns}-tooltip {
opacity: 1;
visibility: visible;
}

/* Responsive Design */
@media (max-width: 768px) {
.${ns}-header {
padding: 0 16px;
}

.${ns}-left {
gap: 12px;
}

.${ns}-brand-subtitle {
display: none;
}

.${ns}-center {
display: none;
}

.${ns}-user-info {
display: none;
}

.${ns}-user-dropdown {
right: -8px;
}

.${ns}-user-dropdown::before {
right: 20px;
}
}

@media (max-width: 480px) {
.${ns}-header {
padding: 0 12px;
}

.${ns}-left {
gap: 8px;
}

.${ns}-right {
gap: 4px;
}

.${ns}-brand-title {
font-size: 1.125rem;
}

.${ns}-action {
width: 36px;
height: 36px;
}
}

/* Dark Theme */
.${ns}-header.dark {
background-color: #1a1a1a;
color: #ffffff;
border-bottom-color: #333333;
}

.${ns}-header.dark .${ns}-brand-title {
color: #ffffff;
}

.${ns}-header.dark .${ns}-brand-subtitle {
color: #b0b0b0;
}

.${ns}-header.dark .${ns}-sidebar-toggle {
color: #ffffff;
}

.${ns}-header.dark .${ns}-sidebar-toggle:hover {
background-color: #2a2a2a;
}

.${ns}-header.dark .${ns}-action {
color: #ffffff;
}

.${ns}-header.dark .${ns}-action:hover {
background-color: #2a2a2a;
}

.${ns}-header.dark .${ns}-user:hover {
background-color: #2a2a2a;
}

.${ns}-header.dark .${ns}-user-dropdown {
background: #1a1a1a;
border-color: #333333;
}

.${ns}-header.dark .${ns}-user-dropdown::before {
background: #1a1a1a;
border-color: #333333;
}

.${ns}-header.dark .${ns}-dropdown-item {
color: #ffffff;
}

.${ns}-header.dark .${ns}-dropdown-item:hover {
background-color: #2a2a2a;
}

.${ns}-header.dark .${ns}-search-input {
background: #2a2a2a;
border-color: #333333;
color: #ffffff;
}

.${ns}-header.dark .${ns}-search-input:focus {
background: #333333;
}
        `.trim();
    }

    // === HTML GENERATION ===
    generateHTML() {
        const ns = this.metadata.cssNamespace;
        const header = this.metadata.header;

        return `
<header class="${ns}-header${this.metadata.behavior.showShadow ? ' shadow' : ''}" id="${ns}-header">
<!-- Left Section -->
<div class="${ns}-left">
${header.left.sidebarToggle.enabled ? this.generateSidebarToggle() : ''}
${this.generateBranding()}
</div>

<!-- Center Section -->
${header.center.enabled ? this.generateCenter() : ''}

<!-- Right Section -->
<div class="${ns}-right">
${this.generateActions()}
${this.generateUser()}
</div>
</header>
        `.trim();
    }

    generateSidebarToggle() {
        const ns = this.metadata.cssNamespace;
        const toggle = this.metadata.header.left.sidebarToggle;

        return `
<button class="${ns}-sidebar-toggle"
    data-action="toggle-sidebar"
    title="Toggle Navigation">
<i class="fas ${toggle.icon}"></i>
</button>
        `;
    }

    generateBranding() {
        const ns = this.metadata.cssNamespace;
        const branding = this.metadata.header.left.branding;

        const content = `
<img src="${branding.logo.src}"
   alt="${branding.logo.alt}"
   class="${ns}-logo"
   onerror="this.style.display='none'">
<div class="${ns}-brand-text">
${branding.showTitle ? `<div class="${ns}-brand-title">${branding.title}</div>` : ''}
${branding.showSubtitle ? `<div class="${ns}-brand-subtitle">${branding.subtitle}</div>` : ''}
</div>
        `;

        if (branding.logo.url) {
            return `<a href="${branding.logo.url}" class="${ns}-branding">${content}</a>`;
        } else {
            return `<div class="${ns}-branding">${content}</div>`;
        }
    }

    generateCenter() {
        const ns = this.metadata.cssNamespace;
        const center = this.metadata.header.center;

        if (center.content.type === 'search') {
            return `
<div class="${ns}-center">
<div class="${ns}-search-container">
<i class="fas fa-search ${ns}-search-icon"></i>
<input type="text"
     class="${ns}-search-input"
     placeholder="${center.content.searchPlaceholder}"
     data-action="search">
</div>
</div>
            `;
        }

        return `<div class="${ns}-center"></div>`;
    }

    generateActions() {
        const ns = this.metadata.cssNamespace;
        const actions = this.metadata.header.right.actions || [];

        return actions.map(action => `
<button class="${ns}-action"
    data-action="${action.action}"
    title="${action.tooltip}">
<i class="fas ${action.icon}"></i>
${action.badge ? `
<span class="${ns}-action-badge ${action.badge.color}">
${action.badge.count > 99 ? '99+' : action.badge.count}
</span>
` : ''}
<div class="${ns}-tooltip">${action.tooltip}</div>
</button>
        `).join('');
    }

    generateUser() {
        const ns = this.metadata.cssNamespace;
        const user = this.metadata.header.right.user;

        return `
<div class="${ns}-user" data-action="toggle-user-dropdown">
<img src="${user.avatar.src}"
   alt="${user.avatar.alt}"
   class="${ns}-user-avatar"
   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
<div class="${ns}-user-avatar-fallback" style="display: none;">
${user.avatar.fallbackText}
</div>

<div class="${ns}-user-info">
<div class="${ns}-user-name">${user.name}</div>
<div class="${ns}-user-role">${user.role}</div>
</div>

<i class="fas fa-chevron-down ${ns}-user-dropdown-icon"></i>

${user.dropdown.enabled ? this.generateUserDropdown() : ''}
</div>
        `;
    }

    generateUserDropdown() {
        const ns = this.metadata.cssNamespace;
        const items = this.metadata.header.right.user.dropdown.items;

        return `
<div class="${ns}-user-dropdown" id="${ns}-user-dropdown">
${items.map(item => {
            if (item.type === 'separator') {
                return `<div class="${ns}-dropdown-separator"></div>`;
            }

            const itemClass = `${ns}-dropdown-item ${item.id === 'logout' ? 'logout' : ''}`;

            if (item.url) {
                return `
    <a href="${item.url}" class="${itemClass}" data-action="${item.action}">
      <i class="fas ${item.icon}"></i>
      ${item.label}
    </a>
                `;
            } else {
                return `
    <button class="${itemClass}" data-action="${item.action}">
      <i class="fas ${item.icon}"></i>
      ${item.label}
    </button>
                `;
            }
        }).join('')}
</div>
        `;
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
        const ns = this.metadata.cssNamespace;
        const header = this.container.querySelector(`.${ns}-header`);
        if (!header) return;

        // Apply sticky behavior
        if (this.metadata.behavior.sticky) {
            header.classList.add('sticky');
        }

        // Setup scroll behavior
        if (this.metadata.behavior.hideOnScroll) {
            this.addEventListenerWithCleanup(window, 'scroll', this.handleScroll.bind(this));
        }
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
        }
    }

    handleSearchInput(e) {
        this.globalSearch(e.target.value);
    }

    handleOutsideClick(e) {
        const ns = this.metadata.cssNamespace;
        if (!e.target.closest(`.${ns}-user`)) {
            this.closeUserDropdown();
        }
    }

    handleScroll() {
        if (!this.metadata.behavior.hideOnScroll) return;

        const ns = this.metadata.cssNamespace;
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
        const toggle = this.metadata.header.left.sidebarToggle;

        if (toggle.targetNamespace) {
            // Try to use the target namespace
            const namespaceparts = toggle.targetNamespace.split('.');
            let obj = window;

            for (const part of namespaceparts) {
                if (obj && obj[part]) {
                    obj = obj[part];
                } else {
                    obj = null;
                    break;
                }
            }

            if (obj && typeof obj.toggle === 'function') {
                obj.toggle();
                return;
            }
        }

        // Fallback: toggle sidebar class directly
        const sidebar = document.getElementById(toggle.targetSidebar);
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        } else {
            console.log('Sidebar toggle - target not found, using console log');
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
        const ns = this.metadata.cssNamespace;
        const dropdown = this.container.querySelector(`#${ns}-user-dropdown`);
        const user = this.container.querySelector(`.${ns}-user`);

        if (dropdown && user) {
            dropdown.classList.add('show');
            user.classList.add('open');
            this.userDropdownOpen = true;
        }
    }

    closeUserDropdown() {
        const ns = this.metadata.cssNamespace;
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
    }

    // Action handlers
    showNotifications() {
        console.log('Show notifications triggered');
        alert('Notifications panel would open here');
    }

    showMessages() {
        console.log('Show messages triggered');
        alert('Messages panel would open here');
    }

    showQuickSettings() {
        console.log('Show quick settings triggered');
        alert('Quick settings panel would open here');
    }

    // User dropdown actions
    showProfile() {
        console.log('Show profile triggered');
        this.closeUserDropdown();
        alert('Profile page would open here');
    }

    showAccountSettings() {
        console.log('Show account settings triggered');
        this.closeUserDropdown();
        alert('Account settings would open here');
    }

    showBilling() {
        console.log('Show billing triggered');
        this.closeUserDropdown();
        alert('Billing page would open here');
    }

    showHelp() {
        console.log('Show help triggered');
        this.closeUserDropdown();
        alert('Help & support would open here');
    }

    logout() {
        console.log('Logout triggered');
        this.closeUserDropdown();

        if (confirm('Are you sure you want to sign out?')) {
            alert('Logout functionality would be implemented here');
        }
    }

    // Theme switching
    setTheme(theme) {
        const ns = this.metadata.cssNamespace;
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
        const ns = this.metadata.cssNamespace;
        const nameEl = this.container.querySelector(`.${ns}-user-name`);
        const roleEl = this.container.querySelector(`.${ns}-user-role`);
        const avatarEl = this.container.querySelector(`.${ns}-user-avatar`);

        if (nameEl && userInfo.name) nameEl.textContent = userInfo.name;
        if (roleEl && userInfo.role) roleEl.textContent = userInfo.role;
        if (avatarEl && userInfo.avatar) avatarEl.src = userInfo.avatar;
    }

    // Update action badge
    updateActionBadge(actionId, count) {
        const ns = this.metadata.cssNamespace;
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
        const ns = this.metadata.cssNamespace;
        const header = this.container.querySelector(`.${ns}-header`);
        if (header) {
            header.classList.remove('hidden');
        }
    }

    hide() {
        const ns = this.metadata.cssNamespace;
        const header = this.container.querySelector(`.${ns}-header`);
        if (header) {
            header.classList.add('hidden');
        }
    }

    // Get current state
    getState() {
        return {
            userDropdownOpen: this.userDropdownOpen,
            isScrolling: this.isScrolling,
            lastScrollTop: this.lastScrollTop
        };
    }
}

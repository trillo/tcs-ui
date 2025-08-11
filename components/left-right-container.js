/**
 * LeftRightContainer Component - Extends BaseComponent
 * Provides a responsive 2-column layout for hosting other components side by side
 */

class LeftRightContainer extends BaseComponent {
    static cssNamespace = 'sidebar-container-k9m3';
    static cssFile = ''; // Can be set to external CSS file path

    constructor(container, options = {}) {
        // Call parent with merged options
        super(container, options);

        // Container-specific state
        this.leftComponent = null;
        this.rightComponent = null;
        this.leftContainer = null;
        this.rightContainer = null;
    }

    /**
     * Override needsDataManager since LeftRightContainer doesn't need data management
     */
    needsDataManager() {
        return false;
    }

    /**
     * Generate sidebar container layout HTML
     */
    generateHTML() {
        const { 
            leftWidth, 
            rightWidth, 
            gap, 
            breakpoint,
            leftPlaceholder,
            rightPlaceholder,
            showPlaceholders
        } = this.options.ui;

        return `
            <div class="${LeftRightContainer.cssNamespace}">
                <div class="${LeftRightContainer.cssNamespace}__wrapper" 
                     style="--left-width: ${leftWidth}; --right-width: ${rightWidth}; --gap: ${gap}; --breakpoint: ${breakpoint};">
                    
                    <!-- Left Container -->
                    <div class="${LeftRightContainer.cssNamespace}__left" 
                         data-container-id="left">
                        ${showPlaceholders ? `
                            <div class="${LeftRightContainer.cssNamespace}__placeholder">
                                <div class="${LeftRightContainer.cssNamespace}__placeholder-content">
                                    <div class="${LeftRightContainer.cssNamespace}__placeholder-icon">
                                        <i class="fas fa-cube"></i>
                                    </div>
                                    <h3 class="${LeftRightContainer.cssNamespace}__placeholder-title">Left Component</h3>
                                    <p class="${LeftRightContainer.cssNamespace}__placeholder-text">${leftPlaceholder}</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Right Container -->
                    <div class="${LeftRightContainer.cssNamespace}__right" 
                         data-container-id="right">
                        ${showPlaceholders ? `
                            <div class="${LeftRightContainer.cssNamespace}__placeholder">
                                <div class="${LeftRightContainer.cssNamespace}__placeholder-content">
                                    <div class="${LeftRightContainer.cssNamespace}__placeholder-icon">
                                        <i class="fas fa-cogs"></i>
                                    </div>
                                    <h3 class="${LeftRightContainer.cssNamespace}__placeholder-title">Right Component</h3>
                                    <p class="${LeftRightContainer.cssNamespace}__placeholder-text">${rightPlaceholder}</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * LeftRightContainer-specific CSS
     */
    getInlineCSS() {
        return `
            ${super.getInlineCSS()}

            /* LeftRightContainer Component Styles */
            .${LeftRightContainer.cssNamespace} {
                width: 100%;
                min-height: 100vh;
                background: var(--color-background);
                padding: var(--spacing-lg);
            }

            .${LeftRightContainer.cssNamespace}__wrapper {
                display: grid;
                grid-template-columns: var(--left-width) var(--right-width);
                gap: var(--gap);
                max-width: 1400px;
                margin: 0 auto;
                min-height: calc(100vh - calc(var(--spacing-lg) * 2));
                align-items: start;
            }

            /* Individual Containers */
            .${LeftRightContainer.cssNamespace}__left,
            .${LeftRightContainer.cssNamespace}__right {
                background: var(--color-surface);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-sm);
                min-height: 400px;
                transition: all var(--transition-normal);
                overflow: hidden;
                position: relative;
            }

            .${LeftRightContainer.cssNamespace}__left:hover,
            .${LeftRightContainer.cssNamespace}__right:hover {
                box-shadow: var(--shadow-md);
                transform: translateY(-2px);
            }

            /* Placeholder Styles */
            .${LeftRightContainer.cssNamespace}__placeholder {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                min-height: 400px;
                padding: var(--spacing-xl);
                background: linear-gradient(135deg, 
                    rgba(25, 118, 210, 0.05) 0%, 
                    rgba(25, 118, 210, 0.1) 100%);
                border: 2px dashed rgba(25, 118, 210, 0.2);
                border-radius: var(--radius-lg);
                transition: all var(--transition-normal);
            }

            .${LeftRightContainer.cssNamespace}__placeholder:hover {
                background: linear-gradient(135deg, 
                    rgba(25, 118, 210, 0.08) 0%, 
                    rgba(25, 118, 210, 0.15) 100%);
                border-color: rgba(25, 118, 210, 0.3);
            }

            .${LeftRightContainer.cssNamespace}__placeholder-content {
                text-align: center;
                max-width: 300px;
            }

            .${LeftRightContainer.cssNamespace}__placeholder-icon {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
                border-radius: var(--radius-full);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto var(--spacing-lg) auto;
                color: white;
                font-size: 32px;
                box-shadow: var(--shadow-md);
                animation: float 3s ease-in-out infinite;
            }

            .${LeftRightContainer.cssNamespace}__placeholder-title {
                font-size: var(--font-size-xl);
                font-weight: var(--font-weight-semibold);
                color: var(--color-text-primary);
                margin: 0 0 var(--spacing-md) 0;
            }

            .${LeftRightContainer.cssNamespace}__placeholder-text {
                font-size: var(--font-size-md);
                color: var(--color-text-secondary);
                line-height: var(--line-height-relaxed);
                margin: 0;
            }

            /* Float Animation */
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
            }

            /* Responsive Design */
            @media (max-width: 1024px) {
                .${LeftRightContainer.cssNamespace}__wrapper {
                    grid-template-columns: 1fr 1fr;
                    gap: var(--spacing-md);
                }
            }

            @media (max-width: 768px) {
                .${LeftRightContainer.cssNamespace} {
                    padding: var(--spacing-md);
                }

                .${LeftRightContainer.cssNamespace}__wrapper {
                    grid-template-columns: 1fr;
                    gap: var(--spacing-md);
                }

                .${LeftRightContainer.cssNamespace}__left,
                .${LeftRightContainer.cssNamespace}__right {
                    min-height: 300px;
                }

                .${LeftRightContainer.cssNamespace}__placeholder {
                    min-height: 300px;
                    padding: var(--spacing-lg);
                }

                .${LeftRightContainer.cssNamespace}__placeholder-icon {
                    width: 60px;
                    height: 60px;
                    font-size: 24px;
                }

                .${LeftRightContainer.cssNamespace}__placeholder-title {
                    font-size: var(--font-size-lg);
                }

                .${LeftRightContainer.cssNamespace}__placeholder-text {
                    font-size: var(--font-size-sm);
                }
            }

            @media (max-width: 480px) {
                .${LeftRightContainer.cssNamespace} {
                    padding: var(--spacing-sm);
                }

                .${LeftRightContainer.cssNamespace}__wrapper {
                    gap: var(--spacing-sm);
                }

                .${LeftRightContainer.cssNamespace}__placeholder {
                    padding: var(--spacing-md);
                }
            }

            /* Custom Layout Options */
            .${LeftRightContainer.cssNamespace}--equal {
                --left-width: 1fr;
                --right-width: 1fr;
            }

            .${LeftRightContainer.cssNamespace}--left-heavy {
                --left-width: 2fr;
                --right-width: 1fr;
            }

            .${LeftRightContainer.cssNamespace}--right-heavy {
                --left-width: 1fr;
                --right-width: 2fr;
            }

            .${LeftRightContainer.cssNamespace}--sidebar-left {
                --left-width: 300px;
                --right-width: 1fr;
            }

            .${LeftRightContainer.cssNamespace}--sidebar-right {
                --left-width: 1fr;
                --right-width: 300px;
            }

            /* When components are loaded, hide placeholders */
            .${LeftRightContainer.cssNamespace}__left:not(:empty) .${LeftRightContainer.cssNamespace}__placeholder,
            .${LeftRightContainer.cssNamespace}__right:not(:empty) .${LeftRightContainer.cssNamespace}__placeholder {
                display: none;
            }
        `;
    }

    /**
     * Add event listeners (minimal for layout component)
     */
    addEventListeners() {
        // Store container references for easy access
        this.leftContainer = this.container.querySelector('[data-container-id="left"]');
        this.rightContainer = this.container.querySelector('[data-container-id="right"]');

        // Add resize listener for responsive behavior
        const resizeListener = () => this.handleResize();
        window.addEventListener('resize', resizeListener);
        this.eventListeners.push({ element: window, event: 'resize', listener: resizeListener });

        // Optional: Add click listeners to placeholders for debugging
        if (this.options.ui.showPlaceholders) {
            this.addPlaceholderListeners();
        }
    }

    /**
     * Add placeholder click listeners for preview/debug
     */
    addPlaceholderListeners() {
        const leftPlaceholder = this.leftContainer?.querySelector(`.${LeftRightContainer.cssNamespace}__placeholder`);
        const rightPlaceholder = this.rightContainer?.querySelector(`.${LeftRightContainer.cssNamespace}__placeholder`);

        if (leftPlaceholder) {
            const clickListener = () => this.handlePlaceholderClick('left');
            leftPlaceholder.addEventListener('click', clickListener);
            this.eventListeners.push({ element: leftPlaceholder, event: 'click', listener: clickListener });
        }

        if (rightPlaceholder) {
            const clickListener = () => this.handlePlaceholderClick('right');
            rightPlaceholder.addEventListener('click', clickListener);
            this.eventListeners.push({ element: rightPlaceholder, event: 'click', listener: clickListener });
        }
    }

    /**
     * Handle placeholder clicks (for preview mode)
     */
    handlePlaceholderClick(side) {
        if (this.options.events.onPlaceholderClick) {
            this.options.events.onPlaceholderClick(side);
        } else {
            console.log(`${side} container clicked - ready for component`);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Optional: Trigger layout recalculation or notify child components
        if (this.options.events.onResize) {
            this.options.events.onResize();
        }
    }

    /**
     * Get container element by side
     */
    getContainer(side) {
        if (side === 'left') return this.leftContainer;
        if (side === 'right') return this.rightContainer;
        return null;
    }

    /**
     * Add component to specific side
     */
    addComponent(side, component) {
        const container = this.getContainer(side);
        if (!container) {
            this.log(`Invalid container side: ${side}`);
            return false;
        }

        // Clear existing content (including placeholders)
        container.innerHTML = '';

        // Store component reference
        if (side === 'left') {
            this.leftComponent = component;
        } else {
            this.rightComponent = component;
        }

        this.log(`Component added to ${side} container`);
        return true;
    }

    /**
     * Remove component from specific side
     */
    removeComponent(side) {
        const container = this.getContainer(side);
        if (!container) {
            this.log(`Invalid container side: ${side}`);
            return false;
        }

        // Destroy existing component if it exists
        const existingComponent = side === 'left' ? this.leftComponent : this.rightComponent;
        if (existingComponent && existingComponent.destroy) {
            existingComponent.destroy();
        }

        // Clear container
        container.innerHTML = '';

        // Show placeholder if enabled
        if (this.options.ui.showPlaceholders) {
            this.renderPlaceholder(container, side);
        }

        // Clear component reference
        if (side === 'left') {
            this.leftComponent = null;
        } else {
            this.rightComponent = null;
        }

        this.log(`Component removed from ${side} container`);
        return true;
    }

    /**
     * Render placeholder for specific container
     */
    renderPlaceholder(container, side) {
        const placeholder = side === 'left' ? this.options.ui.leftPlaceholder : this.options.ui.rightPlaceholder;
        const icon = side === 'left' ? 'fas fa-cube' : 'fas fa-cogs';

        container.innerHTML = `
            <div class="${LeftRightContainer.cssNamespace}__placeholder">
                <div class="${LeftRightContainer.cssNamespace}__placeholder-content">
                    <div class="${LeftRightContainer.cssNamespace}__placeholder-icon">
                        <i class="${icon}"></i>
                    </div>
                    <h3 class="${LeftRightContainer.cssNamespace}__placeholder-title">${side === 'left' ? 'Left' : 'Right'} Component</h3>
                    <p class="${LeftRightContainer.cssNamespace}__placeholder-text">${placeholder}</p>
                </div>
            </div>
        `;

        // Re-add placeholder listeners
        this.addPlaceholderListeners();
    }

    /**
     * Set layout mode
     */
    setLayoutMode(mode) {
        const wrapper = this.container.querySelector(`.${LeftRightContainer.cssNamespace}__wrapper`);
        if (wrapper) {
            // Remove existing layout classes
            wrapper.classList.remove(
                `${LeftRightContainer.cssNamespace}--equal`,
                `${LeftRightContainer.cssNamespace}--left-heavy`,
                `${LeftRightContainer.cssNamespace}--right-heavy`,
                `${LeftRightContainer.cssNamespace}--sidebar-left`,
                `${LeftRightContainer.cssNamespace}--sidebar-right`
            );

            // Add new layout class
            if (mode !== 'custom') {
                wrapper.classList.add(`${LeftRightContainer.cssNamespace}--${mode}`);
            }

            this.log(`Layout mode set to: ${mode}`);
        }
    }

    /**
     * Initialize component after render
     */
    initialize() {
        // Apply initial layout mode if specified
        if (this.options.ui.layoutMode && this.options.ui.layoutMode !== 'custom') {
            this.setLayoutMode(this.options.ui.layoutMode);
        }

        this.log('LeftRightContainer initialized');
    }

    /**
     * Override destroy to handle component cleanup
     */
    destroy() {
        // Destroy child components
        if (this.leftComponent && this.leftComponent.destroy) {
            this.leftComponent.destroy();
        }
        if (this.rightComponent && this.rightComponent.destroy) {
            this.rightComponent.destroy();
        }

        // Call parent destroy
        super.destroy();
    }

    /**
     * Get status including child components
     */
    getStatus() {
        const baseStatus = super.getStatus();
        return {
            ...baseStatus,
            leftComponent: !!this.leftComponent,
            rightComponent: !!this.rightComponent,
            layoutMode: this.options.ui.layoutMode
        };
    }

    /**
     * Get default options for normal mode
     */
    static getDefaultOptions() {
        return {
            ui: {
                leftWidth: '1fr',
                rightWidth: '1fr',
                gap: 'var(--spacing-lg)',
                breakpoint: '768px',
                layoutMode: 'equal', // 'equal', 'left-heavy', 'right-heavy', 'sidebar-left', 'sidebar-right', 'custom'
                showPlaceholders: false,
                leftPlaceholder: 'Add your component here',
                rightPlaceholder: 'Add your component here'
            }
        };
    }

    /**
     * Get default options for preview mode
     */
    static getPreviewOptions() {
        return {
            ui: {
                leftWidth: '1fr',
                rightWidth: '1fr',
                gap: 'var(--spacing-lg)',
                breakpoint: '768px',
                layoutMode: 'equal',
                showPlaceholders: true,
                leftPlaceholder: 'This container is ready to host a component on the left side. Components will automatically replace this placeholder.',
                rightPlaceholder: 'This container is ready to host a component on the right side. Perfect for forms, data displays, or any other component.'
            }
        };
    }
}

// ========================================
// EXPORT AND GLOBAL ASSIGNMENT
// ========================================

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeftRightContainer;
}

if (typeof window !== 'undefined') {
    window.LeftRightContainer = LeftRightContainer;
    console.log('✅ LeftRightContainer component (extends BaseComponent) loaded');
}
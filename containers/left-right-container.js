/**
 * LeftRightContainer Component - Extends BaseComponent
 * Provides a responsive 2-column layout for hosting other components side by side
 */

class LeftRightContainer extends BaseComponent {
    static cssNamespace = 'left-right-container';

    constructor(container, options = {}) {
        super(container, options);
        this.leftContainer = null;
        this.rightContainer = null;
    }

    async postInit() {
        this.leftContainer = this.container.querySelector('[data-container-id="left"]');
        this.rightContainer = this.container.querySelector('[data-container-id="right"]');
        setTimeout(() => {
            this.syncHeights();
        }, 100); // Small delay to ensure content is fully rendered
    }

    /**
     * Override needsDataManager since LeftRightContainer doesn't need data management
     */
    needsDataManager() {
        return false;
    }

    /**
     * Generate layout HTML
     */
    generateHTML() {
        const { showPlaceholders, leftPlaceholder, rightPlaceholder } = this.options.ui;

        return `
            <div class="${LeftRightContainer.cssNamespace}">
                <div class="${LeftRightContainer.cssNamespace}__wrapper">
                    <!-- Left Container -->
                    <div class="${LeftRightContainer.cssNamespace}__left" data-container-id="left">
                        ${showPlaceholders ? `
                            <div class="${LeftRightContainer.cssNamespace}__placeholder">
                                <div class="${LeftRightContainer.cssNamespace}__placeholder-content">
                                    <h3>Left Component</h3>
                                    <p>${leftPlaceholder}</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Right Container -->
                    <div class="${LeftRightContainer.cssNamespace}__right" data-container-id="right">
                        ${showPlaceholders ? `
                            <div class="${LeftRightContainer.cssNamespace}__placeholder">
                                <div class="${LeftRightContainer.cssNamespace}__placeholder-content">
                                    <h3>Right Component</h3>
                                    <p>${rightPlaceholder}</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Component CSS
     */
    getInlineCSS() {
        const { 
            leftWidth, 
            rightWidth, 
            gap, 
            padding,
            leftAlign,
            rightAlign,
            backgroundColor,
            leftBackgroundColor,
            rightBackgroundColor,
            breakpoint
        } = this.options.ui;

        return `
            ${super.getInlineCSS()}

            .${LeftRightContainer.cssNamespace} {
                width: 100%;
                background: ${backgroundColor};
            }

            .${LeftRightContainer.cssNamespace}__wrapper {
                display: flex;
                gap: ${gap};
                width: 100%;
                flex-wrap: nowrap;
            }

            .${LeftRightContainer.cssNamespace}__left {
                flex: 0 0 calc(${leftWidth} - ${gap}/2);
                padding: ${padding};
                background: ${leftBackgroundColor};
                display: flex;
                align-items: ${leftAlign === 'top' ? 'flex-start' : leftAlign === 'bottom' ? 'flex-end' : 'center'};
                justify-content: ${leftAlign === 'left' ? 'flex-start' : leftAlign === 'right' ? 'flex-end' : 'center'};
                min-height: 200px;
                box-sizing: border-box;
                height: 100vh;
            }

            .${LeftRightContainer.cssNamespace}__right {
                flex: 0 0 calc(${rightWidth} - ${gap}/2);
                padding: ${padding};
                background: ${rightBackgroundColor};
                display: flex;
                align-items: ${rightAlign === 'top' ? 'flex-start' : rightAlign === 'bottom' ? 'flex-end' : 'center'};
                justify-content: ${rightAlign === 'left' ? 'flex-start' : rightAlign === 'right' ? 'flex-end' : 'center'};
                min-height: 200px;
                box-sizing: border-box;
                height: 100vh;
            }

            .${LeftRightContainer.cssNamespace}__placeholder {
                width: 100%;
                text-align: center;
                color: #666;
                border: 2px dashed #ddd;
                border-radius: 8px;
                padding: 20px;
                background: rgba(0, 0, 0, 0.02);
            }

            .${LeftRightContainer.cssNamespace}__placeholder-content h3 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 18px;
            }

            .${LeftRightContainer.cssNamespace}__placeholder-content p {
                margin: 0;
                font-size: 14px;
                line-height: 1.4;
            }

            /* Responsive Design */
            @media (max-width: ${breakpoint}) {
                .${LeftRightContainer.cssNamespace}__wrapper {
                    flex-direction: column;
                }

                .${LeftRightContainer.cssNamespace}__left,
                .${LeftRightContainer.cssNamespace}__right {
                    flex: 1 1 100%;
                }
            }
        `;
    }

    /**
     * Sync heights of left and right containers to match the taller one
     */
    /**
     * Sync heights of left and right containers to match the taller one
     */
    syncHeights() {
        if (!this.leftContainer || !this.rightContainer) {
            this.log('Cannot sync heights - containers not found');
            return false;
        }
        
        // Get the first child of each container (the actual components)
        const leftChild = this.leftContainer.firstElementChild;
        const rightChild = this.rightContainer.firstElementChild;
        
        if (!leftChild || !rightChild) {
            this.log('Cannot sync heights - child components not found');
            return false;
        }
        
        // Reset heights to auto to get natural heights
        leftChild.style.height = 'auto';
        rightChild.style.height = 'auto';
        
        // Get actual heights
        const leftHeight = leftChild.offsetHeight;
        const rightHeight = rightChild.offsetHeight;
        
        // Set both to the maximum height
        const maxHeight = Math.max(leftHeight, rightHeight);
        leftChild.style.height = `${maxHeight}px`;
        rightChild.style.height = `${maxHeight}px`;
        
        this.log(`Child heights synced to ${maxHeight}px (left: ${leftHeight}px, right: ${rightHeight}px)`);
        return true;
    }

    /**
     * Reset container heights to auto (remove manual height setting)
     */
    resetHeights() {
        if (this.leftContainer) this.leftContainer.style.height = 'auto';
        if (this.rightContainer) this.rightContainer.style.height = 'auto';
        this.log('Heights reset to auto');
    }

    /**
     * Get default options
     */
    static getDefaultOptions() {
        return {
            ui: {
                leftWidth: '50%',
                rightWidth: '50%',
                gap: '20px',
                padding: '20px',
                leftAlign: 'right',
                rightAlign: 'left',
                backgroundColor: '#fafafa',
                leftBackgroundColor: '#f8f8f8',
                rightBackgroundColor: '#f8f8f8',
                breakpoint: '768px',
                showPlaceholders: false,
                leftPlaceholder: 'Left component will be placed here',
                rightPlaceholder: 'Right component will be placed here'
            }
        };
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeftRightContainer;
}

if (typeof window !== 'undefined') {
    window.LeftRightContainer = LeftRightContainer;
    console.log('✅ LeftRightContainer component loaded');
}

/* __START_OF_JSON_SPECIFICATION__
{
  "name": "LeftRightContainer",
  "type": "left-right-container",
  "options": {
    "ui": {
      "leftWidth": "50%",
      "rightWidth": "50%", 
      "gap": "20px",
      "padding": "20px",
      "leftAlign": "center",
      "rightAlign": "center",
      "backgroundColor": "#fafafa",
      "leftBackgroundColor": "#f8f8f8",
      "rightBackgroundColor": "#f8f8f8",
      "breakpoint": "768px",
      "showPlaceholders": false,
      "leftPlaceholder": "Left component will be placed here",
      "rightPlaceholder": "Right component will be placed here"
    }
  }
}
__END_OF_JSON_SPECIFICATION__ */
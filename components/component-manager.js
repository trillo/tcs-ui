/**
 * ComponentManager - Manages component lifecycle, mounting, unmounting, and orchestration
 * Handles component registration, communication, and state management
 */

class ComponentManager {
    constructor() {
        this.mountedComponents = new Map();
        this.componentRegistry = new Map();
    }

    /**
     * Register a component class for later use
     */
    registerComponent(name, ComponentClass, defaultOptions = {}) {
        this.componentRegistry.set(name, {
            ComponentClass,
            defaultOptions
        });

        console.log(`[ComponentManager] Registered component: ${name}`);
        return this;
    }

    /**
     * Mount a component by class
     */
    mountComponent(ComponentClass, containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with ID '${containerId}' not found`);
        }

        try {
            const component = new ComponentClass(container, options);

            this.mountedComponents.set(containerId, {
                component,
                ComponentClass,
                options,
                containerId,
                mountedAt: new Date().toISOString()
            });

            console.log(`[ComponentManager] Mounted ${ComponentClass.name} in #${containerId}`);
            return component;

        } catch (error) {
            console.error(`[ComponentManager] Failed to mount ${ComponentClass.name}:`, error);
            throw error;
        }
    }

    /**
     * Mount a component by registered name
     */
    mountRegisteredComponent(componentName, containerId, options = {}) {
        const registration = this.componentRegistry.get(componentName);
        if (!registration) {
            throw new Error(`Component '${componentName}' not registered`);
        }

        const mergedOptions = { ...registration.defaultOptions, ...options };
        return this.mountComponent(registration.ComponentClass, containerId, mergedOptions);
    }

    /**
     * Unmount a component
     */
    unmountComponent(containerId) {
        const mounted = this.mountedComponents.get(containerId);
        if (!mounted) {
            console.warn(`[ComponentManager] No component found in container #${containerId}`);
            return false;
        }

        try {
            // Call destroy method if available
            if (mounted.component.destroy && typeof mounted.component.destroy === 'function') {
                mounted.component.destroy();
            }

            // Clear container
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
            }

            this.mountedComponents.delete(containerId);
            console.log(`[ComponentManager] Unmounted component from #${containerId}`);
            return true;

        } catch (error) {
            console.error(`[ComponentManager] Error unmounting component from #${containerId}:`, error);
            return false;
        }
    }

    /**
     * Remount a component (unmount then mount again)
     */
    remountComponent(containerId) {
        const mounted = this.mountedComponents.get(containerId);
        if (!mounted) {
            console.warn(`[ComponentManager] No component found to remount in #${containerId}`);
            return null;
        }

        const { ComponentClass, options } = mounted;
        this.unmountComponent(containerId);
        return this.mountComponent(ComponentClass, containerId, options);
    }

    /**
     * Get a mounted component
     */
    getComponent(containerId) {
        const mounted = this.mountedComponents.get(containerId);
        return mounted ? mounted.component : null;
    }

    /**
     * Check if a component is mounted
     */
    isComponentMounted(containerId) {
        return this.mountedComponents.has(containerId);
    }

    /**
     * Update component options
     */
    updateComponentOptions(containerId, newOptions) {
        const mounted = this.mountedComponents.get(containerId);
        if (!mounted) {
            console.warn(`[ComponentManager] No component found in #${containerId}`);
            return false;
        }

        // Update stored options
        mounted.options = { ...mounted.options, ...newOptions };

        // If component has an update method, call it
        if (mounted.component.update && typeof mounted.component.update === 'function') {
            mounted.component.update(newOptions);
        }

        console.log(`[ComponentManager] Updated options for component in #${containerId}`);
        return true;
    }

    /**
     * Broadcast message to all components
     */
    broadcastToComponents(message, data = {}) {
        let notifiedCount = 0;

        this.mountedComponents.forEach(({ component }, containerId) => {
            try {
                // Check if component has a message handler
                if (component.handleMessage && typeof component.handleMessage === 'function') {
                    component.handleMessage(message, data);
                    notifiedCount++;
                }

                // Check for specific message handler
                const handlerName = `on${message.charAt(0).toUpperCase() + message.slice(1)}`;
                if (component[handlerName] && typeof component[handlerName] === 'function') {
                    component[handlerName](data);
                    notifiedCount++;
                }
            } catch (error) {
                console.error(`[ComponentManager] Error broadcasting to #${containerId}:`, error);
            }
        });

        console.log(`[ComponentManager] Broadcasted '${message}' to ${notifiedCount} components`);
        return notifiedCount;
    }

    /**
     * Send message to specific component
     */
    sendToComponent(containerId, message, data = {}) {
        const component = this.getComponent(containerId);
        if (!component) {
            console.warn(`[ComponentManager] No component found in #${containerId}`);
            return false;
        }

        try {
            // Check if component has a message handler
            if (component.handleMessage && typeof component.handleMessage === 'function') {
                component.handleMessage(message, data);
                return true;
            }

            // Check for specific message handler
            const handlerName = `on${message.charAt(0).toUpperCase() + message.slice(1)}`;
            if (component[handlerName] && typeof component[handlerName] === 'function') {
                component[handlerName](data);
                return true;
            }

            console.warn(`[ComponentManager] Component in #${containerId} has no handler for '${message}'`);
            return false;

        } catch (error) {
            console.error(`[ComponentManager] Error sending message to #${containerId}:`, error);
            return false;
        }
    }

    /**
     * Find components by class name
     */
    findComponentsByClass(ComponentClass) {
        const found = [];

        this.mountedComponents.forEach((mounted, containerId) => {
            if (mounted.ComponentClass === ComponentClass) {
                found.push({
                    containerId,
                    component: mounted.component,
                    ...mounted
                });
            }
        });

        return found;
    }

    /**
     * Find components by a predicate function
     */
    findComponents(predicate) {
        const found = [];

        this.mountedComponents.forEach((mounted, containerId) => {
            if (predicate(mounted.component, containerId, mounted)) {
                found.push({
                    containerId,
                    component: mounted.component,
                    ...mounted
                });
            }
        });

        return found;
    }

    /**
     * Get all mounted components
     */
    getMountedComponents() {
        return Array.from(this.mountedComponents.entries()).map(([containerId, mounted]) => ({
            containerId,
            componentName: mounted.ComponentClass.name,
            component: mounted.component,
            mountedAt: mounted.mountedAt,
            options: mounted.options
        }));
    }

    /**
     * Get registered components
     */
    getRegisteredComponents() {
        return Array.from(this.componentRegistry.entries()).map(([name, registration]) => ({
            name,
            componentClass: registration.ComponentClass.name,
            defaultOptions: registration.defaultOptions
        }));
    }

    /**
     * Unmount all components
     */
    unmountAllComponents() {
        const containerIds = Array.from(this.mountedComponents.keys());
        let unmountedCount = 0;

        containerIds.forEach(containerId => {
            if (this.unmountComponent(containerId)) {
                unmountedCount++;
            }
        });

        console.log(`[ComponentManager] Unmounted ${unmountedCount} components`);
        return unmountedCount;
    }

    /**
     * Refresh all components
     */
    refreshAllComponents() {
        let refreshedCount = 0;

        this.mountedComponents.forEach(({ component }, containerId) => {
            try {
                if (component.refresh && typeof component.refresh === 'function') {
                    component.refresh();
                    refreshedCount++;
                } else if (component.render && typeof component.render === 'function') {
                    component.render();
                    refreshedCount++;
                }
            } catch (error) {
                console.error(`[ComponentManager] Error refreshing component in #${containerId}:`, error);
            }
        });

        console.log(`[ComponentManager] Refreshed ${refreshedCount} components`);
        return refreshedCount;
    }

    /**
     * Get component manager statistics
     */
    getStats() {
        return {
            mountedComponents: this.mountedComponents.size,
            registeredComponents: this.componentRegistry.size,
            componentsByClass: this.getComponentsByClass()
        };
    }

    /**
     * Get components grouped by class
     */
    getComponentsByClass() {
        const byClass = {};

        this.mountedComponents.forEach(({ ComponentClass }) => {
            const className = ComponentClass.name;
            byClass[className] = (byClass[className] || 0) + 1;
        });

        return byClass;
    }

    /**
     * Cleanup and destroy component manager
     */
    destroy() {
        // Unmount all components
        this.unmountAllComponents();

        // Clear registrations
        this.componentRegistry.clear();

        console.log('[ComponentManager] Destroyed');
    }
}

// ========================================
// EXPORT AND GLOBAL ASSIGNMENT
// ========================================

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentManager;
}

if (typeof window !== 'undefined') {
    window.ComponentManager = ComponentManager;
    console.log('✅ ComponentManager loaded');
}

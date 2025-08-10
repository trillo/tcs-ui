/**
 * StaticDataManager - Handles static/predetermined data
 * Used when data is already available and doesn't need to be fetched
 */

class StaticDataManager {
    constructor(data = null) {
        this.data = data;
        this.loadCount = 0;
    }

    /**
     * Load the static data
     * Always resolves immediately with the provided data
     */
    async load() {
        this.loadCount++;

        // Simulate very small delay for consistency with other managers
        await new Promise(resolve => setTimeout(resolve, 1));

        return this.data;
    }

    /**
     * Update the static data
     */
    setData(newData) {
        this.data = newData;
        return this;
    }

    /**
     * Get current data without loading
     */
    getData() {
        return this.data;
    }

    /**
     * Check if data is available
     */
    hasData() {
        return this.data !== null && this.data !== undefined;
    }

    /**
     * Get manager statistics
     */
    getStats() {
        return {
            type: 'static',
            loadCount: this.loadCount,
            hasData: this.hasData(),
            dataSize: this.data ? JSON.stringify(this.data).length : 0
        };
    }

    /**
     * Clone the data (useful for immutable operations)
     */
    clone() {
        return new StaticDataManager(
            this.data ? JSON.parse(JSON.stringify(this.data)) : null
        );
    }

    /**
     * Transform data using a function
     */
    transform(transformFn) {
        if (typeof transformFn !== 'function') {
            throw new Error('Transform function must be a function');
        }

        this.data = transformFn(this.data);
        return this;
    }

    /**
     * Filter array data
     */
    filter(filterFn) {
        if (Array.isArray(this.data)) {
            this.data = this.data.filter(filterFn);
        } else {
            throw new Error('Filter can only be used with array data');
        }
        return this;
    }

    /**
     * Map array data
     */
    map(mapFn) {
        if (Array.isArray(this.data)) {
            this.data = this.data.map(mapFn);
        } else {
            throw new Error('Map can only be used with array data');
        }
        return this;
    }

    /**
     * Sort array data
     */
    sort(compareFn) {
        if (Array.isArray(this.data)) {
            this.data = this.data.sort(compareFn);
        } else {
            throw new Error('Sort can only be used with array data');
        }
        return this;
    }

    /**
     * Get array length or object keys count
     */
    size() {
        if (Array.isArray(this.data)) {
            return this.data.length;
        } else if (this.data && typeof this.data === 'object') {
            return Object.keys(this.data).length;
        } else {
            return 0;
        }
    }

    /**
     * Check if data is empty
     */
    isEmpty() {
        return this.size() === 0;
    }

    /**
     * Reset data to null
     */
    clear() {
        this.data = null;
        return this;
    }

    /**
     * Validate data against a schema (simple validation)
     */
    validate(schema) {
        if (!schema) return true;

        try {
            if (typeof schema === 'function') {
                return schema(this.data);
            }

            if (schema.type) {
                switch (schema.type) {
                    case 'array':
                        return Array.isArray(this.data);
                    case 'object':
                        return this.data && typeof this.data === 'object' && !Array.isArray(this.data);
                    case 'string':
                        return typeof this.data === 'string';
                    case 'number':
                        return typeof this.data === 'number';
                    case 'boolean':
                        return typeof this.data === 'boolean';
                    default:
                        return true;
                }
            }

            return true;

        } catch (error) {
            return false;
        }
    }

    /**
     * Serialize data to JSON string
     */
    toJSON() {
        return JSON.stringify(this.data);
    }

    /**
     * Create StaticDataManager from JSON string
     */
    static fromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            return new StaticDataManager(data);
        } catch (error) {
            throw new Error(`Invalid JSON: ${error.message}`);
        }
    }

    /**
     * Create StaticDataManager with array data
     */
    static fromArray(arrayData) {
        if (!Array.isArray(arrayData)) {
            throw new Error('Data must be an array');
        }
        return new StaticDataManager(arrayData);
    }

    /**
     * Create StaticDataManager with object data
     */
    static fromObject(objectData) {
        if (!objectData || typeof objectData !== 'object' || Array.isArray(objectData)) {
            throw new Error('Data must be an object');
        }
        return new StaticDataManager(objectData);
    }

    /**
     * Merge with another StaticDataManager
     */
    merge(otherManager) {
        if (!(otherManager instanceof StaticDataManager)) {
            throw new Error('Can only merge with another StaticDataManager');
        }

        const otherData = otherManager.getData();

        if (Array.isArray(this.data) && Array.isArray(otherData)) {
            this.data = [...this.data, ...otherData];
        } else if (this.data && typeof this.data === 'object' &&
                   otherData && typeof otherData === 'object') {
            this.data = { ...this.data, ...otherData };
        } else {
            // If types don't match, replace with other data
            this.data = otherData;
        }

        return this;
    }

    /**
     * Get a specific property from object data
     */
    get(key) {
        if (this.data && typeof this.data === 'object') {
            return this.data[key];
        }
        return undefined;
    }

    /**
     * Set a specific property in object data
     */
    set(key, value) {
        if (!this.data || typeof this.data !== 'object' || Array.isArray(this.data)) {
            this.data = {};
        }
        this.data[key] = value;
        return this;
    }

    /**
     * Remove a property from object data
     */
    remove(key) {
        if (this.data && typeof this.data === 'object' && !Array.isArray(this.data)) {
            delete this.data[key];
        }
        return this;
    }

    /**
     * Check if object data has a specific key
     */
    has(key) {
        return this.data && typeof this.data === 'object' && key in this.data;
    }

    /**
     * Get all keys from object data
     */
    keys() {
        if (this.data && typeof this.data === 'object' && !Array.isArray(this.data)) {
            return Object.keys(this.data);
        }
        return [];
    }

    /**
     * Get all values from object data
     */
    values() {
        if (this.data && typeof this.data === 'object' && !Array.isArray(this.data)) {
            return Object.values(this.data);
        }
        return [];
    }

    /**
     * Cleanup - nothing to cleanup for static data
     */
    destroy() {
        this.data = null;
        this.loadCount = 0;
    }

    /**
     * String representation
     */
    toString() {
        return `StaticDataManager(${this.data ? typeof this.data : 'null'}, loads: ${this.loadCount})`;
    }
}

// ========================================
// EXPORT AND GLOBAL ASSIGNMENT
// ========================================

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StaticDataManager;
}

if (typeof window !== 'undefined') {
    window.StaticDataManager = StaticDataManager;
    console.log('✅ StaticDataManager loaded');
}

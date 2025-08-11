/**
 * Utils - Shared utility functions for TrilloAI Framework
 * Provides common utilities like deep merge, object manipulation, validation, etc.
 */

class Utils {
    /**
     * Deep merge two or more objects
     * @param {object} target - Target object
     * @param {...object} sources - Source objects to merge
     * @returns {object} - Merged object
     */
    static deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (Utils.isObject(target) && Utils.isObject(source)) {
            for (const key in source) {
                if (Utils.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    Utils.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return Utils.deepMerge(target, ...sources);
    }

    /**
     * Check if value is an object (not array or null)
     * @param {*} item - Value to check
     * @returns {boolean} - True if object
     */
    static isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Clone an object deeply
     * @param {*} obj - Object to clone
     * @returns {*} - Cloned object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = Utils.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
        return obj;
    }

    /**
     * Get nested object property safely
     * @param {object} obj - Object to traverse
     * @param {string} path - Dot notation path (e.g., 'user.profile.name')
     * @param {*} defaultValue - Default value if path not found
     * @returns {*} - Value at path or default
     */
    static getNestedValue(obj, path, defaultValue = undefined) {
        if (!obj || !path) return defaultValue;

        const keys = path.split('.');
        let result = obj;

        for (const key of keys) {
            if (result === null || result === undefined || !(key in result)) {
                return defaultValue;
            }
            result = result[key];
        }

        return result;
    }

    /**
     * Set nested object property safely
     * @param {object} obj - Object to modify
     * @param {string} path - Dot notation path
     * @param {*} value - Value to set
     * @returns {object} - Modified object
     */
    static setNestedValue(obj, path, value) {
        if (!obj || !path) return obj;

        const keys = path.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || !Utils.isObject(current[key])) {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
        return obj;
    }

    /**
     * Generate unique ID
     * @param {string} prefix - Optional prefix
     * @returns {string} - Unique ID
     */
    static generateId(prefix = 'id') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2);
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Debounce function execution
     * @param {function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Execute immediately on first call
     * @returns {function} - Debounced function
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    /**
     * Throttle function execution
     * @param {function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {function} - Throttled function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Format bytes to human readable string
     * @param {number} bytes - Bytes to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} - Formatted string
     */
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Format date to string
     * @param {Date|string|number} date - Date to format
     * @param {object} options - Formatting options
     * @returns {string} - Formatted date string
     */
    static formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            ...options
        };

        const dateObj = new Date(date);
        return dateObj.toLocaleDateString(undefined, defaultOptions);
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid email
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {boolean} - True if valid URL
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Sanitize HTML string
     * @param {string} html - HTML to sanitize
     * @returns {string} - Sanitized HTML
     */
    static sanitizeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Convert string to camelCase
     * @param {string} str - String to convert
     * @returns {string} - CamelCase string
     */
    static toCamelCase(str) {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
    }

    /**
     * Convert string to kebab-case
     * @param {string} str - String to convert
     * @returns {string} - Kebab-case string
     */
    static toKebabCase(str) {
        return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * Capitalize first letter of string
     * @param {string} str - String to capitalize
     * @returns {string} - Capitalized string
     */
    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Convert object to query string
     * @param {object} obj - Object to convert
     * @param {string} prefix - Optional prefix
     * @returns {string} - Query string
     */
    static objectToQueryString(obj, prefix = '') {
        const str = [];

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const k = prefix ? `${prefix}[${key}]` : key;
                const v = obj[key];

                str.push(
                    v !== null && typeof v === 'object'
                        ? Utils.objectToQueryString(v, k)
                        : `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
                );
            }
        }

        return str.join('&');
    }

    /**
     * Parse query string to object
     * @param {string} queryString - Query string to parse
     * @returns {object} - Parsed object
     */
    static queryStringToObject(queryString) {
        const params = new URLSearchParams(queryString);
        const result = {};

        for (const [key, value] of params) {
            result[key] = value;
        }

        return result;
    }

    /**
     * Check if value is empty (null, undefined, empty string, empty array, empty object)
     * @param {*} value - Value to check
     * @returns {boolean} - True if empty
     */
    static isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (Utils.isObject(value)) return Object.keys(value).length === 0;
        return false;
    }

    /**
     * Remove empty values from object
     * @param {object} obj - Object to clean
     * @param {boolean} deep - Whether to clean nested objects
     * @returns {object} - Cleaned object
     */
    static removeEmpty(obj, deep = false) {
        const result = {};

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];

                if (!Utils.isEmpty(value)) {
                    result[key] = deep && Utils.isObject(value)
                        ? Utils.removeEmpty(value, deep)
                        : value;
                }
            }
        }

        return result;
    }

    /**
     * Sleep/delay execution
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} - Promise that resolves after delay
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry function with exponential backoff
     * @param {function} fn - Function to retry
     * @param {number} maxAttempts - Maximum retry attempts
     * @param {number} delay - Initial delay in milliseconds
     * @returns {Promise} - Promise that resolves with function result
     */
    static async retry(fn, maxAttempts = 3, delay = 1000) {
        let attempt = 1;

        while (attempt <= maxAttempts) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }

                await Utils.sleep(delay * Math.pow(2, attempt - 1));
                attempt++;
            }
        }
    }

    /**
     * Create a simple event emitter
     * @returns {object} - Event emitter instance
     */
    static createEventEmitter() {
        const events = {};

        return {
            on(event, callback) {
                if (!events[event]) events[event] = [];
                events[event].push(callback);
            },

            off(event, callback) {
                if (!events[event]) return;
                events[event] = events[event].filter(cb => cb !== callback);
            },

            emit(event, ...args) {
                if (!events[event]) return;
                events[event].forEach(callback => callback(...args));
            },

            once(event, callback) {
                const onceCallback = (...args) => {
                    callback(...args);
                    this.off(event, onceCallback);
                };
                this.on(event, onceCallback);
            }
        };
    }

    /**
     * Log with prefix and styling
     * @param {string} prefix - Log prefix
     * @param {string} level - Log level (log, warn, error)
     * @param {...any} args - Arguments to log
     */
    static log(prefix, level = 'log', ...args) {
        if (typeof window !== 'undefined' && !window.debugMode) return;

        const styles = {
            log: 'color: #2196F3',
            warn: 'color: #FF9800',
            error: 'color: #F44336'
        };

        console[level](`%c[${prefix}]`, styles[level] || styles.log, ...args);
    }
}

// ========================================
// EXPORT AND GLOBAL ASSIGNMENT
// ========================================

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}

if (typeof window !== 'undefined') {
    window.Utils = Utils;
    console.log('✅ Utils module loaded');
}

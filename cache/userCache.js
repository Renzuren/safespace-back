// cache/userCache.js
const NodeCache = require('node-cache');

// Initialize cache with standard TTL (Time To Live) of 5 minutes
const cache = new NodeCache({ 
    stdTTL: 300, // 5 minutes in seconds
    checkperiod: 60, // Check for expired keys every 60 seconds
    useClones: false // Don't clone objects for better performance
});

class UserCache {
    constructor() {
        this.cache = cache;
    }

    /**
     * Generate cache key for users list
     * @param {Object} params - Query parameters (page, limit, filters, etc.)
     * @returns {string} Cache key
     */
    generateKey(params = {}) {
        const { page = 1, limit = 10, role, status, fromDate, toDate, search } = params;
        const key = `users:page:${page}:limit:${limit}`;
        
        // Add filters to key if present
        const filters = [];
        if (role) filters.push(`role:${role}`);
        if (status) filters.push(`status:${status}`);
        if (fromDate) filters.push(`from:${fromDate}`);
        if (toDate) filters.push(`to:${toDate}`);
        if (search) filters.push(`search:${search}`);
        
        return filters.length > 0 ? `${key}:${filters.join(':')}` : key;
    }

    /**
     * Generate cache key for single user
     * @param {string} userId - User ID
     * @returns {string} Cache key
     */
    generateUserKey(userId) {
        return `user:${userId}`;
    }

    /**
     * Get users list from cache
     * @param {Object} params - Query parameters
     * @returns {Object|null} Cached users or null if not found
     */
    getUsers(params = {}) {
        const key = this.generateKey(params);
        const cachedData = this.cache.get(key);
        
        if (cachedData) {
            console.log(`Cache hit for users key: ${key}`);
            return cachedData;
        }
        
        console.log(`Cache miss for users key: ${key}`);
        return null;
    }

    /**
     * Get single user from cache
     * @param {string} userId - User ID
     * @returns {Object|null} Cached user or null if not found
     */
    getUser(userId) {
        const key = this.generateUserKey(userId);
        const cachedData = this.cache.get(key);
        
        if (cachedData) {
            console.log(`Cache hit for user key: ${key}`);
            return cachedData;
        }
        
        console.log(`Cache miss for user key: ${key}`);
        return null;
    }

    /**
     * Store users list in cache
     * @param {Object} params - Query parameters
     * @param {Object} data - Users data to cache
     * @param {number} ttl - Time to live in seconds (optional, uses default if not provided)
     */
    setUsers(params = {}, data, ttl = null) {
        const key = this.generateKey(params);
        
        if (ttl) {
            this.cache.set(key, data, ttl);
        } else {
            this.cache.set(key, data);
        }
        
        console.log(`Cached users data for key: ${key}`);
    }

    /**
     * Store single user in cache
     * @param {string} userId - User ID
     * @param {Object} data - User data to cache
     * @param {number} ttl - Time to live in seconds (optional, uses default if not provided)
     */
    setUser(userId, data, ttl = null) {
        const key = this.generateUserKey(userId);
        
        if (ttl) {
            this.cache.set(key, data, ttl);
        } else {
            this.cache.set(key, data);
        }
        
        console.log(`Cached user data for key: ${key}`);
    }

    /**
     * Invalidate all cache for a specific user
     * @param {string} userId - User ID
     */
    invalidateUserCache(userId) {
        const keys = this.cache.keys();
        
        // Invalidate single user cache
        const userKeys = keys.filter(key => key === `user:${userId}`);
        
        // Invalidate all users list caches (any key starting with 'users:')
        const usersListKeys = keys.filter(key => key.startsWith('users:'));
        
        const allKeysToDelete = [...userKeys, ...usersListKeys];
        
        allKeysToDelete.forEach(key => {
            this.cache.del(key);
            console.log(`Invalidated cache key: ${key}`);
        });
        
        console.log(`Invalidated ${allKeysToDelete.length} cache entries for user: ${userId}`);
    }

    /**
     * Invalidate specific users list cache
     * @param {Object} params - Query parameters that were used for caching
     */
    invalidateUsersList(params = {}) {
        const key = this.generateKey(params);
        this.cache.del(key);
        console.log(`Invalidated users list cache key: ${key}`);
    }

    /**
     * Clear all user-related cache
     */
    clearAllUserCache() {
        const keys = this.cache.keys();
        const userRelatedKeys = keys.filter(key => key.startsWith('user:') || key.startsWith('users:'));
        
        userRelatedKeys.forEach(key => {
            this.cache.del(key);
        });
        
        console.log(`Cleared ${userRelatedKeys.length} user-related cache entries`);
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            keys: this.cache.keys().length,
            hits: this.cache.getStats().hits,
            misses: this.cache.getStats().misses,
            ksize: this.cache.getStats().ksize,
            vsize: this.cache.getStats().vsize
        };
    }
}

module.exports = new UserCache();
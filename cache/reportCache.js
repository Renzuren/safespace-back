// services/reportCache.js
const NodeCache = require('node-cache');

// Initialize cache with standard TTL (Time To Live) of 5 minutes
const cache = new NodeCache({ 
    stdTTL: 3000, // 5 minutes in seconds
    checkperiod: 60, // Check for expired keys every 60 seconds
    useClones: false // Don't clone objects for better performance
});

class ReportCache {
    constructor() {
        this.cache = cache;
    }

    /**
     * Generate cache key for user reports
     * @param {string} userId - User ID
     * @param {Object} params - Query parameters (page, limit, filters, etc.)
     * @returns {string} Cache key
     */
    generateKey(userId, params = {}) {
        const { page = 1, limit = 10, status, classification, procedureType, fromDate, toDate, search } = params;
        const key = `reports:${userId}:page:${page}:limit:${limit}`;
        
        // Add filters to key if present
        const filters = [];
        if (status) filters.push(`status:${status}`);
        if (classification) filters.push(`class:${classification}`);
        if (procedureType) filters.push(`proc:${procedureType}`);
        if (fromDate) filters.push(`from:${fromDate}`);
        if (toDate) filters.push(`to:${toDate}`);
        if (search) filters.push(`search:${search}`);
        
        return filters.length > 0 ? `${key}:${filters.join(':')}` : key;
    }

    /**
     * Get reports from cache
     * @param {string} userId - User ID
     * @param {Object} params - Query parameters
     * @returns {Object|null} Cached reports or null if not found
     */
    get(userId, params = {}) {
        const key = this.generateKey(userId, params);
        const cachedData = this.cache.get(key);
        
        if (cachedData) {
            console.log(`Cache hit for key: ${key}`);
            return cachedData;
        }
        
        console.log(`Cache miss for key: ${key}`);
        return null;
    }

    /**
     * Store reports in cache
     * @param {string} userId - User ID
     * @param {Object} params - Query parameters
     * @param {Object} data - Reports data to cache
     * @param {number} ttl - Time to live in seconds (optional, uses default if not provided)
     */
    set(userId, params = {}, data, ttl = null) {
        const key = this.generateKey(userId, params);
        
        if (ttl) {
            this.cache.set(key, data, ttl);
        } else {
            this.cache.set(key, data);
        }
        
        console.log(`Cached data for key: ${key}`);
    }

    /**
     * Invalidate all cache for a specific user
     * @param {string} userId - User ID
     */
    invalidateUserCache(userId) {
        const keys = this.cache.keys();
        const userKeys = keys.filter(key => key.startsWith(`reports:${userId}`));
        
        userKeys.forEach(key => {
            this.cache.del(key);
            console.log(`Invalidated cache key: ${key}`);
        });
        
        console.log(`Invalidated ${userKeys.length} cache entries for user: ${userId}`);
    }
}

module.exports = new ReportCache();
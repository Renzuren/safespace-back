const { db } = require('../utils/database');
const { COLLECTIONS } = require('../utils/constants');
const userCache = require('../cache/userCache');

class AccountModel {
  static get collection() {
    return COLLECTIONS.COLLECTIONS_USERS;
  }

  static async findByUserId(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Check cache first
      const cachedUser = userCache.getUser(userId);
      if (cachedUser) {
        return cachedUser;
      }

      // If not in cache, fetch from database
      console.log('Fetching user from database...');
      const accountsRef = db.collection(this.collection);
      const snapshot = await accountsRef
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      
      const user = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
      };

      // Store in cache
      userCache.setUser(userId, user);
      
      return user;
    } catch (error) {
      console.error('Error finding account by user ID:', error);
      throw error;
    }
  }

  static async getUsers(filters = {}, page = 1, limit = 10, search = null, dateFilters = {}) {
    try {
      // Prepare cache parameters
      const cacheParams = {
        page,
        limit,
        role: filters.role,
        status: filters.status,
        fromDate: dateFilters.fromDate,
        toDate: dateFilters.toDate,
        search
      };
      
      // Check cache first
      const cachedData = userCache.getUsers(cacheParams);
      if (cachedData) {
        return cachedData;
      }
      
      // If not in cache, fetch from database
      console.log('Fetching users from database...');
      const accountsRef = db.collection(this.collection);
      let query = accountsRef;

      // Apply role filter if provided
      if (filters.role) {
        query = query.where('role', '==', filters.role);
      }

      // Apply status filter if provided (if you have status field)
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      // Apply date filters for createdAt
      if (dateFilters.fromDate) {
        query = query.where('createdAt', '>=', dateFilters.fromDate);
      }
      
      if (dateFilters.toDate) {
        query = query.where('createdAt', '<=', dateFilters.toDate);
      }

      // Sort by creation date (newest first)
      query = query.orderBy('createdAt', 'desc');

      // Get total count for pagination
      let totalItems = 0;
      let allAccounts = [];

      if (search) {
        // If searching, get all documents and filter client-side
        const snapshot = await query.get();
        
        snapshot.forEach(doc => {
          const data = doc.data();
          allAccounts.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
          });
        });

        // Client-side search across searchable fields
        const searchLower = search.toLowerCase();
        const filteredAccounts = allAccounts.filter(account => {
          const emailMatch = account.email?.toLowerCase().includes(searchLower);
          const nameMatch = account.fullName?.toLowerCase().includes(searchLower);
          const phoneMatch = account.phoneNumber?.toLowerCase().includes(searchLower);
          
          return emailMatch || nameMatch || phoneMatch;
        });

        allAccounts = filteredAccounts;
        totalItems = allAccounts.length;

        // Apply pagination to filtered results
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedAccounts = allAccounts.slice(startIndex, endIndex);

        // Remove sensitive data
        const sanitizedAccounts = paginatedAccounts.map(account => {
          const { password, ...accountWithoutPassword } = account;
          return accountWithoutPassword;
        });

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        const result = {
          users: sanitizedAccounts,
          totalItems,
          totalPages,
          hasPrevPage,
          hasNextPage,
          page,
          limit
        };
        
        // Store in cache
        userCache.setUsers(cacheParams, result);
        
        return result;

      } else {
        // Get total count
        const countSnapshot = await query.count().get();
        totalItems = countSnapshot.data().count;

        // Apply pagination
        if (page > 1) {
          const offset = (page - 1) * limit;
          const prevPageSnapshot = await query.limit(offset).get();
          
          if (!prevPageSnapshot.empty) {
            const lastDoc = prevPageSnapshot.docs[prevPageSnapshot.docs.length - 1];
            query = query.startAfter(lastDoc);
          }
        }

        // Apply limit
        query = query.limit(limit);

        // Execute query
        const snapshot = await query.get();

        // Process results
        const users = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          users.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
          });
        });

        // Remove sensitive data
        const sanitizedUsers = users.map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        const result = {
          users: sanitizedUsers,
          totalItems,
          totalPages,
          hasPrevPage,
          hasNextPage,
          page,
          limit
        };
        
        // Store in cache
        userCache.setUsers(cacheParams, result);
        
        return result;
      }

    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  static async updateRole(userId, newRole) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!newRole) {
        throw new Error('Role is required');
      }

      const accountsRef = db.collection(this.collection);
      
      // First, find the user document by userId
      const snapshot = await accountsRef
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      // Get the document reference and data
      const doc = snapshot.docs[0];
      const docRef = doc.ref;
      const currentData = doc.data();

      // Update the role
      const updatedAt = new Date();
      
      await docRef.update({
        role: newRole,
        updatedAt: updatedAt
      });

      // Invalidate cache for this user
      await userCache.invalidateUserCache(userId);

      // Return the updated user without sensitive data
      const { password, ...userWithoutPassword } = currentData;
      
      const updatedUser = {
        userId: userWithoutPassword.userId,
        fullName: userWithoutPassword.fullName,
        email: userWithoutPassword.email,
        role: newRole,
        createdAt: userWithoutPassword.createdAt?.toDate ? userWithoutPassword.createdAt.toDate() : userWithoutPassword.createdAt,
        updatedAt: updatedAt,
        phoneNumber: userWithoutPassword.phoneNumber,
        apiKey: userWithoutPassword.apiKey
      };

      // Optionally cache the updated user
      userCache.setUser(userId, updatedUser);

      return updatedUser;

    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }
}

module.exports = AccountModel;
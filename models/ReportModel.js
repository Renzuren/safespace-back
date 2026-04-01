const { db } = require('../utils/database');
const { COLLECTIONS } = require('../utils/constants');
const reportCache = require('../cache/reportCache');

class ReportModel {
  static get collection() {
    return COLLECTIONS.COLLECTIONS_REPORTS;
  }

  static async create(reportData) {
    try {
      console.log('🔵 [4] Model received - incidentDate:', reportData.incidentDate);
      console.log('🔵 [4] Model received - incidentTime:', reportData.incidentTime);
      console.log('🔵 [4] Full reportData keys:', Object.keys(reportData).join(', '));

      // Log entire data structure before Firestore
      console.log('🔥 About to write to Firestore:', JSON.stringify(reportData, null, 2));

      const usersRef = db.collection(this.collection);
      const docRef = await usersRef.add(reportData);
      
      // Immediately read back to verify what was stored
      const doc = await docRef.get();
      const storedData = doc.data();
      console.log('📄 Stored document:', JSON.stringify(storedData, null, 2));
      console.log('✅ Firestore write successful, doc id:', docRef.id);
      console.log('📄 Stored incidentDate:', storedData.incidentDate);
      console.log('📄 Stored incidentTime:', storedData.incidentTime);
      
      // Invalidate cache for this user after creating new report
      await reportCache.invalidateUserCache(reportData.userId);
      
      return {
        id: docRef.id,
        ...reportData
      };
    } catch (error) {
      console.error('❌ Firestore write error:', error);
      throw error;
    }
  }

  static async get(filters = {}, page = 1, limit = 10, search = null, dateFilters = {}) {
    try {
      const userId = filters.userId;
      
      // Prepare cache parameters
      const cacheParams = {
        page,
        limit,
        status: filters.status,
        classification: filters.classification,
        procedureType: filters.procedureType,
        fromDate: dateFilters.fromDate,
        toDate: dateFilters.toDate,
        search
      };
      
      // Check cache first
      const cachedData = reportCache.get(userId, cacheParams);
      if (cachedData) {
        return cachedData;
      }
      
      // If not in cache, fetch from database
      console.log('Fetching from database...');
      const reportsRef = db.collection(this.collection);
      let query = reportsRef;

      // Apply basic filters (userId, status, classification, procedureType)
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      
      if (filters.classification) {
        query = query.where('classification', '==', filters.classification);
      }
      
      if (filters.procedureType) {
        query = query.where('procedureType', '==', filters.procedureType);
      }

      // Apply date filters
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
      let allReports = [];

      if (search) {
        // If searching, get all documents and filter client-side
        const snapshot = await query.get();
        
        snapshot.forEach(doc => {
          const data = doc.data();
          allReports.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
          });
        });

        // Client-side search across searchable fields
        const searchLower = search.toLowerCase();
        const filteredReports = allReports.filter(report => {
          const firstNameMatch = report.firstName?.toLowerCase().includes(searchLower);
          const lastNameMatch = report.lastName?.toLowerCase().includes(searchLower);
          const complainedFullNameMatch = report.complainedFullName?.toLowerCase().includes(searchLower);
          const complainantStoryMatch = report.complainantStory?.toLowerCase().includes(searchLower);
          
          return firstNameMatch || lastNameMatch || complainedFullNameMatch || complainantStoryMatch;
        });

        allReports = filteredReports;
        totalItems = allReports.length;

        // Apply pagination to filtered results
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedReports = allReports.slice(startIndex, endIndex);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        const result = {
          reports: paginatedReports,
          totalItems,
          totalPages,
          hasPrevPage,
          hasNextPage,
          page,
          limit
        };
        
        // Store in cache
        reportCache.set(userId, cacheParams, result);
        
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
        const reports = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          reports.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
          });
        });

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalItems / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        const result = {
          reports,
          totalItems,
          totalPages,
          hasPrevPage,
          hasNextPage,
          page,
          limit
        };
        
        // Store in cache
        reportCache.set(userId, cacheParams, result);
        
        return result;
      }

    } catch (error) {
      console.error('Error getting reports:', error);
      throw error;
    }
  }

  static async update(reportId, userId = '', updateData) {
    try {
      const reportRef = db.collection(this.collection);
      let query = reportRef.where('reportId', '==', reportId);
      
      // Check if userId is a non-empty string
      if (userId && typeof userId === 'string' && userId.trim()) {
        query = query.where('userId', '==', userId);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return false;
      }
      
      const doc = snapshot.docs[0];
      await doc.ref.update(updateData);
      
      // Invalidate cache for this user after creating new report
      await reportCache.invalidateAllReportCache();
      
      return true;
      
    } catch (error) {
      console.error('Error updating report:', error);
      throw error;
    }
  }

  // Severity & Offense
  static async getCountWithSanction(fullName, severity, classification) {
    try {
      const reportsRef = db.collection(this.collection);
      
      // Get all reports
      const snapshot = await reportsRef.get();
      
      const searchNameLower = fullName.toLowerCase().trim();
      let count = 0;
      
      // Count reports where complainedFullName matches the search
      snapshot.forEach(doc => {
        const data = doc.data();
        const complainedName = data.complainedFullName?.toLowerCase() || '';
        
        // Check if the complained name contains the search name (partial match)
        if (complainedName.includes(searchNameLower)) {
          count++;
        }
      });
      
      // Determine sanction based on severity, classification, and count
      const sanction = this.getSanction(severity, classification, count);
      
      return {
        count: count,
        sanction: sanction
      };
      
    } catch (error) {
      console.error('Error getting report count with sanction:', error);
      throw error;
    }
  }

  static getSanction(severity, classification, offenseCount) {
    // If severity is None, no sanction
    if (severity === 'None') {
      return 'No sanction applicable';
    }
    
    // Check if classification is Student
    const isStudent = classification === 'Student';
    
    // For Students
    if (isStudent) {
      switch(severity) {
        case 'Light':
          if (offenseCount === 1) {
            return 'Reprimand or community service not exceeding 30 hours';
          } else if (offenseCount === 2) {
            return 'Suspension for not exceeding one (1) semester';
          } else if (offenseCount >= 3) {
            return 'Expulsion';
          }
          break;
          
        case 'Less Grave':
          if (offenseCount === 1) {
            return 'Community service for 60 hours';
          } else if (offenseCount === 2) {
            return 'Suspension for one (1) year';
          } else if (offenseCount >= 3) {
            return 'Expulsion';
          }
          break;
          
        case 'Grave':
          if (offenseCount >= 1) {
            return 'Suspension for one (1) academic year to expulsion';
          }
          break;
      }
    } 
    // For Non-Students (Professor, Instructor, Teacher, Gov't Employee, Stranger, Co-worker, Colleague)
    else {
      switch(severity) {
        case 'Light':
          if (offenseCount === 1) {
            return 'Reprimand or suspension for one (1) month and one (1) day to six (6) months';
          } else if (offenseCount === 2) {
            return 'Fine or suspension for six (6) months and one (1) day to one (1) year';
          } else if (offenseCount >= 3) {
            return 'Dismissal';
          }
          break;
          
        case 'Less Grave':
          if (offenseCount === 1) {
            return 'Suspension for six (6) months and one (1) day to one (1) year';
          } else if (offenseCount >= 2) {
            return 'Dismissal';
          }
          break;
          
        case 'Grave':
          if (offenseCount >= 1) {
            return 'Dismissal';
          }
          break;
      }
    }
    
    return 'No applicable sanction based on current offense count';
  }

  // Dashboard
  static async getTotalReports() {
    try {
      const reportsRef = db.collection(this.collection);
      const snapshot = await reportsRef.count().get();
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting total reports:', error);
      throw error;
    }
  }

  static async getPendingReports() {
    try {
      const reportsRef = db.collection(this.collection);
      const snapshot = await reportsRef
        .where('status', '==', 'pending')
        .count()
        .get();
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting pending reports:', error);
      throw error;
    }
  }

  static async getReportsLast6Weeks(startDate, endDate) {
    try {
      const reportsRef = db.collection(this.collection);
      // Query reports created in the last 6 weeks
      const snapshot = await reportsRef
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get();

      // Initialize weeks array (last 6 weeks)
      const weeks = [];
      const weekLabels = [];
      
      // Generate week labels (e.g., "Week of Mar 15", "Week of Mar 22", etc.)
      for (let i = 5; i >= 0; i--) {
        const weekStart = new Date(endDate);
        weekStart.setDate(endDate.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const startStr = weekStart.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
        const endStr = weekEnd.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
        weekLabels.push(`${startStr} - ${endStr}`);
        weeks.push(0);
      }

      // Group reports by week
      snapshot.forEach(doc => {
        const report = doc.data();
        const createdAt = report.createdAt?.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
        
        // Calculate which week this report belongs to
        const daysSinceStart = Math.floor((createdAt - startDate) / (1000 * 60 * 60 * 24));
        const weekIndex = Math.floor(daysSinceStart / 7);
        
        // Only count if within our 6-week range (0-5)
        if (weekIndex >= 0 && weekIndex < 6) {
          weeks[weekIndex]++;
        }
      });

      // Format the data for the frontend
      return weeks.map((count, index) => ({
        week: weekLabels[index],
        count: count
      }));

    } catch (error) {
      console.error('Error getting reports by week:', error);
      throw error;
    }
  }

  // Helpers
  static async countByUserId(userId) {
    try {
      const reportsRef = db.collection(this.collection);
      const snapshot = await reportsRef
        .where('userId', '==', userId)
        .count()
        .get();
      
      return snapshot.data().count;
    } catch (error) {
      console.error('Error counting reports by user:', error);
      throw error;
    }
  }

  static async countByUserIdAndStatus(userId, status) {
    try {
      const reportsRef = db.collection(this.collection);
      const snapshot = await reportsRef
        .where('userId', '==', userId)
        .where('status', '==', status)
        .count()
        .get();
      
      return snapshot.data().count;
    } catch (error) {
      console.error('Error counting reports by user and status:', error);
      throw error;
    }
  }
}

module.exports = ReportModel;
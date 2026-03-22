const { db } = require('../utils/database');
const { COLLECTIONS } = require('../utils/constants');
const userCache = require('../cache/userCache');

class AuthModel {
  static get collection() {
    return COLLECTIONS.COLLECTIONS_USERS;
  }

  static async findByEmail(email) {
    try {
      const usersRef = db.collection(this.collection);
      const snapshot = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      const usersRef = db.collection(this.collection);
      const docRef = await usersRef.add(userData);

      await userCache.clearAllUserCache();
      console.log('User cache invalidated after creating new user');
      
      return {
        id: docRef.id,
        ...userData
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Dashboard
  static async getTotalUsers() {
    try {
      const usersRef = db.collection(this.collection);
      const snapshot = await usersRef.count().get();
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting total users:', error);
      throw error;
    }
  }

  // Reset
  static async updatePassword(userId, newHashedPassword) {
    try {
      const usersRef = db.collection(this.collection);
      const snapshot = await usersRef
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return false;
      }

      const doc = snapshot.docs[0];
      await doc.ref.update({
        hashedPassword: newHashedPassword,
        updatedAt: new Date().toISOString(),
        resetPasswordToken: null,
        resetPasswordExpires: null
      });

      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  static async setResetToken(userId, token, expiresAt) {
    try {
      const usersRef = db.collection(this.collection);
      const snapshot = await usersRef
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return false;
      }

      const doc = snapshot.docs[0];
      await doc.ref.update({
        resetPasswordToken: token,
        resetPasswordExpires: expiresAt,
        updatedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error setting reset token:', error);
      throw error;
    }
  }

  static async findByResetToken(token) {
    try {
      const usersRef = db.collection(this.collection);
      const snapshot = await usersRef
        .where('resetPasswordToken', '==', token)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        resetPasswordExpires: data.resetPasswordExpires?.toDate ? data.resetPasswordExpires.toDate() : data.resetPasswordExpires
      };
    } catch (error) {
      console.error('Error finding user by reset token:', error);
      throw error;
    }
  }
}

module.exports = AuthModel;
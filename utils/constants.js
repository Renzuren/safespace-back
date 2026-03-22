module.exports = {
  FIREBASE: {
    // Firebase configuration
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL
  },

  JWT: {
    // JWT configuration
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN
  },

  COLLECTIONS: {
    COLLECTIONS_USERS: process.env.COLLECTIONS_USERS,
    COLLECTIONS_REPORTS: process.env.COLLECTIONS_REPORTS,
    COLLECTIONS_APPOINTMENTS: process.env.COLLECTIONS_APPOINTMENTS
  },

  // Status codes
  STATUS_CODES: {
    // Success
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,

    // Client Errors
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,

    // Server Errors
    INTERNAL_SERVER_ERROR: 500
  },
};
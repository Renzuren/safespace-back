const admin = require('firebase-admin');
require('dotenv').config();
const { FIREBASE } = require('./constants');

let PRIVATE_KEY = FIREBASE.FIREBASE_PRIVATE_KEY;
if (PRIVATE_KEY) {
  PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: FIREBASE.FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE.FIREBASE_CLIENT_EMAIL,
    privateKey: PRIVATE_KEY
  })
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

module.exports = { db, admin, FieldValue };
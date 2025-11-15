/**
 * Example test configuration for Firebase
 * Copy this file to config.ts and fill in your test Firebase credentials
 * Note: config.ts is gitignored to protect your credentials
 */
export const config = {
  api: {
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY || "your-api-key",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
      projectId: process.env.FIREBASE_PROJECT_ID || "your-project-id",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
      appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef"
    }
  }
};

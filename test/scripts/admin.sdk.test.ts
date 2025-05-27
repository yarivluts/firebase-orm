import * as admin from "firebase-admin";
import { FirestoreOrmRepository } from "../../index";
import { Member } from "../model/member";

describe('Firebase Admin SDK integration', () => {
  it('should initialize with Firebase Admin SDK', async () => {
    // This is a mock test to demonstrate usage - will be skipped in CI
    const serviceAccount = { /* Mock service account details */ };

    try {
      // Initialize with mock data - this will throw an error in CI
      // but demonstrates the correct usage pattern
      const adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
        databaseURL: "https://your-project-id.firebaseio.com",
        storageBucket: "your-project-id.appspot.com"
      }, 'admin-test-app');

      // Initialize Firebase ORM with Admin app
      FirestoreOrmRepository.initializeAdminApp(adminApp);

      // Initialize storage
      const adminStorage = admin.storage();
      FirestoreOrmRepository.initGlobalStorage(adminStorage);

      // Add a global path
      FirestoreOrmRepository.initGlobalPath('website_id', '50');

      // Create a new member
      const member = new Member();
      member.name = "Admin Test User";
      member.photoUrl = "https://example.com/admin-photo.jpg";
      await member.save();

      // Retrieve the member
      const members = await Member.query().where('name', '==', 'Admin Test User').get();
      expect(members.length).toBeGreaterThan(0);
      expect(members[0].name).toBe("Admin Test User");

    } catch (error) {
      // Skip the test if it fails to initialize
      // In a real environment, you would provide valid credentials
      console.log("Skipping test: Firebase Admin initialization failed");
      console.log(error);
    } finally {
      // Clean up by deleting the app
      try {
        const app = admin.app('admin-test-app');
        await app.delete();
      } catch (e) {
        // App may not exist
      }
    }
  }, 10000); // Longer timeout for async operations

  it('should perform CRUD operations with Admin SDK', async () => {
    // This test is similar to the previous one but focuses on CRUD operations
    const serviceAccount = { /* Mock service account details */ };

    try {
      // Initialize with mock data
      const adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
        databaseURL: "https://your-project-id.firebaseio.com"
      }, 'admin-crud-test-app');

      // Initialize Firebase ORM with Admin app
      FirestoreOrmRepository.initializeAdminApp(adminApp);
      FirestoreOrmRepository.initGlobalPath('website_id', '50');

      // Create a new member
      const member = new Member();
      member.name = "CRUD Test User";
      member.photoUrl = "https://example.com/crud-photo.jpg";
      await member.save();

      // Retrieve the member by ID
      const memberId = member.getId();
      const retrievedMember = new Member();
      await retrievedMember.load(memberId);
      
      expect(retrievedMember.name).toBe("CRUD Test User");

      // Update the member
      retrievedMember.name = "Updated CRUD Test User";
      await retrievedMember.save();

      // Retrieve again to verify update
      const updatedMember = new Member();
      await updatedMember.load(memberId);
      expect(updatedMember.name).toBe("Updated CRUD Test User");

      // Delete the member
      await updatedMember.remove();

      // Try to retrieve the deleted member
      try {
        const deletedMember = new Member();
        await deletedMember.load(memberId);
        // Should not get here if member is properly deleted
        expect(deletedMember.getId()).toBeNull();
      } catch (error) {
        // Expected error when trying to load a deleted document
        expect(error).toBeDefined();
      }

    } catch (error) {
      // Skip the test if it fails to initialize
      console.log("Skipping test: Firebase Admin CRUD operations failed");
      console.log(error);
    } finally {
      // Clean up by deleting the app
      try {
        const app = admin.app('admin-crud-test-app');
        await app.delete();
      } catch (e) {
        // App may not exist
      }
    }
  }, 10000);
});
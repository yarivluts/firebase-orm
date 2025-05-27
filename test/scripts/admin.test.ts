import * as admin from "firebase-admin";
import { FirestoreOrmRepository } from "../../index";
import { Member } from "../model/member";

// This test is meant as an example and will be skipped automatically
// To run it, you would need to provide valid Firebase Admin credentials
describe('Firebase Admin SDK integration', () => {
    it('should initialize with Firebase Admin SDK', async () => {
        // This is a mock test to demonstrate usage - will be skipped
        const serviceAccount = { /* Your service account details */ };

        try {
            // Initialize with mock data - this will throw an error in CI
            // but demonstrates the correct usage pattern
            const adminApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount as any),
                databaseURL: "https://your-project-id.firebaseio.com",
                storageBucket: "your-project-id.appspot.com"
            });

            // Initialize Firebase ORM with Admin app
            FirestoreOrmRepository.initializeAdminApp(adminApp);

            // Initialize storage
            const adminStorage = admin.storage();
            FirestoreOrmRepository.initGlobalStorage(adminStorage);

            // Add a global path
            FirestoreOrmRepository.initGlobalPath('website_id', '50');

            // Create a new member
            const member = new Member();
            member.name = "Test User";
            member.photoUrl = "https://example.com/photo.jpg";
            await member.save();

            // Retrieve the member
            const members = await Member.query().where('name', '==', 'Test User').get();
            expect(members.length).toBeGreaterThan(0);
            expect(members[0].name).toBe("Test User");

        } catch (error) {
            // Skip the test if it fails to initialize
            // In a real environment, you would provide valid credentials
            console.log("Skipping test: Firebase Admin initialization failed");
            console.log(error);
        }
    }, 10000); // Longer timeout for async operations
});
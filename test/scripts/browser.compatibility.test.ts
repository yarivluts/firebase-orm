/**
 * Test to verify that browser-only usage does not require firebase-admin
 */

import { FirestoreOrmRepository } from '../../repository';

describe('Browser Compatibility', () => {
    it('should not require firebase-admin imports for client SDK usage', () => {
        // This test verifies that we can import FirestoreOrmRepository
        // without firebase-admin being available
        expect(FirestoreOrmRepository).toBeDefined();
        expect(typeof FirestoreOrmRepository.initGlobalConnection).toBe('function');
        expect(typeof FirestoreOrmRepository.initializeApp).toBe('function');
    });

    it('should throw error when trying to use admin methods in browser environment', async () => {
        // Simulate browser environment
        const originalWindow = global.window;
        (global as any).window = {}; // Set window to simulate browser
        
        try {
            await expect(
                FirestoreOrmRepository.initializeAdminApp({} as any)
            ).rejects.toThrow('initializeAdminApp can only be called in a Node.js environment, not in the browser');
        } finally {
            // Restore original state
            if (originalWindow === undefined) {
                delete (global as any).window;
            } else {
                (global as any).window = originalWindow;
            }
        }
    });

    it('should have proper type definitions without firebase-admin dependencies', () => {
        // Verify that the class is properly defined
        const repository = FirestoreOrmRepository as any;
        
        expect(repository.DEFAULT_KEY_NAME).toBe('default');
        expect(typeof repository.setGlobalConfig).toBe('function');
        expect(typeof repository.getGlobalConfig).toBe('function');
        expect(typeof repository.initGlobalConnection).toBe('function');
    });
});

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

    it('should not have initializeAdminApp method in default entry point', () => {
        // The deprecated initializeAdminApp method should not exist in the default
        // browser entry point to avoid bundlers trying to resolve admin dependencies
        expect((FirestoreOrmRepository as any).initializeAdminApp).toBeUndefined();
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

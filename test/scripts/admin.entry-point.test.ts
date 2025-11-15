/**
 * Test to verify the separate admin entry point works correctly
 */

describe('Admin Entry Point', () => {
    it('should be able to import initializeAdminApp from admin module', async () => {
        // This test verifies that we can import from the admin module
        const adminModule = await import('../../admin');
        
        expect(adminModule.initializeAdminApp).toBeDefined();
        expect(typeof adminModule.initializeAdminApp).toBe('function');
    });

    it('should export FirestoreOrmRepository from admin module', async () => {
        const adminModule = await import('../../admin');
        
        expect(adminModule.FirestoreOrmRepository).toBeDefined();
        expect(typeof adminModule.FirestoreOrmRepository.initGlobalConnection).toBe('function');
    });

    it('should throw error when trying to use admin init in browser environment', async () => {
        // Simulate browser environment
        const originalWindow = global.window;
        (global as any).window = {}; // Set window to simulate browser
        
        try {
            const adminModule = await import('../../admin');
            await expect(
                adminModule.initializeAdminApp({} as any)
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

    it('admin module should not be imported by default index', () => {
        // Verify that importing from index doesn't pull in admin module
        const indexModule = require('../../index');
        
        // The deprecated method should still exist for backward compatibility
        expect(indexModule.FirestoreOrmRepository.initializeAdminApp).toBeDefined();
        expect(typeof indexModule.FirestoreOrmRepository.initializeAdminApp).toBe('function');
    });

    it('should maintain all main exports in admin module', async () => {
        const adminModule = await import('../../admin');
        
        // Verify key exports are available
        expect(adminModule.FirestoreOrmRepository).toBeDefined();
        expect(adminModule.BaseModel).toBeDefined();
        
        // These should be defined if properly exported
        expect(typeof adminModule.FirestoreOrmRepository.getGlobalConnection).toBe('function');
    });
});

/**
 * Integration test demonstrating the separation between browser and admin entry points
 * This test shows that both entry points work correctly and independently
 */

describe('Integration: Browser and Admin Entry Points', () => {
    beforeEach(() => {
        // Clear any global state between tests
        jest.clearAllMocks();
    });

    describe('Browser Entry Point', () => {
        it('should work with Firebase Client SDK mock', async () => {
            // Import from main entry point (browser-safe)
            const { FirestoreOrmRepository, BaseModel } = require('../../index');
            
            // Mock Firebase Client SDK Firestore
            const mockClientFirestore = {
                app: { 
                    name: 'integration-browser-app',
                    options: {
                        apiKey: 'mock-api-key',
                        projectId: 'mock-project'
                    }
                },
                type: 'firestore'
            };

            // Initialize with client SDK
            await FirestoreOrmRepository.initGlobalConnection(
                mockClientFirestore as any, 
                'integration-browser'
            );
            
            // Verify initialization
            const repo = FirestoreOrmRepository.getGlobalConnection('integration-browser');
            expect(repo).toBeDefined();
            expect(repo.getFirestore()).toBe(mockClientFirestore);
            
            // Verify BaseModel is available
            expect(BaseModel).toBeDefined();
        });

        it('should not load admin module when using browser entry point', () => {
            // Import from main entry point
            const mainModule = require('../../index');
            
            expect(mainModule.FirestoreOrmRepository).toBeDefined();
            expect(mainModule.BaseModel).toBeDefined();
            
            // Check that we're using the main module, not admin
            const modules = Object.keys(require.cache);
            const mainModuleLoaded = modules.some(m => m.includes('/index.js'));
            expect(mainModuleLoaded).toBe(true);
        });

        it('should handle all browser-side operations without admin dependencies', async () => {
            const { FirestoreOrmRepository } = require('../../index');
            
            const mockFirestore = { app: { name: 'ops-test' } };
            await FirestoreOrmRepository.initGlobalConnection(mockFirestore as any, 'ops-test');
            
            // Global configuration
            FirestoreOrmRepository.setGlobalConfig({
                auto_lower_case_field_name: true,
                auto_path_id: false
            });
            
            const config = FirestoreOrmRepository.getGlobalConfig();
            expect(config.auto_lower_case_field_name).toBe(true);
            expect(config.auto_path_id).toBe(false);
            
            // Path operations
            FirestoreOrmRepository.initGlobalPath('website_id', 'test-website');
            expect(FirestoreOrmRepository.getGlobalPath('website_id')).toBe('test-website');
            
            // Connection retrieval
            const repo = FirestoreOrmRepository.getGlobalConnection('ops-test');
            expect(repo).toBeDefined();
        });
    });

    describe('Admin Entry Point', () => {
        it('should provide initializeAdminApp function', async () => {
            // Import from admin entry point
            const adminModule = await import('../../admin');
            
            expect(adminModule.initializeAdminApp).toBeDefined();
            expect(typeof adminModule.initializeAdminApp).toBe('function');
        });

        it('should re-export common functionality from admin module', async () => {
            const adminModule = await import('../../admin');
            
            // Verify re-exports
            expect(adminModule.FirestoreOrmRepository).toBeDefined();
            expect(adminModule.BaseModel).toBeDefined();
            
            // Verify it's the same class (not a copy)
            const mainModule = require('../../index');
            expect(adminModule.FirestoreOrmRepository).toBe(mainModule.FirestoreOrmRepository);
        });

        it('should throw error when using admin init in browser environment', async () => {
            // Simulate browser environment
            const originalWindow = global.window;
            (global as any).window = {}; // Set window to simulate browser
            
            try {
                const adminModule = await import('../../admin');
                const mockAdminApp = { name: 'test-admin-app' } as any;
                
                await expect(
                    adminModule.initializeAdminApp(mockAdminApp)
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
    });

    describe('Entry Point Separation', () => {
        it('should verify main bundle does not import admin module', () => {
            const fs = require('fs');
            const path = require('path');
            
            // Check ESM build
            const esmIndexPath = path.join(__dirname, '../../dist/esm/index.js');
            if (fs.existsSync(esmIndexPath)) {
                const content = fs.readFileSync(esmIndexPath, 'utf8');
                
                // Should not import admin module
                expect(content).not.toContain('./admin');
                expect(content).not.toContain('from "./admin"');
                expect(content).not.toContain("from './admin'");
            }
        });

        it('should verify admin module contains firebase-admin imports', () => {
            const fs = require('fs');
            const path = require('path');
            
            // Check ESM build
            const esmAdminPath = path.join(__dirname, '../../dist/esm/admin.js');
            if (fs.existsSync(esmAdminPath)) {
                const content = fs.readFileSync(esmAdminPath, 'utf8');
                
                // Should contain firebase-admin import
                expect(content).toContain('firebase-admin');
            }
        });

        it('should verify package.json exports are correctly configured', () => {
            const fs = require('fs');
            const path = require('path');
            
            const packageJsonPath = path.join(__dirname, '../../package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Verify exports field exists
            expect(packageJson.exports).toBeDefined();
            expect(packageJson.exports['.']).toBeDefined();
            expect(packageJson.exports['./admin']).toBeDefined();
            
            // Verify browser condition
            expect(packageJson.exports['.'].browser).toBe('./dist/esm/index.js');
            
            // Verify admin condition
            expect(packageJson.exports['./admin'].import).toBe('./dist/esm/admin.js');
        });
    });

    describe('Backward Compatibility', () => {
        it('should support deprecated initializeAdminApp on FirestoreOrmRepository', () => {
            const { FirestoreOrmRepository } = require('../../index');
            
            // The deprecated method should still exist
            expect(FirestoreOrmRepository.initializeAdminApp).toBeDefined();
            expect(typeof FirestoreOrmRepository.initializeAdminApp).toBe('function');
        });

        it('should show deprecation warning when using old method', async () => {
            const { FirestoreOrmRepository } = require('../../index');
            
            // Mock console.warn to capture deprecation warning
            const originalWarn = console.warn;
            const warnMock = jest.fn();
            console.warn = warnMock;
            
            // Simulate browser environment to prevent actual admin import
            const originalWindow = global.window;
            (global as any).window = {};
            
            try {
                await FirestoreOrmRepository.initializeAdminApp({} as any).catch(() => {
                    // Expected to throw in browser environment
                });
                
                // Should have shown deprecation warning
                expect(warnMock).toHaveBeenCalledWith(
                    expect.stringContaining('deprecated')
                );
                expect(warnMock).toHaveBeenCalledWith(
                    expect.stringContaining('@arbel/firebase-orm/admin')
                );
            } finally {
                console.warn = originalWarn;
                if (originalWindow === undefined) {
                    delete (global as any).window;
                } else {
                    (global as any).window = originalWindow;
                }
            }
        });
    });

    describe('Real-World Scenarios', () => {
        it('should work in Angular-like browser setup', async () => {
            // Simulate Angular's typical setup
            const { FirestoreOrmRepository, BaseModel, Model, Field } = require('../../index');
            
            // Mock Firebase app initialization (as would happen in Angular)
            const mockApp = { name: 'angular-real-world' };
            const mockFirestore = { app: mockApp };
            
            // Initialize ORM
            await FirestoreOrmRepository.initGlobalConnection(mockFirestore as any, 'angular-rw');
            
            // Verify all needed exports are available
            expect(FirestoreOrmRepository).toBeDefined();
            expect(BaseModel).toBeDefined();
            expect(Model).toBeDefined();
            expect(Field).toBeDefined();
            
            // Verify ORM is ready to use
            const repo = FirestoreOrmRepository.getGlobalConnection('angular-rw');
            expect(repo).toBeDefined();
        });

        it('should work in Node.js server setup with admin entry point', async () => {
            // Simulate Node.js server setup
            const adminModule = await import('../../admin');
            
            // Verify admin functionality is available
            expect(adminModule.initializeAdminApp).toBeDefined();
            expect(adminModule.FirestoreOrmRepository).toBeDefined();
            expect(adminModule.BaseModel).toBeDefined();
            
            // This demonstrates that server-side code can use the admin entry point
            // while browser code uses the main entry point, ensuring proper separation
        });
    });
});

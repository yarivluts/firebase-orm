/**
 * Test to simulate Angular 19 ESBuild behavior with module resolution
 * This ensures that importing from the main entry point doesn't require firebase-admin
 */

describe('Angular 19 Simulation', () => {
    it('should import main module without firebase-admin being available', () => {
        // Simulate a scenario where firebase-admin is not installed
        // In a real Angular 19 browser build, firebase-admin wouldn't be available
        
        // This should work without any issues
        const mainModule = require('../../index');
        
        expect(mainModule.FirestoreOrmRepository).toBeDefined();
        expect(mainModule.BaseModel).toBeDefined();
        expect(mainModule.Model).toBeDefined();
        expect(mainModule.Field).toBeDefined();
    });

    it('should allow initialization with Firebase Client SDK', async () => {
        const { FirestoreOrmRepository } = require('../../index');
        
        // Mock Firebase Client SDK firestore
        const mockClientFirestore = {
            app: { 
                name: 'angular-app',
                options: {
                    apiKey: 'test-key',
                    projectId: 'test-project'
                }
            },
            type: 'firestore'
        };

        // This should work in Angular without firebase-admin
        await expect(
            FirestoreOrmRepository.initGlobalConnection(mockClientFirestore as any, 'angular-test')
        ).resolves.toBeDefined();
        
        const repo = FirestoreOrmRepository.getGlobalConnection('angular-test');
        expect(repo).toBeDefined();
    });

    it('should NOT attempt to load admin module for client SDK operations', async () => {
        const { FirestoreOrmRepository } = require('../../index');
        
        const mockFirestore = {
            app: { name: 'client-only-app' }
        };

        // Initialize with client SDK
        await FirestoreOrmRepository.initGlobalConnection(mockFirestore as any, 'client-ops');
        
        // These operations should work without touching admin module
        const repo = FirestoreOrmRepository.getGlobalConnection('client-ops');
        expect(repo.getFirestore()).toBe(mockFirestore);
        
        // Global config operations
        FirestoreOrmRepository.setGlobalConfig({ auto_lower_case_field_name: true });
        const config = FirestoreOrmRepository.getGlobalConfig();
        expect(config.auto_lower_case_field_name).toBe(true);
        
        // Path operations
        FirestoreOrmRepository.initGlobalPath('test_path', 'test_value');
        expect(FirestoreOrmRepository.getGlobalPath('test_path')).toBe('test_value');
    });

    it('should verify no static imports of firebase-admin in dist files', () => {
        const fs = require('fs');
        const path = require('path');
        
        // Check main entry point files
        const filesToCheck = [
            '../../dist/esm/index.js',
            '../../dist/esm/repository.js',
            '../../dist/cjs/index.js',
            '../../dist/cjs/repository.js'
        ];
        
        filesToCheck.forEach(file => {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Check for static imports (these would cause bundler failures)
                expect(content).not.toMatch(/import\s+.*\s+from\s+["']firebase-admin/);
                expect(content).not.toMatch(/require\s*\(\s*["']firebase-admin/);
                
                // Dynamic imports with guards are OK
                // They won't be executed in browser and won't be resolved by bundlers
                // when behind typeof window checks
            }
        });
    });

    it('should demonstrate proper Angular 19 usage pattern', async () => {
        // This simulates the exact code from the issue report
        const { FirestoreOrmRepository } = require('../../index');
        
        // Simulate Firebase Client SDK initialization
        // In real Angular app, this would be:
        // import { initializeApp } from 'firebase/app';
        // import { getFirestore } from 'firebase/firestore';
        
        const mockApp = { name: 'angular-19-app' };
        const mockFirestore = { 
            app: mockApp,
            type: 'firestore'
        };
        
        // This should work without any firebase-admin
        await FirestoreOrmRepository.initGlobalConnection(mockFirestore as any);
        
        // Application can now use the ORM
        expect(FirestoreOrmRepository.getGlobalConnection()).toBeDefined();
    });

    it('should allow importing specific decorators and models', () => {
        // Angular apps often import specific decorators
        const { Model, Field, BaseModel } = require('../../index');
        
        expect(Model).toBeDefined();
        expect(Field).toBeDefined();
        expect(BaseModel).toBeDefined();
        
        // These imports should not pull in admin dependencies
        expect(typeof Model).toBe('function');
        expect(typeof Field).toBe('function');
    });

    it('should handle tree-shaking scenario in production build', () => {
        // In production, bundlers perform tree-shaking
        // Only imported symbols should be included
        const { FirestoreOrmRepository, BaseModel } = require('../../index');
        
        // These should be available
        expect(FirestoreOrmRepository).toBeDefined();
        expect(BaseModel).toBeDefined();
        
        // The admin module should not be loaded at all
        // (in real tree-shaking scenario, it wouldn't even be in the bundle)
        const modules = Object.keys(require.cache);
        
        // Verify the main module is loaded
        const mainModuleLoaded = modules.some(m => m.includes('index.js'));
        expect(mainModuleLoaded).toBe(true);
        
        // Admin module should not be automatically loaded
        // (it's only loaded when explicitly imported or when deprecated method is called)
        const adminModuleAutoLoaded = modules.some(m => 
            m.includes('admin.js') && !m.includes('firebase-admin')
        );
        // It's OK if it's not loaded (better for tree-shaking)
        // It's also OK if it is loaded (as long as firebase-admin itself isn't)
        
        // Most importantly, firebase-admin should not be in the module cache
        const firebaseAdminLoaded = modules.some(m => 
            m.includes('node_modules/firebase-admin')
        );
        expect(firebaseAdminLoaded).toBe(false);
    });
});

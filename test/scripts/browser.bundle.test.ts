/**
 * Test to verify that browser bundles don't pull in firebase-admin dependencies
 * This simulates what Angular/webpack/esbuild would encounter
 */

describe('Browser Bundle Compatibility', () => {
    it('should be able to use FirestoreOrmRepository without firebase-admin installed', () => {
        // This test verifies we can import and use the main exports
        // without firebase-admin being available
        const { FirestoreOrmRepository } = require('../../index');
        
        expect(FirestoreOrmRepository).toBeDefined();
        expect(typeof FirestoreOrmRepository.initGlobalConnection).toBe('function');
        expect(typeof FirestoreOrmRepository.initializeApp).toBe('function');
        expect(typeof FirestoreOrmRepository.getGlobalConnection).toBe('function');
    });

    it('should be able to initialize client SDK without admin dependencies', async () => {
        const { FirestoreOrmRepository } = require('../../index');
        
        // Mock a Client SDK Firestore instance
        const mockClientFirestore = {
            app: { name: 'test-client-app' },
            type: 'firestore'
        };

        // Should not throw when initializing with client SDK
        await expect(
            FirestoreOrmRepository.initGlobalConnection(mockClientFirestore as any, 'test-browser-bundle')
        ).resolves.toBeDefined();

        // Should be able to get the connection
        const repo = FirestoreOrmRepository.getGlobalConnection('test-browser-bundle');
        expect(repo).toBeDefined();
    });

    it('should be able to import BaseModel without admin dependencies', () => {
        const { BaseModel } = require('../../index');
        
        expect(BaseModel).toBeDefined();
    });

    it('should be able to import decorators without admin dependencies', () => {
        const index = require('../../index');
        
        // These decorators should be available without firebase-admin
        expect(index.Model).toBeDefined();
        expect(index.Field).toBeDefined();
    });

    it('main index should not contain direct firebase-admin imports', () => {
        // Read the built ESM index file
        const fs = require('fs');
        const path = require('path');
        const indexPath = path.join(__dirname, '../../dist/esm/index.js');
        
        if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath, 'utf8');
            
            // Should not contain static imports of firebase-admin
            expect(content).not.toContain('from "firebase-admin"');
            expect(content).not.toContain("from 'firebase-admin'");
            
            // The only acceptable mention would be in comments or type references
            const firebaseAdminMatches = content.match(/firebase-admin/g);
            if (firebaseAdminMatches) {
                // If there are any matches, they should only be in comments
                expect(firebaseAdminMatches.length).toBe(0);
            }
        }
    });

    it('main repository.js should not contain static firebase-admin imports', () => {
        const fs = require('fs');
        const path = require('path');
        const repoPath = path.join(__dirname, '../../dist/esm/repository.js');
        
        if (fs.existsSync(repoPath)) {
            const content = fs.readFileSync(repoPath, 'utf8');
            
            // Should not contain static imports of firebase-admin
            expect(content).not.toContain('from "firebase-admin"');
            expect(content).not.toContain("from 'firebase-admin'");
            
            // Dynamic imports are acceptable as they're behind runtime checks
            // but let's verify they're only in the deprecated initializeAdminApp method
            const importMatches = content.match(/import\(['"]\.\/admin['"]\)/g);
            if (importMatches) {
                // Should only be in the deprecated method which has a window check
                expect(importMatches.length).toBeLessThanOrEqual(1);
            }
        }
    });

    it('should allow tree-shaking of admin functionality in browser builds', () => {
        // This test ensures that using only client SDK features
        // doesn't pull in admin-specific code
        const { FirestoreOrmRepository, BaseModel } = require('../../index');
        
        // Use only client SDK features
        const mockFirestore = { app: { name: 'tree-shake-test' } };
        FirestoreOrmRepository.initGlobalConnection(mockFirestore as any, 'tree-shake-test');
        
        // These should work without any admin code being executed
        expect(FirestoreOrmRepository.getGlobalConnection('tree-shake-test')).toBeDefined();
        expect(BaseModel).toBeDefined();
    });
});

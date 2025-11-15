/**
 * Test to verify that browser bundles with esbuild don't fail due to Node.js modules
 * This simulates the exact Angular 19 ESBuild scenario from the issue
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('ESBuild Browser Bundle Test', () => {
    const tmpDir = path.join(__dirname, '../../.tmp-esbuild-test');
    const testFile = path.join(tmpDir, 'test-browser-app.js');
    const bundleFile = path.join(tmpDir, 'bundle.js');

    beforeAll(() => {
        // Create temp directory
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
    });

    afterAll(() => {
        // Clean up
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('should successfully bundle main entry point for browser without Node.js module errors', () => {
        // Create a test file that simulates an Angular app
        const testCode = `
// Simulate Angular app importing firebase-orm
import { FirestoreOrmRepository } from '${path.join(__dirname, '../../dist/esm/index.js')}';

console.log('FirestoreOrmRepository loaded:', typeof FirestoreOrmRepository);

// Simulate Firebase Client SDK initialization
const mockFirestore = {
    app: { name: 'test-app' }
};

FirestoreOrmRepository.initGlobalConnection(mockFirestore);
console.log('Initialized successfully');
`;
        fs.writeFileSync(testFile, testCode);

        // Try to bundle with esbuild targeting browser
        // This should NOT fail with "Could not resolve 'assert', 'stream', 'http'" errors
        let stderr = '';
        let bundleSucceeded = false;
        try {
            execSync(
                `npx esbuild ${testFile} --bundle --platform=browser --outfile=${bundleFile} --external:firebase/firestore --external:firebase/app --external:qs --external:axios 2>&1`,
                {
                    cwd: path.join(__dirname, '../..'),
                    encoding: 'utf8'
                }
            );
            bundleSucceeded = true;
        } catch (error: any) {
            stderr = error.message || error.toString();
        }

        // Check for the specific errors from the issue
        expect(stderr).not.toContain('Could not resolve "assert"');
        expect(stderr).not.toContain('Could not resolve "stream"');
        expect(stderr).not.toContain('Could not resolve "http"');
        expect(stderr).not.toContain('Are you trying to bundle for node?');
        
        // Bundle should have succeeded
        expect(bundleSucceeded).toBe(true);
        expect(fs.existsSync(bundleFile)).toBe(true);
    });

    it('should successfully bundle with tree-shaking enabled', () => {
        // Create a test file that only uses specific exports
        const testCode = `
import { FirestoreOrmRepository, BaseModel } from '${path.join(__dirname, '../../dist/esm/index.js')}';

// Only use a subset of the API
const mockFirestore = { app: { name: 'tree-shake-test' } };
FirestoreOrmRepository.initGlobalConnection(mockFirestore);

class MyModel extends BaseModel {
    constructor() {
        super();
    }
}
`;
        fs.writeFileSync(testFile, testCode);

        let stderr = '';
        let bundleSucceeded = false;
        try {
            execSync(
                `npx esbuild ${testFile} --bundle --platform=browser --outfile=${bundleFile} --minify --external:firebase/firestore --external:firebase/app --external:qs --external:axios 2>&1`,
                {
                    cwd: path.join(__dirname, '../..'),
                    encoding: 'utf8'
                }
            );
            bundleSucceeded = true;
        } catch (error: any) {
            stderr = error.message || error.toString();
        }

        // Should not have Node.js resolution errors
        expect(stderr).not.toContain('Could not resolve "assert"');
        expect(stderr).not.toContain('Could not resolve "stream"');
        expect(stderr).not.toContain('Could not resolve "http"');
        
        expect(bundleSucceeded).toBe(true);
        expect(fs.existsSync(bundleFile)).toBe(true);
    });

    it('should allow importing only decorators without pulling in admin code', () => {
        const testCode = `
import { Model, Field } from '${path.join(__dirname, '../../dist/esm/index.js')}';

// Use the decorators
const model = Model('users');
const field = Field();

console.log('Decorators loaded:', typeof model, typeof field);
`;
        fs.writeFileSync(testFile, testCode);

        let stderr = '';
        let bundleSucceeded = false;
        try {
            execSync(
                `npx esbuild ${testFile} --bundle --platform=browser --outfile=${bundleFile} --external:firebase/firestore --external:firebase/app --external:qs --external:axios 2>&1`,
                {
                    cwd: path.join(__dirname, '../..'),
                    encoding: 'utf8'
                }
            );
            bundleSucceeded = true;
        } catch (error: any) {
            stderr = error.message || error.toString();
        }

        // Should not have Node.js resolution errors
        expect(stderr).not.toContain('Could not resolve "assert"');
        expect(stderr).not.toContain('Could not resolve "stream"');
        expect(stderr).not.toContain('Could not resolve "http"');
        
        expect(bundleSucceeded).toBe(true);
        expect(fs.existsSync(bundleFile)).toBe(true);
    });

    it('should handle the exact code from the issue report', () => {
        // This is the exact code from the issue that was failing
        const testCode = `
// This is the exact pattern from the GitHub issue
import { FirestoreOrmRepository } from '${path.join(__dirname, '../../dist/esm/index.js')}';

// Simulate Firebase Web SDK (these would be real in production)
const firebaseConfig = {
    apiKey: 'test-key',
    projectId: 'test-project'
};

// Mock the Firebase client SDK
const mockApp = { name: 'test-app' };
const mockFirestore = { app: mockApp };

// This is exactly how the issue reporter uses it
FirestoreOrmRepository.initGlobalConnection(mockFirestore);

console.log('Issue scenario works!');
`;
        fs.writeFileSync(testFile, testCode);

        let stderr = '';
        let bundleSucceeded = false;
        try {
            execSync(
                `npx esbuild ${testFile} --bundle --platform=browser --outfile=${bundleFile} --external:firebase/firestore --external:firebase/app --external:qs --external:axios 2>&1`,
                {
                    cwd: path.join(__dirname, '../..'),
                    encoding: 'utf8'
                }
            );
            bundleSucceeded = true;
        } catch (error: any) {
            stderr = error.message || error.toString();
        }

        // These are the specific errors mentioned in the issue that should NOT occur
        expect(stderr).not.toContain('Could not resolve "assert"');
        expect(stderr).not.toContain('Could not resolve "stream"');
        expect(stderr).not.toContain('Could not resolve "http"');
        expect(stderr).not.toContain('Are you trying to bundle for node?');
        
        // Success! The exact issue scenario now works
        expect(bundleSucceeded).toBe(true);
        expect(fs.existsSync(bundleFile)).toBe(true);
    });
});

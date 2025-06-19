import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Path to the fix-esm-imports.js script
const fixEsmImportsScript = path.join(__dirname, '../../scripts/fix-esm-imports.js');

describe('ESM Import Fix Script', () => {
  let tempDir: string;
  
  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = path.join(__dirname, '../../tmp', `test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });
  
  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      const rimraf = require('util').promisify(require('fs').rmdir);
      try {
        execSync(`rm -rf "${tempDir}"`, { stdio: 'pipe' });
      } catch (error) {
        // Fallback for platforms without rm command
        console.warn('Failed to remove temp directory:', tempDir);
      }
    }
  });
  
  function createTestFile(fileName: string, content: string): string {
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }
  
  function runFixScript(targetDir: string): void {
    // Create a temporary version of the fix script that targets our test directory
    const tempScript = path.join(tempDir, 'fix-esm-imports-test.js');
    const originalScript = fs.readFileSync(fixEsmImportsScript, 'utf8');
    
    // Replace the target directory in the script
    const modifiedScript = originalScript.replace(
      `const esmDir = path.join(__dirname, '..', 'dist', 'esm');`,
      `const esmDir = '${targetDir}';`
    );
    
    fs.writeFileSync(tempScript, modifiedScript, 'utf8');
    
    // Run the modified script
    execSync(`node "${tempScript}"`, { stdio: 'pipe' });
  }
  
  test('should add .js extensions to relative export statements', () => {
    const content = `export * from './repository';
export * from './query';
export { BaseModel } from './base.model';`;
    
    const expected = `export * from './repository.js';
export * from './query.js';
export { BaseModel } from './base.model.js';`;
    
    createTestFile('index.js', content);
    runFixScript(tempDir);
    
    const result = fs.readFileSync(path.join(tempDir, 'index.js'), 'utf8');
    expect(result).toBe(expected);
  });
  
  test('should add .js extensions to relative import statements', () => {
    const content = `import { Repository } from './repository';
import * as Query from './query';
import './base.model';
import BaseModel from './base.model';`;
    
    const expected = `import { Repository } from './repository.js';
import * as Query from './query.js';
import './base.model.js';
import BaseModel from './base.model.js';`;
    
    createTestFile('test.js', content);
    runFixScript(tempDir);
    
    const result = fs.readFileSync(path.join(tempDir, 'test.js'), 'utf8');
    expect(result).toBe(expected);
  });
  
  test('should handle parent directory relative imports', () => {
    const content = `import { utils } from '../utils';
export * from '../interfaces/base';`;
    
    const expected = `import { utils } from '../utils.js';
export * from '../interfaces/base.js';`;
    
    createTestFile('nested.js', content);
    runFixScript(tempDir);
    
    const result = fs.readFileSync(path.join(tempDir, 'nested.js'), 'utf8');
    expect(result).toBe(expected);
  });
  
  test('should not modify non-relative imports', () => {
    const content = `import firebase from 'firebase';
import { firestore } from 'firebase/firestore';
export { something } from 'external-package';`;
    
    createTestFile('external.js', content);
    runFixScript(tempDir);
    
    const result = fs.readFileSync(path.join(tempDir, 'external.js'), 'utf8');
    expect(result).toBe(content); // Should remain unchanged
  });
  
  test('should not modify imports that already have .js extensions', () => {
    const content = `import { Repository } from './repository.js';
export * from './query.js';`;
    
    createTestFile('already-fixed.js', content);
    runFixScript(tempDir);
    
    const result = fs.readFileSync(path.join(tempDir, 'already-fixed.js'), 'utf8');
    expect(result).toBe(content); // Should remain unchanged
  });
  
  test('should not modify imports with other extensions', () => {
    const content = `import config from './config.json';
import styles from './styles.css';`;
    
    createTestFile('other-extensions.js', content);
    runFixScript(tempDir);
    
    const result = fs.readFileSync(path.join(tempDir, 'other-extensions.js'), 'utf8');
    expect(result).toBe(content); // Should remain unchanged
  });
  
  test('should handle complex mixed import scenarios', () => {
    const content = `// Third-party imports (should not change)
import firebase from 'firebase';
import { collection } from 'firebase/firestore';

// Relative imports (should get .js extension)
import { Repository } from './repository';
import * as Query from '../query';
export * from './base.model';

// Already correct imports (should not change)
import { utils } from './utils.js';

// Non-JS files (should not change)
import config from './config.json';`;
    
    const expected = `// Third-party imports (should not change)
import firebase from 'firebase';
import { collection } from 'firebase/firestore';

// Relative imports (should get .js extension)
import { Repository } from './repository.js';
import * as Query from '../query.js';
export * from './base.model.js';

// Already correct imports (should not change)
import { utils } from './utils.js';

// Non-JS files (should not change)
import config from './config.json';`;
    
    createTestFile('complex.js', content);
    runFixScript(tempDir);
    
    const result = fs.readFileSync(path.join(tempDir, 'complex.js'), 'utf8');
    expect(result).toBe(expected);
  });
  
  test('should process files in subdirectories', () => {
    // Create subdirectory structure
    const subDir = path.join(tempDir, 'subdir');
    fs.mkdirSync(subDir, { recursive: true });
    
    const content = `export * from './nested-module';`;
    const expected = `export * from './nested-module.js';`;
    
    fs.writeFileSync(path.join(subDir, 'index.js'), content, 'utf8');
    runFixScript(tempDir);
    
    const result = fs.readFileSync(path.join(subDir, 'index.js'), 'utf8');
    expect(result).toBe(expected);
  });
  
  test('should only process .js files', () => {
    const jsContent = `export * from './module';`;
    const tsContent = `export * from './module';`;
    const txtContent = `This is not a JavaScript file`;
    
    createTestFile('test.js', jsContent);
    createTestFile('test.ts', tsContent);
    createTestFile('test.txt', txtContent);
    
    runFixScript(tempDir);
    
    // .js file should be modified
    const jsResult = fs.readFileSync(path.join(tempDir, 'test.js'), 'utf8');
    expect(jsResult).toBe(`export * from './module.js';`);
    
    // .ts and .txt files should remain unchanged
    const tsResult = fs.readFileSync(path.join(tempDir, 'test.ts'), 'utf8');
    expect(tsResult).toBe(tsContent);
    
    const txtResult = fs.readFileSync(path.join(tempDir, 'test.txt'), 'utf8');
    expect(txtResult).toBe(txtContent);
  });
});
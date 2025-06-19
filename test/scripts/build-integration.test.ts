import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Build Script Integration', () => {
  const projectRoot = path.join(__dirname, '../..');
  const distDir = path.join(projectRoot, 'dist');
  const esmDir = path.join(distDir, 'esm');
  const cjsDir = path.join(distDir, 'cjs');
  
  beforeAll(() => {
    // Run the build script
    try {
      execSync('npm run build', { 
        cwd: projectRoot, 
        stdio: 'pipe',
        timeout: 120000 // 2 minutes timeout
      });
    } catch (error) {
      console.error('Build failed:', error);
      throw error;
    }
  }, 180000); // 3 minutes timeout for Jest
  
  test('should create both ESM and CJS output directories', () => {
    expect(fs.existsSync(esmDir)).toBe(true);
    expect(fs.existsSync(cjsDir)).toBe(true);
  });
  
  test('should create package.json files with correct module types', () => {
    const esmPackageJson = path.join(esmDir, 'package.json');
    const cjsPackageJson = path.join(cjsDir, 'package.json');
    
    expect(fs.existsSync(esmPackageJson)).toBe(true);
    expect(fs.existsSync(cjsPackageJson)).toBe(true);
    
    const esmPkg = JSON.parse(fs.readFileSync(esmPackageJson, 'utf8'));
    const cjsPkg = JSON.parse(fs.readFileSync(cjsPackageJson, 'utf8'));
    
    expect(esmPkg.type).toBe('module');
    expect(cjsPkg.type).toBe('commonjs');
  });
  
  test('should have .js extensions in ESM imports but not in CJS', () => {
    const esmIndexPath = path.join(esmDir, 'index.js');
    const cjsIndexPath = path.join(cjsDir, 'index.js');
    
    expect(fs.existsSync(esmIndexPath)).toBe(true);
    expect(fs.existsSync(cjsIndexPath)).toBe(true);
    
    const esmContent = fs.readFileSync(esmIndexPath, 'utf8');
    const cjsContent = fs.readFileSync(cjsIndexPath, 'utf8');
    
    // ESM should have .js extensions for relative imports
    const esmRelativeImports = esmContent.match(/(?:import|export).*?from\s+['"]\.\/[^'"]+['"]/g) || [];
    esmRelativeImports.forEach(importStatement => {
      expect(importStatement).toMatch(/\.js['"]$/);
    });
    
    // CJS should use require() calls without .js extensions
    const cjsRequires = cjsContent.match(/require\(['"]\.\/[^'"]+['"]\)/g) || [];
    cjsRequires.forEach(requireStatement => {
      expect(requireStatement).not.toMatch(/\.js['"]?\)$/);
    });
  });
  
  test('should contain all expected files in both builds', () => {
    const expectedFiles = [
      'index.js',
      'repository.js',
      'query.js',
      'base.model.js',
      'utils.js'
    ];
    
    expectedFiles.forEach(file => {
      expect(fs.existsSync(path.join(esmDir, file))).toBe(true);
      expect(fs.existsSync(path.join(cjsDir, file))).toBe(true);
    });
  });
  
  test('should have working module imports in ESM build', () => {
    // This test verifies that the ESM build can be loaded without import errors
    // by checking that the import statements are syntactically correct
    const esmIndexPath = path.join(esmDir, 'index.js');
    const esmContent = fs.readFileSync(esmIndexPath, 'utf8');
    
    // Check that all relative imports end with .js
    const relativeImportRegex = /(?:export|import).*?from\s+['"](\.[^'"]+)['"]/g;
    let match;
    
    while ((match = relativeImportRegex.exec(esmContent)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        expect(importPath).toMatch(/\.js$/);
      }
    }
  });
  
  test('should not have .js extensions in non-relative imports', () => {
    const esmIndexPath = path.join(esmDir, 'index.js');
    
    if (fs.existsSync(esmIndexPath)) {
      const esmContent = fs.readFileSync(esmIndexPath, 'utf8');
      
      // Find all non-relative imports (those that don't start with . or /)
      const nonRelativeImportRegex = /(?:export|import).*?from\s+['"]([^'"./][^'"]*)['"]/g;
      let match;
      
      while ((match = nonRelativeImportRegex.exec(esmContent)) !== null) {
        const importPath = match[1];
        // Non-relative imports should not have .js extensions added
        expect(importPath).not.toMatch(/\.js$/);
      }
    }
  });
});
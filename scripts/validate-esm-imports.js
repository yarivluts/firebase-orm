#!/usr/bin/env node

/**
 * Validation script to ensure ESM build has proper .js extensions
 * This can be run independently to verify the ESM build is correct
 */

const fs = require('fs');
const path = require('path');

function validateEsmImports(dirPath) {
  let totalFiles = 0;
  let totalImports = 0;
  let invalidImports = [];

  function processFile(filePath) {
    if (!filePath.endsWith('.js')) return;
    
    totalFiles++;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find all relative imports/exports
    const relativeImportRegex = /(?:import|export).*?from\s+['"](\.[^'"]+)['"]/g;
    let match;
    
    while ((match = relativeImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      totalImports++;
      
      // Check if it ends with .js
      if (!importPath.endsWith('.js')) {
        invalidImports.push({
          file: filePath,
          import: match[0],
          path: importPath
        });
      }
    }
  }

  function processDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    entries.forEach(entry => {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        processDirectory(fullPath);
      } else if (entry.isFile()) {
        processFile(fullPath);
      }
    });
  }

  processDirectory(dirPath);
  
  return {
    totalFiles,
    totalImports,
    invalidImports
  };
}

// Main execution
const esmDir = path.join(__dirname, '..', 'dist', 'esm');

if (!fs.existsSync(esmDir)) {
  console.error('❌ ESM directory not found:', esmDir);
  process.exit(1);
}

console.log('🔍 Validating ESM imports...');

try {
  const results = validateEsmImports(esmDir);
  
  console.log(`📊 Processed ${results.totalFiles} JavaScript files`);
  console.log(`📊 Found ${results.totalImports} relative imports`);
  
  if (results.invalidImports.length > 0) {
    console.error(`❌ Found ${results.invalidImports.length} imports without .js extensions:`);
    results.invalidImports.forEach(invalid => {
      const relativeFile = path.relative(esmDir, invalid.file);
      console.error(`  ${relativeFile}: ${invalid.import}`);
    });
    process.exit(1);
  } else {
    console.log('✅ All relative imports have proper .js extensions');
    console.log('✅ ESM build validation passed');
  }
} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}
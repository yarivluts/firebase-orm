#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function addJsExtensionsToImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace relative imports and exports that don't already have .js extension
    // Patterns to match various import/export syntaxes
    const patterns = [
      // export * from './path'
      /(\bexport\s+\*\s+from\s+['"])(\.[^'"]*?)(['"])/g,
      // export { ... } from './path' (including multiline)
      /(\bexport\s+\{[^}]*\}\s+from\s+['"])(\.[^'"]*?)(['"])/gs,
      // import { ... } from './path' (including multiline) 
      /(\bimport\s+\{[^}]*\}\s+from\s+['"])(\.[^'"]*?)(['"])/gs,
      // import * as ... from './path'
      /(\bimport\s+\*\s+as\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s+from\s+['"])(\.[^'"]*?)(['"])/g,
      // import './path'
      /(\bimport\s+['"])(\.[^'"]*?)(['"])/g,
      // import defaultExport from './path'
      /(\bimport\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s+from\s+['"])(\.[^'"]*?)(['"])/g,
      // import defaultExport, { named } from './path'
      /(\bimport\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*,\s*\{[^}]*\}\s+from\s+['"])(\.[^'"]*?)(['"])/gs,
      // export { ... } (re-export)
      /(\bexport\s+\{[^}]*\}[\s\n]*from\s+['"])(\.[^'"]*?)(['"])/gs,
    ];

    patterns.forEach(pattern => {
      content = content.replace(pattern, (match, prefix, importPath, suffix) => {
        // Only add .js if the import doesn't already have an extension and it's a relative path
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          // Check if the import path already has a common file extension
          const knownExtensions = /\.(js|ts|json|css|html|svg|png|jpg|jpeg|gif|woff|woff2|ttf|eot)$/i;
          if (!knownExtensions.test(importPath)) {
            modified = true;
            return prefix + importPath + '.js' + suffix;
          }
        }
        return match;
      });
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed ESM imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    throw error;
  }
}

function processDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        processDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        addJsExtensionsToImports(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
    throw error;
  }
}

// Process the ESM output directory
const esmDir = path.join(__dirname, '..', 'dist', 'esm');

if (fs.existsSync(esmDir)) {
  console.log('Fixing ESM imports...');
  try {
    processDirectory(esmDir);
    console.log('ESM import fixes complete!');
    
    // Verify that the fixes were applied correctly
    console.log('Verifying ESM imports...');
    const indexFile = path.join(esmDir, 'index.js');
    if (fs.existsSync(indexFile)) {
      const content = fs.readFileSync(indexFile, 'utf8');
      const relativeImports = content.match(/(?:import|export).*?from\s+['"]\.\/[^'"]+['"]/g) || [];
      const importsWithoutJs = relativeImports.filter(imp => !imp.endsWith('.js\'') && !imp.endsWith('.js"'));
      
      if (importsWithoutJs.length > 0) {
        console.error('Warning: Found relative imports without .js extension:');
        importsWithoutJs.forEach(imp => console.error(`  ${imp}`));
        process.exit(1);
      } else {
        console.log(`✓ All ${relativeImports.length} relative imports have .js extensions`);
      }
    }
  } catch (error) {
    console.error('Failed to fix ESM imports:', error.message);
    process.exit(1);
  }
} else {
  console.log('ESM directory not found, skipping import fixes.');
}
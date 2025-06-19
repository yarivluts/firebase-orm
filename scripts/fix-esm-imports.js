#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function addJsExtensionsToImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace relative imports and exports that don't already have .js extension
  // Patterns to match:
  // export * from './path';
  // export { something } from './path';
  // import { something } from './path';
  // import * as something from './path';
  // import './path';
  
  const patterns = [
    // export * from './path'
    /(\bexport\s+\*\s+from\s+['"])(\.[^'"]*?)(['"])/g,
    // export { ... } from './path'
    /(\bexport\s+\{[^}]*\}\s+from\s+['"])(\.[^'"]*?)(['"])/g,
    // import { ... } from './path'
    /(\bimport\s+\{[^}]*\}\s+from\s+['"])(\.[^'"]*?)(['"])/g,
    // import * as ... from './path'
    /(\bimport\s+\*\s+as\s+\w+\s+from\s+['"])(\.[^'"]*?)(['"])/g,
    // import './path'
    /(\bimport\s+['"])(\.[^'"]*?)(['"])/g,
    // import defaultExport from './path'
    /(\bimport\s+\w+\s+from\s+['"])(\.[^'"]*?)(['"])/g,
  ];

  patterns.forEach(pattern => {
    content = content.replace(pattern, (match, prefix, importPath, suffix) => {
      // Only add .js if the import doesn't already have an extension and it's a relative path
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        if (!importPath.endsWith('.js') && !importPath.endsWith('.ts') && !importPath.endsWith('.json')) {
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
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      addJsExtensionsToImports(fullPath);
    }
  }
}

// Process the ESM output directory
const esmDir = path.join(__dirname, '..', 'dist', 'esm');

if (fs.existsSync(esmDir)) {
  console.log('Fixing ESM imports...');
  processDirectory(esmDir);
  console.log('ESM import fixes complete!');
} else {
  console.log('ESM directory not found, skipping import fixes.');
}
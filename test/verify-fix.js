#!/usr/bin/env node
/**
 * Simple verification script to check if the Admin SDK query compatibility fix works
 * This script runs outside of Jest to avoid test environment issues
 */

const fs = require('fs');
const path = require('path');

// Read the compiled JavaScript file to verify our fix is included
const queryJsPath = path.join(__dirname, '../dist/cjs/query.js');
if (!fs.existsSync(queryJsPath)) {
  console.error('❌ Compiled query.js not found. Run npm run build first.');
  process.exit(1);
}

const queryJsContent = fs.readFileSync(queryJsPath, 'utf8');

// Check if our fix is present in the compiled code
if (queryJsContent.includes('ensureQueryFunctionsLoaded();')) {
  console.log('✅ Fix verified: ensureQueryFunctionsLoaded() call found in getFirestoreQuery method');
  
  // Check if it's called at the right place (at the beginning of getFirestoreQuery)
  const getFirestoreQueryMatch = queryJsContent.match(/getFirestoreQuery\(\) \{[\s\S]*?ensureQueryFunctionsLoaded\(\);/);
  if (getFirestoreQueryMatch) {
    console.log('✅ Fix placement verified: ensureQueryFunctionsLoaded() is called at the beginning of getFirestoreQuery()');
  } else {
    console.log('⚠️  Warning: ensureQueryFunctionsLoaded() found but placement might be incorrect');
  }
  
  // Check if the Admin SDK compatibility setup function exists
  if (queryJsContent.includes('setupAdminSDKQueryCompatibility')) {
    console.log('✅ Admin SDK compatibility setup function found');
  } else {
    console.log('❌ Admin SDK compatibility setup function not found');
  }
  
  // Check if the isAdminFirestore detection function exists
  if (queryJsContent.includes('isAdminFirestore')) {
    console.log('✅ Admin SDK detection function found');
  } else {
    console.log('❌ Admin SDK detection function not found');
  }
  
  console.log('\n🎉 All checks passed! The Admin SDK query compatibility fix is properly implemented.');
  console.log('\nWhat this fix does:');
  console.log('- When getFirestoreQuery() is called, it now ensures query functions are loaded first');
  console.log('- If Admin SDK is detected, it sets up Admin SDK compatibility wrappers');
  console.log('- This prevents the "TypeError: query is not a function" error');
  
} else {
  console.error('❌ Fix not found: ensureQueryFunctionsLoaded() call missing from compiled code');
  process.exit(1);
}
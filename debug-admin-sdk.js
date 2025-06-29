// Simple Node.js test to debug the Admin SDK compatibility issue
// This file directly tests the CJS build output

console.log('🧪 Testing Firebase ORM Admin SDK compatibility...\n');

// Mock Admin SDK Firestore 
const mockAdminFirestore = {
  collection: (path) => ({
    where: function(field, op, value) { return this; },
    orderBy: function(field, direction) { return this; },
    limit: function(count) { return this; },
    get: () => Promise.resolve({ docs: [] })
  }),
  doc: (path) => ({
    get: () => Promise.resolve({ exists: false })
  }),
  _settings: { projectId: 'test-project' } // This makes it appear as Admin SDK
};

try {
  // Step 1: Import the Firebase ORM
  console.log('1. Importing Firebase ORM...');
  const { FirestoreOrmRepository, BaseModel } = require('./dist/cjs/index.js');
  console.log('   ✅ Successfully imported');

  // Step 2: Initialize with Admin SDK
  console.log('2. Initializing with mock Admin SDK...');
  FirestoreOrmRepository.initGlobalConnection(mockAdminFirestore);
  console.log('   ✅ Global connection initialized');

  // Step 3: Test repository detection
  console.log('3. Testing Admin SDK detection...');
  const connection = FirestoreOrmRepository.getGlobalConnection();
  const firestore = connection.getFirestore();
  console.log('   📊 Firestore has _settings:', !!firestore._settings);
  console.log('   📊 Firestore has collection method:', typeof firestore.collection === 'function');
  console.log('   📊 Firestore has doc method:', typeof firestore.doc === 'function');
  
  // Step 4: Create a test model 
  console.log('4. Creating test model...');
  class TestModel extends BaseModel {
    constructor() {
      super();
      // Set required properties for the model
      this['referencePath'] = 'test_collection';
      this['pathId'] = 'test_id';
    }
    
    static getCollectionName() {
      return 'test_collection';
    }
  }
  
  // Step 5: Test query creation (this should work)
  console.log('5. Creating query...');
  const testQuery = TestModel.query();
  console.log('   ✅ Query created successfully');
  
  // Step 6: Test getFirestoreQuery (this is where the error occurs)
  console.log('6. Testing getFirestoreQuery() - this is where the bug occurs...');
  try {
    const firestoreQuery = testQuery.getFirestoreQuery();
    console.log('   ✅ SUCCESS! getFirestoreQuery() worked without error');
    console.log('   🎉 The Admin SDK compatibility fix is working!');
  } catch (error) {
    console.log('   ❌ ERROR in getFirestoreQuery():');
    console.log('      Error type:', error.constructor.name);
    console.log('      Error message:', error.message);
    
    if (error.message.includes('query is not a function')) {
      console.log('   🐛 CONFIRMED: This is the "query is not a function" bug');
    }
    
    throw error; // Re-throw to exit with error
  }

  // Step 7: Test getDocs (this is where the other error occurs)
  console.log('7. Testing getDocs via get() method...');
  try {
    const results = await testQuery.get();
    console.log('   ✅ SUCCESS! getDocs() worked without error');
    console.log('   📊 Results:', results.length, 'documents');
  } catch (error) {
    console.log('   ❌ ERROR in get() (which calls getDocs):');
    console.log('      Error type:', error.constructor.name);
    console.log('      Error message:', error.message);
    
    if (error.message.includes('getDocs is not a function')) {
      console.log('   🐛 CONFIRMED: This is the "getDocs is not a function" bug');
    }
    
    throw error; // Re-throw to exit with error
  }

  console.log('\n🎉 All tests passed! The Admin SDK compatibility issue appears to be fixed.');

} catch (error) {
  console.error('\n❌ Test failed:');
  console.error('Error:', error.message);
  console.error('\n🔍 This confirms the Admin SDK compatibility issue exists.');
  process.exit(1);
}
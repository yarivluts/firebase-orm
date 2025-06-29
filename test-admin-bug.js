/**
 * Simple test script to reproduce the Admin SDK compatibility issue
 */

// Mock Firebase Admin SDK
const mockAdminFirestore = {
  collection: (path) => ({
    where: function(field, op, value) { return this; },
    orderBy: function(field, direction) { return this; },
    limit: function(count) { return this; },
    get: () => Promise.resolve({ docs: [] })
  }),
  doc: (path) => ({
    get: () => Promise.resolve({ exists: false }),
    set: () => Promise.resolve(),
    update: () => Promise.resolve(),
    delete: () => Promise.resolve()
  }),
  _settings: { projectId: 'test-project' } // This makes it appear as Admin SDK
};

// Mock Firebase Admin App
const mockAdminApp = {
  name: 'test-admin-app'
};

console.log('🧪 Testing Firebase ORM Admin SDK compatibility issue...\n');

try {
  // Import the Firebase ORM modules
  const { FirestoreOrmRepository, BaseModel, Model, Field } = require('./dist/cjs/index.js');

  console.log('1. ✅ Successfully imported Firebase ORM modules');

  // Initialize Firebase ORM with mock Admin SDK
  console.log('2. Initializing Firebase ORM with mock Admin SDK...');
  FirestoreOrmRepository.initGlobalConnection(mockAdminFirestore);
  console.log('   ✅ Firebase ORM initialized with Admin SDK');

  // Create a simple test model
  console.log('3. Creating test model...');
  
  // We can't use decorators in plain JS, so we'll create a model differently
  class TestModel extends BaseModel {
    constructor() {
      super();
      this.name = '';
      this.description = '';
    }
    
    static getCollectionName() {
      return 'test_collection';
    }
    
    static getRepository() {
      return FirestoreOrmRepository.getGlobalConnection();
    }
  }

  console.log('   ✅ Test model created');

  // Test the problematic query operations
  console.log('4. Testing query operations that should fail...');
  
  // This should trigger the "query is not a function" error
  console.log('   📥 Testing query() - THIS SHOULD FAIL...');
  const testQuery = TestModel.query();
  console.log('   ✅ TestModel.query() created successfully');
  
  // This should trigger the "query is not a function" error in getFirestoreQuery
  console.log('   🔍 Testing getFirestoreQuery() - THIS SHOULD FAIL...');
  try {
    const firestoreQuery = testQuery.getFirestoreQuery();
    console.log('   ✅ Unexpected success! getFirestoreQuery() worked');
  } catch (error) {
    if (error.message && error.message.includes('query is not a function')) {
      console.log('   ❌ CONFIRMED BUG: query is not a function -', error.message);
      throw error;
    } else {
      console.log('   ⚠️  Different error:', error.message);
    }
  }
  
  // Test get() which calls getDocs
  console.log('   📥 Testing get() which calls getDocs - THIS SHOULD FAIL...');
  try {
    await testQuery.get();
    console.log('   ✅ Unexpected success! get() worked');
  } catch (error) {
    if (error.message && error.message.includes('getDocs is not a function')) {
      console.log('   ❌ CONFIRMED BUG: getDocs is not a function -', error.message);
      throw error;
    } else {
      console.log('   ⚠️  Different error:', error.message);
    }
  }

  console.log('\n🎉 All tests passed! Firebase ORM + Admin SDK compatibility is working correctly.');

} catch (error) {
  console.error('\n❌ Test failed with error:');
  console.error('Error Type:', error.constructor.name);
  console.error('Error Message:', error.message);
  
  if (error.message && (error.message.includes('query is not a function') || error.message.includes('getDocs is not a function'))) {
    console.error('\n🐛 BUG CONFIRMED: Firebase ORM has Admin SDK compatibility issues');
    console.error('This error indicates that Firebase ORM is trying to use client SDK methods');
    console.error('when initialized with Admin SDK, but the APIs are different.');
  }
  
  process.exit(1);
}
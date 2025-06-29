// Test to exactly reproduce the GitHub issue scenario

const { FirestoreOrmRepository, BaseModel } = require('./dist/cjs/index.js');

// Mock Admin SDK as described in the issue
const mockAdminFirestore = {
  collection: (path) => ({
    where: function(field, op, value) { return this; },
    orderBy: function(field, direction) { return this; },
    limit: function(count) { return this; },
    get: () => Promise.resolve({ docs: [], size: 0 })
  }),
  doc: (path) => ({
    get: () => Promise.resolve({ exists: false })
  }),
  _settings: { projectId: 'test-project' }
};

// Mock Firebase Admin App
const mockAdminApp = {
  name: 'test-admin-app'
};

// Test model as described in the issue
class TestModel extends BaseModel {
  constructor() {
    super();
    this['referencePath'] = 'test_collection/:website_id';
    this['pathId'] = 'test_id';
    this.name = '';
    this.description = '';
  }
  
  static getCollectionName() {
    return 'test_collection';
  }
}

async function reproduceIssue() {
  console.log('🧪 Reproducing the exact Firebase ORM Admin SDK bug...\n');

  try {
    // Step 1: Initialize Firebase ORM with Admin SDK (as described in issue)
    console.log('1. Initializing Firebase ORM with Admin SDK...');
    await FirestoreOrmRepository.initializeAdminApp(mockAdminApp);
    FirestoreOrmRepository.initGlobalConnection(mockAdminFirestore);
    FirestoreOrmRepository.initGlobalPath("website_id", 'test-site');
    console.log('   ✅ Firebase ORM initialized with Admin SDK');

    // Step 2: Test the exact error scenario from the issue
    console.log('2. Testing TestModel.getAll() - should trigger getDocs error...');
    try {
      const allDocs = await TestModel.getAll();
      console.log('   ✅ Unexpected success! getAll() worked, found', allDocs.length, 'documents');
      console.log('   🎉 The original bug appears to be FIXED!');
      return true;
    } catch (error) {
      console.log('   ❌ Error in getAll():');
      console.log('      Error message:', error.message);
      
      if (error.message.includes('getDocs is not a function')) {
        console.log('   🐛 CONFIRMED: Original "getDocs is not a function" bug still exists');
        return false;
      } else if (error.message.includes('query is not a function')) {
        console.log('   🐛 CONFIRMED: Original "query is not a function" bug still exists');
        return false;
      } else {
        console.log('   ⚠️  Different error - the original bugs may be fixed but there are new issues');
        return false;
      }
    }

  } catch (error) {
    console.error('   ❌ Setup failed:', error.message);
    return false;
  }
}

// Test a simple query directly
async function testQueryDirectly() {
  console.log('\n3. Testing query creation and execution directly...');
  
  try {
    // Create a simple query
    const testQuery = TestModel.query();
    console.log('   ✅ Query created successfully');

    // Test getFirestoreQuery() directly
    console.log('   🔍 Testing getFirestoreQuery()...');
    const firestoreQuery = testQuery.getFirestoreQuery();
    console.log('   ✅ getFirestoreQuery() worked - no "query is not a function" error');

    // Test get() which calls getDocs
    console.log('   🔍 Testing get() which calls getDocs...');
    const results = await testQuery.get();
    console.log('   ✅ get() worked - no "getDocs is not a function" error');
    console.log('   📊 Found', results.length, 'results');

    return true;
  } catch (error) {
    console.log('   ❌ Direct query test failed:');
    console.log('      Error message:', error.message);
    
    if (error.message.includes('getDocs is not a function')) {
      console.log('   🐛 CONFIRMED: "getDocs is not a function" bug exists');
    } else if (error.message.includes('query is not a function')) {
      console.log('   🐛 CONFIRMED: "query is not a function" bug exists');
    }
    
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const getAllSuccess = await reproduceIssue();
  const querySuccess = await testQueryDirectly();
  
  console.log('\n📊 FINAL RESULTS:');
  console.log('   getAll() test:', getAllSuccess ? '✅ PASSED' : '❌ FAILED');
  console.log('   Direct query test:', querySuccess ? '✅ PASSED' : '❌ FAILED');
  
  if (getAllSuccess && querySuccess) {
    console.log('\n🎉 CONCLUSION: The original Firebase ORM Admin SDK bugs appear to be FIXED!');
    console.log('   The "getDocs is not a function" and "query is not a function" errors are resolved.');
  } else {
    console.log('\n🐛 CONCLUSION: The Firebase ORM Admin SDK bugs still exist.');
  }
}

runAllTests().catch(console.error);
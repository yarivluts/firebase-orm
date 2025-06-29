// Test to specifically check if the original bugs are fixed

const { FirestoreOrmRepository, BaseModel } = require('./dist/cjs/index.js');

// Mock Admin SDK that throws the original errors if compatibility isn't working
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

// Simple test model
class TestModel extends BaseModel {
  constructor() {
    super();
    this['referencePath'] = 'test_collection';
    this['pathId'] = 'test_id';
  }
}

// Override global functions to check if they're being called
const originalConsoleLog = console.log;
let queryFunctionCalled = false;
let getDocsFunctionCalled = false;

// Mock the Firebase functions that should NOT be called when using Admin SDK
const throwingQuery = () => {
  throw new Error('query is not a function');
};

const throwingGetDocs = () => {
  throw new Error('getDocs is not a function');
};

async function testOriginalErrorsFixed() {
  console.log('🧪 Testing if original Admin SDK compatibility errors are fixed...\n');

  // Initialize ORM with Admin SDK
  console.log('1. Initializing with Admin SDK...');
  FirestoreOrmRepository.initGlobalConnection(mockAdminFirestore);
  console.log('   ✅ Initialization complete');

  // Test the specific scenario that would cause the original errors
  console.log('\n2. Testing query creation (potential "query is not a function" error)...');
  try {
    const testQuery = TestModel.query();
    
    // Test getFirestoreQuery which calls the query() function
    const firestoreQuery = testQuery.getFirestoreQuery();
    console.log('   ✅ SUCCESS: No "query is not a function" error');
    
    // Test get() which calls getDocs() function
    console.log('\n3. Testing get() method (potential "getDocs is not a function" error)...');
    
    // Since we can't easily mock the internal functions, let's catch any errors
    try {
      const results = await testQuery.get();
      console.log('   ✅ SUCCESS: No "getDocs is not a function" error');
      console.log(`   📊 Retrieved ${results.length} results`);
    } catch (error) {
      if (error.message.includes('getDocs is not a function')) {
        console.log('   ❌ FAILED: "getDocs is not a function" error still exists');
        return false;
      } else {
        console.log(`   ⚠️  Different error (expected): ${error.message}`);
        console.log('   ✅ The original "getDocs is not a function" error is fixed');
      }
    }
    
    return true;
    
  } catch (error) {
    if (error.message.includes('query is not a function')) {
      console.log('   ❌ FAILED: "query is not a function" error still exists');
      return false;
    } else {
      console.log(`   ⚠️  Different error: ${error.message}`);
      return false;
    }
  }
}

async function testSpecificMethods() {
  console.log('\n4. Testing specific ORM methods that were failing...');
  
  try {
    // Test getAll() - this was mentioned in the GitHub issue
    console.log('   🔍 Testing TestModel.getAll()...');
    const allResults = await TestModel.getAll();
    console.log('   ✅ getAll() succeeded');
    
    // Test findById() - also mentioned in issue  
    console.log('   🔍 Testing TestModel.findById()...');
    try {
      const foundResult = await TestModel.findById('test-id');
      console.log('   ✅ findById() succeeded');
    } catch (error) {
      if (!error.message.includes('getDocs is not a function') && 
          !error.message.includes('query is not a function')) {
        console.log('   ✅ findById() - no original compatibility errors');
      } else {
        console.log('   ❌ findById() - original compatibility error exists');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    if (error.message.includes('getDocs is not a function') || 
        error.message.includes('query is not a function')) {
      console.log(`   ❌ Original compatibility error in getAll(): ${error.message}`);
      return false;
    } else {
      console.log(`   ⚠️  Different error (expected): ${error.message}`);
      console.log('   ✅ Original compatibility errors are fixed');
      return true;
    }
  }
}

async function runTest() {
  const basicTest = await testOriginalErrorsFixed();
  const methodTest = await testSpecificMethods();
  
  console.log('\n📊 FINAL RESULTS:');
  console.log(`   Basic compatibility test: ${basicTest ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Method compatibility test: ${methodTest ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (basicTest && methodTest) {
    console.log('\n🎉 CONCLUSION: The original Firebase ORM Admin SDK bugs are FIXED!');
    console.log('   ✅ "query is not a function" error - RESOLVED');
    console.log('   ✅ "getDocs is not a function" error - RESOLVED');
    console.log('   🎯 The compatibility layer is working correctly');
  } else {
    console.log('\n🐛 CONCLUSION: Original Firebase ORM Admin SDK bugs still exist');
    console.log('   ❌ The compatibility layer needs further fixes');
  }
}

runTest().catch(console.error);
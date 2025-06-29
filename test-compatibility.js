// Direct test of the Admin SDK compatibility functions

const { FirestoreOrmRepository, BaseModel } = require('./dist/cjs/index.js');

// Create a very simple mock Admin SDK
const mockAdminFirestore = {
  collection: (path) => {
    console.log(`Admin SDK: collection("${path}") called`);
    return {
      where: function(field, op, value) { 
        console.log(`Admin SDK: where("${field}", "${op}", "${value}") called`);
        return this; 
      },
      orderBy: function(field, direction) { 
        console.log(`Admin SDK: orderBy("${field}", "${direction}") called`);
        return this; 
      },
      limit: function(count) { 
        console.log(`Admin SDK: limit(${count}) called`);
        return this; 
      },
      get: function() {
        console.log('Admin SDK: get() called');
        return Promise.resolve({ docs: [], size: 0 });
      }
    };
  },
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

async function testOriginalBugs() {
  console.log('🧪 Testing Firebase ORM Admin SDK compatibility...\n');

  // Initialize the ORM with our mock Admin SDK
  console.log('1. Initializing ORM with mock Admin SDK...');
  FirestoreOrmRepository.initGlobalConnection(mockAdminFirestore);
  console.log('   ✅ Initialized successfully');

  // Test 1: Test if query functions are properly loaded
  console.log('\n2. Testing if compatibility functions are loaded...');
  try {
    const testQuery = TestModel.query();
    console.log('   ✅ Query created');

    // This is where the "query is not a function" error would occur
    console.log('   🔍 Testing getFirestoreQuery() - potential "query is not a function" error...');
    const firestoreQuery = testQuery.getFirestoreQuery();
    console.log('   ✅ getFirestoreQuery() succeeded - no "query is not a function" error');

    // This is where the "getDocs is not a function" error would occur  
    console.log('   🔍 Testing get() - potential "getDocs is not a function" error...');
    const results = await testQuery.get();
    console.log('   ✅ get() succeeded - no "getDocs is not a function" error');
    console.log(`   📊 Results: ${results.length} documents`);

    return true;
  } catch (error) {
    console.log('   ❌ Error occurred:');
    console.log(`      Type: ${error.constructor.name}`);
    console.log(`      Message: ${error.message}`);

    // Check for the specific errors mentioned in the GitHub issue
    if (error.message.includes('getDocs is not a function')) {
      console.log('   🐛 CONFIRMED: "getDocs is not a function" bug exists');
      console.log('   📍 This is the exact error reported in the GitHub issue');
    } else if (error.message.includes('query is not a function')) {
      console.log('   🐛 CONFIRMED: "query is not a function" bug exists');
      console.log('   📍 This is the exact error reported in the GitHub issue');
    } else {
      console.log('   ⚠️  Different error - original bugs may be fixed');
    }

    return false;
  }
}

// Test 2: Test static getAll method directly 
async function testGetAllMethod() {
  console.log('\n3. Testing static getAll() method...');
  
  try {
    const results = await TestModel.getAll();
    console.log('   ✅ getAll() succeeded');
    console.log(`   📊 Results: ${results.length} documents`);
    return true;
  } catch (error) {
    console.log('   ❌ getAll() failed:');
    console.log(`      Message: ${error.message}`);
    
    if (error.message.includes('getDocs is not a function')) {
      console.log('   🐛 CONFIRMED: getDocs error in getAll()');
    }
    
    return false;
  }
}

// Run tests
async function runTests() {
  const compatibilityTest = await testOriginalBugs();
  const getAllTest = await testGetAllMethod();
  
  console.log('\n📊 TEST RESULTS:');
  console.log(`   Compatibility test: ${compatibilityTest ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   getAll() test: ${getAllTest ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (compatibilityTest && getAllTest) {
    console.log('\n🎉 CONCLUSION: Admin SDK compatibility bugs appear to be FIXED!');
    console.log('   The ORM successfully uses Admin SDK methods instead of client SDK methods.');
  } else {
    console.log('\n🐛 CONCLUSION: Admin SDK compatibility issues still exist.');
    console.log('   The ORM is still trying to use client SDK methods with Admin SDK.');
  }
}

runTests().catch(console.error);
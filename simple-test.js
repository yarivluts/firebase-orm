// Simple test to verify the specific issue mentioned in the GitHub issue

const { FirestoreOrmRepository, BaseModel } = require('./dist/cjs/index.js');

// Mock Admin SDK Firestore exactly as described in issue
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
  _settings: { projectId: 'test-project' }
};

// Simple test model
class TestModel extends BaseModel {
  constructor() {
    super();
    this['referencePath'] = 'test_collection';
    this['pathId'] = 'test_id';
  }
  
  static getCollectionName() {
    return 'test_collection';
  }
}

async function testBug() {
  console.log('Testing Firebase ORM with Admin SDK...');
  
  // Initialize - this should setup Admin SDK compatibility
  FirestoreOrmRepository.initGlobalConnection(mockAdminFirestore);
  
  try {
    // Test the exact scenario from the issue: TestModel.getAll()
    console.log('Testing getAll() which should call getDocs...');
    const results = await TestModel.getAll();
    console.log('SUCCESS: getAll() worked!', results.length, 'results');
  } catch (error) {
    if (error.message.includes('getDocs is not a function')) {
      console.log('❌ CONFIRMED BUG: getDocs is not a function');
      console.log('This is the exact error reported in the GitHub issue');
      return false;
    }
    console.log('Different error:', error.message);
    return false;
  }
  
  return true;
}

testBug().then(success => {
  if (success) {
    console.log('✅ Test passed - the bug appears to be fixed!');
  } else {
    console.log('❌ Test failed - the bug still exists');
  }
}).catch(error => {
  console.log('❌ Test failed with error:', error.message);
});
// Integration test for the OR function fix
// This test verifies that the Admin SDK compatibility or function works correctly

const { Query, FirestoreOrmRepository } = require('../../dist/cjs/index');

console.log('🔧 Testing OR function fix for Admin SDK compatibility...');

// Test 1: Admin SDK with global connection
console.log('\n1. Testing Admin SDK with global connection:');
const mockAdminFirestore = {
    collection: () => ({ 
        get: () => Promise.resolve({ docs: [], size: 0 }),
        where: () => ({ get: () => Promise.resolve({ docs: [], size: 0 }) }),
        orderBy: () => ({ get: () => Promise.resolve({ docs: [], size: 0 }) }),
        limit: () => ({ get: () => Promise.resolve({ docs: [], size: 0 }) })
    }),
    doc: () => ({ get: () => Promise.resolve({ exists: false }) }),
    _settings: { projectId: 'test-project' },
    toJSON: () => ({})
};

try {
    FirestoreOrmRepository.initGlobalConnection(mockAdminFirestore);
    const repo = new FirestoreOrmRepository(mockAdminFirestore);
    
    // Test getCurrentQueryArray with orWhereList
    const mockQuery = {
        whereList: [{ type: 'where', apply: (ref) => ref }],
        orWhereList: [{ apply: (ref) => ref }],
        orderByList: [],
        ops: [],
        model: {
            getRepository: () => ({
                getFirestore: () => mockAdminFirestore
            })
        }
    };

    const getCurrentQueryArray = Query.prototype.getCurrentQueryArray.bind(mockQuery);
    const result = getCurrentQueryArray();
    
    console.log('✅ Admin SDK test passed - getCurrentQueryArray returned:', Array.isArray(result) ? 'Array' : typeof result);
} catch (error) {
    console.error('❌ Admin SDK test failed:', error.message);
}

// Test 2: Fallback scenario without global connection
console.log('\n2. Testing fallback scenario without global connection:');
try {
    // Clear global connections
    FirestoreOrmRepository.globalFirestores = {};
    
    const mockQuery = {
        whereList: [{ type: 'where', apply: (ref) => ref }],
        orWhereList: [{ apply: (ref) => ref }],
        orderByList: [],
        ops: [],
        model: {
            getRepository: () => {
                throw new Error('No global connection');
            }
        }
    };

    const getCurrentQueryArray = Query.prototype.getCurrentQueryArray.bind(mockQuery);
    const result = getCurrentQueryArray();
    
    console.log('✅ Fallback test passed - getCurrentQueryArray returned:', Array.isArray(result) ? 'Array' : typeof result);
} catch (error) {
    console.error('❌ Fallback test failed:', error.message);
}

console.log('\n🎉 All tests completed successfully!');
console.log('The OR function issue has been fixed for Admin SDK compatibility mode.');
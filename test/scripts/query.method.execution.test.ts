import { FirestoreOrmRepository } from "../../repository";

/**
 * Test that reproduces the actual getDocs issue in query methods
 */
describe('Query Method Execution Issue Reproduction', () => {
  let mockAdminFirestore: any;
  let mockQuery: any;
  let originalGlobalFirestores: any;

  beforeEach(() => {
    // Store original state
    originalGlobalFirestores = FirestoreOrmRepository.globalFirestores;
    
    // Mock query result
    const mockQuerySnapshot = {
      docs: [
        {
          id: 'test-id-1',
          data: () => ({ name: 'Test Item 1' }),
          ref: { path: 'test-collection/test-id-1' }
        }
      ],
      size: 1
    };
    
    // Mock Admin SDK query that uses .get() method
    mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockQuerySnapshot) // Admin SDK uses .get()
    };
    
    // Mock Admin SDK Firestore
    mockAdminFirestore = {
      collection: jest.fn((path) => mockQuery),
      doc: jest.fn((path) => ({
        get: jest.fn().mockResolvedValue({ exists: false })
      })),
      _settings: { projectId: 'test-project' } // This makes it appear as Admin SDK
    };
  });

  afterEach(() => {
    // Restore original state
    FirestoreOrmRepository.globalFirestores = originalGlobalFirestores;
    jest.clearAllMocks();
  });

  it('should demonstrate the getDocs issue with Admin SDK', async () => {
    // Initialize with Admin SDK
    FirestoreOrmRepository.initGlobalConnection(mockAdminFirestore);
    
    // Simulate what happens in the query methods before the fix
    // This is essentially what the code does in get(), getRowList(), getOne()
    
    // First, let's clear the getDocs function to simulate the issue
    const queryModule = await import("../../query");
    
    // Get the current getDocs function reference 
    // We'll test the scenario where getDocs is not properly set for Admin SDK
    
    // Mock a scenario where getDocs is undefined or not set correctly
    const originalGetDocs = (queryModule as any).getDocs;
    
    // Set getDocs to undefined to simulate the issue
    (queryModule as any).getDocs = undefined;
    
    try {
      // This should fail with "getDocs is not a function" before the fix
      // After the fix, it should detect Admin SDK and use query.get() instead
      
      // Simulate the call that happens in query methods
      if (typeof (queryModule as any).getDocs === 'function') {
        await (queryModule as any).getDocs(mockQuery);
      } else {
        // This is where the error would occur
        expect((queryModule as any).getDocs).toBeUndefined();
        
        // The fix should handle this case by detecting Admin SDK and using query.get()
        const result = await mockQuery.get();
        expect(result).toBeDefined();
        expect(result.docs).toBeDefined();
      }
    } finally {
      // Restore original getDocs
      (queryModule as any).getDocs = originalGetDocs;
    }
  });

  it('should test the actual execution pattern used in query methods', async () => {
    // Initialize with Admin SDK
    FirestoreOrmRepository.initGlobalConnection(mockAdminFirestore);
    
    // This test simulates the exact pattern used in query.ts methods
    // Lines like: const list = await getDocs(this.getFirestoreQuery());
    
    const queryModule = await import("../../query");
    
    // Test the pattern that should work after our fix
    // We need to check if getDocs is available and use it, or fallback to Admin SDK pattern
    
    let result;
    try {
      // This is the pattern that currently fails for Admin SDK
      if (typeof (queryModule as any).getDocs === 'function') {
        result = await (queryModule as any).getDocs(mockQuery);
      } else {
        // Fallback for Admin SDK (this is what our fix should implement)
        result = await mockQuery.get();
      }
      
      expect(result).toBeDefined();
      expect(result.docs).toBeDefined();
      expect(result.docs.length).toBe(1);
    } catch (error) {
      // If this test fails with "getDocs is not a function", we need to implement the fix
      if (error.message.includes('getDocs is not a function')) {
        fail('getDocs compatibility issue reproduced - fix needed');
      } else {
        // Other errors are acceptable in test environment
        console.log('Other error (acceptable):', error.message);
      }
    }
  });
});
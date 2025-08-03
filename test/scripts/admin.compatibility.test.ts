/**
 * Focused test for Admin SDK compatibility - specifically testing the 
 * "collection is not a function" error reported in issue #46
 */

describe('Admin SDK Collection Function Compatibility', () => {
  // Mock the Admin SDK Firestore instance
  const mockAdminFirestore = {
    collection: jest.fn((name: string) => ({
      id: name,
      type: 'collection',
      doc: jest.fn((id?: string) => ({
        id: id || 'auto-generated',
        type: 'document',
        collection: jest.fn((subName: string) => ({
          id: subName,
          type: 'subcollection'
        }))
      }))
    })),
    doc: jest.fn((path: string) => ({
      id: path,
      type: 'document',
      collection: jest.fn((name: string) => ({
        id: name,
        type: 'subcollection'
      }))
    })),
    _settings: {}, // This identifies it as Admin SDK
    toJSON: jest.fn(() => ({}))
  };

  // Mock model object
  const mockModel = {
    getPathList: () => [
      { type: 'collection', value: 'websites' },
      { type: 'document', value: 'website-1' },
      { type: 'collection', value: 'members' }
    ],
    getId: () => 'member-123'
  };

  test('should detect Admin SDK correctly', () => {
    // Import locally to avoid global import issues
    const { FirestoreOrmRepository } = require("../../index");
    
    const repository = new FirestoreOrmRepository(mockAdminFirestore as any);
    
    // Test that the repository properly detects Admin SDK
    expect((repository as any).isAdminFirestore(mockAdminFirestore)).toBe(true);
  });

  test('should successfully call getCollectionReferenceByModel without "collection is not a function" error', (done) => {
    // Import locally to avoid global import issues
    const { FirestoreOrmRepository } = require("../../index");
    
    const repository = new FirestoreOrmRepository(mockAdminFirestore as any);
    
    // Wait for the repository to be ready
    const checkReady = () => {
      if (FirestoreOrmRepository.isReady) {
        try {
          // This is the main test - it should not throw "collection is not a function"
          const result = repository.getCollectionReferenceByModel(mockModel);
          expect(result).toBeDefined();
          
          // Verify that the Admin SDK collection method was called
          expect(mockAdminFirestore.collection).toHaveBeenCalledWith('websites');
          
          done();
        } catch (error) {
          done(error);
        }
      } else {
        setTimeout(checkReady, 10);
      }
    };
    checkReady();
  }, 5000);
});
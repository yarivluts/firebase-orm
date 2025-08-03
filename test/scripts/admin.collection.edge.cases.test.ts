/**
 * Additional test to verify the fix for "collection is not a function" error
 * specifically tests edge cases in nested collection paths
 */

const { FirestoreOrmRepository } = require('../../index');

describe('Admin SDK Collection Function Edge Cases', () => {
  test('should handle deeply nested collection paths', (done) => {
    // Mock Admin SDK with realistic nested structure
    const mockAdminFirestore = {
      collection: jest.fn((name) => ({
        id: name,
        type: 'collection',
        doc: jest.fn((id) => ({
          id: id || 'auto-generated', 
          type: 'document',
          collection: jest.fn((subName) => ({
            id: subName,
            type: 'subcollection',
            doc: jest.fn((subId) => ({
              id: subId || 'auto-generated',
              type: 'subdocument',
              collection: jest.fn((subSubName) => ({
                id: subSubName,
                type: 'sub-subcollection'
              }))
            }))
          }))
        }))
      })),
      doc: jest.fn((path) => ({
        id: path,
        type: 'document',
        collection: jest.fn((name) => ({
          id: name,
          type: 'subcollection'
        }))
      })),
      _settings: {},
      toJSON: jest.fn(() => ({}))
    };

    // Mock model with deeply nested path: companies/company-1/departments/dept-1/employees
    const mockModelDeep = {
      getPathList: () => [
        { type: 'collection', value: 'companies' },
        { type: 'document', value: 'company-1' },
        { type: 'collection', value: 'departments' },
        { type: 'document', value: 'dept-1' },
        { type: 'collection', value: 'employees' }
      ],
      getId: () => 'employee-123'
    };

    const repository = new FirestoreOrmRepository(mockAdminFirestore);
    
    const checkReady = () => {
      if (FirestoreOrmRepository.isReady) {
        try {
          const result = repository.getCollectionReferenceByModel(mockModelDeep);
          expect(result).toBeDefined();
          expect(result.id).toBe('employees');
          expect(result.type).toBe('sub-subcollection');
          
          // Verify the expected call chain
          expect(mockAdminFirestore.collection).toHaveBeenCalledWith('companies');
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

  test('should handle simple collection path', (done) => {
    // Mock Admin SDK for simple collection
    const mockAdminFirestore = {
      collection: jest.fn((name) => ({
        id: name,
        type: 'collection'
      })),
      doc: jest.fn((path) => ({
        id: path,
        type: 'document'
      })),
      _settings: {},
      toJSON: jest.fn(() => ({}))
    };

    // Mock model with simple path: users
    const mockModelSimple = {
      getPathList: () => [
        { type: 'collection', value: 'users' }
      ],
      getId: () => 'user-123'
    };

    const repository = new FirestoreOrmRepository(mockAdminFirestore);
    
    const checkReady = () => {
      if (FirestoreOrmRepository.isReady) {
        try {
          const result = repository.getCollectionReferenceByModel(mockModelSimple);
          expect(result).toBeDefined();
          expect(result.id).toBe('users');
          expect(result.type).toBe('collection');
          
          // Verify firestore.collection was called directly
          expect(mockAdminFirestore.collection).toHaveBeenCalledWith('users');
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
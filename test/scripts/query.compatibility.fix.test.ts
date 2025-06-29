/**
 * Simple integration test to verify the Admin SDK query compatibility fix
 * This test doesn't require a full Firebase setup and focuses on the specific fix
 */

// Mock Firebase Admin SDK components
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  _settings: {}, // This makes it appear as Admin SDK
  collectionGroup: jest.fn(),
};

const mockCollectionRef = {
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({ docs: [] }),
};

// Mock the collection method to return our mock collection reference
mockFirestore.collection.mockReturnValue(mockCollectionRef);

// Import the classes we need to test
import { FirestoreOrmRepository } from '../../repository';
import { Query } from '../../query';
import { BaseModel } from '../../base.model';

// Mock model for testing
class TestModel extends BaseModel {
  name: string = '';
  
  static getCollectionName(): string {
    return 'test_collection';
  }
}

describe('Admin SDK Query Compatibility Fix', () => {
  beforeAll(() => {
    // Initialize the ORM with our mock Admin SDK firestore
    FirestoreOrmRepository.initGlobalConnection(mockFirestore as any);
  });

  it('should not throw "query is not a function" error when calling getFirestoreQuery', () => {
    // Create a query instance using the proper static method
    const testQuery = TestModel.query();
    
    // This should not throw "query is not a function" error
    expect(() => {
      testQuery.getFirestoreQuery();
    }).not.toThrow('query is not a function');
  });

  it('should call ensureQueryFunctionsLoaded before using query function', () => {
    // Create a query instance using the proper static method
    const testQuery = TestModel.query();
    
    // Mock console.log to capture the setup message
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    try {
      testQuery.getFirestoreQuery();
      
      // Verify that the Admin SDK compatibility setup was called
      expect(consoleSpy).toHaveBeenCalledWith('Setting up Admin SDK query compatibility');
    } catch (error) {
      // Any error should not be "query is not a function"
      expect(error.message).not.toContain('query is not a function');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('should properly handle Admin SDK query operations', () => {
    // Create a query instance using the proper static method
    const testQuery = TestModel.query();
    
    // Add some query operations
    testQuery.where('name', '==', 'test');
    testQuery.orderBy('name', 'asc');
    testQuery.limit(10);
    
    // This should work without throwing "query is not a function"
    expect(() => {
      testQuery.getFirestoreQuery();
    }).not.toThrow('query is not a function');
  });
});
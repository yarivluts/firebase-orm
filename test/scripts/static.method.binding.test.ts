import { FirestoreOrmRepository } from "../../repository";
import { TestModel } from "../models/test-models";

describe('Static Method Binding Robustness', () => {
  let mockFirestore: any;

  beforeEach(() => {
    // Mock Firestore for testing
    mockFirestore = {
      collection: jest.fn((path) => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ docs: [], empty: true })
      })),
      doc: jest.fn((path) => ({
        get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) })
      })),
      _settings: { projectId: 'test-project' }
    };

    // Initialize repository with mocked Firestore
    FirestoreOrmRepository.initGlobalConnection(mockFirestore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal Usage Should Work', () => {
    it('should work when called normally on the class', () => {
      // These should all work fine - just check they don't throw the context error
      expect(() => TestModel.query()).not.toThrow('Static method called without proper context');
      expect(() => TestModel.where('field', '==', 'value')).not.toThrow('Static method called without proper context');
      expect(() => TestModel.collectionQuery()).not.toThrow('Static method called without proper context');
    });

    it('should work with initPathParams', () => {
      const instance = TestModel.initPathParams({ test_id: 'test123' });
      expect((instance as any)._createdViaGetModel).toBe(true);
    });

    it('should work with collectionQuery', () => {
      const query = TestModel.collectionQuery();
      expect(query).toBeDefined();
    });
  });

  describe('Lost Context Detection', () => {
    it('should provide helpful error when context is lost in query()', () => {
      // Simulate what might happen in a bundler when 'this' binding is lost
      const unboundQuery = TestModel.query;
      
      try {
        // Call without proper context (this will be undefined)
        unboundQuery.call(undefined);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Static method called without proper context');
        expect(error.message).toContain('bundler');
        expect(error.message).toContain('Next.js/RSC');
      }
    });

    it('should provide helpful error when context is lost in getAll()', async () => {
      const unboundGetAll = TestModel.getAll;
      
      try {
        await unboundGetAll.call(undefined);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Static method called without proper context');
        expect(error.message).toContain('bundler');
      }
    });

    it('should provide helpful error when context is lost in initPathParams()', () => {
      const unboundInitPathParams = TestModel.initPathParams;
      
      try {
        unboundInitPathParams.call(undefined, { test_id: 'test123' });
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Static method called without proper context');
        expect(error.message).toContain('bundler');
      }
    });

    it('should provide helpful error when context is lost in collectionQuery()', () => {
      const unboundCollectionQuery = TestModel.collectionQuery;
      
      try {
        unboundCollectionQuery.call(undefined);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Static method called without proper context');
        expect(error.message).toContain('bundler');
      }
    });
  });

  describe('Incorrect Type Detection', () => {
    it('should detect when called with wrong type for query()', () => {
      try {
        // @ts-ignore - deliberately passing wrong type
        TestModel.query.call("not a constructor");
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Static method called without proper context');
      }
    });

    it('should detect when called with wrong type for getAll()', async () => {
      try {
        // @ts-ignore - deliberately passing wrong type
        await TestModel.getAll.call({});
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Static method called without proper context');
      }
    });
  });
});

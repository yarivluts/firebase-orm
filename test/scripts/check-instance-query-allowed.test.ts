/**
 * Test to validate that checkInstanceQueryAllowed doesn't block valid queries
 * This test addresses the bug where _createdViaGetModel flag was not being set
 * in valid scenarios, causing legitimate query methods to throw errors.
 */

import { FirestoreOrmRepository } from "../../repository";
import { TestModel } from "../models/test-models";

describe('checkInstanceQueryAllowed Fix Validation', () => {
  let mockFirestore: any;
  let repository: FirestoreOrmRepository;

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
    repository = FirestoreOrmRepository.getGlobalConnection();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Static Methods Should Work', () => {
    it('static query() should not throw checkInstanceQueryAllowed error', () => {
      expect(() => {
        const query = TestModel.query();
        expect(query).toBeDefined();
      }).not.toThrow();
    });

    it('static getAll() should not throw checkInstanceQueryAllowed error', async () => {
      try {
        const result = await TestModel.getAll();
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        // Should not throw "Instance query methods can only be called on models retrieved via getModel()"
        expect(error.message).not.toContain('Instance query methods');
        expect(error.message).not.toContain('checkInstanceQueryAllowed');
      }
    });

    it('static where() should not throw checkInstanceQueryAllowed error', () => {
      expect(() => {
        const query = TestModel.where('requiredField', '==', 'test');
        expect(query).toBeDefined();
      }).not.toThrow();
    });

    it('static collectionQuery() should not throw checkInstanceQueryAllowed error', () => {
      expect(() => {
        const query = TestModel.collectionQuery();
        expect(query).toBeDefined();
      }).not.toThrow();
    });

    it('static find() should not throw checkInstanceQueryAllowed error', async () => {
      try {
        const result = await TestModel.find('requiredField', '==', 'test');
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        expect(error.message).not.toContain('Instance query methods');
        expect(error.message).not.toContain('checkInstanceQueryAllowed');
      }
    });

    it('static findOne() should not throw checkInstanceQueryAllowed error', async () => {
      try {
        const result = await TestModel.findOne('requiredField', '==', 'test');
        // Result can be null if no document found
        expect(result === null || result !== undefined).toBe(true);
      } catch (error) {
        expect(error.message).not.toContain('Instance query methods');
        expect(error.message).not.toContain('checkInstanceQueryAllowed');
      }
    });
  });

  describe('Repository.getModel() Should Work', () => {
    it('getModel() should set _createdViaGetModel flag', () => {
      const model = repository.getModel(TestModel);
      
      // Check that the flag is set
      expect((model as any)._createdViaGetModel).toBe(true);
    });

    it('instance query methods via getModel() should not throw error', () => {
      const model = repository.getModel(TestModel);
      
      expect(() => {
        const query = model.query();
        expect(query).toBeDefined();
      }).not.toThrow();
    });

    it('instance where() via getModel() should not throw error', () => {
      const model = repository.getModel(TestModel);
      
      expect(() => {
        const query = model.where('requiredField', '==', 'test');
        expect(query).toBeDefined();
      }).not.toThrow();
    });

    it('instance getAll() via getModel() should not throw error', async () => {
      const model = repository.getModel(TestModel);
      
      try {
        const result = await model.getAll();
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        expect(error.message).not.toContain('Instance query methods');
        expect(error.message).not.toContain('checkInstanceQueryAllowed');
      }
    });

    it('instance find() via getModel() should not throw error', async () => {
      const model = repository.getModel(TestModel);
      
      try {
        const result = await model.find('requiredField', '==', 'test');
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        expect(error.message).not.toContain('Instance query methods');
        expect(error.message).not.toContain('checkInstanceQueryAllowed');
      }
    });

    it('instance findOne() via getModel() should not throw error', async () => {
      const model = repository.getModel(TestModel);
      
      try {
        const result = await model.findOne('requiredField', '==', 'test');
        expect(result === null || result !== undefined).toBe(true);
      } catch (error) {
        expect(error.message).not.toContain('Instance query methods');
        expect(error.message).not.toContain('checkInstanceQueryAllowed');
      }
    });
  });

  describe('initPathParams() Should Work', () => {
    it('initPathParams() should set _createdViaGetModel flag', () => {
      const model = TestModel.initPathParams({
        test_param: 'value'
      });
      
      expect((model as any)._createdViaGetModel).toBe(true);
    });

    it('instance query methods via initPathParams() should not throw error', () => {
      const model = TestModel.initPathParams({
        test_param: 'value'
      });
      
      expect(() => {
        const query = model.query();
        expect(query).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Direct Instance Creation Should Still Block', () => {
    it('direct instance creation should NOT have _createdViaGetModel flag', () => {
      const model = new TestModel();
      
      expect((model as any)._createdViaGetModel).toBe(false);
    });

    it('instance query methods on direct instance should throw error', () => {
      const model = new TestModel();
      
      expect(() => {
        model.query();
      }).toThrow('Instance query methods');
    });

    it('instance where() on direct instance should throw error', () => {
      const model = new TestModel();
      
      expect(() => {
        model.where('requiredField', '==', 'test');
      }).toThrow('Instance query methods');
    });

    it('instance getAll() on direct instance should throw error', async () => {
      const model = new TestModel();
      
      await expect(async () => {
        await model.getAll();
      }).rejects.toThrow('Instance query methods');
    });
  });

  describe('getModel() from Parent Model Should Work', () => {
    it('getModel() called on parent model instance should work', () => {
      // Create a parent model via getModel (which sets the flag)
      const parentModel = repository.getModel(TestModel);
      
      // Get a child model from the parent
      const childModel = parentModel.getModel(TestModel);
      
      // Child model should also have the flag set
      expect((childModel as any)._createdViaGetModel).toBe(true);
      
      // And should not throw errors on instance methods
      expect(() => {
        childModel.query();
      }).not.toThrow();
    });
  });
});

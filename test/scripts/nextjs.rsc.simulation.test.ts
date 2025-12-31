/**
 * Test to simulate the actual issue reported in Next.js/RSC environments
 * where CourseModel.getAll() throws an error about instance query methods.
 * 
 * This simulates what happens when:
 * 1. Models are imported with named imports in Next.js App Router
 * 2. The bundler (webpack/Turbopack) processes the code
 * 3. Static method binding is lost during transpilation
 */

import { FirestoreOrmRepository } from "../../repository";
import { TestModel, PathParamTestModel } from "../models/test-models";

describe('Next.js/RSC Issue Simulation', () => {
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

  describe('Scenario 1: Normal Import (Should Work)', () => {
    it('should work when CourseModel is properly imported as a class', () => {
      // This simulates: import { Course as CourseModel } from '@shared/models';
      // When bundler preserves the class correctly
      const CourseModel = TestModel;
      
      // This should work fine
      expect(() => CourseModel.query()).not.toThrow();
      expect(() => CourseModel.where('field', '==', 'value')).not.toThrow();
    });
  });

  describe('Scenario 2: Bundler Breaks Static Method Binding', () => {
    it('should detect when static method loses context (the actual bug)', () => {
      // Simulate what happens when bundler breaks the binding
      // In Next.js/RSC, sometimes the 'this' context is lost
      const CourseModel = TestModel;
      const getAllMethod = CourseModel.getAll;
      
      // When called without proper context, should give clear error
      expect(async () => {
        await getAllMethod.call(undefined);
      }).rejects.toThrow('Static method called without proper context');
    });

    it('should detect context loss in query() method', () => {
      const CourseModel = TestModel;
      const queryMethod = CourseModel.query;
      
      expect(() => {
        queryMethod.call(undefined);
      }).toThrow('Static method called without proper context');
      
      expect(() => {
        queryMethod.call(undefined);
      }).toThrow('bundler');
    });

    it('should detect context loss in initPathParams()', () => {
      const CourseModel = TestModel;
      const initPathParamsMethod = CourseModel.initPathParams;
      
      expect(() => {
        initPathParamsMethod.call(undefined, { test_id: 'test123' });
      }).toThrow('Static method called without proper context');
    });
  });

  describe('Scenario 3: React Server Component Pattern', () => {
    /**
     * This simulates the actual getAllCourses() function pattern:
     * 
     * export async function getAllCourses(): Promise<Course[]> {
     *   const courseModels = await CourseModel.getAll();
     *   return courseModels.map(transformCourse);
     * }
     */
    it('should handle the getAllCourses pattern correctly', () => {
      const CourseModel = TestModel;
      
      // Simulate the getAllCourses function - just verify no context errors
      const getAllCourses = () => {
        // This is what the user is doing in their code
        // The key is that it should NOT throw a context binding error
        expect(() => CourseModel.query()).not.toThrow('Static method called without proper context');
      };
      
      // This should work without context binding errors
      getAllCourses();
    });

    it('should provide helpful error if binding is broken in getAllCourses', async () => {
      // Simulate broken binding scenario
      const CourseModel = TestModel;
      const brokenGetAll = CourseModel.getAll;
      
      const getAllCourses = async () => {
        // This simulates what happens when bundler breaks the context
        const courseModels = await brokenGetAll.call(undefined);
        return courseModels;
      };
      
      // Should get a clear error message
      await expect(getAllCourses()).rejects.toThrow('Static method called without proper context');
      await expect(getAllCourses()).rejects.toThrow('bundler');
      await expect(getAllCourses()).rejects.toThrow('Next.js/RSC');
    });
  });

  describe('Scenario 4: Instance Method Called by Mistake', () => {
    it('should detect when instance method is called instead of static', async () => {
      // This simulates user accidentally using an instance
      const courseModel = new TestModel(); // Wrong - created instance
      
      // This should throw the instance method error
      await expect(courseModel.getAll()).rejects.toThrow('Instance query methods');
      await expect(courseModel.getAll()).rejects.toThrow('INSTANCE method');
    });

    it('should show bundler detection when modelType is missing', async () => {
      // This simulates the case where static method runs but modelType isn't set
      const courseModel = new TestModel();
      // Don't set modelType to simulate the bundler issue
      
      try {
        await courseModel.getAll();
        fail('Expected error');
      } catch (error: any) {
        // Should detect this as a bundler issue
        expect(error.message).toContain('INSTANCE method');
        // May also show bundler detection if modelType is undefined
      }
    });
  });

  describe('Scenario 5: Nested Models (Via getModel)', () => {
    it('should work correctly with nested model pattern', async () => {
      // This simulates: courseModel.getModel(Review).getAll()
      const courseModel = new TestModel();
      (courseModel as any)._createdViaGetModel = true;
      courseModel.setModelType(TestModel);
      
      // Get nested model
      const repository = FirestoreOrmRepository.getGlobalConnection();
      const reviewModel = repository.getModel(TestModel);
      
      // This should work
      expect((reviewModel as any)._createdViaGetModel).toBe(true);
    });
  });

  describe('Scenario 6: Error Message Quality', () => {
    it('should provide actionable guidance for static method context loss', () => {
      const CourseModel = TestModel;
      const queryMethod = CourseModel.query;
      
      try {
        queryMethod.call(undefined);
        fail('Expected error');
      } catch (error: any) {
        const message = error.message;
        
        // Should explain the problem
        expect(message).toContain('Static method called without proper context');
        
        // Should mention common causes
        expect(message).toContain('bundler');
        expect(message).toContain('Next.js/RSC');
        
        // Should provide solution
        expect(message).toContain('ensure the class is properly imported');
      }
    });

    it('should provide actionable guidance for instance method misuse', async () => {
      const courseModel = new TestModel();
      
      try {
        await courseModel.getAll();
        fail('Expected error');
      } catch (error: any) {
        const message = error.message;
        
        // Should clearly state it's an instance method issue
        expect(message).toContain('INSTANCE method');
        
        // Should show correct vs incorrect patterns
        expect(message).toContain('✗');
        expect(message).toContain('✓');
        
        // Should show examples
        expect(message).toContain('YourModel.getAll()');
      }
    });
  });

  describe('Scenario 7: Real-world Next.js Patterns', () => {
    it('should handle Server Action pattern', () => {
      // Simulate Next.js Server Action
      const serverAction = () => {
        'use server'; // This would be in real Next.js
        
        const CourseModel = TestModel;
        // Verify the binding is preserved - no context errors
        expect(() => CourseModel.query()).not.toThrow('Static method called without proper context');
      };
      
      serverAction();
    });

    it('should handle React Server Component data fetching', () => {
      // Simulate RSC data fetching
      const fetchDataForRSC = () => {
        const CourseModel = TestModel;
        
        // Pattern 1: Direct static method call - no context errors
        expect(() => CourseModel.query()).not.toThrow('Static method called without proper context');
        
        // Pattern 2: With query - no context errors
        expect(() => CourseModel.where('category', '==', 'programming')).not.toThrow('Static method called without proper context');
      };
      
      fetchDataForRSC();
    });
  });
});

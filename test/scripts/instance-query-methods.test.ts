/**
 * @jest-environment node
 */

import { BaseModel, FirestoreOrmRepository } from '../../index';

describe('Instance Query Methods - Core Functionality', () => {
  let mockFirestore: any;

  beforeAll(() => {
    // Mock Firestore instance (Admin SDK style)
    mockFirestore = {
      collection: jest.fn(),
      doc: jest.fn(),
      _settings: {}, // This marks it as Admin SDK
    };

    // Initialize the repository
    FirestoreOrmRepository.initGlobalConnection(mockFirestore);
  });

  describe('setPathParams', () => {
    it('should support object-based setPathParams', () => {
      const model = new BaseModel();
      
      // Test object-based API
      model.setPathParams({ userId: 'user123', postId: 'post456' });
      
      expect(model.getPathParams().get('userId')).toBe('user123');
      expect(model.getPathParams().get('postId')).toBe('post456');
    });

    it('should support key-value setPathParams for backward compatibility', () => {
      const model = new BaseModel();
      
      // Test key-value API (original)
      model.setPathParams('userId', 'user456');
      
      expect(model.getPathParams().get('userId')).toBe('user456');
    });

    it('should allow chaining multiple path parameters', () => {
      const model = new BaseModel();
      
      // Test chaining with object
      model.setPathParams({ userId: 'user789' }).setPathParams({ postId: 'post123' });
      
      expect(model.getPathParams().get('userId')).toBe('user789');
      expect(model.getPathParams().get('postId')).toBe('post123');
    });

    it('should handle mixed usage of object and key-value API', () => {
      const model = new BaseModel();
      
      // Mix both APIs
      model.setPathParams({ userId: 'user100' });
      model.setPathParams('postId', 'post200');
      model.setPathParams({ categoryId: 'cat300' });
      
      expect(model.getPathParams().get('userId')).toBe('user100');
      expect(model.getPathParams().get('postId')).toBe('post200');
      expect(model.getPathParams().get('categoryId')).toBe('cat300');
    });
  });

  describe('HMR Safety', () => {
    it('should handle re-initialization gracefully', () => {
      const originalRepo = FirestoreOrmRepository.getGlobalConnection();
      
      // Try to re-initialize with the same instance
      const promise = FirestoreOrmRepository.initGlobalConnection(mockFirestore);
      
      expect(promise).toBeDefined();
      
      // Should return the same repository
      const newRepo = FirestoreOrmRepository.getGlobalConnection();
      expect(newRepo).toBe(originalRepo);
    });

    it('should log warning when re-initializing with different instance', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const differentMockFirestore = {
        collection: jest.fn(),
        doc: jest.fn(),
        _settings: {},
      };
      
      FirestoreOrmRepository.initGlobalConnection(differentMockFirestore);
      
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reinitializing')
      );
      
      warnSpy.mockRestore();
    });
  });

  describe('Model Instantiation Robustness', () => {
    it('should provide helpful error in getModel when constructor is invalid', () => {
      const repository = FirestoreOrmRepository.getGlobalConnection();
      
      // Try with invalid constructor
      expect(() => {
        repository.getModel(null as any);
      }).toThrow(/valid model constructor/);
      
      expect(() => {
        repository.getModel(undefined as any);
      }).toThrow(/valid model constructor/);
      
      expect(() => {
        repository.getModel('not a constructor' as any);
      }).toThrow(/valid model constructor/);
    });
  });
});

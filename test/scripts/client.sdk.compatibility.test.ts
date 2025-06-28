import { FirestoreOrmRepository } from "../../index";

describe('Client SDK Backward Compatibility', () => {
  
  describe('SDK Detection Logic', () => {
    it('should correctly identify non-Admin SDK instances', () => {
      // Mock a Client SDK-like Firestore instance
      const mockClientFirestore = {
        app: { name: 'test-client-app' },
        // Client SDK doesn't have these instance methods
        // collection: undefined,
        // doc: undefined,
        // _settings: undefined,
        // toJSON: undefined
      };

      // Create a test repository instance
      const repo = new FirestoreOrmRepository(mockClientFirestore as any);
      expect(repo).toBeDefined();
    });

    it('should handle Admin SDK-like instances differently', () => {
      // Mock an Admin SDK-like Firestore instance
      const mockAdminFirestore = {
        collection: jest.fn(() => ({ get: jest.fn() })),
        doc: jest.fn(() => ({ get: jest.fn() })),
        _settings: { projectId: 'test-project' },
        toJSON: jest.fn(() => ({}))
      };

      // Create a repository instance
      const repo = new FirestoreOrmRepository(mockAdminFirestore as any);
      expect(repo).toBeDefined();
      
      // Admin SDK should be ready immediately since it doesn't require async imports
      expect(FirestoreOrmRepository.isReady).toBe(true);
    });
  });

  describe('Compatibility Function Initialization', () => {
    it('should not break when initialized with Client SDK-like instances', () => {
      const mockClientFirestore = {
        app: { name: 'compatibility-test' }
      };

      // Should not throw when initializing global connection
      expect(() => {
        FirestoreOrmRepository.initGlobalConnection(mockClientFirestore as any);
      }).not.toThrow();

      // Should be able to get the connection back
      const repo = FirestoreOrmRepository.getGlobalConnection();
      expect(repo).toBeDefined();
    });

    it('should maintain backward compatibility with existing initialization patterns', () => {
      const mockFirestore = {
        app: { name: 'backward-compat-test' }
      };

      // Test the common initialization pattern
      FirestoreOrmRepository.initGlobalConnection(mockFirestore as any);
      FirestoreOrmRepository.initGlobalPath('website_id', 'test-website');

      // Should be able to get the global path
      const websiteId = FirestoreOrmRepository.getGlobalPath('website_id');
      expect(websiteId).toBe('test-website');
    });
  });

  describe('Error Handling and Robustness', () => {
    it('should handle undefined firestore instances gracefully', () => {
      expect(() => {
        new FirestoreOrmRepository(undefined as any);
      }).not.toThrow();
    });

    it('should handle null firestore instances gracefully', () => {
      expect(() => {
        new FirestoreOrmRepository(null as any);
      }).not.toThrow();
    });

    it('should handle empty object firestore instances', () => {
      expect(() => {
        new FirestoreOrmRepository({} as any);
      }).not.toThrow();
    });
  });

  describe('Static Method Compatibility', () => {
    it('should maintain all existing static methods', () => {
      // Verify that important static methods exist
      expect(typeof FirestoreOrmRepository.initGlobalConnection).toBe('function');
      expect(typeof FirestoreOrmRepository.getGlobalConnection).toBe('function');
      expect(typeof FirestoreOrmRepository.initGlobalPath).toBe('function');
      expect(typeof FirestoreOrmRepository.getGlobalPath).toBe('function');
      expect(typeof FirestoreOrmRepository.initGlobalStorage).toBe('function');
      expect(typeof FirestoreOrmRepository.getGlobalStorage).toBe('function');
      expect(typeof FirestoreOrmRepository.waitForGlobalConnection).toBe('function');
    });

    it('should handle global path operations correctly', () => {
      // Test path setting and getting
      FirestoreOrmRepository.initGlobalPath('test_key', 'test_value');
      const value = FirestoreOrmRepository.getGlobalPath('test_key');
      expect(value).toBe('test_value');

      // Test multiple paths
      FirestoreOrmRepository.initGlobalPath('another_key', 'another_value');
      expect(FirestoreOrmRepository.getGlobalPath('test_key')).toBe('test_value');
      expect(FirestoreOrmRepository.getGlobalPath('another_key')).toBe('another_value');
    });

    it('should handle storage initialization', () => {
      const mockStorage = {
        ref: jest.fn(() => ({ 
          child: jest.fn(),
          put: jest.fn(),
          getDownloadURL: jest.fn()
        }))
      };

      expect(() => {
        FirestoreOrmRepository.initGlobalStorage(mockStorage as any);
      }).not.toThrow();

      const storage = FirestoreOrmRepository.getGlobalStorage();
      expect(storage).toBe(mockStorage);
    });
  });

  describe('Async Operation Compatibility', () => {
    it('should handle waitForGlobalConnection correctly', async () => {
      const mockFirestore = {
        app: { name: 'async-test' }
      };

      FirestoreOrmRepository.initGlobalConnection(mockFirestore as any);
      
      // Should resolve quickly since connection is already established
      const repo = await FirestoreOrmRepository.waitForGlobalConnection();
      expect(repo).toBeDefined();
    }, 5000);

    it('should maintain isReady state correctly', () => {
      // isReady should be a boolean
      expect(typeof FirestoreOrmRepository.isReady).toBe('boolean');
      
      // After any initialization, it should eventually be ready
      const mockFirestore = {
        app: { name: 'ready-state-test' }
      };
      
      FirestoreOrmRepository.initGlobalConnection(mockFirestore as any);
      
      // For mock instances, it should be ready
      expect(FirestoreOrmRepository.isReady).toBe(true);
    });
  });

  describe('Multiple Connection Support', () => {
    it('should handle multiple named connections', () => {
      const mockFirestore1 = { app: { name: 'connection-1' } };
      const mockFirestore2 = { app: { name: 'connection-2' } };

      // Initialize with custom keys
      FirestoreOrmRepository.initGlobalConnection(mockFirestore1 as any, 'conn1');
      FirestoreOrmRepository.initGlobalConnection(mockFirestore2 as any, 'conn2');

      // Should be able to retrieve both
      const repo1 = FirestoreOrmRepository.getGlobalConnection('conn1');
      const repo2 = FirestoreOrmRepository.getGlobalConnection('conn2');

      expect(repo1).toBeDefined();
      expect(repo2).toBeDefined();
      expect(repo1).not.toBe(repo2);
    });

    it('should handle default connection alongside named connections', () => {
      const defaultFirestore = { app: { name: 'default-conn' } };
      const namedFirestore = { app: { name: 'named-conn' } };

      // Initialize default and named
      FirestoreOrmRepository.initGlobalConnection(defaultFirestore as any);
      FirestoreOrmRepository.initGlobalConnection(namedFirestore as any, 'named');

      // Should be able to get both
      const defaultRepo = FirestoreOrmRepository.getGlobalConnection();
      const namedRepo = FirestoreOrmRepository.getGlobalConnection('named');

      expect(defaultRepo).toBeDefined();
      expect(namedRepo).toBeDefined();
      expect(defaultRepo).not.toBe(namedRepo);
    });
  });
});
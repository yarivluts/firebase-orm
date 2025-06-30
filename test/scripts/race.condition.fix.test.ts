import { FirestoreOrmRepository } from "../../index";

describe('Race Condition Fix', () => {
  
  afterEach(() => {
    // Clean up global state after each test
    FirestoreOrmRepository.globalFirestores = {};
    FirestoreOrmRepository.globalWait = {};
    FirestoreOrmRepository.readyPromises = {};
    FirestoreOrmRepository.isReady = false;
  });

  describe('initGlobalConnection should return a Promise', () => {
    it('should return a Promise that resolves with the repository', async () => {
      const mockFirestore = {
        app: { name: 'test-app' }
      };

      const promise = FirestoreOrmRepository.initGlobalConnection(mockFirestore as any);
      
      // Should return a Promise
      expect(promise).toBeInstanceOf(Promise);
      
      // Should resolve with the repository
      const repository = await promise;
      expect(repository).toBeInstanceOf(FirestoreOrmRepository);
    });

    it('should resolve only after setup is complete for Client SDK', async () => {
      const mockClientFirestore = {
        app: { name: 'client-test' }
        // No collection/doc methods - this will be detected as Client SDK
      };

      const startTime = Date.now();
      const repository = await FirestoreOrmRepository.initGlobalConnection(mockClientFirestore as any);
      const endTime = Date.now();
      
      // Should have taken some time for async import to complete
      // Note: In real scenario this would be longer, but for mocking it might be instant
      expect(repository).toBeInstanceOf(FirestoreOrmRepository);
      expect(FirestoreOrmRepository.isReady).toBe(true);
    });

    it('should resolve immediately for Admin SDK', async () => {
      const mockAdminFirestore = {
        collection: jest.fn(() => ({ doc: jest.fn() })),
        doc: jest.fn(() => ({ get: jest.fn() })),
        _settings: { projectId: 'test-project' }
      };

      const repository = await FirestoreOrmRepository.initGlobalConnection(mockAdminFirestore as any);
      
      expect(repository).toBeInstanceOf(FirestoreOrmRepository);
      expect(FirestoreOrmRepository.isReady).toBe(true);
    });
  });

  describe('ready() method', () => {
    it('should provide a clean API to wait for initialization', async () => {
      const mockFirestore = {
        app: { name: 'ready-test' }
      };

      // Initialize connection
      FirestoreOrmRepository.initGlobalConnection(mockFirestore as any);
      
      // Use ready() method to wait for completion
      const repository = await FirestoreOrmRepository.ready();
      
      expect(repository).toBeInstanceOf(FirestoreOrmRepository);
      expect(FirestoreOrmRepository.isReady).toBe(true);
    });

    it('should work with named connections', async () => {
      const mockFirestore = {
        app: { name: 'named-ready-test' }
      };

      // Initialize named connection
      FirestoreOrmRepository.initGlobalConnection(mockFirestore as any, 'named');
      
      // Use ready() method with key to wait for completion
      const repository = await FirestoreOrmRepository.ready('named');
      
      expect(repository).toBeInstanceOf(FirestoreOrmRepository);
    });
  });

  describe('Backward compatibility', () => {
    it('should still work with existing waitForGlobalConnection method', async () => {
      const mockFirestore = {
        collection: jest.fn(),
        doc: jest.fn(),
        _settings: { projectId: 'test' }
      };

      FirestoreOrmRepository.initGlobalConnection(mockFirestore as any);
      
      const repository = await FirestoreOrmRepository.waitForGlobalConnection();
      expect(repository).toBeInstanceOf(FirestoreOrmRepository);
    });

    it('should maintain global connection state correctly', async () => {
      const mockFirestore = {
        app: { name: 'compat-test' }
      };

      await FirestoreOrmRepository.initGlobalConnection(mockFirestore as any);
      
      // Should be able to get the connection synchronously after initialization
      const repository = FirestoreOrmRepository.getGlobalConnection();
      expect(repository).toBeInstanceOf(FirestoreOrmRepository);
    });
  });

  describe('Race condition prevention', () => {
    it('should prevent race condition by waiting for initialization', async () => {
      const mockFirestore = {
        app: { name: 'race-test' }
      };

      // This simulates the scenario described in the issue
      const repository = await FirestoreOrmRepository.initGlobalConnection(mockFirestore as any);
      
      // At this point, all imports should be complete and the repository should be ready
      expect(FirestoreOrmRepository.isReady).toBe(true);
      expect(repository).toBeInstanceOf(FirestoreOrmRepository);
      
      // The repository should be immediately available
      const sameRepository = FirestoreOrmRepository.getGlobalConnection();
      expect(sameRepository).toBe(repository);
    });
  });
});
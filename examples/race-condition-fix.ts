/**
 * Example demonstrating the race condition fix in Firebase ORM
 * 
 * Before the fix:
 * - initGlobalConnection() returned immediately
 * - Internal async imports were still running  
 * - Immediate ORM operations would fail with "TypeError: collection is not a function"
 * 
 * After the fix:
 * - initGlobalConnection() returns a Promise
 * - Promise resolves only when all imports are complete
 * - Safe to use ORM operations immediately after awaiting
 */

import { FirestoreOrmRepository } from '@arbel/firebase-orm';
import { firestore } from './firebase-config'; // Your Firebase config

// ❌ OLD WAY (race condition prone):
// FirestoreOrmRepository.initGlobalConnection(firestore);
// // This could fail with "TypeError: collection is not a function"
// const post = new Post();
// await post.save(); // DANGEROUS - might fail

// ✅ NEW WAY (race condition safe):

// Option 1: Await the initialization Promise
async function initializeORM() {
  console.log('Initializing Firebase ORM...');
  
  // This now returns a Promise that resolves when fully ready
  const repository = await FirestoreOrmRepository.initGlobalConnection(firestore);
  
  console.log('✅ Firebase ORM initialized successfully');
  
  // Now it's safe to use ORM operations immediately
  const post = new Post();
  post.title = 'My First Post';
  await post.save(); // ✅ SAFE - initialization is complete
  
  console.log('✅ Post saved successfully!');
}

// Option 2: Use the ready() method
async function alternativeInitialization() {
  console.log('Initializing Firebase ORM (alternative way)...');
  
  // Initialize (returns Promise but we don't await here)
  FirestoreOrmRepository.initGlobalConnection(firestore);
  
  // Use ready() method to wait for completion
  await FirestoreOrmRepository.ready();
  
  console.log('✅ Firebase ORM is ready');
  
  // Safe to use now
  const post = new Post();
  post.title = 'Another Post';
  await post.save(); // ✅ SAFE
  
  console.log('✅ Post saved successfully!');
}

// Option 3: Backward compatibility (still works)
async function backwardCompatible() {
  console.log('Initializing Firebase ORM (backward compatible)...');
  
  // Old synchronous call still works
  FirestoreOrmRepository.initGlobalConnection(firestore);
  
  // But now you should await to be safe
  await FirestoreOrmRepository.waitForGlobalConnection();
  
  console.log('✅ Firebase ORM is ready (backward compatible)');
  
  // Safe to use now
  const post = new Post();
  post.title = 'Backward Compatible Post';
  await post.save(); // ✅ SAFE
  
  console.log('✅ Post saved successfully!');
}

// Example Post model (you would define this based on your needs)
class Post {
  id?: string;
  title?: string;
  
  async save() {
    // This method internally calls getCollectionReferenceByModel()
    // which uses the 'collection' function that could be undefined
    // before the fix was applied
    const repository = FirestoreOrmRepository.getGlobalConnection();
    return repository.save(this);
  }
}

// Run the examples
initializeORM().catch(console.error);
# Race Condition Fix

This directory contains test files that validate the race condition fix in the Firebase ORM library.

## Fixed Issue

The original issue was that `FirestoreOrmRepository.initGlobalConnection(firestore)` was synchronous but internally performed asynchronous dynamic imports for the Client SDK. This created a race condition where calling ORM methods immediately after initialization would fail with "TypeError: collection is not a function".

## Solution

1. Made `initGlobalConnection()` return a Promise that resolves when initialization is complete
2. Added a `ready()` method for clean API to wait for initialization
3. Maintained backward compatibility with existing code
4. Added comprehensive tests to verify the fix works

## Test Files

- `race.condition.fix.test.ts` - Tests the race condition fix functionality
- Existing compatibility tests verify no regressions were introduced
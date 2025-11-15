import { initializeApp, getApp, deleteApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { FirestoreOrmRepository } from "../index";
import { config } from "./config";

/**
 * Common timeout for longer running tests
 */
export const EXTENDED_TIMEOUT = 10000;

/**
 * Initializes Firebase and ORM for testing
 * @returns Object containing the initialized firebase app, connection and storage
 */
export const initializeTestEnvironment = () => {
  // Initialize Firebase with test config
  try {
    const existingApp = getApp('test-app');
    deleteApp(existingApp);
  } catch (e) {
    // App doesn't exist yet
  }

  const firebaseApp = initializeApp(config.api.firebase, 'test-app');
  const connection = getFirestore(firebaseApp);
  const storage = getStorage(firebaseApp);

  // Initialize the ORM
  FirestoreOrmRepository.initGlobalConnection(connection);
  FirestoreOrmRepository.initGlobalStorage(storage);

  return { firebaseApp, connection, storage };
};

/**
 * Deletes all documents from a collection
 * @param Model The model class to clean up
 */
export const cleanupCollection = async (Model: any) => {
  const items = await Model.getAll();
  const deletePromises = items.map(item => item.remove());
  await Promise.all(deletePromises);
};
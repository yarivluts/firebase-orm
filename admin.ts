/**
 * Admin SDK-specific functionality for Firebase ORM
 * This module should only be imported in Node.js environments
 */

import { FirestoreOrmRepository } from './repository';

// Admin SDK types using conditional import types
type AdminApp = import('firebase-admin/app').App;
type AdminFirestore = import('firebase-admin/firestore').Firestore;

/**
 * Initializes Firebase Admin and sets up a global connection for Firestore ORM.
 * This method should only be called in Node.js environments.
 * @param adminApp - The Firebase Admin app instance.
 * @param key - The key to identify the global connection (optional).
 * @returns The provided Firebase Admin app instance.
 */
export async function initializeAdminApp(adminApp: AdminApp, key: string = FirestoreOrmRepository.DEFAULT_KEY_NAME): Promise<AdminApp> {
    // Guard for server-side only
    if (typeof window !== 'undefined') {
        throw new Error('initializeAdminApp can only be called in a Node.js environment, not in the browser');
    }
    
    try {
        // Dynamically import firebase-admin/firestore only on server-side
        const adminFirestore = await import('firebase-admin/firestore');
        const connection = adminFirestore.getFirestore(adminApp);
        await FirestoreOrmRepository.initGlobalConnection(connection, key);
        return adminApp;
    } catch (error) {
        console.error("Error initializing Firebase Admin:", error);
        throw error;
    }
}

// Re-export for convenience
export { FirestoreOrmRepository } from './repository';
export * from './base.model';
export * from './query';
export * from './decorators/model';
export * from './decorators/field';
export * from './decorators/relationships';
export * from './interfaces/model.interface';
export * from './interfaces/current.model.interface';
export * from './interfaces/field.options.interface';
export * from './interfaces/model.alllist.options.interface';
export * from './interfaces/model.options.interface';
export * from './interfaces/relationship.options.interface';
export * from './interfaces/observe.load.model.interface';
export * from './interfaces/observe.remove.model.interface';
export * from './interfaces/observe.save.model.interface';
export * from './interfaces/global.config.interface';
export * from './utils/case-conversion';

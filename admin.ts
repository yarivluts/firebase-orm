/**
 * Admin SDK-specific functionality for Firebase ORM
 * This module should only be imported in Node.js environments
 */

import { FirestoreOrmRepository } from './repository';

// Admin SDK types using conditional import types
type AdminApp = import('firebase-admin/app').App;
type AdminFirestore = import('firebase-admin/firestore').Firestore;

/**
 * Wrapper that provides Admin SDK compatibility for FirestoreOrmRepository.
 * This creates adapter functions that make the Admin SDK work with the ORM's interface.
 */
function setupAdminSDKWrapper(firestore: AdminFirestore, repository: FirestoreOrmRepository) {
    // Override the getCollectionReferenceByModel method to work with Admin SDK
    const originalGetCollectionRef = repository['getCollectionReferenceByModel'].bind(repository);
    
    repository['getCollectionReferenceByModel'] = function(object: any, isDoc: boolean = false, customId?: string) {
        // Admin SDK uses different API - build the path manually
        const pathList: any = object.getPathList();
        const id = customId ?? object.getId();
        
        if (!pathList || pathList.length < 1) {
            console.error("Can't get collection path - ", object);
            return null;
        }
        
        let current: any = firestore;
        
        for (let i = 0; i < pathList.length; i++) {
            const stage = pathList[i];
            if (!stage.value) {
                continue;
            }
            
            if (stage.type == 'collection') {
                if (typeof current.collection === 'function') {
                    current = current.collection(stage.value);
                } else if (current.path) {
                    current = (firestore as any).collection(`${current.path}/${stage.value}`);
                }
                
                if (isDoc && i + 1 == pathList.length) {
                    const docId = customId ?? object.id ?? null;
                    if (docId) {
                        current = current.doc(docId);
                    } else {
                        current = current.doc();
                    }
                }
            } else if (stage.type == 'document') {
                current = current.doc(stage.value);
            }
        }
        
        return current;
    };
    
    // Override async version too
    repository['getCollectionReferenceByModelAsync'] = async function(object: any, isDoc: boolean = false, customId?: string) {
        return this['getCollectionReferenceByModel'](object, isDoc, customId);
    };
    
    // Override load method to work with Admin SDK's .get() instead of getDocs
    const originalLoad = repository['load'].bind(repository);
    repository['load'] = async function(object: any, id: string, params: { [key: string]: string; } = {}) {
        for (let key in params) {
            let value = params[key];
            object[key] = value;
        }
        
        const ref = await this['getCollectionReferenceByModelAsync'](object);
        if (!ref) {
            console.error("Can't load the model " + object.getReferencePath() + " , please set all values");
            return object;
        } else {
            if (!id) {
                console.error("Can't load the model " + object.getReferencePath() + " , please set id");
            } else {
                // Admin SDK uses where().get() pattern
                const docsRef = await ref.where('__name__', '==', id).get();
                if (docsRef.size == 0) {
                    object.is_exist = false;
                    return object;
                } else {
                    const docObj = docsRef.docs[0];
                    object.is_exist = true;
                    object.initFromData(docObj.data());
                    return object;
                }
            }
        }
        return object;
    };
    
    // Override save method to work with Admin SDK's .update() and .set()
    const originalSave = repository['save'].bind(repository);
    repository['save'] = async function(model: any, customId?: string) {
        const object = model;
        const ref = await this['getDocReferenceByModelAsync'](object, object.getId() ?? customId);
        if (!ref) {
            console.error("Can't save the model " + object.getReferencePath() + " , please set all values");
            return false;
        }
        
        if (object.getId()) {
            // Admin SDK uses .update()
            await ref.update(object.getDocumentData());
        } else {
            try {
                // Admin SDK uses .set()
                await ref.set(object.getDocumentData());
                object.setId(ref.id);
            } catch (error) {
                console.error("Error adding document: ", error);
            }
        }
        return object;
    };
}

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
        
        // Create a repository instance
        const repository = new (FirestoreOrmRepository as any)(connection);
        
        // Setup Admin SDK compatibility wrapper
        setupAdminSDKWrapper(connection as any, repository);
        
        // Mark as ready immediately for Admin SDK
        (FirestoreOrmRepository as any).isReady = true;
        
        // Register it in the global connections
        (FirestoreOrmRepository as any).globalFirestores[key] = repository;
        (FirestoreOrmRepository as any).readyPromises[key] = Promise.resolve(repository);
        
        if ((FirestoreOrmRepository as any).globalWait[key]) {
            (FirestoreOrmRepository as any).globalWait[key](repository);
        }
        
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

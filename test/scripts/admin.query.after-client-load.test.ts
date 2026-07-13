import * as admin from 'firebase-admin';
// Import the CLIENT SDK first, on purpose: this is the fullstack-bundle
// scenario (e.g. a Next.js server build that also ships firebase for the
// browser). query.ts's module-load lazyLoadFirestoreImports() finds no
// connection, so it locks the module-level query helpers onto the client
// implementations.
import 'firebase/firestore';
import { initializeAdminApp } from '../../admin';
import { Product } from '../model/product';

/**
 * Regression test: initializeAdminApp must force admin-mode query functions
 * even when the client SDK was importable/loaded first. Before the fix, the
 * ORM built queries with the client SDK's query()/where() against Admin SDK
 * refs, crashing with `TypeError: <ref>._freezeSettings is not a function`.
 *
 * Unlike admin.query.compatibility.test.ts (which tolerates generic errors),
 * this test asserts the SHAPE of the built query: an Admin SDK Query exposes
 * `.get()`, while a client Query does not.
 */
describe('Admin SDK query compatibility after client SDK load', () => {
  it('builds Admin-SDK-shaped queries (with .get) after initializeAdminApp', async () => {
    // No credential on purpose: building a query performs no I/O, and a
    // credential-less app never hits the lazy ADC lookup — so this runs
    // everywhere (CI included) instead of skipping like the mock-service-
    // account variants do.
    const adminApp = admin.initializeApp(
      { projectId: 'test-project-id' },
      `admin-after-client-${Date.now()}`,
    );

    await initializeAdminApp(adminApp);

    // Building the query must not throw client-SDK internals errors...
    const firestoreQuery = Product.query().where('name', '==', 'x').getFirestoreQuery() as any;
    expect(firestoreQuery).toBeDefined();

    // ...and must be an Admin SDK query: admin queries execute via `.get()`.
    // (The client SDK's Query has no `.get` method — execution goes through
    // the standalone getDocs() instead.)
    expect(typeof firestoreQuery.get).toBe('function');
  });
});

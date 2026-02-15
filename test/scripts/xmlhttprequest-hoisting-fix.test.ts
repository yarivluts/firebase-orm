/**
 * Tests for the XMLHttpRequest var hoisting fix.
 *
 * Bug: `var XMLHttpRequest` inside an `if` block was hoisted to module scope,
 * making `typeof XMLHttpRequest === 'undefined'` always true — even in browsers
 * where XMLHttpRequest is natively available. This caused xhr2 and ws (Node-only
 * modules) to be imported in the browser, overwriting window.WebSocket with a
 * non-constructor object and breaking `new WebSocket(...)` (e.g. Next.js HMR).
 *
 * Fix: Removed the `var XMLHttpRequest` declaration entirely. The .then()
 * callback parameter already provides the imported value.
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_MODEL_PATH = path.join(__dirname, '../../base.model.ts');

describe('XMLHttpRequest hoisting fix', () => {

  describe('Source code correctness (static analysis)', () => {
    let source: string;

    beforeAll(() => {
      source = fs.readFileSync(BASE_MODEL_PATH, 'utf8');
    });

    it('should NOT contain "var XMLHttpRequest"', () => {
      // The whole point of the fix: no var declaration that gets hoisted
      expect(source).not.toMatch(/\bvar\s+XMLHttpRequest\b/);
    });

    it('should still contain the typeof XMLHttpRequest guard', () => {
      // The runtime check must remain so the polyfill runs in Node.js
      expect(source).toMatch(/typeof\s+XMLHttpRequest\s*===?\s*['"]undefined['"]/);
    });

    it('should still import xhr2 inside the guard', () => {
      expect(source).toMatch(/import\s*\(\s*['"]xhr2['"]\s*\)/);
    });

    it('should still import ws inside the guard', () => {
      expect(source).toMatch(/import\s*\(\s*['"]ws['"]\s*\)/);
    });

    it('should use .default fallback for xhr2', () => {
      // Ensures both CJS and ESM default exports are handled
      expect(source).toMatch(/xhr2\.default\s*\|\|\s*xhr2/);
    });

    it('should use .default fallback for ws', () => {
      expect(source).toMatch(/ws\.default\s*\|\|\s*ws/);
    });
  });

  describe('Browser environment simulation', () => {
    // In a browser, XMLHttpRequest and WebSocket are already defined globally.
    // The polyfill block must NOT execute and must NOT overwrite them.

    it('should not overwrite native WebSocket when XMLHttpRequest is already defined', (done) => {
      const fakeXHR = function FakeXMLHttpRequest() {};
      const FakeWebSocket = function FakeWebSocket() {};

      // Save originals
      const origXHR = (global as any).XMLHttpRequest;
      const origWS = (global as any).WebSocket;

      // Simulate a browser: define both globals before importing the module
      (global as any).XMLHttpRequest = fakeXHR;
      (global as any).WebSocket = FakeWebSocket;

      jest.isolateModules(() => {
        require('../../base.model');

        // Give dynamic imports time to resolve (if they were to run)
        setTimeout(() => {
          // The native WebSocket must still be our fake browser constructor
          expect((global as any).WebSocket).toBe(FakeWebSocket);
          // XMLHttpRequest must still be the native one
          expect((global as any).XMLHttpRequest).toBe(fakeXHR);

          // Restore originals
          if (origXHR === undefined) {
            delete (global as any).XMLHttpRequest;
          } else {
            (global as any).XMLHttpRequest = origXHR;
          }
          if (origWS === undefined) {
            delete (global as any).WebSocket;
          } else {
            (global as any).WebSocket = origWS;
          }

          done();
        }, 500);
      });
    });
  });

  describe('Node.js environment (polyfill should run)', () => {
    it('should polyfill XMLHttpRequest when it is genuinely undefined', (done) => {
      // Save and remove any existing global XMLHttpRequest
      const origXHR = (global as any).XMLHttpRequest;
      const origWS = (global as any).WebSocket;
      delete (global as any).XMLHttpRequest;
      delete (global as any).WebSocket;

      jest.isolateModules(() => {
        require('../../base.model');

        // The dynamic import is async; wait for it to resolve
        setTimeout(() => {
          // After the polyfill runs, globalVar.XMLHttpRequest should be set
          expect((global as any).XMLHttpRequest).toBeDefined();
          // WebSocket should also be polyfilled
          expect((global as any).WebSocket).toBeDefined();

          // Restore originals
          if (origXHR === undefined) {
            delete (global as any).XMLHttpRequest;
          } else {
            (global as any).XMLHttpRequest = origXHR;
          }
          if (origWS === undefined) {
            delete (global as any).WebSocket;
          } else {
            (global as any).WebSocket = origWS;
          }

          done();
        }, 1000);
      });
    });

    it('should set XMLHttpRequest to a usable value (not undefined)', (done) => {
      const origXHR = (global as any).XMLHttpRequest;
      const origWS = (global as any).WebSocket;
      delete (global as any).XMLHttpRequest;
      delete (global as any).WebSocket;

      jest.isolateModules(() => {
        require('../../base.model');

        setTimeout(() => {
          const XHR = (global as any).XMLHttpRequest;
          // xhr2 exports a constructor; ensure it's not just the module wrapper
          expect(XHR).not.toBeNull();
          expect(typeof XHR === 'function' || typeof XHR === 'object').toBe(true);

          // Restore
          if (origXHR === undefined) {
            delete (global as any).XMLHttpRequest;
          } else {
            (global as any).XMLHttpRequest = origXHR;
          }
          if (origWS === undefined) {
            delete (global as any).WebSocket;
          } else {
            (global as any).WebSocket = origWS;
          }

          done();
        }, 1000);
      });
    });
  });
});

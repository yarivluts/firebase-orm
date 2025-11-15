(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name3 in all)
      __defProp(target, name3, { get: all[name3], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // dist/esm/query.js
  function isAdminFirestore(firestore) {
    return typeof firestore.collection === "function" && typeof firestore.doc === "function" && (firestore._settings !== void 0 || firestore.toJSON !== void 0);
  }
  function setupAdminSDKQueryCompatibility() {
    console.log("Setting up Admin SDK query compatibility");
    endAt = ((...values) => ({
      apply: (ref3) => ref3.endAt(...values)
    }));
    endBefore = ((...values) => ({
      apply: (ref3) => ref3.endBefore(...values)
    }));
    getCountFromServer = ((query3) => {
      console.warn("getCountFromServer not directly supported in Admin SDK - returning approximate count");
      return query3.get().then((snapshot) => ({
        data: () => ({ count: snapshot.size })
      }));
    });
    getDocs = ((query3) => query3.get());
    limit = ((limitCount) => ({
      apply: (ref3) => ref3.limit(limitCount)
    }));
    onSnapshot = ((query3, callback) => query3.onSnapshot(callback));
    or = ((...queries) => ({
      apply: (ref3) => {
        console.warn("OR queries not directly supported in Admin SDK - using first query only");
        return queries.length > 0 ? queries[0].apply(ref3) : ref3;
      }
    }));
    and = ((...queries) => ({
      apply: (ref3) => {
        let result = ref3;
        for (const query3 of queries) {
          if (query3 && typeof query3.apply === "function") {
            result = query3.apply(result);
          }
        }
        return result;
      }
    }));
    orderBy = ((field, direction) => ({
      apply: (ref3) => ref3.orderBy(field, direction)
    }));
    query = ((ref3, ...constraints) => {
      let result = ref3;
      for (const constraint of constraints) {
        if (constraint && typeof constraint.apply === "function") {
          result = constraint.apply(result);
        }
      }
      return result;
    });
    startAfter = ((...values) => ({
      apply: (ref3) => ref3.startAfter(...values)
    }));
    startAt = ((...values) => ({
      apply: (ref3) => ref3.startAt(...values)
    }));
    where = ((field, op, value) => ({
      apply: (ref3) => ref3.where(field, op, value)
    }));
    collectionGroup = ((collectionId) => {
      const connection = FirestoreOrmRepository.getGlobalConnection();
      const firestore = connection.getFirestore();
      return firestore.collectionGroup(collectionId);
    });
  }
  async function setupClientSDKQueryCompatibility() {
    try {
      const module = await import("firebase/firestore");
      endAt = module.endAt;
      endBefore = module.endBefore;
      getCountFromServer = module.getCountFromServer;
      getDocs = module.getDocs;
      limit = module.limit;
      onSnapshot = module.onSnapshot;
      or = module.or;
      and = module.and;
      orderBy = module.orderBy;
      query = module.query;
      startAfter = module.startAfter;
      startAt = module.startAt;
      where = module.where;
      collectionGroup = module.collectionGroup;
    } catch (error) {
      console.warn("Failed to load Client SDK, trying Admin SDK compatibility");
      setupAdminSDKQueryCompatibility();
    }
  }
  async function lazyLoadFirestoreImports() {
    if (!!endAt) {
      return;
    }
    try {
      const connection = FirestoreOrmRepository.getGlobalConnection();
      const firestore = connection.getFirestore();
      if (isAdminFirestore(firestore)) {
        setupAdminSDKQueryCompatibility();
      } else {
        await setupClientSDKQueryCompatibility();
      }
    } catch (error) {
      await setupClientSDKQueryCompatibility();
    }
  }
  function ensureQueryFunctionsLoaded() {
    if (!getDocs || !or) {
      try {
        const connection = FirestoreOrmRepository.getGlobalConnection();
        const firestore = connection.getFirestore();
        if (isAdminFirestore(firestore)) {
          setupAdminSDKQueryCompatibility();
        } else {
          console.warn("Query functions not loaded yet, using fallback implementations");
          setupFallbackQueryFunctions();
        }
      } catch (error) {
        console.warn("No global connection available, using fallback implementations");
        setupFallbackQueryFunctions();
      }
    }
  }
  function setupFallbackQueryFunctions() {
    if (!getDocs) {
      getDocs = ((query3) => {
        console.warn("getDocs using fallback implementation - assuming Admin SDK");
        return query3.get();
      });
    }
    if (!or) {
      or = ((...queries) => ({
        apply: (ref3) => {
          console.warn("OR queries using fallback implementation - may not work correctly");
          return queries.length > 0 && queries[0].apply ? queries[0].apply(ref3) : ref3;
        }
      }));
    }
    if (!and) {
      and = ((...queries) => ({
        apply: (ref3) => {
          let result = ref3;
          for (const query3 of queries) {
            if (query3 && typeof query3.apply === "function") {
              result = query3.apply(result);
            }
          }
          return result;
        }
      }));
    }
  }
  var LIST_EVENTS, WHERE_FILTER_OP, endAt, endBefore, getCountFromServer, getDocs, limit, onSnapshot, or, and, orderBy, query, startAfter, startAt, where, collectionGroup, Query;
  var init_query = __esm({
    "dist/esm/query.js"() {
      init_repository();
      (function(LIST_EVENTS2) {
        LIST_EVENTS2["REMOVED"] = "removed";
        LIST_EVENTS2["MODIFIED"] = "modified";
        LIST_EVENTS2["ADDEDD"] = "added";
        LIST_EVENTS2["INITIALIZE"] = "init";
      })(LIST_EVENTS || (LIST_EVENTS = {}));
      (function(WHERE_FILTER_OP2) {
        WHERE_FILTER_OP2["NOT_EQUAL"] = "<>";
      })(WHERE_FILTER_OP || (WHERE_FILTER_OP = {}));
      lazyLoadFirestoreImports();
      Query = class {
        constructor() {
          this.queryList = [];
          this.whereList = [];
          this.orWhereList = [];
          this.orderByList = [];
          this.ops = [];
          this.startAfterArr = [];
          this.endBeforeArr = [];
          this.isCollectionGroup_ = false;
        }
        init(model, reference, isCollectionGroup) {
          this.model = model;
          if (!reference && !isCollectionGroup) {
            this.current = this.model.getRepositoryReference();
          }
          if (isCollectionGroup) {
            this.isCollectionGroup_ = isCollectionGroup;
          }
        }
        /**
         * Sets whether the query is targeting a collection group.
         *
         * @param isCollectionGroup - A boolean value indicating whether the query is targeting a collection group.
         * @returns The updated Query object.
         */
        setCollectionGroup(isCollectionGroup) {
          this.isCollectionGroup_ = isCollectionGroup;
          return this;
        }
        /**
         * Creates and returns a new Query with the additional filter that documents
         * must contain the specified field and the value should satisfy the
         * relation constraint provided.
         *
         * @param fieldPath The path to compare
         * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=", "!=").
         * @param value The value for comparison
         * @return The created Query.
         */
        where(fieldPath, opStr, value) {
          var field = fieldPath;
          fieldPath = this.model.getFieldName(field);
          this.queryList.push(this.current);
          if (opStr == WHERE_FILTER_OP.NOT_EQUAL) {
            this.whereList.push(or(where(fieldPath, "<", value), where(fieldPath, ">", value)));
          } else {
            var nativeOp = opStr;
            this.whereList.push(where(fieldPath, nativeOp, value));
          }
          return this;
        }
        /**
         * Test Mode - Or operation for additional filter that documents
         * must contain the specified field and the value should satisfy the
         * relation constraint provided.
         *
         * @param fieldPath The path to compare
         * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=", "!=").
         * @param value The value for comparison
         * @return The created Query.
         */
        orWhere(fieldPath, opStr, value) {
          var field = fieldPath;
          fieldPath = this.model.getFieldName(field);
          this.orWhereList.push(where(fieldPath, opStr, value));
          return this;
        }
        /**
         * Creates and returns a new Query that's additionally sorted by the
         * specified field, optionally in descending order instead of ascending.
         *
         * @param fieldPath The field to sort by.
         * @param directionStr Optional direction to sort by (`asc` or `desc`). If
         * not specified, order will be ascending.
         * @return The created Query.
         */
        orderBy(fieldPath, directionStr) {
          var field = fieldPath;
          fieldPath = this.model.getFieldName(field);
          this.orderByList.push(orderBy(fieldPath, directionStr));
          return this;
        }
        /**
         * Creates and returns a new Query where the results are limited to the
         * specified number of documents.
         *
         * @param limit The maximum number of items to return.
         * @return The created Query.
         */
        limit(val) {
          this.queryLimit = val;
          this.ops.push(limit(val));
          return this;
        }
        like(fieldName, find) {
          var field = fieldName;
          fieldName = this.model.getFieldName(field);
          find = (find + "").toLowerCase();
          var likePrefix = "~~~";
          if (this.model["textIndexingFields"] && this.model["textIndexingFields"][this.model.getFieldName(fieldName)]) {
            if (!find.startsWith("%")) {
              find = likePrefix + find;
            }
            if (!find.endsWith("%")) {
              find = find + likePrefix;
            }
            find = find.replace(/%/g, "");
            this.whereList.push(where("text_index_" + this.model.getFieldName(fieldName), "array-contains", find));
          }
          return this;
        }
        /**
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        on(callback, event_type = LIST_EVENTS.INITIALIZE) {
          var params = {};
          params[event_type] = callback;
          return this.onMode(params);
        }
        /**
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        onMode(options) {
          var response = {
            callback: null
          };
          this.initBeforeFetch().then(() => {
            var that = this;
            var now = (/* @__PURE__ */ new Date()).getTime();
            response.callback = onSnapshot(this.current, async function(querySnapshot) {
              for (var i = 0; i < querySnapshot.docChanges().length; i++) {
                var change = querySnapshot.docChanges()[i];
                if (change.type === LIST_EVENTS.ADDEDD && (options.added || options.init)) {
                  let result = that.parseFromData(change.doc.data(), change.doc.id);
                  if (result.created_at && result.created_at > now && options.added) {
                    options.added(result);
                  } else if (options.init) {
                    options.init(result);
                  }
                } else if (change.type === LIST_EVENTS.MODIFIED && options.modified) {
                  let result = that.parseFromData(change.doc.data(), change.doc.id);
                  options.modified(result);
                } else if (change.type === LIST_EVENTS.REMOVED && options.removed) {
                  let result = that.parseFromData(change.doc.data(), change.doc.id);
                  options.removed(result);
                }
              }
            });
          });
          var res = () => {
            if (response.callback) {
              response.callback();
            } else {
              setTimeout(function() {
                res();
              }, 1e3);
            }
          };
          return res;
        }
        /**
         * Creates and returns a new Query that starts at the provided fields
         * relative to the order of the query. The order of the field values
         * must match the order of the order by clauses of the query.
         *
         * @param fieldValues The field values to start this query at, in order
         * of the query's order by.
         * @return The created Query.
         */
        startAt(...fieldValues) {
          this.whereList.push(startAt(...fieldValues));
          return this;
        }
        /**
         * Creates and returns a new Query that starts after the provided document
         * (exclusive). The starting position is relative to the order of the query.
         * The document must contain all of the fields provided in the orderBy of
         * this query.
         *
         * @param snapshot The snapshot of the document to start after.
         * @return The created Query.
         */
        startAfter(ormObject) {
          this.startAfterArr.push(ormObject);
          return this;
        }
        async initStartAfter() {
          for (var i = 0; i < this.startAfterArr.length; i++) {
            var ormObject = this.startAfterArr[i];
            var doc2 = await ormObject.getSnapshot();
            this.whereList.push(startAfter(doc2));
            for (var i = 0; this.orWhereList.length > i; i++) {
              this.orWhere[i].queryObject = this.orWhere[i].queryObject.startAfter(doc2);
            }
          }
        }
        /**
         * Creates and returns a new Query that ends before the provided fields
         * relative to the order of the query. The order of the field values
         * must match the order of the order by clauses of the query.
         *
         * @param fieldValues The field values to end this query before, in order
         * of the query's order by.
         * @return The created Query.
         */
        endBefore(ormObject) {
          this.endBeforeArr.push(ormObject);
          return this;
        }
        async initEndBefore() {
          for (var i = 0; i < this.endBeforeArr.length; i++) {
            var ormObject = this.endBeforeArr[i];
            var doc2 = await ormObject.getSnapshot();
            this.whereList.push(endBefore(doc2));
            for (var i = 0; this.orWhereList.length > i; i++) {
              this.orWhere[i].queryObject = this.orWhere[i].queryObject.endBefore(doc2);
            }
          }
        }
        /**
         * Creates and returns a new Query that ends at the provided fields
         * relative to the order of the query. The order of the field values
         * must match the order of the order by clauses of the query.
         *
         * @param fieldValues The field values to end this query at, in order
         * of the query's order by.
         * @return The created Query.
         */
        endAt(...fieldValues) {
          this.whereList.push(endAt(...fieldValues));
          for (var i = 0; this.orWhereList.length > i; i++) {
            this.orWhereList[i].queryObject = this.orWhereList[i].queryObject.endAt(...fieldValues);
          }
          return this;
        }
        /**
         * Executes the query and returns the results as a `QuerySnapshot`.
         *
         * @return A Promise that will be resolved with the results of the Query.
         */
        async get() {
          await this.initBeforeFetch();
          const query3 = this.getFirestoreQuery();
          const connection = FirestoreOrmRepository.getGlobalConnection();
          const firestore = connection.getFirestore();
          const isAdminSDK = isAdminFirestore(firestore);
          let list2;
          if (isAdminSDK) {
            list2 = await query3.get();
          } else {
            list2 = await getDocs(query3);
          }
          return this.parse(list2);
        }
        async getRowList() {
          await this.initBeforeFetch();
          const query3 = this.getFirestoreQuery();
          const connection = FirestoreOrmRepository.getGlobalConnection();
          const firestore = connection.getFirestore();
          const isAdminSDK = isAdminFirestore(firestore);
          let list2;
          if (isAdminSDK) {
            list2 = await query3.get();
          } else {
            list2 = await getDocs(query3);
          }
          return list2;
        }
        async count() {
          await this.initBeforeFetch();
          const q = await this.getFirestoreQuery();
          const snapshot = await getCountFromServer(q);
          return snapshot.data().count;
        }
        getCurrentQueryArray() {
          ensureQueryFunctionsLoaded();
          const connection = FirestoreOrmRepository.getGlobalConnection();
          const firestore = connection.getFirestore();
          const isAdminSDK = isAdminFirestore(firestore);
          if (isAdminSDK) {
            const res = [];
            const whereConstraints = this.whereList.filter((op) => {
              return op.type == "where" || op.type == "or";
            });
            res.push(...whereConstraints);
            res.push(...this.orWhereList);
            res.push(...this.orderByList);
            res.push(...this.ops);
            return res;
          } else {
            const whereConstraints = this.whereList.filter((op) => {
              return op.type == "where" || op.type == "or";
            });
            const res = [];
            if (whereConstraints.length > 0 && this.orWhereList.length > 0) {
              res.push(and(and(...whereConstraints), or(...this.orWhereList)));
            } else if (whereConstraints.length > 0) {
              if (whereConstraints.length === 1) {
                res.push(whereConstraints[0]);
              } else {
                res.push(and(...whereConstraints));
              }
            } else if (this.orWhereList.length > 0) {
              if (this.orWhereList.length === 1) {
                res.push(this.orWhereList[0]);
              } else {
                res.push(or(...this.orWhereList));
              }
            }
            res.push(...this.orderByList);
            res.push(...this.ops);
            return res;
          }
        }
        getFirestoreQuery() {
          ensureQueryFunctionsLoaded();
          if (this.isCollectionGroup_) {
            return query(collectionGroup(this.model.getRepository().getFirestore(), this.model.getCollectionName()), ...this.getCurrentQueryArray());
          } else {
            return query(this.current, ...this.getCurrentQueryArray());
          }
        }
        async initBeforeFetch() {
          await this.initStartAfter();
          await this.initEndBefore();
          return this;
        }
        /**
         * Executes the query and returns the results as a `QuerySnapshot`.
         * @return A Promise that will be resolved with the results of the Query.
         */
        async getOne() {
          await this.initBeforeFetch();
          this.limit(1);
          const query3 = this.getFirestoreQuery();
          const connection = FirestoreOrmRepository.getGlobalConnection();
          const firestore = connection.getFirestore();
          const isAdminSDK = isAdminFirestore(firestore);
          let list2;
          if (isAdminSDK) {
            list2 = await query3.get();
          } else {
            list2 = await getDocs(query3);
          }
          var res = this.parse(list2);
          if (res.length > 0) {
            return res[0];
          } else {
            return null;
          }
        }
        parse(list2) {
          var result = [];
          for (var i = 0; i < list2.docs.length; i++) {
            let object = this.model.getCurrentModel();
            let data = list2.docs[i].data();
            let id = list2.docs[i].id;
            let ref3 = list2.docs[i].ref;
            let path = list2.docs[i].ref.path;
            if (this.isCollectionGroup_) {
              object.initPathFromStr(path);
            }
            object.setId(id);
            object.initFromData(data);
            result.push(object);
          }
          return result;
        }
        parseFromData(data, id) {
          var result = [];
          let object = this.model.getCurrentModel();
          if (id) {
            object.setId(id);
          }
          object.initFromData(data);
          return object;
        }
      };
    }
  });

  // dist/esm/utils.js
  function printLog(...args) {
    const proc = typeof window !== "undefined" ? window : process;
    if (proc["DEV_MODE"] === "true") {
      console.log(...args);
    }
  }
  var init_utils = __esm({
    "dist/esm/utils.js"() {
    }
  });

  // node_modules/@firebase/util/dist/postinstall.mjs
  var getDefaultsFromPostinstall;
  var init_postinstall = __esm({
    "node_modules/@firebase/util/dist/postinstall.mjs"() {
      getDefaultsFromPostinstall = () => void 0;
    }
  });

  // node_modules/@firebase/util/dist/index.esm2017.js
  function getGlobal() {
    if (typeof self !== "undefined") {
      return self;
    }
    if (typeof window !== "undefined") {
      return window;
    }
    if (typeof global !== "undefined") {
      return global;
    }
    throw new Error("Unable to locate global object.");
  }
  function isCloudWorkstation(host) {
    return host.endsWith(".cloudworkstations.dev");
  }
  async function pingServer(endpoint) {
    const result = await fetch(endpoint, {
      credentials: "include"
    });
    return result.ok;
  }
  function createMockUserToken(token, projectId) {
    if (token.uid) {
      throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');
    }
    const header = {
      alg: "none",
      type: "JWT"
    };
    const project = projectId || "demo-project";
    const iat = token.iat || 0;
    const sub = token.sub || token.user_id;
    if (!sub) {
      throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");
    }
    const payload = Object.assign({
      // Set all required fields to decent defaults
      iss: `https://securetoken.google.com/${project}`,
      aud: project,
      iat,
      exp: iat + 3600,
      auth_time: iat,
      sub,
      user_id: sub,
      firebase: {
        sign_in_provider: "custom",
        identities: {}
      }
    }, token);
    const signature = "";
    return [
      base64urlEncodeWithoutPadding(JSON.stringify(header)),
      base64urlEncodeWithoutPadding(JSON.stringify(payload)),
      signature
    ].join(".");
  }
  function getEmulatorSummary() {
    const summary = {
      prod: [],
      emulator: []
    };
    for (const key of Object.keys(emulatorStatus)) {
      if (emulatorStatus[key]) {
        summary.emulator.push(key);
      } else {
        summary.prod.push(key);
      }
    }
    return summary;
  }
  function getOrCreateEl(id) {
    let parentDiv = document.getElementById(id);
    let created = false;
    if (!parentDiv) {
      parentDiv = document.createElement("div");
      parentDiv.setAttribute("id", id);
      created = true;
    }
    return { created, element: parentDiv };
  }
  function updateEmulatorBanner(name3, isRunningEmulator) {
    if (typeof window === "undefined" || typeof document === "undefined" || !isCloudWorkstation(window.location.host) || emulatorStatus[name3] === isRunningEmulator || emulatorStatus[name3] || // If already set to use emulator, can't go back to prod.
    previouslyDismissed) {
      return;
    }
    emulatorStatus[name3] = isRunningEmulator;
    function prefixedId(id) {
      return `__firebase__banner__${id}`;
    }
    const bannerId = "__firebase__banner";
    const summary = getEmulatorSummary();
    const showError = summary.prod.length > 0;
    function tearDown() {
      const element = document.getElementById(bannerId);
      if (element) {
        element.remove();
      }
    }
    function setupBannerStyles(bannerEl) {
      bannerEl.style.display = "flex";
      bannerEl.style.background = "#7faaf0";
      bannerEl.style.position = "fixed";
      bannerEl.style.bottom = "5px";
      bannerEl.style.left = "5px";
      bannerEl.style.padding = ".5em";
      bannerEl.style.borderRadius = "5px";
      bannerEl.style.alignItems = "center";
    }
    function setupIconStyles(prependIcon, iconId) {
      prependIcon.setAttribute("width", "24");
      prependIcon.setAttribute("id", iconId);
      prependIcon.setAttribute("height", "24");
      prependIcon.setAttribute("viewBox", "0 0 24 24");
      prependIcon.setAttribute("fill", "none");
      prependIcon.style.marginLeft = "-6px";
    }
    function setupCloseBtn() {
      const closeBtn = document.createElement("span");
      closeBtn.style.cursor = "pointer";
      closeBtn.style.marginLeft = "16px";
      closeBtn.style.fontSize = "24px";
      closeBtn.innerHTML = " &times;";
      closeBtn.onclick = () => {
        previouslyDismissed = true;
        tearDown();
      };
      return closeBtn;
    }
    function setupLinkStyles(learnMoreLink, learnMoreId) {
      learnMoreLink.setAttribute("id", learnMoreId);
      learnMoreLink.innerText = "Learn more";
      learnMoreLink.href = "https://firebase.google.com/docs/studio/preview-apps#preview-backend";
      learnMoreLink.setAttribute("target", "__blank");
      learnMoreLink.style.paddingLeft = "5px";
      learnMoreLink.style.textDecoration = "underline";
    }
    function setupDom() {
      const banner = getOrCreateEl(bannerId);
      const firebaseTextId = prefixedId("text");
      const firebaseText = document.getElementById(firebaseTextId) || document.createElement("span");
      const learnMoreId = prefixedId("learnmore");
      const learnMoreLink = document.getElementById(learnMoreId) || document.createElement("a");
      const prependIconId = prefixedId("preprendIcon");
      const prependIcon = document.getElementById(prependIconId) || document.createElementNS("http://www.w3.org/2000/svg", "svg");
      if (banner.created) {
        const bannerEl = banner.element;
        setupBannerStyles(bannerEl);
        setupLinkStyles(learnMoreLink, learnMoreId);
        const closeBtn = setupCloseBtn();
        setupIconStyles(prependIcon, prependIconId);
        bannerEl.append(prependIcon, firebaseText, learnMoreLink, closeBtn);
        document.body.appendChild(bannerEl);
      }
      if (showError) {
        firebaseText.innerText = `Preview backend disconnected.`;
        prependIcon.innerHTML = `<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`;
      } else {
        prependIcon.innerHTML = `<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`;
        firebaseText.innerText = "Preview backend running in this workspace.";
      }
      firebaseText.setAttribute("id", firebaseTextId);
    }
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", setupDom);
    } else {
      setupDom();
    }
  }
  function isIndexedDBAvailable() {
    try {
      return typeof indexedDB === "object";
    } catch (e) {
      return false;
    }
  }
  function validateIndexedDBOpenable() {
    return new Promise((resolve, reject) => {
      try {
        let preExist = true;
        const DB_CHECK_NAME = "validate-browser-context-for-indexeddb-analytics-module";
        const request = self.indexedDB.open(DB_CHECK_NAME);
        request.onsuccess = () => {
          request.result.close();
          if (!preExist) {
            self.indexedDB.deleteDatabase(DB_CHECK_NAME);
          }
          resolve(true);
        };
        request.onupgradeneeded = () => {
          preExist = false;
        };
        request.onerror = () => {
          var _a;
          reject(((_a = request.error) === null || _a === void 0 ? void 0 : _a.message) || "");
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  function replaceTemplate(template, data) {
    return template.replace(PATTERN, (_, key) => {
      const value = data[key];
      return value != null ? String(value) : `<${key}?>`;
    });
  }
  function deepEqual(a, b) {
    if (a === b) {
      return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    for (const k of aKeys) {
      if (!bKeys.includes(k)) {
        return false;
      }
      const aProp = a[k];
      const bProp = b[k];
      if (isObject(aProp) && isObject(bProp)) {
        if (!deepEqual(aProp, bProp)) {
          return false;
        }
      } else if (aProp !== bProp) {
        return false;
      }
    }
    for (const k of bKeys) {
      if (!aKeys.includes(k)) {
        return false;
      }
    }
    return true;
  }
  function isObject(thing) {
    return thing !== null && typeof thing === "object";
  }
  function getModularInstance(service) {
    if (service && service._delegate) {
      return service._delegate;
    } else {
      return service;
    }
  }
  var stringToByteArray$1, byteArrayToString, base64, DecodeBase64StringError, base64Encode, base64urlEncodeWithoutPadding, base64Decode, getDefaultsFromGlobal, getDefaultsFromEnvVariable, getDefaultsFromCookie, getDefaults, getDefaultEmulatorHost, getDefaultEmulatorHostnameAndPort, getDefaultAppConfig, Deferred, emulatorStatus, previouslyDismissed, ERROR_NAME, FirebaseError, ErrorFactory, PATTERN, MAX_VALUE_MILLIS;
  var init_index_esm2017 = __esm({
    "node_modules/@firebase/util/dist/index.esm2017.js"() {
      init_postinstall();
      stringToByteArray$1 = function(str) {
        const out = [];
        let p = 0;
        for (let i = 0; i < str.length; i++) {
          let c = str.charCodeAt(i);
          if (c < 128) {
            out[p++] = c;
          } else if (c < 2048) {
            out[p++] = c >> 6 | 192;
            out[p++] = c & 63 | 128;
          } else if ((c & 64512) === 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) === 56320) {
            c = 65536 + ((c & 1023) << 10) + (str.charCodeAt(++i) & 1023);
            out[p++] = c >> 18 | 240;
            out[p++] = c >> 12 & 63 | 128;
            out[p++] = c >> 6 & 63 | 128;
            out[p++] = c & 63 | 128;
          } else {
            out[p++] = c >> 12 | 224;
            out[p++] = c >> 6 & 63 | 128;
            out[p++] = c & 63 | 128;
          }
        }
        return out;
      };
      byteArrayToString = function(bytes) {
        const out = [];
        let pos = 0, c = 0;
        while (pos < bytes.length) {
          const c1 = bytes[pos++];
          if (c1 < 128) {
            out[c++] = String.fromCharCode(c1);
          } else if (c1 > 191 && c1 < 224) {
            const c2 = bytes[pos++];
            out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
          } else if (c1 > 239 && c1 < 365) {
            const c2 = bytes[pos++];
            const c3 = bytes[pos++];
            const c4 = bytes[pos++];
            const u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 65536;
            out[c++] = String.fromCharCode(55296 + (u >> 10));
            out[c++] = String.fromCharCode(56320 + (u & 1023));
          } else {
            const c2 = bytes[pos++];
            const c3 = bytes[pos++];
            out[c++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
          }
        }
        return out.join("");
      };
      base64 = {
        /**
         * Maps bytes to characters.
         */
        byteToCharMap_: null,
        /**
         * Maps characters to bytes.
         */
        charToByteMap_: null,
        /**
         * Maps bytes to websafe characters.
         * @private
         */
        byteToCharMapWebSafe_: null,
        /**
         * Maps websafe characters to bytes.
         * @private
         */
        charToByteMapWebSafe_: null,
        /**
         * Our default alphabet, shared between
         * ENCODED_VALS and ENCODED_VALS_WEBSAFE
         */
        ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        /**
         * Our default alphabet. Value 64 (=) is special; it means "nothing."
         */
        get ENCODED_VALS() {
          return this.ENCODED_VALS_BASE + "+/=";
        },
        /**
         * Our websafe alphabet.
         */
        get ENCODED_VALS_WEBSAFE() {
          return this.ENCODED_VALS_BASE + "-_.";
        },
        /**
         * Whether this browser supports the atob and btoa functions. This extension
         * started at Mozilla but is now implemented by many browsers. We use the
         * ASSUME_* variables to avoid pulling in the full useragent detection library
         * but still allowing the standard per-browser compilations.
         *
         */
        HAS_NATIVE_SUPPORT: typeof atob === "function",
        /**
         * Base64-encode an array of bytes.
         *
         * @param input An array of bytes (numbers with
         *     value in [0, 255]) to encode.
         * @param webSafe Boolean indicating we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeByteArray(input, webSafe) {
          if (!Array.isArray(input)) {
            throw Error("encodeByteArray takes an array as a parameter");
          }
          this.init_();
          const byteToCharMap = webSafe ? this.byteToCharMapWebSafe_ : this.byteToCharMap_;
          const output = [];
          for (let i = 0; i < input.length; i += 3) {
            const byte1 = input[i];
            const haveByte2 = i + 1 < input.length;
            const byte2 = haveByte2 ? input[i + 1] : 0;
            const haveByte3 = i + 2 < input.length;
            const byte3 = haveByte3 ? input[i + 2] : 0;
            const outByte1 = byte1 >> 2;
            const outByte2 = (byte1 & 3) << 4 | byte2 >> 4;
            let outByte3 = (byte2 & 15) << 2 | byte3 >> 6;
            let outByte4 = byte3 & 63;
            if (!haveByte3) {
              outByte4 = 64;
              if (!haveByte2) {
                outByte3 = 64;
              }
            }
            output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
          }
          return output.join("");
        },
        /**
         * Base64-encode a string.
         *
         * @param input A string to encode.
         * @param webSafe If true, we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeString(input, webSafe) {
          if (this.HAS_NATIVE_SUPPORT && !webSafe) {
            return btoa(input);
          }
          return this.encodeByteArray(stringToByteArray$1(input), webSafe);
        },
        /**
         * Base64-decode a string.
         *
         * @param input to decode.
         * @param webSafe True if we should use the
         *     alternative alphabet.
         * @return string representing the decoded value.
         */
        decodeString(input, webSafe) {
          if (this.HAS_NATIVE_SUPPORT && !webSafe) {
            return atob(input);
          }
          return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
        },
        /**
         * Base64-decode a string.
         *
         * In base-64 decoding, groups of four characters are converted into three
         * bytes.  If the encoder did not apply padding, the input length may not
         * be a multiple of 4.
         *
         * In this case, the last group will have fewer than 4 characters, and
         * padding will be inferred.  If the group has one or two characters, it decodes
         * to one byte.  If the group has three characters, it decodes to two bytes.
         *
         * @param input Input to decode.
         * @param webSafe True if we should use the web-safe alphabet.
         * @return bytes representing the decoded value.
         */
        decodeStringToByteArray(input, webSafe) {
          this.init_();
          const charToByteMap = webSafe ? this.charToByteMapWebSafe_ : this.charToByteMap_;
          const output = [];
          for (let i = 0; i < input.length; ) {
            const byte1 = charToByteMap[input.charAt(i++)];
            const haveByte2 = i < input.length;
            const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
            ++i;
            const haveByte3 = i < input.length;
            const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
            ++i;
            const haveByte4 = i < input.length;
            const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
            ++i;
            if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
              throw new DecodeBase64StringError();
            }
            const outByte1 = byte1 << 2 | byte2 >> 4;
            output.push(outByte1);
            if (byte3 !== 64) {
              const outByte2 = byte2 << 4 & 240 | byte3 >> 2;
              output.push(outByte2);
              if (byte4 !== 64) {
                const outByte3 = byte3 << 6 & 192 | byte4;
                output.push(outByte3);
              }
            }
          }
          return output;
        },
        /**
         * Lazy static initialization function. Called before
         * accessing any of the static map variables.
         * @private
         */
        init_() {
          if (!this.byteToCharMap_) {
            this.byteToCharMap_ = {};
            this.charToByteMap_ = {};
            this.byteToCharMapWebSafe_ = {};
            this.charToByteMapWebSafe_ = {};
            for (let i = 0; i < this.ENCODED_VALS.length; i++) {
              this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
              this.charToByteMap_[this.byteToCharMap_[i]] = i;
              this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
              this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
              if (i >= this.ENCODED_VALS_BASE.length) {
                this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
                this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
              }
            }
          }
        }
      };
      DecodeBase64StringError = class extends Error {
        constructor() {
          super(...arguments);
          this.name = "DecodeBase64StringError";
        }
      };
      base64Encode = function(str) {
        const utf8Bytes = stringToByteArray$1(str);
        return base64.encodeByteArray(utf8Bytes, true);
      };
      base64urlEncodeWithoutPadding = function(str) {
        return base64Encode(str).replace(/\./g, "");
      };
      base64Decode = function(str) {
        try {
          return base64.decodeString(str, true);
        } catch (e) {
          console.error("base64Decode failed: ", e);
        }
        return null;
      };
      getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
      getDefaultsFromEnvVariable = () => {
        if (typeof process === "undefined" || typeof process.env === "undefined") {
          return;
        }
        const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
        if (defaultsJsonString) {
          return JSON.parse(defaultsJsonString);
        }
      };
      getDefaultsFromCookie = () => {
        if (typeof document === "undefined") {
          return;
        }
        let match;
        try {
          match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
        } catch (e) {
          return;
        }
        const decoded = match && base64Decode(match[1]);
        return decoded && JSON.parse(decoded);
      };
      getDefaults = () => {
        try {
          return getDefaultsFromPostinstall() || getDefaultsFromGlobal() || getDefaultsFromEnvVariable() || getDefaultsFromCookie();
        } catch (e) {
          console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
          return;
        }
      };
      getDefaultEmulatorHost = (productName) => {
        var _a, _b;
        return (_b = (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.emulatorHosts) === null || _b === void 0 ? void 0 : _b[productName];
      };
      getDefaultEmulatorHostnameAndPort = (productName) => {
        const host = getDefaultEmulatorHost(productName);
        if (!host) {
          return void 0;
        }
        const separatorIndex = host.lastIndexOf(":");
        if (separatorIndex <= 0 || separatorIndex + 1 === host.length) {
          throw new Error(`Invalid host ${host} with no separate hostname and port!`);
        }
        const port = parseInt(host.substring(separatorIndex + 1), 10);
        if (host[0] === "[") {
          return [host.substring(1, separatorIndex - 1), port];
        } else {
          return [host.substring(0, separatorIndex), port];
        }
      };
      getDefaultAppConfig = () => {
        var _a;
        return (_a = getDefaults()) === null || _a === void 0 ? void 0 : _a.config;
      };
      Deferred = class {
        constructor() {
          this.reject = () => {
          };
          this.resolve = () => {
          };
          this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
          });
        }
        /**
         * Our API internals are not promisified and cannot because our callback APIs have subtle expectations around
         * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
         * and returns a node-style callback which will resolve or reject the Deferred's promise.
         */
        wrapCallback(callback) {
          return (error, value) => {
            if (error) {
              this.reject(error);
            } else {
              this.resolve(value);
            }
            if (typeof callback === "function") {
              this.promise.catch(() => {
              });
              if (callback.length === 1) {
                callback(error);
              } else {
                callback(error, value);
              }
            }
          };
        }
      };
      emulatorStatus = {};
      previouslyDismissed = false;
      ERROR_NAME = "FirebaseError";
      FirebaseError = class _FirebaseError extends Error {
        constructor(code, message, customData) {
          super(message);
          this.code = code;
          this.customData = customData;
          this.name = ERROR_NAME;
          Object.setPrototypeOf(this, _FirebaseError.prototype);
          if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ErrorFactory.prototype.create);
          }
        }
      };
      ErrorFactory = class {
        constructor(service, serviceName, errors) {
          this.service = service;
          this.serviceName = serviceName;
          this.errors = errors;
        }
        create(code, ...data) {
          const customData = data[0] || {};
          const fullCode = `${this.service}/${code}`;
          const template = this.errors[code];
          const message = template ? replaceTemplate(template, customData) : "Error";
          const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
          const error = new FirebaseError(fullCode, fullMessage, customData);
          return error;
        }
      };
      PATTERN = /\{\$([^}]+)}/g;
      MAX_VALUE_MILLIS = 4 * 60 * 60 * 1e3;
    }
  });

  // node_modules/@firebase/component/dist/esm/index.esm2017.js
  function normalizeIdentifierForFactory(identifier) {
    return identifier === DEFAULT_ENTRY_NAME ? void 0 : identifier;
  }
  function isComponentEager(component) {
    return component.instantiationMode === "EAGER";
  }
  var Component, DEFAULT_ENTRY_NAME, Provider, ComponentContainer;
  var init_index_esm20172 = __esm({
    "node_modules/@firebase/component/dist/esm/index.esm2017.js"() {
      init_index_esm2017();
      Component = class {
        /**
         *
         * @param name The public service name, e.g. app, auth, firestore, database
         * @param instanceFactory Service factory responsible for creating the public interface
         * @param type whether the service provided by the component is public or private
         */
        constructor(name3, instanceFactory, type) {
          this.name = name3;
          this.instanceFactory = instanceFactory;
          this.type = type;
          this.multipleInstances = false;
          this.serviceProps = {};
          this.instantiationMode = "LAZY";
          this.onInstanceCreated = null;
        }
        setInstantiationMode(mode) {
          this.instantiationMode = mode;
          return this;
        }
        setMultipleInstances(multipleInstances) {
          this.multipleInstances = multipleInstances;
          return this;
        }
        setServiceProps(props) {
          this.serviceProps = props;
          return this;
        }
        setInstanceCreatedCallback(callback) {
          this.onInstanceCreated = callback;
          return this;
        }
      };
      DEFAULT_ENTRY_NAME = "[DEFAULT]";
      Provider = class {
        constructor(name3, container) {
          this.name = name3;
          this.container = container;
          this.component = null;
          this.instances = /* @__PURE__ */ new Map();
          this.instancesDeferred = /* @__PURE__ */ new Map();
          this.instancesOptions = /* @__PURE__ */ new Map();
          this.onInitCallbacks = /* @__PURE__ */ new Map();
        }
        /**
         * @param identifier A provider can provide multiple instances of a service
         * if this.component.multipleInstances is true.
         */
        get(identifier) {
          const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
          if (!this.instancesDeferred.has(normalizedIdentifier)) {
            const deferred = new Deferred();
            this.instancesDeferred.set(normalizedIdentifier, deferred);
            if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
              try {
                const instance = this.getOrInitializeService({
                  instanceIdentifier: normalizedIdentifier
                });
                if (instance) {
                  deferred.resolve(instance);
                }
              } catch (e) {
              }
            }
          }
          return this.instancesDeferred.get(normalizedIdentifier).promise;
        }
        getImmediate(options) {
          var _a;
          const normalizedIdentifier = this.normalizeInstanceIdentifier(options === null || options === void 0 ? void 0 : options.identifier);
          const optional = (_a = options === null || options === void 0 ? void 0 : options.optional) !== null && _a !== void 0 ? _a : false;
          if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
            try {
              return this.getOrInitializeService({
                instanceIdentifier: normalizedIdentifier
              });
            } catch (e) {
              if (optional) {
                return null;
              } else {
                throw e;
              }
            }
          } else {
            if (optional) {
              return null;
            } else {
              throw Error(`Service ${this.name} is not available`);
            }
          }
        }
        getComponent() {
          return this.component;
        }
        setComponent(component) {
          if (component.name !== this.name) {
            throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
          }
          if (this.component) {
            throw Error(`Component for ${this.name} has already been provided`);
          }
          this.component = component;
          if (!this.shouldAutoInitialize()) {
            return;
          }
          if (isComponentEager(component)) {
            try {
              this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME });
            } catch (e) {
            }
          }
          for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
            const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
            try {
              const instance = this.getOrInitializeService({
                instanceIdentifier: normalizedIdentifier
              });
              instanceDeferred.resolve(instance);
            } catch (e) {
            }
          }
        }
        clearInstance(identifier = DEFAULT_ENTRY_NAME) {
          this.instancesDeferred.delete(identifier);
          this.instancesOptions.delete(identifier);
          this.instances.delete(identifier);
        }
        // app.delete() will call this method on every provider to delete the services
        // TODO: should we mark the provider as deleted?
        async delete() {
          const services = Array.from(this.instances.values());
          await Promise.all([
            ...services.filter((service) => "INTERNAL" in service).map((service) => service.INTERNAL.delete()),
            ...services.filter((service) => "_delete" in service).map((service) => service._delete())
          ]);
        }
        isComponentSet() {
          return this.component != null;
        }
        isInitialized(identifier = DEFAULT_ENTRY_NAME) {
          return this.instances.has(identifier);
        }
        getOptions(identifier = DEFAULT_ENTRY_NAME) {
          return this.instancesOptions.get(identifier) || {};
        }
        initialize(opts = {}) {
          const { options = {} } = opts;
          const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
          if (this.isInitialized(normalizedIdentifier)) {
            throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
          }
          if (!this.isComponentSet()) {
            throw Error(`Component ${this.name} has not been registered yet`);
          }
          const instance = this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier,
            options
          });
          for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
            const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
            if (normalizedIdentifier === normalizedDeferredIdentifier) {
              instanceDeferred.resolve(instance);
            }
          }
          return instance;
        }
        /**
         *
         * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
         * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
         *
         * @param identifier An optional instance identifier
         * @returns a function to unregister the callback
         */
        onInit(callback, identifier) {
          var _a;
          const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
          const existingCallbacks = (_a = this.onInitCallbacks.get(normalizedIdentifier)) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new Set();
          existingCallbacks.add(callback);
          this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
          const existingInstance = this.instances.get(normalizedIdentifier);
          if (existingInstance) {
            callback(existingInstance, normalizedIdentifier);
          }
          return () => {
            existingCallbacks.delete(callback);
          };
        }
        /**
         * Invoke onInit callbacks synchronously
         * @param instance the service instance`
         */
        invokeOnInitCallbacks(instance, identifier) {
          const callbacks = this.onInitCallbacks.get(identifier);
          if (!callbacks) {
            return;
          }
          for (const callback of callbacks) {
            try {
              callback(instance, identifier);
            } catch (_a) {
            }
          }
        }
        getOrInitializeService({ instanceIdentifier, options = {} }) {
          let instance = this.instances.get(instanceIdentifier);
          if (!instance && this.component) {
            instance = this.component.instanceFactory(this.container, {
              instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
              options
            });
            this.instances.set(instanceIdentifier, instance);
            this.instancesOptions.set(instanceIdentifier, options);
            this.invokeOnInitCallbacks(instance, instanceIdentifier);
            if (this.component.onInstanceCreated) {
              try {
                this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
              } catch (_a) {
              }
            }
          }
          return instance || null;
        }
        normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME) {
          if (this.component) {
            return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
          } else {
            return identifier;
          }
        }
        shouldAutoInitialize() {
          return !!this.component && this.component.instantiationMode !== "EXPLICIT";
        }
      };
      ComponentContainer = class {
        constructor(name3) {
          this.name = name3;
          this.providers = /* @__PURE__ */ new Map();
        }
        /**
         *
         * @param component Component being added
         * @param overwrite When a component with the same name has already been registered,
         * if overwrite is true: overwrite the existing component with the new component and create a new
         * provider with the new component. It can be useful in tests where you want to use different mocks
         * for different tests.
         * if overwrite is false: throw an exception
         */
        addComponent(component) {
          const provider = this.getProvider(component.name);
          if (provider.isComponentSet()) {
            throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
          }
          provider.setComponent(component);
        }
        addOrOverwriteComponent(component) {
          const provider = this.getProvider(component.name);
          if (provider.isComponentSet()) {
            this.providers.delete(component.name);
          }
          this.addComponent(component);
        }
        /**
         * getProvider provides a type safe interface where it can only be called with a field name
         * present in NameServiceMapping interface.
         *
         * Firebase SDKs providing services should extend NameServiceMapping interface to register
         * themselves.
         */
        getProvider(name3) {
          if (this.providers.has(name3)) {
            return this.providers.get(name3);
          }
          const provider = new Provider(name3, this);
          this.providers.set(name3, provider);
          return provider;
        }
        getProviders() {
          return Array.from(this.providers.values());
        }
      };
    }
  });

  // node_modules/@firebase/logger/dist/esm/index.esm2017.js
  var instances, LogLevel, levelStringToEnum, defaultLogLevel, ConsoleMethod, defaultLogHandler, Logger;
  var init_index_esm20173 = __esm({
    "node_modules/@firebase/logger/dist/esm/index.esm2017.js"() {
      instances = [];
      (function(LogLevel2) {
        LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
        LogLevel2[LogLevel2["VERBOSE"] = 1] = "VERBOSE";
        LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
        LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
        LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
        LogLevel2[LogLevel2["SILENT"] = 5] = "SILENT";
      })(LogLevel || (LogLevel = {}));
      levelStringToEnum = {
        "debug": LogLevel.DEBUG,
        "verbose": LogLevel.VERBOSE,
        "info": LogLevel.INFO,
        "warn": LogLevel.WARN,
        "error": LogLevel.ERROR,
        "silent": LogLevel.SILENT
      };
      defaultLogLevel = LogLevel.INFO;
      ConsoleMethod = {
        [LogLevel.DEBUG]: "log",
        [LogLevel.VERBOSE]: "log",
        [LogLevel.INFO]: "info",
        [LogLevel.WARN]: "warn",
        [LogLevel.ERROR]: "error"
      };
      defaultLogHandler = (instance, logType, ...args) => {
        if (logType < instance.logLevel) {
          return;
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const method = ConsoleMethod[logType];
        if (method) {
          console[method](`[${now}]  ${instance.name}:`, ...args);
        } else {
          throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
        }
      };
      Logger = class {
        /**
         * Gives you an instance of a Logger to capture messages according to
         * Firebase's logging scheme.
         *
         * @param name The name that the logs will be associated with
         */
        constructor(name3) {
          this.name = name3;
          this._logLevel = defaultLogLevel;
          this._logHandler = defaultLogHandler;
          this._userLogHandler = null;
          instances.push(this);
        }
        get logLevel() {
          return this._logLevel;
        }
        set logLevel(val) {
          if (!(val in LogLevel)) {
            throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
          }
          this._logLevel = val;
        }
        // Workaround for setter/getter having to be the same type.
        setLogLevel(val) {
          this._logLevel = typeof val === "string" ? levelStringToEnum[val] : val;
        }
        get logHandler() {
          return this._logHandler;
        }
        set logHandler(val) {
          if (typeof val !== "function") {
            throw new TypeError("Value assigned to `logHandler` must be a function");
          }
          this._logHandler = val;
        }
        get userLogHandler() {
          return this._userLogHandler;
        }
        set userLogHandler(val) {
          this._userLogHandler = val;
        }
        /**
         * The functions below are all based on the `console` interface
         */
        debug(...args) {
          this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
          this._logHandler(this, LogLevel.DEBUG, ...args);
        }
        log(...args) {
          this._userLogHandler && this._userLogHandler(this, LogLevel.VERBOSE, ...args);
          this._logHandler(this, LogLevel.VERBOSE, ...args);
        }
        info(...args) {
          this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
          this._logHandler(this, LogLevel.INFO, ...args);
        }
        warn(...args) {
          this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
          this._logHandler(this, LogLevel.WARN, ...args);
        }
        error(...args) {
          this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
          this._logHandler(this, LogLevel.ERROR, ...args);
        }
      };
    }
  });

  // node_modules/idb/build/wrap-idb-value.js
  function getIdbProxyableTypes() {
    return idbProxyableTypes || (idbProxyableTypes = [
      IDBDatabase,
      IDBObjectStore,
      IDBIndex,
      IDBCursor,
      IDBTransaction
    ]);
  }
  function getCursorAdvanceMethods() {
    return cursorAdvanceMethods || (cursorAdvanceMethods = [
      IDBCursor.prototype.advance,
      IDBCursor.prototype.continue,
      IDBCursor.prototype.continuePrimaryKey
    ]);
  }
  function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
      const unlisten = () => {
        request.removeEventListener("success", success);
        request.removeEventListener("error", error);
      };
      const success = () => {
        resolve(wrap(request.result));
        unlisten();
      };
      const error = () => {
        reject(request.error);
        unlisten();
      };
      request.addEventListener("success", success);
      request.addEventListener("error", error);
    });
    promise.then((value) => {
      if (value instanceof IDBCursor) {
        cursorRequestMap.set(value, request);
      }
    }).catch(() => {
    });
    reverseTransformCache.set(promise, request);
    return promise;
  }
  function cacheDonePromiseForTransaction(tx) {
    if (transactionDoneMap.has(tx))
      return;
    const done = new Promise((resolve, reject) => {
      const unlisten = () => {
        tx.removeEventListener("complete", complete);
        tx.removeEventListener("error", error);
        tx.removeEventListener("abort", error);
      };
      const complete = () => {
        resolve();
        unlisten();
      };
      const error = () => {
        reject(tx.error || new DOMException("AbortError", "AbortError"));
        unlisten();
      };
      tx.addEventListener("complete", complete);
      tx.addEventListener("error", error);
      tx.addEventListener("abort", error);
    });
    transactionDoneMap.set(tx, done);
  }
  function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
  }
  function wrapFunction(func) {
    if (func === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype)) {
      return function(storeNames, ...args) {
        const tx = func.call(unwrap(this), storeNames, ...args);
        transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
        return wrap(tx);
      };
    }
    if (getCursorAdvanceMethods().includes(func)) {
      return function(...args) {
        func.apply(unwrap(this), args);
        return wrap(cursorRequestMap.get(this));
      };
    }
    return function(...args) {
      return wrap(func.apply(unwrap(this), args));
    };
  }
  function transformCachableValue(value) {
    if (typeof value === "function")
      return wrapFunction(value);
    if (value instanceof IDBTransaction)
      cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
      return new Proxy(value, idbProxyTraps);
    return value;
  }
  function wrap(value) {
    if (value instanceof IDBRequest)
      return promisifyRequest(value);
    if (transformCache.has(value))
      return transformCache.get(value);
    const newValue = transformCachableValue(value);
    if (newValue !== value) {
      transformCache.set(value, newValue);
      reverseTransformCache.set(newValue, value);
    }
    return newValue;
  }
  var instanceOfAny, idbProxyableTypes, cursorAdvanceMethods, cursorRequestMap, transactionDoneMap, transactionStoreNamesMap, transformCache, reverseTransformCache, idbProxyTraps, unwrap;
  var init_wrap_idb_value = __esm({
    "node_modules/idb/build/wrap-idb-value.js"() {
      instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
      cursorRequestMap = /* @__PURE__ */ new WeakMap();
      transactionDoneMap = /* @__PURE__ */ new WeakMap();
      transactionStoreNamesMap = /* @__PURE__ */ new WeakMap();
      transformCache = /* @__PURE__ */ new WeakMap();
      reverseTransformCache = /* @__PURE__ */ new WeakMap();
      idbProxyTraps = {
        get(target, prop, receiver) {
          if (target instanceof IDBTransaction) {
            if (prop === "done")
              return transactionDoneMap.get(target);
            if (prop === "objectStoreNames") {
              return target.objectStoreNames || transactionStoreNamesMap.get(target);
            }
            if (prop === "store") {
              return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
            }
          }
          return wrap(target[prop]);
        },
        set(target, prop, value) {
          target[prop] = value;
          return true;
        },
        has(target, prop) {
          if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
            return true;
          }
          return prop in target;
        }
      };
      unwrap = (value) => reverseTransformCache.get(value);
    }
  });

  // node_modules/idb/build/index.js
  function openDB(name3, version3, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name3, version3);
    const openPromise = wrap(request);
    if (upgrade) {
      request.addEventListener("upgradeneeded", (event) => {
        upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
      });
    }
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion,
        event.newVersion,
        event
      ));
    }
    openPromise.then((db) => {
      if (terminated)
        db.addEventListener("close", () => terminated());
      if (blocking) {
        db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
      }
    }).catch(() => {
    });
    return openPromise;
  }
  function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
      return;
    }
    if (cachedMethods.get(prop))
      return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, "");
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
      // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
      !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
    ) {
      return;
    }
    const method = async function(storeName, ...args) {
      const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
      let target2 = tx.store;
      if (useIndex)
        target2 = target2.index(args.shift());
      return (await Promise.all([
        target2[targetFuncName](...args),
        isWrite && tx.done
      ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
  }
  var readMethods, writeMethods, cachedMethods;
  var init_build = __esm({
    "node_modules/idb/build/index.js"() {
      init_wrap_idb_value();
      init_wrap_idb_value();
      readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
      writeMethods = ["put", "add", "delete", "clear"];
      cachedMethods = /* @__PURE__ */ new Map();
      replaceTraps((oldTraps) => ({
        ...oldTraps,
        get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
        has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
      }));
    }
  });

  // node_modules/@firebase/app/dist/esm/index.esm2017.js
  function isVersionServiceProvider(provider) {
    const component = provider.getComponent();
    return (component === null || component === void 0 ? void 0 : component.type) === "VERSION";
  }
  function _addComponent(app, component) {
    try {
      app.container.addComponent(component);
    } catch (e) {
      logger.debug(`Component ${component.name} failed to register with FirebaseApp ${app.name}`, e);
    }
  }
  function _registerComponent(component) {
    const componentName = component.name;
    if (_components.has(componentName)) {
      logger.debug(`There were multiple attempts to register component ${componentName}.`);
      return false;
    }
    _components.set(componentName, component);
    for (const app of _apps.values()) {
      _addComponent(app, component);
    }
    for (const serverApp of _serverApps.values()) {
      _addComponent(serverApp, component);
    }
    return true;
  }
  function _getProvider(app, name3) {
    const heartbeatController = app.container.getProvider("heartbeat").getImmediate({ optional: true });
    if (heartbeatController) {
      void heartbeatController.triggerHeartbeat();
    }
    return app.container.getProvider(name3);
  }
  function _isFirebaseServerApp(obj) {
    if (obj === null || obj === void 0) {
      return false;
    }
    return obj.settings !== void 0;
  }
  function initializeApp(_options, rawConfig = {}) {
    let options = _options;
    if (typeof rawConfig !== "object") {
      const name4 = rawConfig;
      rawConfig = { name: name4 };
    }
    const config = Object.assign({ name: DEFAULT_ENTRY_NAME2, automaticDataCollectionEnabled: true }, rawConfig);
    const name3 = config.name;
    if (typeof name3 !== "string" || !name3) {
      throw ERROR_FACTORY.create("bad-app-name", {
        appName: String(name3)
      });
    }
    options || (options = getDefaultAppConfig());
    if (!options) {
      throw ERROR_FACTORY.create(
        "no-options"
        /* AppError.NO_OPTIONS */
      );
    }
    const existingApp = _apps.get(name3);
    if (existingApp) {
      if (deepEqual(options, existingApp.options) && deepEqual(config, existingApp.config)) {
        return existingApp;
      } else {
        throw ERROR_FACTORY.create("duplicate-app", { appName: name3 });
      }
    }
    const container = new ComponentContainer(name3);
    for (const component of _components.values()) {
      container.addComponent(component);
    }
    const newApp = new FirebaseAppImpl(options, config, container);
    _apps.set(name3, newApp);
    return newApp;
  }
  function getApp(name3 = DEFAULT_ENTRY_NAME2) {
    const app = _apps.get(name3);
    if (!app && name3 === DEFAULT_ENTRY_NAME2 && getDefaultAppConfig()) {
      return initializeApp();
    }
    if (!app) {
      throw ERROR_FACTORY.create("no-app", { appName: name3 });
    }
    return app;
  }
  function registerVersion(libraryKeyOrName, version3, variant) {
    var _a;
    let library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName]) !== null && _a !== void 0 ? _a : libraryKeyOrName;
    if (variant) {
      library += `-${variant}`;
    }
    const libraryMismatch = library.match(/\s|\//);
    const versionMismatch = version3.match(/\s|\//);
    if (libraryMismatch || versionMismatch) {
      const warning = [
        `Unable to register library "${library}" with version "${version3}":`
      ];
      if (libraryMismatch) {
        warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
      }
      if (libraryMismatch && versionMismatch) {
        warning.push("and");
      }
      if (versionMismatch) {
        warning.push(`version name "${version3}" contains illegal characters (whitespace or "/")`);
      }
      logger.warn(warning.join(" "));
      return;
    }
    _registerComponent(new Component(
      `${library}-version`,
      () => ({ library, version: version3 }),
      "VERSION"
      /* ComponentType.VERSION */
    ));
  }
  function getDbPromise() {
    if (!dbPromise) {
      dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade: (db, oldVersion) => {
          switch (oldVersion) {
            case 0:
              try {
                db.createObjectStore(STORE_NAME);
              } catch (e) {
                console.warn(e);
              }
          }
        }
      }).catch((e) => {
        throw ERROR_FACTORY.create("idb-open", {
          originalErrorMessage: e.message
        });
      });
    }
    return dbPromise;
  }
  async function readHeartbeatsFromIndexedDB(app) {
    try {
      const db = await getDbPromise();
      const tx = db.transaction(STORE_NAME);
      const result = await tx.objectStore(STORE_NAME).get(computeKey(app));
      await tx.done;
      return result;
    } catch (e) {
      if (e instanceof FirebaseError) {
        logger.warn(e.message);
      } else {
        const idbGetError = ERROR_FACTORY.create("idb-get", {
          originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
        });
        logger.warn(idbGetError.message);
      }
    }
  }
  async function writeHeartbeatsToIndexedDB(app, heartbeatObject) {
    try {
      const db = await getDbPromise();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const objectStore = tx.objectStore(STORE_NAME);
      await objectStore.put(heartbeatObject, computeKey(app));
      await tx.done;
    } catch (e) {
      if (e instanceof FirebaseError) {
        logger.warn(e.message);
      } else {
        const idbGetError = ERROR_FACTORY.create("idb-set", {
          originalErrorMessage: e === null || e === void 0 ? void 0 : e.message
        });
        logger.warn(idbGetError.message);
      }
    }
  }
  function computeKey(app) {
    return `${app.name}!${app.options.appId}`;
  }
  function getUTCDateString() {
    const today = /* @__PURE__ */ new Date();
    return today.toISOString().substring(0, 10);
  }
  function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
    const heartbeatsToSend = [];
    let unsentEntries = heartbeatsCache.slice();
    for (const singleDateHeartbeat of heartbeatsCache) {
      const heartbeatEntry = heartbeatsToSend.find((hb) => hb.agent === singleDateHeartbeat.agent);
      if (!heartbeatEntry) {
        heartbeatsToSend.push({
          agent: singleDateHeartbeat.agent,
          dates: [singleDateHeartbeat.date]
        });
        if (countBytes(heartbeatsToSend) > maxSize) {
          heartbeatsToSend.pop();
          break;
        }
      } else {
        heartbeatEntry.dates.push(singleDateHeartbeat.date);
        if (countBytes(heartbeatsToSend) > maxSize) {
          heartbeatEntry.dates.pop();
          break;
        }
      }
      unsentEntries = unsentEntries.slice(1);
    }
    return {
      heartbeatsToSend,
      unsentEntries
    };
  }
  function countBytes(heartbeatsCache) {
    return base64urlEncodeWithoutPadding(
      // heartbeatsCache wrapper properties
      JSON.stringify({ version: 2, heartbeats: heartbeatsCache })
    ).length;
  }
  function getEarliestHeartbeatIdx(heartbeats) {
    if (heartbeats.length === 0) {
      return -1;
    }
    let earliestHeartbeatIdx = 0;
    let earliestHeartbeatDate = heartbeats[0].date;
    for (let i = 1; i < heartbeats.length; i++) {
      if (heartbeats[i].date < earliestHeartbeatDate) {
        earliestHeartbeatDate = heartbeats[i].date;
        earliestHeartbeatIdx = i;
      }
    }
    return earliestHeartbeatIdx;
  }
  function registerCoreComponents(variant) {
    _registerComponent(new Component(
      "platform-logger",
      (container) => new PlatformLoggerServiceImpl(container),
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
    _registerComponent(new Component(
      "heartbeat",
      (container) => new HeartbeatServiceImpl(container),
      "PRIVATE"
      /* ComponentType.PRIVATE */
    ));
    registerVersion(name$q, version$1, variant);
    registerVersion(name$q, version$1, "esm2017");
    registerVersion("fire-js", "");
  }
  var PlatformLoggerServiceImpl, name$q, version$1, logger, name$p, name$o, name$n, name$m, name$l, name$k, name$j, name$i, name$h, name$g, name$f, name$e, name$d, name$c, name$b, name$a, name$9, name$8, name$7, name$6, name$5, name$4, name$3, name$2, name$1, name, version, DEFAULT_ENTRY_NAME2, PLATFORM_LOG_STRING, _apps, _serverApps, _components, ERRORS, ERROR_FACTORY, FirebaseAppImpl, SDK_VERSION, DB_NAME, DB_VERSION, STORE_NAME, dbPromise, MAX_HEADER_BYTES, MAX_NUM_STORED_HEARTBEATS, HeartbeatServiceImpl, HeartbeatStorageImpl;
  var init_index_esm20174 = __esm({
    "node_modules/@firebase/app/dist/esm/index.esm2017.js"() {
      init_index_esm20172();
      init_index_esm20173();
      init_index_esm2017();
      init_index_esm2017();
      init_build();
      PlatformLoggerServiceImpl = class {
        constructor(container) {
          this.container = container;
        }
        // In initial implementation, this will be called by installations on
        // auth token refresh, and installations will send this string.
        getPlatformInfoString() {
          const providers = this.container.getProviders();
          return providers.map((provider) => {
            if (isVersionServiceProvider(provider)) {
              const service = provider.getImmediate();
              return `${service.library}/${service.version}`;
            } else {
              return null;
            }
          }).filter((logString) => logString).join(" ");
        }
      };
      name$q = "@firebase/app";
      version$1 = "0.13.1";
      logger = new Logger("@firebase/app");
      name$p = "@firebase/app-compat";
      name$o = "@firebase/analytics-compat";
      name$n = "@firebase/analytics";
      name$m = "@firebase/app-check-compat";
      name$l = "@firebase/app-check";
      name$k = "@firebase/auth";
      name$j = "@firebase/auth-compat";
      name$i = "@firebase/database";
      name$h = "@firebase/data-connect";
      name$g = "@firebase/database-compat";
      name$f = "@firebase/functions";
      name$e = "@firebase/functions-compat";
      name$d = "@firebase/installations";
      name$c = "@firebase/installations-compat";
      name$b = "@firebase/messaging";
      name$a = "@firebase/messaging-compat";
      name$9 = "@firebase/performance";
      name$8 = "@firebase/performance-compat";
      name$7 = "@firebase/remote-config";
      name$6 = "@firebase/remote-config-compat";
      name$5 = "@firebase/storage";
      name$4 = "@firebase/storage-compat";
      name$3 = "@firebase/firestore";
      name$2 = "@firebase/ai";
      name$1 = "@firebase/firestore-compat";
      name = "firebase";
      version = "11.9.0";
      DEFAULT_ENTRY_NAME2 = "[DEFAULT]";
      PLATFORM_LOG_STRING = {
        [name$q]: "fire-core",
        [name$p]: "fire-core-compat",
        [name$n]: "fire-analytics",
        [name$o]: "fire-analytics-compat",
        [name$l]: "fire-app-check",
        [name$m]: "fire-app-check-compat",
        [name$k]: "fire-auth",
        [name$j]: "fire-auth-compat",
        [name$i]: "fire-rtdb",
        [name$h]: "fire-data-connect",
        [name$g]: "fire-rtdb-compat",
        [name$f]: "fire-fn",
        [name$e]: "fire-fn-compat",
        [name$d]: "fire-iid",
        [name$c]: "fire-iid-compat",
        [name$b]: "fire-fcm",
        [name$a]: "fire-fcm-compat",
        [name$9]: "fire-perf",
        [name$8]: "fire-perf-compat",
        [name$7]: "fire-rc",
        [name$6]: "fire-rc-compat",
        [name$5]: "fire-gcs",
        [name$4]: "fire-gcs-compat",
        [name$3]: "fire-fst",
        [name$1]: "fire-fst-compat",
        [name$2]: "fire-vertex",
        "fire-js": "fire-js",
        // Platform identifier for JS SDK.
        [name]: "fire-js-all"
      };
      _apps = /* @__PURE__ */ new Map();
      _serverApps = /* @__PURE__ */ new Map();
      _components = /* @__PURE__ */ new Map();
      ERRORS = {
        [
          "no-app"
          /* AppError.NO_APP */
        ]: "No Firebase App '{$appName}' has been created - call initializeApp() first",
        [
          "bad-app-name"
          /* AppError.BAD_APP_NAME */
        ]: "Illegal App name: '{$appName}'",
        [
          "duplicate-app"
          /* AppError.DUPLICATE_APP */
        ]: "Firebase App named '{$appName}' already exists with different options or config",
        [
          "app-deleted"
          /* AppError.APP_DELETED */
        ]: "Firebase App named '{$appName}' already deleted",
        [
          "server-app-deleted"
          /* AppError.SERVER_APP_DELETED */
        ]: "Firebase Server App has been deleted",
        [
          "no-options"
          /* AppError.NO_OPTIONS */
        ]: "Need to provide options, when not being deployed to hosting via source.",
        [
          "invalid-app-argument"
          /* AppError.INVALID_APP_ARGUMENT */
        ]: "firebase.{$appName}() takes either no argument or a Firebase App instance.",
        [
          "invalid-log-argument"
          /* AppError.INVALID_LOG_ARGUMENT */
        ]: "First argument to `onLog` must be null or a function.",
        [
          "idb-open"
          /* AppError.IDB_OPEN */
        ]: "Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.",
        [
          "idb-get"
          /* AppError.IDB_GET */
        ]: "Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.",
        [
          "idb-set"
          /* AppError.IDB_WRITE */
        ]: "Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.",
        [
          "idb-delete"
          /* AppError.IDB_DELETE */
        ]: "Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.",
        [
          "finalization-registry-not-supported"
          /* AppError.FINALIZATION_REGISTRY_NOT_SUPPORTED */
        ]: "FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.",
        [
          "invalid-server-app-environment"
          /* AppError.INVALID_SERVER_APP_ENVIRONMENT */
        ]: "FirebaseServerApp is not for use in browser environments."
      };
      ERROR_FACTORY = new ErrorFactory("app", "Firebase", ERRORS);
      FirebaseAppImpl = class {
        constructor(options, config, container) {
          this._isDeleted = false;
          this._options = Object.assign({}, options);
          this._config = Object.assign({}, config);
          this._name = config.name;
          this._automaticDataCollectionEnabled = config.automaticDataCollectionEnabled;
          this._container = container;
          this.container.addComponent(new Component(
            "app",
            () => this,
            "PUBLIC"
            /* ComponentType.PUBLIC */
          ));
        }
        get automaticDataCollectionEnabled() {
          this.checkDestroyed();
          return this._automaticDataCollectionEnabled;
        }
        set automaticDataCollectionEnabled(val) {
          this.checkDestroyed();
          this._automaticDataCollectionEnabled = val;
        }
        get name() {
          this.checkDestroyed();
          return this._name;
        }
        get options() {
          this.checkDestroyed();
          return this._options;
        }
        get config() {
          this.checkDestroyed();
          return this._config;
        }
        get container() {
          return this._container;
        }
        get isDeleted() {
          return this._isDeleted;
        }
        set isDeleted(val) {
          this._isDeleted = val;
        }
        /**
         * This function will throw an Error if the App has already been deleted -
         * use before performing API actions on the App.
         */
        checkDestroyed() {
          if (this.isDeleted) {
            throw ERROR_FACTORY.create("app-deleted", { appName: this._name });
          }
        }
      };
      SDK_VERSION = version;
      DB_NAME = "firebase-heartbeat-database";
      DB_VERSION = 1;
      STORE_NAME = "firebase-heartbeat-store";
      dbPromise = null;
      MAX_HEADER_BYTES = 1024;
      MAX_NUM_STORED_HEARTBEATS = 30;
      HeartbeatServiceImpl = class {
        constructor(container) {
          this.container = container;
          this._heartbeatsCache = null;
          const app = this.container.getProvider("app").getImmediate();
          this._storage = new HeartbeatStorageImpl(app);
          this._heartbeatsCachePromise = this._storage.read().then((result) => {
            this._heartbeatsCache = result;
            return result;
          });
        }
        /**
         * Called to report a heartbeat. The function will generate
         * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
         * to IndexedDB.
         * Note that we only store one heartbeat per day. So if a heartbeat for today is
         * already logged, subsequent calls to this function in the same day will be ignored.
         */
        async triggerHeartbeat() {
          var _a, _b;
          try {
            const platformLogger = this.container.getProvider("platform-logger").getImmediate();
            const agent = platformLogger.getPlatformInfoString();
            const date = getUTCDateString();
            if (((_a = this._heartbeatsCache) === null || _a === void 0 ? void 0 : _a.heartbeats) == null) {
              this._heartbeatsCache = await this._heartbeatsCachePromise;
              if (((_b = this._heartbeatsCache) === null || _b === void 0 ? void 0 : _b.heartbeats) == null) {
                return;
              }
            }
            if (this._heartbeatsCache.lastSentHeartbeatDate === date || this._heartbeatsCache.heartbeats.some((singleDateHeartbeat) => singleDateHeartbeat.date === date)) {
              return;
            } else {
              this._heartbeatsCache.heartbeats.push({ date, agent });
              if (this._heartbeatsCache.heartbeats.length > MAX_NUM_STORED_HEARTBEATS) {
                const earliestHeartbeatIdx = getEarliestHeartbeatIdx(this._heartbeatsCache.heartbeats);
                this._heartbeatsCache.heartbeats.splice(earliestHeartbeatIdx, 1);
              }
            }
            return this._storage.overwrite(this._heartbeatsCache);
          } catch (e) {
            logger.warn(e);
          }
        }
        /**
         * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
         * It also clears all heartbeats from memory as well as in IndexedDB.
         *
         * NOTE: Consuming product SDKs should not send the header if this method
         * returns an empty string.
         */
        async getHeartbeatsHeader() {
          var _a;
          try {
            if (this._heartbeatsCache === null) {
              await this._heartbeatsCachePromise;
            }
            if (((_a = this._heartbeatsCache) === null || _a === void 0 ? void 0 : _a.heartbeats) == null || this._heartbeatsCache.heartbeats.length === 0) {
              return "";
            }
            const date = getUTCDateString();
            const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
            const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
            this._heartbeatsCache.lastSentHeartbeatDate = date;
            if (unsentEntries.length > 0) {
              this._heartbeatsCache.heartbeats = unsentEntries;
              await this._storage.overwrite(this._heartbeatsCache);
            } else {
              this._heartbeatsCache.heartbeats = [];
              void this._storage.overwrite(this._heartbeatsCache);
            }
            return headerString;
          } catch (e) {
            logger.warn(e);
            return "";
          }
        }
      };
      HeartbeatStorageImpl = class {
        constructor(app) {
          this.app = app;
          this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
        }
        async runIndexedDBEnvironmentCheck() {
          if (!isIndexedDBAvailable()) {
            return false;
          } else {
            return validateIndexedDBOpenable().then(() => true).catch(() => false);
          }
        }
        /**
         * Read all heartbeats.
         */
        async read() {
          const canUseIndexedDB = await this._canUseIndexedDBPromise;
          if (!canUseIndexedDB) {
            return { heartbeats: [] };
          } else {
            const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
            if (idbHeartbeatObject === null || idbHeartbeatObject === void 0 ? void 0 : idbHeartbeatObject.heartbeats) {
              return idbHeartbeatObject;
            } else {
              return { heartbeats: [] };
            }
          }
        }
        // overwrite the storage with the provided heartbeats
        async overwrite(heartbeatsObject) {
          var _a;
          const canUseIndexedDB = await this._canUseIndexedDBPromise;
          if (!canUseIndexedDB) {
            return;
          } else {
            const existingHeartbeatsObject = await this.read();
            return writeHeartbeatsToIndexedDB(this.app, {
              lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
              heartbeats: heartbeatsObject.heartbeats
            });
          }
        }
        // add heartbeats
        async add(heartbeatsObject) {
          var _a;
          const canUseIndexedDB = await this._canUseIndexedDBPromise;
          if (!canUseIndexedDB) {
            return;
          } else {
            const existingHeartbeatsObject = await this.read();
            return writeHeartbeatsToIndexedDB(this.app, {
              lastSentHeartbeatDate: (_a = heartbeatsObject.lastSentHeartbeatDate) !== null && _a !== void 0 ? _a : existingHeartbeatsObject.lastSentHeartbeatDate,
              heartbeats: [
                ...existingHeartbeatsObject.heartbeats,
                ...heartbeatsObject.heartbeats
              ]
            });
          }
        }
      };
      registerCoreComponents("");
    }
  });

  // node_modules/@firebase/storage/dist/index.esm2017.js
  function prependCode(code) {
    return "storage/" + code;
  }
  function unknown() {
    const message = "An unknown error occurred, please check the error payload for server response.";
    return new StorageError(StorageErrorCode.UNKNOWN, message);
  }
  function objectNotFound(path) {
    return new StorageError(StorageErrorCode.OBJECT_NOT_FOUND, "Object '" + path + "' does not exist.");
  }
  function quotaExceeded(bucket) {
    return new StorageError(StorageErrorCode.QUOTA_EXCEEDED, "Quota for bucket '" + bucket + "' exceeded, please view quota on https://firebase.google.com/pricing/.");
  }
  function unauthenticated() {
    const message = "User is not authenticated, please authenticate using Firebase Authentication and try again.";
    return new StorageError(StorageErrorCode.UNAUTHENTICATED, message);
  }
  function unauthorizedApp() {
    return new StorageError(StorageErrorCode.UNAUTHORIZED_APP, "This app does not have permission to access Firebase Storage on this project.");
  }
  function unauthorized(path) {
    return new StorageError(StorageErrorCode.UNAUTHORIZED, "User does not have permission to access '" + path + "'.");
  }
  function retryLimitExceeded() {
    return new StorageError(StorageErrorCode.RETRY_LIMIT_EXCEEDED, "Max retry time for operation exceeded, please try again.");
  }
  function canceled() {
    return new StorageError(StorageErrorCode.CANCELED, "User canceled the upload/download.");
  }
  function invalidUrl(url) {
    return new StorageError(StorageErrorCode.INVALID_URL, "Invalid URL '" + url + "'.");
  }
  function invalidDefaultBucket(bucket) {
    return new StorageError(StorageErrorCode.INVALID_DEFAULT_BUCKET, "Invalid default bucket '" + bucket + "'.");
  }
  function noDefaultBucket() {
    return new StorageError(StorageErrorCode.NO_DEFAULT_BUCKET, "No default bucket found. Did you set the '" + CONFIG_STORAGE_BUCKET_KEY + "' property when initializing the app?");
  }
  function cannotSliceBlob() {
    return new StorageError(StorageErrorCode.CANNOT_SLICE_BLOB, "Cannot slice blob for upload. Please retry the upload.");
  }
  function serverFileWrongSize() {
    return new StorageError(StorageErrorCode.SERVER_FILE_WRONG_SIZE, "Server recorded incorrect upload file size, please retry the upload.");
  }
  function noDownloadURL() {
    return new StorageError(StorageErrorCode.NO_DOWNLOAD_URL, "The given file does not have any download URLs.");
  }
  function missingPolyFill(polyFill) {
    return new StorageError(StorageErrorCode.UNSUPPORTED_ENVIRONMENT, `${polyFill} is missing. Make sure to install the required polyfills. See https://firebase.google.com/docs/web/environments-js-sdk#polyfills for more information.`);
  }
  function invalidArgument(message) {
    return new StorageError(StorageErrorCode.INVALID_ARGUMENT, message);
  }
  function appDeleted() {
    return new StorageError(StorageErrorCode.APP_DELETED, "The Firebase app was deleted.");
  }
  function invalidRootOperation(name3) {
    return new StorageError(StorageErrorCode.INVALID_ROOT_OPERATION, "The operation '" + name3 + "' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').");
  }
  function invalidFormat(format, message) {
    return new StorageError(StorageErrorCode.INVALID_FORMAT, "String does not match format '" + format + "': " + message);
  }
  function internalError(message) {
    throw new StorageError(StorageErrorCode.INTERNAL_ERROR, "Internal error: " + message);
  }
  function start(doRequest, backoffCompleteCb, timeout) {
    let waitSeconds = 1;
    let retryTimeoutId = null;
    let globalTimeoutId = null;
    let hitTimeout = false;
    let cancelState = 0;
    function canceled2() {
      return cancelState === 2;
    }
    let triggeredCallback = false;
    function triggerCallback(...args) {
      if (!triggeredCallback) {
        triggeredCallback = true;
        backoffCompleteCb.apply(null, args);
      }
    }
    function callWithDelay(millis) {
      retryTimeoutId = setTimeout(() => {
        retryTimeoutId = null;
        doRequest(responseHandler, canceled2());
      }, millis);
    }
    function clearGlobalTimeout() {
      if (globalTimeoutId) {
        clearTimeout(globalTimeoutId);
      }
    }
    function responseHandler(success, ...args) {
      if (triggeredCallback) {
        clearGlobalTimeout();
        return;
      }
      if (success) {
        clearGlobalTimeout();
        triggerCallback.call(null, success, ...args);
        return;
      }
      const mustStop = canceled2() || hitTimeout;
      if (mustStop) {
        clearGlobalTimeout();
        triggerCallback.call(null, success, ...args);
        return;
      }
      if (waitSeconds < 64) {
        waitSeconds *= 2;
      }
      let waitMillis;
      if (cancelState === 1) {
        cancelState = 2;
        waitMillis = 0;
      } else {
        waitMillis = (waitSeconds + Math.random()) * 1e3;
      }
      callWithDelay(waitMillis);
    }
    let stopped = false;
    function stop2(wasTimeout) {
      if (stopped) {
        return;
      }
      stopped = true;
      clearGlobalTimeout();
      if (triggeredCallback) {
        return;
      }
      if (retryTimeoutId !== null) {
        if (!wasTimeout) {
          cancelState = 2;
        }
        clearTimeout(retryTimeoutId);
        callWithDelay(0);
      } else {
        if (!wasTimeout) {
          cancelState = 1;
        }
      }
    }
    callWithDelay(0);
    globalTimeoutId = setTimeout(() => {
      hitTimeout = true;
      stop2(true);
    }, timeout);
    return stop2;
  }
  function stop(id) {
    id(false);
  }
  function isJustDef(p) {
    return p !== void 0;
  }
  function isFunction(p) {
    return typeof p === "function";
  }
  function isNonArrayObject(p) {
    return typeof p === "object" && !Array.isArray(p);
  }
  function isString(p) {
    return typeof p === "string" || p instanceof String;
  }
  function isNativeBlob(p) {
    return isNativeBlobDefined() && p instanceof Blob;
  }
  function isNativeBlobDefined() {
    return typeof Blob !== "undefined";
  }
  function validateNumber(argument, minValue, maxValue, value) {
    if (value < minValue) {
      throw invalidArgument(`Invalid value for '${argument}'. Expected ${minValue} or greater.`);
    }
    if (value > maxValue) {
      throw invalidArgument(`Invalid value for '${argument}'. Expected ${maxValue} or less.`);
    }
  }
  function makeUrl(urlPart, host, protocol) {
    let origin = host;
    if (protocol == null) {
      origin = `https://${host}`;
    }
    return `${protocol}://${origin}/v0${urlPart}`;
  }
  function makeQueryString(params) {
    const encode = encodeURIComponent;
    let queryPart = "?";
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        const nextPart = encode(key) + "=" + encode(params[key]);
        queryPart = queryPart + nextPart + "&";
      }
    }
    queryPart = queryPart.slice(0, -1);
    return queryPart;
  }
  function isRetryStatusCode(status, additionalRetryCodes) {
    const isFiveHundredCode = status >= 500 && status < 600;
    const extraRetryCodes = [
      // Request Timeout: web server didn't receive full request in time.
      408,
      // Too Many Requests: you're getting rate-limited, basically.
      429
    ];
    const isExtraRetryCode = extraRetryCodes.indexOf(status) !== -1;
    const isAdditionalRetryCode = additionalRetryCodes.indexOf(status) !== -1;
    return isFiveHundredCode || isExtraRetryCode || isAdditionalRetryCode;
  }
  function addAuthHeader_(headers, authToken) {
    if (authToken !== null && authToken.length > 0) {
      headers["Authorization"] = "Firebase " + authToken;
    }
  }
  function addVersionHeader_(headers, firebaseVersion) {
    headers["X-Firebase-Storage-Version"] = "webjs/" + (firebaseVersion !== null && firebaseVersion !== void 0 ? firebaseVersion : "AppManager");
  }
  function addGmpidHeader_(headers, appId) {
    if (appId) {
      headers["X-Firebase-GMPID"] = appId;
    }
  }
  function addAppCheckHeader_(headers, appCheckToken) {
    if (appCheckToken !== null) {
      headers["X-Firebase-AppCheck"] = appCheckToken;
    }
  }
  function makeRequest(requestInfo, appId, authToken, appCheckToken, requestFactory, firebaseVersion, retry = true, isUsingEmulator = false) {
    const queryPart = makeQueryString(requestInfo.urlParams);
    const url = requestInfo.url + queryPart;
    const headers = Object.assign({}, requestInfo.headers);
    addGmpidHeader_(headers, appId);
    addAuthHeader_(headers, authToken);
    addVersionHeader_(headers, firebaseVersion);
    addAppCheckHeader_(headers, appCheckToken);
    return new NetworkRequest(url, requestInfo.method, headers, requestInfo.body, requestInfo.successCodes, requestInfo.additionalRetryCodes, requestInfo.handler, requestInfo.errorHandler, requestInfo.timeout, requestInfo.progressCallback, requestFactory, retry, isUsingEmulator);
  }
  function getBlobBuilder() {
    if (typeof BlobBuilder !== "undefined") {
      return BlobBuilder;
    } else if (typeof WebKitBlobBuilder !== "undefined") {
      return WebKitBlobBuilder;
    } else {
      return void 0;
    }
  }
  function getBlob$1(...args) {
    const BlobBuilder2 = getBlobBuilder();
    if (BlobBuilder2 !== void 0) {
      const bb = new BlobBuilder2();
      for (let i = 0; i < args.length; i++) {
        bb.append(args[i]);
      }
      return bb.getBlob();
    } else {
      if (isNativeBlobDefined()) {
        return new Blob(args);
      } else {
        throw new StorageError(StorageErrorCode.UNSUPPORTED_ENVIRONMENT, "This browser doesn't seem to support creating Blobs");
      }
    }
  }
  function sliceBlob(blob, start2, end) {
    if (blob.webkitSlice) {
      return blob.webkitSlice(start2, end);
    } else if (blob.mozSlice) {
      return blob.mozSlice(start2, end);
    } else if (blob.slice) {
      return blob.slice(start2, end);
    }
    return null;
  }
  function decodeBase64(encoded) {
    if (typeof atob === "undefined") {
      throw missingPolyFill("base-64");
    }
    return atob(encoded);
  }
  function dataFromString(format, stringData) {
    switch (format) {
      case StringFormat.RAW:
        return new StringData(utf8Bytes_(stringData));
      case StringFormat.BASE64:
      case StringFormat.BASE64URL:
        return new StringData(base64Bytes_(format, stringData));
      case StringFormat.DATA_URL:
        return new StringData(dataURLBytes_(stringData), dataURLContentType_(stringData));
    }
    throw unknown();
  }
  function utf8Bytes_(value) {
    const b = [];
    for (let i = 0; i < value.length; i++) {
      let c = value.charCodeAt(i);
      if (c <= 127) {
        b.push(c);
      } else {
        if (c <= 2047) {
          b.push(192 | c >> 6, 128 | c & 63);
        } else {
          if ((c & 64512) === 55296) {
            const valid = i < value.length - 1 && (value.charCodeAt(i + 1) & 64512) === 56320;
            if (!valid) {
              b.push(239, 191, 189);
            } else {
              const hi = c;
              const lo = value.charCodeAt(++i);
              c = 65536 | (hi & 1023) << 10 | lo & 1023;
              b.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63);
            }
          } else {
            if ((c & 64512) === 56320) {
              b.push(239, 191, 189);
            } else {
              b.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
            }
          }
        }
      }
    }
    return new Uint8Array(b);
  }
  function percentEncodedBytes_(value) {
    let decoded;
    try {
      decoded = decodeURIComponent(value);
    } catch (e) {
      throw invalidFormat(StringFormat.DATA_URL, "Malformed data URL.");
    }
    return utf8Bytes_(decoded);
  }
  function base64Bytes_(format, value) {
    switch (format) {
      case StringFormat.BASE64: {
        const hasMinus = value.indexOf("-") !== -1;
        const hasUnder = value.indexOf("_") !== -1;
        if (hasMinus || hasUnder) {
          const invalidChar = hasMinus ? "-" : "_";
          throw invalidFormat(format, "Invalid character '" + invalidChar + "' found: is it base64url encoded?");
        }
        break;
      }
      case StringFormat.BASE64URL: {
        const hasPlus = value.indexOf("+") !== -1;
        const hasSlash = value.indexOf("/") !== -1;
        if (hasPlus || hasSlash) {
          const invalidChar = hasPlus ? "+" : "/";
          throw invalidFormat(format, "Invalid character '" + invalidChar + "' found: is it base64 encoded?");
        }
        value = value.replace(/-/g, "+").replace(/_/g, "/");
        break;
      }
    }
    let bytes;
    try {
      bytes = decodeBase64(value);
    } catch (e) {
      if (e.message.includes("polyfill")) {
        throw e;
      }
      throw invalidFormat(format, "Invalid character found");
    }
    const array = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      array[i] = bytes.charCodeAt(i);
    }
    return array;
  }
  function dataURLBytes_(dataUrl) {
    const parts = new DataURLParts(dataUrl);
    if (parts.base64) {
      return base64Bytes_(StringFormat.BASE64, parts.rest);
    } else {
      return percentEncodedBytes_(parts.rest);
    }
  }
  function dataURLContentType_(dataUrl) {
    const parts = new DataURLParts(dataUrl);
    return parts.contentType;
  }
  function endsWith(s, end) {
    const longEnough = s.length >= end.length;
    if (!longEnough) {
      return false;
    }
    return s.substring(s.length - end.length) === end;
  }
  function jsonObjectOrNull(s) {
    let obj;
    try {
      obj = JSON.parse(s);
    } catch (e) {
      return null;
    }
    if (isNonArrayObject(obj)) {
      return obj;
    } else {
      return null;
    }
  }
  function parent(path) {
    if (path.length === 0) {
      return null;
    }
    const index = path.lastIndexOf("/");
    if (index === -1) {
      return "";
    }
    const newPath = path.slice(0, index);
    return newPath;
  }
  function child(path, childPath) {
    const canonicalChildPath = childPath.split("/").filter((component) => component.length > 0).join("/");
    if (path.length === 0) {
      return canonicalChildPath;
    } else {
      return path + "/" + canonicalChildPath;
    }
  }
  function lastComponent(path) {
    const index = path.lastIndexOf("/", path.length - 2);
    if (index === -1) {
      return path;
    } else {
      return path.slice(index + 1);
    }
  }
  function noXform_(metadata, value) {
    return value;
  }
  function xformPath(fullPath) {
    if (!isString(fullPath) || fullPath.length < 2) {
      return fullPath;
    } else {
      return lastComponent(fullPath);
    }
  }
  function getMappings() {
    if (mappings_) {
      return mappings_;
    }
    const mappings = [];
    mappings.push(new Mapping("bucket"));
    mappings.push(new Mapping("generation"));
    mappings.push(new Mapping("metageneration"));
    mappings.push(new Mapping("name", "fullPath", true));
    function mappingsXformPath(_metadata, fullPath) {
      return xformPath(fullPath);
    }
    const nameMapping = new Mapping("name");
    nameMapping.xform = mappingsXformPath;
    mappings.push(nameMapping);
    function xformSize(_metadata, size) {
      if (size !== void 0) {
        return Number(size);
      } else {
        return size;
      }
    }
    const sizeMapping = new Mapping("size");
    sizeMapping.xform = xformSize;
    mappings.push(sizeMapping);
    mappings.push(new Mapping("timeCreated"));
    mappings.push(new Mapping("updated"));
    mappings.push(new Mapping("md5Hash", null, true));
    mappings.push(new Mapping("cacheControl", null, true));
    mappings.push(new Mapping("contentDisposition", null, true));
    mappings.push(new Mapping("contentEncoding", null, true));
    mappings.push(new Mapping("contentLanguage", null, true));
    mappings.push(new Mapping("contentType", null, true));
    mappings.push(new Mapping("metadata", "customMetadata", true));
    mappings_ = mappings;
    return mappings_;
  }
  function addRef(metadata, service) {
    function generateRef() {
      const bucket = metadata["bucket"];
      const path = metadata["fullPath"];
      const loc = new Location(bucket, path);
      return service._makeStorageReference(loc);
    }
    Object.defineProperty(metadata, "ref", { get: generateRef });
  }
  function fromResource(service, resource, mappings) {
    const metadata = {};
    metadata["type"] = "file";
    const len = mappings.length;
    for (let i = 0; i < len; i++) {
      const mapping = mappings[i];
      metadata[mapping.local] = mapping.xform(metadata, resource[mapping.server]);
    }
    addRef(metadata, service);
    return metadata;
  }
  function fromResourceString(service, resourceString, mappings) {
    const obj = jsonObjectOrNull(resourceString);
    if (obj === null) {
      return null;
    }
    const resource = obj;
    return fromResource(service, resource, mappings);
  }
  function downloadUrlFromResourceString(metadata, resourceString, host, protocol) {
    const obj = jsonObjectOrNull(resourceString);
    if (obj === null) {
      return null;
    }
    if (!isString(obj["downloadTokens"])) {
      return null;
    }
    const tokens = obj["downloadTokens"];
    if (tokens.length === 0) {
      return null;
    }
    const encode = encodeURIComponent;
    const tokensList = tokens.split(",");
    const urls = tokensList.map((token) => {
      const bucket = metadata["bucket"];
      const path = metadata["fullPath"];
      const urlPart = "/b/" + encode(bucket) + "/o/" + encode(path);
      const base = makeUrl(urlPart, host, protocol);
      const queryString = makeQueryString({
        alt: "media",
        token
      });
      return base + queryString;
    });
    return urls[0];
  }
  function toResourceString(metadata, mappings) {
    const resource = {};
    const len = mappings.length;
    for (let i = 0; i < len; i++) {
      const mapping = mappings[i];
      if (mapping.writable) {
        resource[mapping.server] = metadata[mapping.local];
      }
    }
    return JSON.stringify(resource);
  }
  function fromBackendResponse(service, bucket, resource) {
    const listResult = {
      prefixes: [],
      items: [],
      nextPageToken: resource["nextPageToken"]
    };
    if (resource[PREFIXES_KEY]) {
      for (const path of resource[PREFIXES_KEY]) {
        const pathWithoutTrailingSlash = path.replace(/\/$/, "");
        const reference = service._makeStorageReference(new Location(bucket, pathWithoutTrailingSlash));
        listResult.prefixes.push(reference);
      }
    }
    if (resource[ITEMS_KEY]) {
      for (const item of resource[ITEMS_KEY]) {
        const reference = service._makeStorageReference(new Location(bucket, item["name"]));
        listResult.items.push(reference);
      }
    }
    return listResult;
  }
  function fromResponseString(service, bucket, resourceString) {
    const obj = jsonObjectOrNull(resourceString);
    if (obj === null) {
      return null;
    }
    const resource = obj;
    return fromBackendResponse(service, bucket, resource);
  }
  function handlerCheck(cndn) {
    if (!cndn) {
      throw unknown();
    }
  }
  function metadataHandler(service, mappings) {
    function handler(xhr, text) {
      const metadata = fromResourceString(service, text, mappings);
      handlerCheck(metadata !== null);
      return metadata;
    }
    return handler;
  }
  function listHandler(service, bucket) {
    function handler(xhr, text) {
      const listResult = fromResponseString(service, bucket, text);
      handlerCheck(listResult !== null);
      return listResult;
    }
    return handler;
  }
  function downloadUrlHandler(service, mappings) {
    function handler(xhr, text) {
      const metadata = fromResourceString(service, text, mappings);
      handlerCheck(metadata !== null);
      return downloadUrlFromResourceString(metadata, text, service.host, service._protocol);
    }
    return handler;
  }
  function sharedErrorHandler(location) {
    function errorHandler(xhr, err) {
      let newErr;
      if (xhr.getStatus() === 401) {
        if (
          // This exact message string is the only consistent part of the
          // server's error response that identifies it as an App Check error.
          xhr.getErrorText().includes("Firebase App Check token is invalid")
        ) {
          newErr = unauthorizedApp();
        } else {
          newErr = unauthenticated();
        }
      } else {
        if (xhr.getStatus() === 402) {
          newErr = quotaExceeded(location.bucket);
        } else {
          if (xhr.getStatus() === 403) {
            newErr = unauthorized(location.path);
          } else {
            newErr = err;
          }
        }
      }
      newErr.status = xhr.getStatus();
      newErr.serverResponse = err.serverResponse;
      return newErr;
    }
    return errorHandler;
  }
  function objectErrorHandler(location) {
    const shared = sharedErrorHandler(location);
    function errorHandler(xhr, err) {
      let newErr = shared(xhr, err);
      if (xhr.getStatus() === 404) {
        newErr = objectNotFound(location.path);
      }
      newErr.serverResponse = err.serverResponse;
      return newErr;
    }
    return errorHandler;
  }
  function getMetadata$2(service, location, mappings) {
    const urlPart = location.fullServerUrl();
    const url = makeUrl(urlPart, service.host, service._protocol);
    const method = "GET";
    const timeout = service.maxOperationRetryTime;
    const requestInfo = new RequestInfo(url, method, metadataHandler(service, mappings), timeout);
    requestInfo.errorHandler = objectErrorHandler(location);
    return requestInfo;
  }
  function list$2(service, location, delimiter, pageToken, maxResults) {
    const urlParams = {};
    if (location.isRoot) {
      urlParams["prefix"] = "";
    } else {
      urlParams["prefix"] = location.path + "/";
    }
    if (delimiter && delimiter.length > 0) {
      urlParams["delimiter"] = delimiter;
    }
    if (pageToken) {
      urlParams["pageToken"] = pageToken;
    }
    if (maxResults) {
      urlParams["maxResults"] = maxResults;
    }
    const urlPart = location.bucketOnlyServerUrl();
    const url = makeUrl(urlPart, service.host, service._protocol);
    const method = "GET";
    const timeout = service.maxOperationRetryTime;
    const requestInfo = new RequestInfo(url, method, listHandler(service, location.bucket), timeout);
    requestInfo.urlParams = urlParams;
    requestInfo.errorHandler = sharedErrorHandler(location);
    return requestInfo;
  }
  function getBytes$1(service, location, maxDownloadSizeBytes) {
    const urlPart = location.fullServerUrl();
    const url = makeUrl(urlPart, service.host, service._protocol) + "?alt=media";
    const method = "GET";
    const timeout = service.maxOperationRetryTime;
    const requestInfo = new RequestInfo(url, method, (_, data) => data, timeout);
    requestInfo.errorHandler = objectErrorHandler(location);
    if (maxDownloadSizeBytes !== void 0) {
      requestInfo.headers["Range"] = `bytes=0-${maxDownloadSizeBytes}`;
      requestInfo.successCodes = [
        200,
        206
        /* Partial Content */
      ];
    }
    return requestInfo;
  }
  function getDownloadUrl(service, location, mappings) {
    const urlPart = location.fullServerUrl();
    const url = makeUrl(urlPart, service.host, service._protocol);
    const method = "GET";
    const timeout = service.maxOperationRetryTime;
    const requestInfo = new RequestInfo(url, method, downloadUrlHandler(service, mappings), timeout);
    requestInfo.errorHandler = objectErrorHandler(location);
    return requestInfo;
  }
  function updateMetadata$2(service, location, metadata, mappings) {
    const urlPart = location.fullServerUrl();
    const url = makeUrl(urlPart, service.host, service._protocol);
    const method = "PATCH";
    const body = toResourceString(metadata, mappings);
    const headers = { "Content-Type": "application/json; charset=utf-8" };
    const timeout = service.maxOperationRetryTime;
    const requestInfo = new RequestInfo(url, method, metadataHandler(service, mappings), timeout);
    requestInfo.headers = headers;
    requestInfo.body = body;
    requestInfo.errorHandler = objectErrorHandler(location);
    return requestInfo;
  }
  function deleteObject$2(service, location) {
    const urlPart = location.fullServerUrl();
    const url = makeUrl(urlPart, service.host, service._protocol);
    const method = "DELETE";
    const timeout = service.maxOperationRetryTime;
    function handler(_xhr, _text) {
    }
    const requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.successCodes = [200, 204];
    requestInfo.errorHandler = objectErrorHandler(location);
    return requestInfo;
  }
  function determineContentType_(metadata, blob) {
    return metadata && metadata["contentType"] || blob && blob.type() || "application/octet-stream";
  }
  function metadataForUpload_(location, blob, metadata) {
    const metadataClone = Object.assign({}, metadata);
    metadataClone["fullPath"] = location.path;
    metadataClone["size"] = blob.size();
    if (!metadataClone["contentType"]) {
      metadataClone["contentType"] = determineContentType_(null, blob);
    }
    return metadataClone;
  }
  function multipartUpload(service, location, mappings, blob, metadata) {
    const urlPart = location.bucketOnlyServerUrl();
    const headers = {
      "X-Goog-Upload-Protocol": "multipart"
    };
    function genBoundary() {
      let str = "";
      for (let i = 0; i < 2; i++) {
        str = str + Math.random().toString().slice(2);
      }
      return str;
    }
    const boundary = genBoundary();
    headers["Content-Type"] = "multipart/related; boundary=" + boundary;
    const metadata_ = metadataForUpload_(location, blob, metadata);
    const metadataString = toResourceString(metadata_, mappings);
    const preBlobPart = "--" + boundary + "\r\nContent-Type: application/json; charset=utf-8\r\n\r\n" + metadataString + "\r\n--" + boundary + "\r\nContent-Type: " + metadata_["contentType"] + "\r\n\r\n";
    const postBlobPart = "\r\n--" + boundary + "--";
    const body = FbsBlob.getBlob(preBlobPart, blob, postBlobPart);
    if (body === null) {
      throw cannotSliceBlob();
    }
    const urlParams = { name: metadata_["fullPath"] };
    const url = makeUrl(urlPart, service.host, service._protocol);
    const method = "POST";
    const timeout = service.maxUploadRetryTime;
    const requestInfo = new RequestInfo(url, method, metadataHandler(service, mappings), timeout);
    requestInfo.urlParams = urlParams;
    requestInfo.headers = headers;
    requestInfo.body = body.uploadData();
    requestInfo.errorHandler = sharedErrorHandler(location);
    return requestInfo;
  }
  function checkResumeHeader_(xhr, allowed) {
    let status = null;
    try {
      status = xhr.getResponseHeader("X-Goog-Upload-Status");
    } catch (e) {
      handlerCheck(false);
    }
    const allowedStatus = allowed || ["active"];
    handlerCheck(!!status && allowedStatus.indexOf(status) !== -1);
    return status;
  }
  function createResumableUpload(service, location, mappings, blob, metadata) {
    const urlPart = location.bucketOnlyServerUrl();
    const metadataForUpload = metadataForUpload_(location, blob, metadata);
    const urlParams = { name: metadataForUpload["fullPath"] };
    const url = makeUrl(urlPart, service.host, service._protocol);
    const method = "POST";
    const headers = {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": `${blob.size()}`,
      "X-Goog-Upload-Header-Content-Type": metadataForUpload["contentType"],
      "Content-Type": "application/json; charset=utf-8"
    };
    const body = toResourceString(metadataForUpload, mappings);
    const timeout = service.maxUploadRetryTime;
    function handler(xhr) {
      checkResumeHeader_(xhr);
      let url2;
      try {
        url2 = xhr.getResponseHeader("X-Goog-Upload-URL");
      } catch (e) {
        handlerCheck(false);
      }
      handlerCheck(isString(url2));
      return url2;
    }
    const requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.urlParams = urlParams;
    requestInfo.headers = headers;
    requestInfo.body = body;
    requestInfo.errorHandler = sharedErrorHandler(location);
    return requestInfo;
  }
  function getResumableUploadStatus(service, location, url, blob) {
    const headers = { "X-Goog-Upload-Command": "query" };
    function handler(xhr) {
      const status = checkResumeHeader_(xhr, ["active", "final"]);
      let sizeString = null;
      try {
        sizeString = xhr.getResponseHeader("X-Goog-Upload-Size-Received");
      } catch (e) {
        handlerCheck(false);
      }
      if (!sizeString) {
        handlerCheck(false);
      }
      const size = Number(sizeString);
      handlerCheck(!isNaN(size));
      return new ResumableUploadStatus(size, blob.size(), status === "final");
    }
    const method = "POST";
    const timeout = service.maxUploadRetryTime;
    const requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.headers = headers;
    requestInfo.errorHandler = sharedErrorHandler(location);
    return requestInfo;
  }
  function continueResumableUpload(location, service, url, blob, chunkSize, mappings, status, progressCallback) {
    const status_ = new ResumableUploadStatus(0, 0);
    if (status) {
      status_.current = status.current;
      status_.total = status.total;
    } else {
      status_.current = 0;
      status_.total = blob.size();
    }
    if (blob.size() !== status_.total) {
      throw serverFileWrongSize();
    }
    const bytesLeft = status_.total - status_.current;
    let bytesToUpload = bytesLeft;
    if (chunkSize > 0) {
      bytesToUpload = Math.min(bytesToUpload, chunkSize);
    }
    const startByte = status_.current;
    const endByte = startByte + bytesToUpload;
    let uploadCommand = "";
    if (bytesToUpload === 0) {
      uploadCommand = "finalize";
    } else if (bytesLeft === bytesToUpload) {
      uploadCommand = "upload, finalize";
    } else {
      uploadCommand = "upload";
    }
    const headers = {
      "X-Goog-Upload-Command": uploadCommand,
      "X-Goog-Upload-Offset": `${status_.current}`
    };
    const body = blob.slice(startByte, endByte);
    if (body === null) {
      throw cannotSliceBlob();
    }
    function handler(xhr, text) {
      const uploadStatus = checkResumeHeader_(xhr, ["active", "final"]);
      const newCurrent = status_.current + bytesToUpload;
      const size = blob.size();
      let metadata;
      if (uploadStatus === "final") {
        metadata = metadataHandler(service, mappings)(xhr, text);
      } else {
        metadata = null;
      }
      return new ResumableUploadStatus(newCurrent, size, uploadStatus === "final", metadata);
    }
    const method = "POST";
    const timeout = service.maxUploadRetryTime;
    const requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.headers = headers;
    requestInfo.body = body.uploadData();
    requestInfo.progressCallback = progressCallback || null;
    requestInfo.errorHandler = sharedErrorHandler(location);
    return requestInfo;
  }
  function taskStateFromInternalTaskState(state) {
    switch (state) {
      case "running":
      case "pausing":
      case "canceling":
        return TaskState.RUNNING;
      case "paused":
        return TaskState.PAUSED;
      case "success":
        return TaskState.SUCCESS;
      case "canceled":
        return TaskState.CANCELED;
      case "error":
        return TaskState.ERROR;
      default:
        return TaskState.ERROR;
    }
  }
  function async(f) {
    return (...argsToForward) => {
      Promise.resolve().then(() => f(...argsToForward));
    };
  }
  function newTextConnection() {
    return textFactoryOverride ? textFactoryOverride() : new XhrTextConnection();
  }
  function newBytesConnection() {
    return new XhrBytesConnection();
  }
  function newBlobConnection() {
    return new XhrBlobConnection();
  }
  function getBytesInternal(ref3, maxDownloadSizeBytes) {
    ref3._throwIfRoot("getBytes");
    const requestInfo = getBytes$1(ref3.storage, ref3._location, maxDownloadSizeBytes);
    return ref3.storage.makeRequestWithTokens(requestInfo, newBytesConnection).then((bytes) => maxDownloadSizeBytes !== void 0 ? (
      // GCS may not honor the Range header for small files
      bytes.slice(0, maxDownloadSizeBytes)
    ) : bytes);
  }
  function getBlobInternal(ref3, maxDownloadSizeBytes) {
    ref3._throwIfRoot("getBlob");
    const requestInfo = getBytes$1(ref3.storage, ref3._location, maxDownloadSizeBytes);
    return ref3.storage.makeRequestWithTokens(requestInfo, newBlobConnection).then((blob) => maxDownloadSizeBytes !== void 0 ? (
      // GCS may not honor the Range header for small files
      blob.slice(0, maxDownloadSizeBytes)
    ) : blob);
  }
  function uploadBytes$1(ref3, data, metadata) {
    ref3._throwIfRoot("uploadBytes");
    const requestInfo = multipartUpload(ref3.storage, ref3._location, getMappings(), new FbsBlob(data, true), metadata);
    return ref3.storage.makeRequestWithTokens(requestInfo, newTextConnection).then((finalMetadata) => {
      return {
        metadata: finalMetadata,
        ref: ref3
      };
    });
  }
  function uploadBytesResumable$1(ref3, data, metadata) {
    ref3._throwIfRoot("uploadBytesResumable");
    return new UploadTask(ref3, new FbsBlob(data), metadata);
  }
  function uploadString$1(ref3, value, format = StringFormat.RAW, metadata) {
    ref3._throwIfRoot("uploadString");
    const data = dataFromString(format, value);
    const metadataClone = Object.assign({}, metadata);
    if (metadataClone["contentType"] == null && data.contentType != null) {
      metadataClone["contentType"] = data.contentType;
    }
    return uploadBytes$1(ref3, data.data, metadataClone);
  }
  function listAll$1(ref3) {
    const accumulator = {
      prefixes: [],
      items: []
    };
    return listAllHelper(ref3, accumulator).then(() => accumulator);
  }
  async function listAllHelper(ref3, accumulator, pageToken) {
    const opt = {
      // maxResults is 1000 by default.
      pageToken
    };
    const nextPage = await list$1(ref3, opt);
    accumulator.prefixes.push(...nextPage.prefixes);
    accumulator.items.push(...nextPage.items);
    if (nextPage.nextPageToken != null) {
      await listAllHelper(ref3, accumulator, nextPage.nextPageToken);
    }
  }
  function list$1(ref3, options) {
    if (options != null) {
      if (typeof options.maxResults === "number") {
        validateNumber(
          "options.maxResults",
          /* minValue= */
          1,
          /* maxValue= */
          1e3,
          options.maxResults
        );
      }
    }
    const op = options || {};
    const requestInfo = list$2(
      ref3.storage,
      ref3._location,
      /*delimiter= */
      "/",
      op.pageToken,
      op.maxResults
    );
    return ref3.storage.makeRequestWithTokens(requestInfo, newTextConnection);
  }
  function getMetadata$1(ref3) {
    ref3._throwIfRoot("getMetadata");
    const requestInfo = getMetadata$2(ref3.storage, ref3._location, getMappings());
    return ref3.storage.makeRequestWithTokens(requestInfo, newTextConnection);
  }
  function updateMetadata$1(ref3, metadata) {
    ref3._throwIfRoot("updateMetadata");
    const requestInfo = updateMetadata$2(ref3.storage, ref3._location, metadata, getMappings());
    return ref3.storage.makeRequestWithTokens(requestInfo, newTextConnection);
  }
  function getDownloadURL$1(ref3) {
    ref3._throwIfRoot("getDownloadURL");
    const requestInfo = getDownloadUrl(ref3.storage, ref3._location, getMappings());
    return ref3.storage.makeRequestWithTokens(requestInfo, newTextConnection).then((url) => {
      if (url === null) {
        throw noDownloadURL();
      }
      return url;
    });
  }
  function deleteObject$1(ref3) {
    ref3._throwIfRoot("deleteObject");
    const requestInfo = deleteObject$2(ref3.storage, ref3._location);
    return ref3.storage.makeRequestWithTokens(requestInfo, newTextConnection);
  }
  function _getChild$1(ref3, childPath) {
    const newPath = child(ref3._location.path, childPath);
    const location = new Location(ref3._location.bucket, newPath);
    return new Reference(ref3.storage, location);
  }
  function isUrl(path) {
    return /^[A-Za-z]+:\/\//.test(path);
  }
  function refFromURL(service, url) {
    return new Reference(service, url);
  }
  function refFromPath(ref3, path) {
    if (ref3 instanceof FirebaseStorageImpl) {
      const service = ref3;
      if (service._bucket == null) {
        throw noDefaultBucket();
      }
      const reference = new Reference(service, service._bucket);
      if (path != null) {
        return refFromPath(reference, path);
      } else {
        return reference;
      }
    } else {
      if (path !== void 0) {
        return _getChild$1(ref3, path);
      } else {
        return ref3;
      }
    }
  }
  function ref$1(serviceOrRef, pathOrUrl) {
    if (pathOrUrl && isUrl(pathOrUrl)) {
      if (serviceOrRef instanceof FirebaseStorageImpl) {
        return refFromURL(serviceOrRef, pathOrUrl);
      } else {
        throw invalidArgument("To use ref(service, url), the first argument must be a Storage instance.");
      }
    } else {
      return refFromPath(serviceOrRef, pathOrUrl);
    }
  }
  function extractBucket(host, config) {
    const bucketString = config === null || config === void 0 ? void 0 : config[CONFIG_STORAGE_BUCKET_KEY];
    if (bucketString == null) {
      return null;
    }
    return Location.makeFromBucketSpec(bucketString, host);
  }
  function connectStorageEmulator$1(storage, host, port, options = {}) {
    storage.host = `${host}:${port}`;
    const useSsl = isCloudWorkstation(host);
    if (useSsl) {
      void pingServer(`https://${storage.host}/b`);
      updateEmulatorBanner("Storage", true);
    }
    storage._isUsingEmulator = true;
    storage._protocol = useSsl ? "https" : "http";
    const { mockUserToken } = options;
    if (mockUserToken) {
      storage._overrideAuthToken = typeof mockUserToken === "string" ? mockUserToken : createMockUserToken(mockUserToken, storage.app.options.projectId);
    }
  }
  function getBytes(ref3, maxDownloadSizeBytes) {
    ref3 = getModularInstance(ref3);
    return getBytesInternal(ref3, maxDownloadSizeBytes);
  }
  function uploadBytes(ref3, data, metadata) {
    ref3 = getModularInstance(ref3);
    return uploadBytes$1(ref3, data, metadata);
  }
  function uploadString(ref3, value, format, metadata) {
    ref3 = getModularInstance(ref3);
    return uploadString$1(ref3, value, format, metadata);
  }
  function uploadBytesResumable(ref3, data, metadata) {
    ref3 = getModularInstance(ref3);
    return uploadBytesResumable$1(ref3, data, metadata);
  }
  function getMetadata(ref3) {
    ref3 = getModularInstance(ref3);
    return getMetadata$1(ref3);
  }
  function updateMetadata(ref3, metadata) {
    ref3 = getModularInstance(ref3);
    return updateMetadata$1(ref3, metadata);
  }
  function list(ref3, options) {
    ref3 = getModularInstance(ref3);
    return list$1(ref3, options);
  }
  function listAll(ref3) {
    ref3 = getModularInstance(ref3);
    return listAll$1(ref3);
  }
  function getDownloadURL(ref3) {
    ref3 = getModularInstance(ref3);
    return getDownloadURL$1(ref3);
  }
  function deleteObject(ref3) {
    ref3 = getModularInstance(ref3);
    return deleteObject$1(ref3);
  }
  function ref(serviceOrRef, pathOrUrl) {
    serviceOrRef = getModularInstance(serviceOrRef);
    return ref$1(serviceOrRef, pathOrUrl);
  }
  function _getChild(ref3, childPath) {
    return _getChild$1(ref3, childPath);
  }
  function getStorage(app = getApp(), bucketUrl) {
    app = getModularInstance(app);
    const storageProvider = _getProvider(app, STORAGE_TYPE);
    const storageInstance = storageProvider.getImmediate({
      identifier: bucketUrl
    });
    const emulator = getDefaultEmulatorHostnameAndPort("storage");
    if (emulator) {
      connectStorageEmulator(storageInstance, ...emulator);
    }
    return storageInstance;
  }
  function connectStorageEmulator(storage, host, port, options = {}) {
    connectStorageEmulator$1(storage, host, port, options);
  }
  function getBlob(ref3, maxDownloadSizeBytes) {
    ref3 = getModularInstance(ref3);
    return getBlobInternal(ref3, maxDownloadSizeBytes);
  }
  function getStream(ref3, maxDownloadSizeBytes) {
    throw new Error("getStream() is only supported by NodeJS builds");
  }
  function factory(container, { instanceIdentifier: url }) {
    const app = container.getProvider("app").getImmediate();
    const authProvider = container.getProvider("auth-internal");
    const appCheckProvider = container.getProvider("app-check-internal");
    return new FirebaseStorageImpl(app, authProvider, appCheckProvider, url, SDK_VERSION);
  }
  function registerStorage() {
    _registerComponent(new Component(
      STORAGE_TYPE,
      factory,
      "PUBLIC"
      /* ComponentType.PUBLIC */
    ).setMultipleInstances(true));
    registerVersion(name2, version2, "");
    registerVersion(name2, version2, "esm2017");
  }
  var DEFAULT_HOST, CONFIG_STORAGE_BUCKET_KEY, DEFAULT_MAX_OPERATION_RETRY_TIME, DEFAULT_MAX_UPLOAD_RETRY_TIME, DEFAULT_MIN_SLEEP_TIME_MILLIS, StorageError, StorageErrorCode, Location, FailRequest, ErrorCode, NetworkRequest, RequestEndStatus, StringFormat, StringData, DataURLParts, FbsBlob, Mapping, mappings_, PREFIXES_KEY, ITEMS_KEY, RequestInfo, ResumableUploadStatus, RESUMABLE_UPLOAD_CHUNK_SIZE, TaskEvent, TaskState, Observer, textFactoryOverride, XhrConnection, XhrTextConnection, XhrBytesConnection, XhrBlobConnection, UploadTask, Reference, FirebaseStorageImpl, name2, version2, STORAGE_TYPE;
  var init_index_esm20175 = __esm({
    "node_modules/@firebase/storage/dist/index.esm2017.js"() {
      init_index_esm20174();
      init_index_esm2017();
      init_index_esm20172();
      DEFAULT_HOST = "firebasestorage.googleapis.com";
      CONFIG_STORAGE_BUCKET_KEY = "storageBucket";
      DEFAULT_MAX_OPERATION_RETRY_TIME = 2 * 60 * 1e3;
      DEFAULT_MAX_UPLOAD_RETRY_TIME = 10 * 60 * 1e3;
      DEFAULT_MIN_SLEEP_TIME_MILLIS = 1e3;
      StorageError = class _StorageError extends FirebaseError {
        /**
         * @param code - A `StorageErrorCode` string to be prefixed with 'storage/' and
         *  added to the end of the message.
         * @param message  - Error message.
         * @param status_ - Corresponding HTTP Status Code
         */
        constructor(code, message, status_ = 0) {
          super(prependCode(code), `Firebase Storage: ${message} (${prependCode(code)})`);
          this.status_ = status_;
          this.customData = { serverResponse: null };
          this._baseMessage = this.message;
          Object.setPrototypeOf(this, _StorageError.prototype);
        }
        get status() {
          return this.status_;
        }
        set status(status) {
          this.status_ = status;
        }
        /**
         * Compares a `StorageErrorCode` against this error's code, filtering out the prefix.
         */
        _codeEquals(code) {
          return prependCode(code) === this.code;
        }
        /**
         * Optional response message that was added by the server.
         */
        get serverResponse() {
          return this.customData.serverResponse;
        }
        set serverResponse(serverResponse) {
          this.customData.serverResponse = serverResponse;
          if (this.customData.serverResponse) {
            this.message = `${this._baseMessage}
${this.customData.serverResponse}`;
          } else {
            this.message = this._baseMessage;
          }
        }
      };
      (function(StorageErrorCode2) {
        StorageErrorCode2["UNKNOWN"] = "unknown";
        StorageErrorCode2["OBJECT_NOT_FOUND"] = "object-not-found";
        StorageErrorCode2["BUCKET_NOT_FOUND"] = "bucket-not-found";
        StorageErrorCode2["PROJECT_NOT_FOUND"] = "project-not-found";
        StorageErrorCode2["QUOTA_EXCEEDED"] = "quota-exceeded";
        StorageErrorCode2["UNAUTHENTICATED"] = "unauthenticated";
        StorageErrorCode2["UNAUTHORIZED"] = "unauthorized";
        StorageErrorCode2["UNAUTHORIZED_APP"] = "unauthorized-app";
        StorageErrorCode2["RETRY_LIMIT_EXCEEDED"] = "retry-limit-exceeded";
        StorageErrorCode2["INVALID_CHECKSUM"] = "invalid-checksum";
        StorageErrorCode2["CANCELED"] = "canceled";
        StorageErrorCode2["INVALID_EVENT_NAME"] = "invalid-event-name";
        StorageErrorCode2["INVALID_URL"] = "invalid-url";
        StorageErrorCode2["INVALID_DEFAULT_BUCKET"] = "invalid-default-bucket";
        StorageErrorCode2["NO_DEFAULT_BUCKET"] = "no-default-bucket";
        StorageErrorCode2["CANNOT_SLICE_BLOB"] = "cannot-slice-blob";
        StorageErrorCode2["SERVER_FILE_WRONG_SIZE"] = "server-file-wrong-size";
        StorageErrorCode2["NO_DOWNLOAD_URL"] = "no-download-url";
        StorageErrorCode2["INVALID_ARGUMENT"] = "invalid-argument";
        StorageErrorCode2["INVALID_ARGUMENT_COUNT"] = "invalid-argument-count";
        StorageErrorCode2["APP_DELETED"] = "app-deleted";
        StorageErrorCode2["INVALID_ROOT_OPERATION"] = "invalid-root-operation";
        StorageErrorCode2["INVALID_FORMAT"] = "invalid-format";
        StorageErrorCode2["INTERNAL_ERROR"] = "internal-error";
        StorageErrorCode2["UNSUPPORTED_ENVIRONMENT"] = "unsupported-environment";
      })(StorageErrorCode || (StorageErrorCode = {}));
      Location = class _Location {
        constructor(bucket, path) {
          this.bucket = bucket;
          this.path_ = path;
        }
        get path() {
          return this.path_;
        }
        get isRoot() {
          return this.path.length === 0;
        }
        fullServerUrl() {
          const encode = encodeURIComponent;
          return "/b/" + encode(this.bucket) + "/o/" + encode(this.path);
        }
        bucketOnlyServerUrl() {
          const encode = encodeURIComponent;
          return "/b/" + encode(this.bucket) + "/o";
        }
        static makeFromBucketSpec(bucketString, host) {
          let bucketLocation;
          try {
            bucketLocation = _Location.makeFromUrl(bucketString, host);
          } catch (e) {
            return new _Location(bucketString, "");
          }
          if (bucketLocation.path === "") {
            return bucketLocation;
          } else {
            throw invalidDefaultBucket(bucketString);
          }
        }
        static makeFromUrl(url, host) {
          let location = null;
          const bucketDomain = "([A-Za-z0-9.\\-_]+)";
          function gsModify(loc) {
            if (loc.path.charAt(loc.path.length - 1) === "/") {
              loc.path_ = loc.path_.slice(0, -1);
            }
          }
          const gsPath = "(/(.*))?$";
          const gsRegex = new RegExp("^gs://" + bucketDomain + gsPath, "i");
          const gsIndices = { bucket: 1, path: 3 };
          function httpModify(loc) {
            loc.path_ = decodeURIComponent(loc.path);
          }
          const version3 = "v[A-Za-z0-9_]+";
          const firebaseStorageHost = host.replace(/[.]/g, "\\.");
          const firebaseStoragePath = "(/([^?#]*).*)?$";
          const firebaseStorageRegExp = new RegExp(`^https?://${firebaseStorageHost}/${version3}/b/${bucketDomain}/o${firebaseStoragePath}`, "i");
          const firebaseStorageIndices = { bucket: 1, path: 3 };
          const cloudStorageHost = host === DEFAULT_HOST ? "(?:storage.googleapis.com|storage.cloud.google.com)" : host;
          const cloudStoragePath = "([^?#]*)";
          const cloudStorageRegExp = new RegExp(`^https?://${cloudStorageHost}/${bucketDomain}/${cloudStoragePath}`, "i");
          const cloudStorageIndices = { bucket: 1, path: 2 };
          const groups = [
            { regex: gsRegex, indices: gsIndices, postModify: gsModify },
            {
              regex: firebaseStorageRegExp,
              indices: firebaseStorageIndices,
              postModify: httpModify
            },
            {
              regex: cloudStorageRegExp,
              indices: cloudStorageIndices,
              postModify: httpModify
            }
          ];
          for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const captures = group.regex.exec(url);
            if (captures) {
              const bucketValue = captures[group.indices.bucket];
              let pathValue = captures[group.indices.path];
              if (!pathValue) {
                pathValue = "";
              }
              location = new _Location(bucketValue, pathValue);
              group.postModify(location);
              break;
            }
          }
          if (location == null) {
            throw invalidUrl(url);
          }
          return location;
        }
      };
      FailRequest = class {
        constructor(error) {
          this.promise_ = Promise.reject(error);
        }
        /** @inheritDoc */
        getPromise() {
          return this.promise_;
        }
        /** @inheritDoc */
        cancel(_appDelete = false) {
        }
      };
      (function(ErrorCode2) {
        ErrorCode2[ErrorCode2["NO_ERROR"] = 0] = "NO_ERROR";
        ErrorCode2[ErrorCode2["NETWORK_ERROR"] = 1] = "NETWORK_ERROR";
        ErrorCode2[ErrorCode2["ABORT"] = 2] = "ABORT";
      })(ErrorCode || (ErrorCode = {}));
      NetworkRequest = class {
        constructor(url_, method_, headers_, body_, successCodes_, additionalRetryCodes_, callback_, errorCallback_, timeout_, progressCallback_, connectionFactory_, retry = true, isUsingEmulator = false) {
          this.url_ = url_;
          this.method_ = method_;
          this.headers_ = headers_;
          this.body_ = body_;
          this.successCodes_ = successCodes_;
          this.additionalRetryCodes_ = additionalRetryCodes_;
          this.callback_ = callback_;
          this.errorCallback_ = errorCallback_;
          this.timeout_ = timeout_;
          this.progressCallback_ = progressCallback_;
          this.connectionFactory_ = connectionFactory_;
          this.retry = retry;
          this.isUsingEmulator = isUsingEmulator;
          this.pendingConnection_ = null;
          this.backoffId_ = null;
          this.canceled_ = false;
          this.appDelete_ = false;
          this.promise_ = new Promise((resolve, reject) => {
            this.resolve_ = resolve;
            this.reject_ = reject;
            this.start_();
          });
        }
        /**
         * Actually starts the retry loop.
         */
        start_() {
          const doTheRequest = (backoffCallback, canceled2) => {
            if (canceled2) {
              backoffCallback(false, new RequestEndStatus(false, null, true));
              return;
            }
            const connection = this.connectionFactory_();
            this.pendingConnection_ = connection;
            const progressListener = (progressEvent) => {
              const loaded = progressEvent.loaded;
              const total = progressEvent.lengthComputable ? progressEvent.total : -1;
              if (this.progressCallback_ !== null) {
                this.progressCallback_(loaded, total);
              }
            };
            if (this.progressCallback_ !== null) {
              connection.addUploadProgressListener(progressListener);
            }
            connection.send(this.url_, this.method_, this.isUsingEmulator, this.body_, this.headers_).then(() => {
              if (this.progressCallback_ !== null) {
                connection.removeUploadProgressListener(progressListener);
              }
              this.pendingConnection_ = null;
              const hitServer = connection.getErrorCode() === ErrorCode.NO_ERROR;
              const status = connection.getStatus();
              if (!hitServer || isRetryStatusCode(status, this.additionalRetryCodes_) && this.retry) {
                const wasCanceled = connection.getErrorCode() === ErrorCode.ABORT;
                backoffCallback(false, new RequestEndStatus(false, null, wasCanceled));
                return;
              }
              const successCode = this.successCodes_.indexOf(status) !== -1;
              backoffCallback(true, new RequestEndStatus(successCode, connection));
            });
          };
          const backoffDone = (requestWentThrough, status) => {
            const resolve = this.resolve_;
            const reject = this.reject_;
            const connection = status.connection;
            if (status.wasSuccessCode) {
              try {
                const result = this.callback_(connection, connection.getResponse());
                if (isJustDef(result)) {
                  resolve(result);
                } else {
                  resolve();
                }
              } catch (e) {
                reject(e);
              }
            } else {
              if (connection !== null) {
                const err = unknown();
                err.serverResponse = connection.getErrorText();
                if (this.errorCallback_) {
                  reject(this.errorCallback_(connection, err));
                } else {
                  reject(err);
                }
              } else {
                if (status.canceled) {
                  const err = this.appDelete_ ? appDeleted() : canceled();
                  reject(err);
                } else {
                  const err = retryLimitExceeded();
                  reject(err);
                }
              }
            }
          };
          if (this.canceled_) {
            backoffDone(false, new RequestEndStatus(false, null, true));
          } else {
            this.backoffId_ = start(doTheRequest, backoffDone, this.timeout_);
          }
        }
        /** @inheritDoc */
        getPromise() {
          return this.promise_;
        }
        /** @inheritDoc */
        cancel(appDelete) {
          this.canceled_ = true;
          this.appDelete_ = appDelete || false;
          if (this.backoffId_ !== null) {
            stop(this.backoffId_);
          }
          if (this.pendingConnection_ !== null) {
            this.pendingConnection_.abort();
          }
        }
      };
      RequestEndStatus = class {
        constructor(wasSuccessCode, connection, canceled2) {
          this.wasSuccessCode = wasSuccessCode;
          this.connection = connection;
          this.canceled = !!canceled2;
        }
      };
      StringFormat = {
        /**
         * Indicates the string should be interpreted "raw", that is, as normal text.
         * The string will be interpreted as UTF-16, then uploaded as a UTF-8 byte
         * sequence.
         * Example: The string 'Hello! \\ud83d\\ude0a' becomes the byte sequence
         * 48 65 6c 6c 6f 21 20 f0 9f 98 8a
         */
        RAW: "raw",
        /**
         * Indicates the string should be interpreted as base64-encoded data.
         * Padding characters (trailing '='s) are optional.
         * Example: The string 'rWmO++E6t7/rlw==' becomes the byte sequence
         * ad 69 8e fb e1 3a b7 bf eb 97
         */
        BASE64: "base64",
        /**
         * Indicates the string should be interpreted as base64url-encoded data.
         * Padding characters (trailing '='s) are optional.
         * Example: The string 'rWmO--E6t7_rlw==' becomes the byte sequence
         * ad 69 8e fb e1 3a b7 bf eb 97
         */
        BASE64URL: "base64url",
        /**
         * Indicates the string is a data URL, such as one obtained from
         * canvas.toDataURL().
         * Example: the string 'data:application/octet-stream;base64,aaaa'
         * becomes the byte sequence
         * 69 a6 9a
         * (the content-type "application/octet-stream" is also applied, but can
         * be overridden in the metadata object).
         */
        DATA_URL: "data_url"
      };
      StringData = class {
        constructor(data, contentType) {
          this.data = data;
          this.contentType = contentType || null;
        }
      };
      DataURLParts = class {
        constructor(dataURL) {
          this.base64 = false;
          this.contentType = null;
          const matches = dataURL.match(/^data:([^,]+)?,/);
          if (matches === null) {
            throw invalidFormat(StringFormat.DATA_URL, "Must be formatted 'data:[<mediatype>][;base64],<data>");
          }
          const middle = matches[1] || null;
          if (middle != null) {
            this.base64 = endsWith(middle, ";base64");
            this.contentType = this.base64 ? middle.substring(0, middle.length - ";base64".length) : middle;
          }
          this.rest = dataURL.substring(dataURL.indexOf(",") + 1);
        }
      };
      FbsBlob = class _FbsBlob {
        constructor(data, elideCopy) {
          let size = 0;
          let blobType = "";
          if (isNativeBlob(data)) {
            this.data_ = data;
            size = data.size;
            blobType = data.type;
          } else if (data instanceof ArrayBuffer) {
            if (elideCopy) {
              this.data_ = new Uint8Array(data);
            } else {
              this.data_ = new Uint8Array(data.byteLength);
              this.data_.set(new Uint8Array(data));
            }
            size = this.data_.length;
          } else if (data instanceof Uint8Array) {
            if (elideCopy) {
              this.data_ = data;
            } else {
              this.data_ = new Uint8Array(data.length);
              this.data_.set(data);
            }
            size = data.length;
          }
          this.size_ = size;
          this.type_ = blobType;
        }
        size() {
          return this.size_;
        }
        type() {
          return this.type_;
        }
        slice(startByte, endByte) {
          if (isNativeBlob(this.data_)) {
            const realBlob = this.data_;
            const sliced = sliceBlob(realBlob, startByte, endByte);
            if (sliced === null) {
              return null;
            }
            return new _FbsBlob(sliced);
          } else {
            const slice = new Uint8Array(this.data_.buffer, startByte, endByte - startByte);
            return new _FbsBlob(slice, true);
          }
        }
        static getBlob(...args) {
          if (isNativeBlobDefined()) {
            const blobby = args.map((val) => {
              if (val instanceof _FbsBlob) {
                return val.data_;
              } else {
                return val;
              }
            });
            return new _FbsBlob(getBlob$1.apply(null, blobby));
          } else {
            const uint8Arrays = args.map((val) => {
              if (isString(val)) {
                return dataFromString(StringFormat.RAW, val).data;
              } else {
                return val.data_;
              }
            });
            let finalLength = 0;
            uint8Arrays.forEach((array) => {
              finalLength += array.byteLength;
            });
            const merged = new Uint8Array(finalLength);
            let index = 0;
            uint8Arrays.forEach((array) => {
              for (let i = 0; i < array.length; i++) {
                merged[index++] = array[i];
              }
            });
            return new _FbsBlob(merged, true);
          }
        }
        uploadData() {
          return this.data_;
        }
      };
      Mapping = class {
        constructor(server, local, writable, xform) {
          this.server = server;
          this.local = local || server;
          this.writable = !!writable;
          this.xform = xform || noXform_;
        }
      };
      mappings_ = null;
      PREFIXES_KEY = "prefixes";
      ITEMS_KEY = "items";
      RequestInfo = class {
        constructor(url, method, handler, timeout) {
          this.url = url;
          this.method = method;
          this.handler = handler;
          this.timeout = timeout;
          this.urlParams = {};
          this.headers = {};
          this.body = null;
          this.errorHandler = null;
          this.progressCallback = null;
          this.successCodes = [200];
          this.additionalRetryCodes = [];
        }
      };
      ResumableUploadStatus = class {
        constructor(current, total, finalized, metadata) {
          this.current = current;
          this.total = total;
          this.finalized = !!finalized;
          this.metadata = metadata || null;
        }
      };
      RESUMABLE_UPLOAD_CHUNK_SIZE = 256 * 1024;
      TaskEvent = {
        /**
         * For this event,
         * <ul>
         *   <li>The `next` function is triggered on progress updates and when the
         *       task is paused/resumed with an `UploadTaskSnapshot` as the first
         *       argument.</li>
         *   <li>The `error` function is triggered if the upload is canceled or fails
         *       for another reason.</li>
         *   <li>The `complete` function is triggered if the upload completes
         *       successfully.</li>
         * </ul>
         */
        STATE_CHANGED: "state_changed"
      };
      TaskState = {
        /** The task is currently transferring data. */
        RUNNING: "running",
        /** The task was paused by the user. */
        PAUSED: "paused",
        /** The task completed successfully. */
        SUCCESS: "success",
        /** The task was canceled. */
        CANCELED: "canceled",
        /** The task failed with an error. */
        ERROR: "error"
      };
      Observer = class {
        constructor(nextOrObserver, error, complete) {
          const asFunctions = isFunction(nextOrObserver) || error != null || complete != null;
          if (asFunctions) {
            this.next = nextOrObserver;
            this.error = error !== null && error !== void 0 ? error : void 0;
            this.complete = complete !== null && complete !== void 0 ? complete : void 0;
          } else {
            const observer = nextOrObserver;
            this.next = observer.next;
            this.error = observer.error;
            this.complete = observer.complete;
          }
        }
      };
      textFactoryOverride = null;
      XhrConnection = class {
        constructor() {
          this.sent_ = false;
          this.xhr_ = new XMLHttpRequest();
          this.initXhr();
          this.errorCode_ = ErrorCode.NO_ERROR;
          this.sendPromise_ = new Promise((resolve) => {
            this.xhr_.addEventListener("abort", () => {
              this.errorCode_ = ErrorCode.ABORT;
              resolve();
            });
            this.xhr_.addEventListener("error", () => {
              this.errorCode_ = ErrorCode.NETWORK_ERROR;
              resolve();
            });
            this.xhr_.addEventListener("load", () => {
              resolve();
            });
          });
        }
        send(url, method, isUsingEmulator, body, headers) {
          if (this.sent_) {
            throw internalError("cannot .send() more than once");
          }
          if (isCloudWorkstation(url) && isUsingEmulator) {
            this.xhr_.withCredentials = true;
          }
          this.sent_ = true;
          this.xhr_.open(method, url, true);
          if (headers !== void 0) {
            for (const key in headers) {
              if (headers.hasOwnProperty(key)) {
                this.xhr_.setRequestHeader(key, headers[key].toString());
              }
            }
          }
          if (body !== void 0) {
            this.xhr_.send(body);
          } else {
            this.xhr_.send();
          }
          return this.sendPromise_;
        }
        getErrorCode() {
          if (!this.sent_) {
            throw internalError("cannot .getErrorCode() before sending");
          }
          return this.errorCode_;
        }
        getStatus() {
          if (!this.sent_) {
            throw internalError("cannot .getStatus() before sending");
          }
          try {
            return this.xhr_.status;
          } catch (e) {
            return -1;
          }
        }
        getResponse() {
          if (!this.sent_) {
            throw internalError("cannot .getResponse() before sending");
          }
          return this.xhr_.response;
        }
        getErrorText() {
          if (!this.sent_) {
            throw internalError("cannot .getErrorText() before sending");
          }
          return this.xhr_.statusText;
        }
        /** Aborts the request. */
        abort() {
          this.xhr_.abort();
        }
        getResponseHeader(header) {
          return this.xhr_.getResponseHeader(header);
        }
        addUploadProgressListener(listener) {
          if (this.xhr_.upload != null) {
            this.xhr_.upload.addEventListener("progress", listener);
          }
        }
        removeUploadProgressListener(listener) {
          if (this.xhr_.upload != null) {
            this.xhr_.upload.removeEventListener("progress", listener);
          }
        }
      };
      XhrTextConnection = class extends XhrConnection {
        initXhr() {
          this.xhr_.responseType = "text";
        }
      };
      XhrBytesConnection = class extends XhrConnection {
        initXhr() {
          this.xhr_.responseType = "arraybuffer";
        }
      };
      XhrBlobConnection = class extends XhrConnection {
        initXhr() {
          this.xhr_.responseType = "blob";
        }
      };
      UploadTask = class {
        isExponentialBackoffExpired() {
          return this.sleepTime > this.maxSleepTime;
        }
        /**
         * @param ref - The firebaseStorage.Reference object this task came
         *     from, untyped to avoid cyclic dependencies.
         * @param blob - The blob to upload.
         */
        constructor(ref3, blob, metadata = null) {
          this._transferred = 0;
          this._needToFetchStatus = false;
          this._needToFetchMetadata = false;
          this._observers = [];
          this._error = void 0;
          this._uploadUrl = void 0;
          this._request = void 0;
          this._chunkMultiplier = 1;
          this._resolve = void 0;
          this._reject = void 0;
          this._ref = ref3;
          this._blob = blob;
          this._metadata = metadata;
          this._mappings = getMappings();
          this._resumable = this._shouldDoResumable(this._blob);
          this._state = "running";
          this._errorHandler = (error) => {
            this._request = void 0;
            this._chunkMultiplier = 1;
            if (error._codeEquals(StorageErrorCode.CANCELED)) {
              this._needToFetchStatus = true;
              this.completeTransitions_();
            } else {
              const backoffExpired = this.isExponentialBackoffExpired();
              if (isRetryStatusCode(error.status, [])) {
                if (backoffExpired) {
                  error = retryLimitExceeded();
                } else {
                  this.sleepTime = Math.max(this.sleepTime * 2, DEFAULT_MIN_SLEEP_TIME_MILLIS);
                  this._needToFetchStatus = true;
                  this.completeTransitions_();
                  return;
                }
              }
              this._error = error;
              this._transition(
                "error"
                /* InternalTaskState.ERROR */
              );
            }
          };
          this._metadataErrorHandler = (error) => {
            this._request = void 0;
            if (error._codeEquals(StorageErrorCode.CANCELED)) {
              this.completeTransitions_();
            } else {
              this._error = error;
              this._transition(
                "error"
                /* InternalTaskState.ERROR */
              );
            }
          };
          this.sleepTime = 0;
          this.maxSleepTime = this._ref.storage.maxUploadRetryTime;
          this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
            this._start();
          });
          this._promise.then(null, () => {
          });
        }
        _makeProgressCallback() {
          const sizeBefore = this._transferred;
          return (loaded) => this._updateProgress(sizeBefore + loaded);
        }
        _shouldDoResumable(blob) {
          return blob.size() > 256 * 1024;
        }
        _start() {
          if (this._state !== "running") {
            return;
          }
          if (this._request !== void 0) {
            return;
          }
          if (this._resumable) {
            if (this._uploadUrl === void 0) {
              this._createResumable();
            } else {
              if (this._needToFetchStatus) {
                this._fetchStatus();
              } else {
                if (this._needToFetchMetadata) {
                  this._fetchMetadata();
                } else {
                  this.pendingTimeout = setTimeout(() => {
                    this.pendingTimeout = void 0;
                    this._continueUpload();
                  }, this.sleepTime);
                }
              }
            }
          } else {
            this._oneShotUpload();
          }
        }
        _resolveToken(callback) {
          Promise.all([
            this._ref.storage._getAuthToken(),
            this._ref.storage._getAppCheckToken()
          ]).then(([authToken, appCheckToken]) => {
            switch (this._state) {
              case "running":
                callback(authToken, appCheckToken);
                break;
              case "canceling":
                this._transition(
                  "canceled"
                  /* InternalTaskState.CANCELED */
                );
                break;
              case "pausing":
                this._transition(
                  "paused"
                  /* InternalTaskState.PAUSED */
                );
                break;
            }
          });
        }
        // TODO(andysoto): assert false
        _createResumable() {
          this._resolveToken((authToken, appCheckToken) => {
            const requestInfo = createResumableUpload(this._ref.storage, this._ref._location, this._mappings, this._blob, this._metadata);
            const createRequest = this._ref.storage._makeRequest(requestInfo, newTextConnection, authToken, appCheckToken);
            this._request = createRequest;
            createRequest.getPromise().then((url) => {
              this._request = void 0;
              this._uploadUrl = url;
              this._needToFetchStatus = false;
              this.completeTransitions_();
            }, this._errorHandler);
          });
        }
        _fetchStatus() {
          const url = this._uploadUrl;
          this._resolveToken((authToken, appCheckToken) => {
            const requestInfo = getResumableUploadStatus(this._ref.storage, this._ref._location, url, this._blob);
            const statusRequest = this._ref.storage._makeRequest(requestInfo, newTextConnection, authToken, appCheckToken);
            this._request = statusRequest;
            statusRequest.getPromise().then((status) => {
              status = status;
              this._request = void 0;
              this._updateProgress(status.current);
              this._needToFetchStatus = false;
              if (status.finalized) {
                this._needToFetchMetadata = true;
              }
              this.completeTransitions_();
            }, this._errorHandler);
          });
        }
        _continueUpload() {
          const chunkSize = RESUMABLE_UPLOAD_CHUNK_SIZE * this._chunkMultiplier;
          const status = new ResumableUploadStatus(this._transferred, this._blob.size());
          const url = this._uploadUrl;
          this._resolveToken((authToken, appCheckToken) => {
            let requestInfo;
            try {
              requestInfo = continueResumableUpload(this._ref._location, this._ref.storage, url, this._blob, chunkSize, this._mappings, status, this._makeProgressCallback());
            } catch (e) {
              this._error = e;
              this._transition(
                "error"
                /* InternalTaskState.ERROR */
              );
              return;
            }
            const uploadRequest = this._ref.storage._makeRequest(
              requestInfo,
              newTextConnection,
              authToken,
              appCheckToken,
              /*retry=*/
              false
              // Upload requests should not be retried as each retry should be preceded by another query request. Which is handled in this file.
            );
            this._request = uploadRequest;
            uploadRequest.getPromise().then((newStatus) => {
              this._increaseMultiplier();
              this._request = void 0;
              this._updateProgress(newStatus.current);
              if (newStatus.finalized) {
                this._metadata = newStatus.metadata;
                this._transition(
                  "success"
                  /* InternalTaskState.SUCCESS */
                );
              } else {
                this.completeTransitions_();
              }
            }, this._errorHandler);
          });
        }
        _increaseMultiplier() {
          const currentSize = RESUMABLE_UPLOAD_CHUNK_SIZE * this._chunkMultiplier;
          if (currentSize * 2 < 32 * 1024 * 1024) {
            this._chunkMultiplier *= 2;
          }
        }
        _fetchMetadata() {
          this._resolveToken((authToken, appCheckToken) => {
            const requestInfo = getMetadata$2(this._ref.storage, this._ref._location, this._mappings);
            const metadataRequest = this._ref.storage._makeRequest(requestInfo, newTextConnection, authToken, appCheckToken);
            this._request = metadataRequest;
            metadataRequest.getPromise().then((metadata) => {
              this._request = void 0;
              this._metadata = metadata;
              this._transition(
                "success"
                /* InternalTaskState.SUCCESS */
              );
            }, this._metadataErrorHandler);
          });
        }
        _oneShotUpload() {
          this._resolveToken((authToken, appCheckToken) => {
            const requestInfo = multipartUpload(this._ref.storage, this._ref._location, this._mappings, this._blob, this._metadata);
            const multipartRequest = this._ref.storage._makeRequest(requestInfo, newTextConnection, authToken, appCheckToken);
            this._request = multipartRequest;
            multipartRequest.getPromise().then((metadata) => {
              this._request = void 0;
              this._metadata = metadata;
              this._updateProgress(this._blob.size());
              this._transition(
                "success"
                /* InternalTaskState.SUCCESS */
              );
            }, this._errorHandler);
          });
        }
        _updateProgress(transferred) {
          const old = this._transferred;
          this._transferred = transferred;
          if (this._transferred !== old) {
            this._notifyObservers();
          }
        }
        _transition(state) {
          if (this._state === state) {
            return;
          }
          switch (state) {
            case "canceling":
            case "pausing":
              this._state = state;
              if (this._request !== void 0) {
                this._request.cancel();
              } else if (this.pendingTimeout) {
                clearTimeout(this.pendingTimeout);
                this.pendingTimeout = void 0;
                this.completeTransitions_();
              }
              break;
            case "running":
              const wasPaused = this._state === "paused";
              this._state = state;
              if (wasPaused) {
                this._notifyObservers();
                this._start();
              }
              break;
            case "paused":
              this._state = state;
              this._notifyObservers();
              break;
            case "canceled":
              this._error = canceled();
              this._state = state;
              this._notifyObservers();
              break;
            case "error":
              this._state = state;
              this._notifyObservers();
              break;
            case "success":
              this._state = state;
              this._notifyObservers();
              break;
          }
        }
        completeTransitions_() {
          switch (this._state) {
            case "pausing":
              this._transition(
                "paused"
                /* InternalTaskState.PAUSED */
              );
              break;
            case "canceling":
              this._transition(
                "canceled"
                /* InternalTaskState.CANCELED */
              );
              break;
            case "running":
              this._start();
              break;
          }
        }
        /**
         * A snapshot of the current task state.
         */
        get snapshot() {
          const externalState = taskStateFromInternalTaskState(this._state);
          return {
            bytesTransferred: this._transferred,
            totalBytes: this._blob.size(),
            state: externalState,
            metadata: this._metadata,
            task: this,
            ref: this._ref
          };
        }
        /**
         * Adds a callback for an event.
         * @param type - The type of event to listen for.
         * @param nextOrObserver -
         *     The `next` function, which gets called for each item in
         *     the event stream, or an observer object with some or all of these three
         *     properties (`next`, `error`, `complete`).
         * @param error - A function that gets called with a `StorageError`
         *     if the event stream ends due to an error.
         * @param completed - A function that gets called if the
         *     event stream ends normally.
         * @returns
         *     If only the event argument is passed, returns a function you can use to
         *     add callbacks (see the examples above). If more than just the event
         *     argument is passed, returns a function you can call to unregister the
         *     callbacks.
         */
        on(type, nextOrObserver, error, completed) {
          const observer = new Observer(nextOrObserver || void 0, error || void 0, completed || void 0);
          this._addObserver(observer);
          return () => {
            this._removeObserver(observer);
          };
        }
        /**
         * This object behaves like a Promise, and resolves with its snapshot data
         * when the upload completes.
         * @param onFulfilled - The fulfillment callback. Promise chaining works as normal.
         * @param onRejected - The rejection callback.
         */
        then(onFulfilled, onRejected) {
          return this._promise.then(onFulfilled, onRejected);
        }
        /**
         * Equivalent to calling `then(null, onRejected)`.
         */
        catch(onRejected) {
          return this.then(null, onRejected);
        }
        /**
         * Adds the given observer.
         */
        _addObserver(observer) {
          this._observers.push(observer);
          this._notifyObserver(observer);
        }
        /**
         * Removes the given observer.
         */
        _removeObserver(observer) {
          const i = this._observers.indexOf(observer);
          if (i !== -1) {
            this._observers.splice(i, 1);
          }
        }
        _notifyObservers() {
          this._finishPromise();
          const observers = this._observers.slice();
          observers.forEach((observer) => {
            this._notifyObserver(observer);
          });
        }
        _finishPromise() {
          if (this._resolve !== void 0) {
            let triggered = true;
            switch (taskStateFromInternalTaskState(this._state)) {
              case TaskState.SUCCESS:
                async(this._resolve.bind(null, this.snapshot))();
                break;
              case TaskState.CANCELED:
              case TaskState.ERROR:
                const toCall = this._reject;
                async(toCall.bind(null, this._error))();
                break;
              default:
                triggered = false;
                break;
            }
            if (triggered) {
              this._resolve = void 0;
              this._reject = void 0;
            }
          }
        }
        _notifyObserver(observer) {
          const externalState = taskStateFromInternalTaskState(this._state);
          switch (externalState) {
            case TaskState.RUNNING:
            case TaskState.PAUSED:
              if (observer.next) {
                async(observer.next.bind(observer, this.snapshot))();
              }
              break;
            case TaskState.SUCCESS:
              if (observer.complete) {
                async(observer.complete.bind(observer))();
              }
              break;
            case TaskState.CANCELED:
            case TaskState.ERROR:
              if (observer.error) {
                async(observer.error.bind(observer, this._error))();
              }
              break;
            default:
              if (observer.error) {
                async(observer.error.bind(observer, this._error))();
              }
          }
        }
        /**
         * Resumes a paused task. Has no effect on a currently running or failed task.
         * @returns True if the operation took effect, false if ignored.
         */
        resume() {
          const valid = this._state === "paused" || this._state === "pausing";
          if (valid) {
            this._transition(
              "running"
              /* InternalTaskState.RUNNING */
            );
          }
          return valid;
        }
        /**
         * Pauses a currently running task. Has no effect on a paused or failed task.
         * @returns True if the operation took effect, false if ignored.
         */
        pause() {
          const valid = this._state === "running";
          if (valid) {
            this._transition(
              "pausing"
              /* InternalTaskState.PAUSING */
            );
          }
          return valid;
        }
        /**
         * Cancels a currently running or paused task. Has no effect on a complete or
         * failed task.
         * @returns True if the operation took effect, false if ignored.
         */
        cancel() {
          const valid = this._state === "running" || this._state === "pausing";
          if (valid) {
            this._transition(
              "canceling"
              /* InternalTaskState.CANCELING */
            );
          }
          return valid;
        }
      };
      Reference = class _Reference {
        constructor(_service, location) {
          this._service = _service;
          if (location instanceof Location) {
            this._location = location;
          } else {
            this._location = Location.makeFromUrl(location, _service.host);
          }
        }
        /**
         * Returns the URL for the bucket and path this object references,
         *     in the form gs://<bucket>/<object-path>
         * @override
         */
        toString() {
          return "gs://" + this._location.bucket + "/" + this._location.path;
        }
        _newRef(service, location) {
          return new _Reference(service, location);
        }
        /**
         * A reference to the root of this object's bucket.
         */
        get root() {
          const location = new Location(this._location.bucket, "");
          return this._newRef(this._service, location);
        }
        /**
         * The name of the bucket containing this reference's object.
         */
        get bucket() {
          return this._location.bucket;
        }
        /**
         * The full path of this object.
         */
        get fullPath() {
          return this._location.path;
        }
        /**
         * The short name of this object, which is the last component of the full path.
         * For example, if fullPath is 'full/path/image.png', name is 'image.png'.
         */
        get name() {
          return lastComponent(this._location.path);
        }
        /**
         * The `StorageService` instance this `StorageReference` is associated with.
         */
        get storage() {
          return this._service;
        }
        /**
         * A `StorageReference` pointing to the parent location of this `StorageReference`, or null if
         * this reference is the root.
         */
        get parent() {
          const newPath = parent(this._location.path);
          if (newPath === null) {
            return null;
          }
          const location = new Location(this._location.bucket, newPath);
          return new _Reference(this._service, location);
        }
        /**
         * Utility function to throw an error in methods that do not accept a root reference.
         */
        _throwIfRoot(name3) {
          if (this._location.path === "") {
            throw invalidRootOperation(name3);
          }
        }
      };
      FirebaseStorageImpl = class {
        constructor(app, _authProvider, _appCheckProvider, _url, _firebaseVersion, _isUsingEmulator = false) {
          this.app = app;
          this._authProvider = _authProvider;
          this._appCheckProvider = _appCheckProvider;
          this._url = _url;
          this._firebaseVersion = _firebaseVersion;
          this._isUsingEmulator = _isUsingEmulator;
          this._bucket = null;
          this._host = DEFAULT_HOST;
          this._protocol = "https";
          this._appId = null;
          this._deleted = false;
          this._maxOperationRetryTime = DEFAULT_MAX_OPERATION_RETRY_TIME;
          this._maxUploadRetryTime = DEFAULT_MAX_UPLOAD_RETRY_TIME;
          this._requests = /* @__PURE__ */ new Set();
          if (_url != null) {
            this._bucket = Location.makeFromBucketSpec(_url, this._host);
          } else {
            this._bucket = extractBucket(this._host, this.app.options);
          }
        }
        /**
         * The host string for this service, in the form of `host` or
         * `host:port`.
         */
        get host() {
          return this._host;
        }
        set host(host) {
          this._host = host;
          if (this._url != null) {
            this._bucket = Location.makeFromBucketSpec(this._url, host);
          } else {
            this._bucket = extractBucket(host, this.app.options);
          }
        }
        /**
         * The maximum time to retry uploads in milliseconds.
         */
        get maxUploadRetryTime() {
          return this._maxUploadRetryTime;
        }
        set maxUploadRetryTime(time) {
          validateNumber(
            "time",
            /* minValue=*/
            0,
            /* maxValue= */
            Number.POSITIVE_INFINITY,
            time
          );
          this._maxUploadRetryTime = time;
        }
        /**
         * The maximum time to retry operations other than uploads or downloads in
         * milliseconds.
         */
        get maxOperationRetryTime() {
          return this._maxOperationRetryTime;
        }
        set maxOperationRetryTime(time) {
          validateNumber(
            "time",
            /* minValue=*/
            0,
            /* maxValue= */
            Number.POSITIVE_INFINITY,
            time
          );
          this._maxOperationRetryTime = time;
        }
        async _getAuthToken() {
          if (this._overrideAuthToken) {
            return this._overrideAuthToken;
          }
          const auth = this._authProvider.getImmediate({ optional: true });
          if (auth) {
            const tokenData = await auth.getToken();
            if (tokenData !== null) {
              return tokenData.accessToken;
            }
          }
          return null;
        }
        async _getAppCheckToken() {
          if (_isFirebaseServerApp(this.app) && this.app.settings.appCheckToken) {
            return this.app.settings.appCheckToken;
          }
          const appCheck = this._appCheckProvider.getImmediate({ optional: true });
          if (appCheck) {
            const result = await appCheck.getToken();
            return result.token;
          }
          return null;
        }
        /**
         * Stop running requests and prevent more from being created.
         */
        _delete() {
          if (!this._deleted) {
            this._deleted = true;
            this._requests.forEach((request) => request.cancel());
            this._requests.clear();
          }
          return Promise.resolve();
        }
        /**
         * Returns a new firebaseStorage.Reference object referencing this StorageService
         * at the given Location.
         */
        _makeStorageReference(loc) {
          return new Reference(this, loc);
        }
        /**
         * @param requestInfo - HTTP RequestInfo object
         * @param authToken - Firebase auth token
         */
        _makeRequest(requestInfo, requestFactory, authToken, appCheckToken, retry = true) {
          if (!this._deleted) {
            const request = makeRequest(requestInfo, this._appId, authToken, appCheckToken, requestFactory, this._firebaseVersion, retry, this._isUsingEmulator);
            this._requests.add(request);
            request.getPromise().then(() => this._requests.delete(request), () => this._requests.delete(request));
            return request;
          } else {
            return new FailRequest(appDeleted());
          }
        }
        async makeRequestWithTokens(requestInfo, requestFactory) {
          const [authToken, appCheckToken] = await Promise.all([
            this._getAuthToken(),
            this._getAppCheckToken()
          ]);
          return this._makeRequest(requestInfo, requestFactory, authToken, appCheckToken).getPromise();
        }
      };
      name2 = "@firebase/storage";
      version2 = "0.13.13";
      STORAGE_TYPE = "storage";
      registerStorage();
    }
  });

  // node_modules/firebase/storage/dist/esm/index.esm.js
  var index_esm_exports = {};
  __export(index_esm_exports, {
    StorageError: () => StorageError,
    StorageErrorCode: () => StorageErrorCode,
    StringFormat: () => StringFormat,
    _FbsBlob: () => FbsBlob,
    _Location: () => Location,
    _TaskEvent: () => TaskEvent,
    _TaskState: () => TaskState,
    _UploadTask: () => UploadTask,
    _dataFromString: () => dataFromString,
    _getChild: () => _getChild,
    _invalidArgument: () => invalidArgument,
    _invalidRootOperation: () => invalidRootOperation,
    connectStorageEmulator: () => connectStorageEmulator,
    deleteObject: () => deleteObject,
    getBlob: () => getBlob,
    getBytes: () => getBytes,
    getDownloadURL: () => getDownloadURL,
    getMetadata: () => getMetadata,
    getStorage: () => getStorage,
    getStream: () => getStream,
    list: () => list,
    listAll: () => listAll,
    ref: () => ref,
    updateMetadata: () => updateMetadata,
    uploadBytes: () => uploadBytes,
    uploadBytesResumable: () => uploadBytesResumable,
    uploadString: () => uploadString
  });
  var init_index_esm = __esm({
    "node_modules/firebase/storage/dist/esm/index.esm.js"() {
      init_index_esm20175();
    }
  });

  // node_modules/atob/browser-atob.js
  var require_browser_atob = __commonJS({
    "node_modules/atob/browser-atob.js"(exports, module) {
      (function(w) {
        "use strict";
        function findBest(atobNative) {
          if ("function" === typeof atobNative) {
            return atobNative;
          }
          if ("function" === typeof Buffer) {
            return function atobBrowserify(a) {
              return new Buffer(a, "base64").toString("binary");
            };
          }
          if ("object" === typeof w.base64js) {
            return function atobWebWorker_iOS(a) {
              var buf = w.base64js.b64ToByteArray(a);
              return Array.prototype.map.call(buf, function(ch) {
                return String.fromCharCode(ch);
              }).join("");
            };
          }
          return function() {
            throw new Error("You're probably in an old browser or an iOS webworker. It might help to include beatgammit's base64-js.");
          };
        }
        var atobBest = findBest(w.atob);
        w.atob = atobBest;
        if (typeof module === "object" && module && module.exports) {
          module.exports = atobBest;
        }
      })(window);
    }
  });

  // node_modules/btoa/index.js
  var require_btoa = __commonJS({
    "node_modules/btoa/index.js"(exports, module) {
      (function() {
        "use strict";
        function btoa2(str) {
          var buffer;
          if (str instanceof Buffer) {
            buffer = str;
          } else {
            buffer = Buffer.from(str.toString(), "binary");
          }
          return buffer.toString("base64");
        }
        module.exports = btoa2;
      })();
    }
  });

  // node_modules/xhr2/lib/browser.js
  var require_browser = __commonJS({
    "node_modules/xhr2/lib/browser.js"(exports, module) {
      module.exports = XMLHttpRequest;
    }
  });

  // node_modules/ws/browser.js
  var require_browser2 = __commonJS({
    "node_modules/ws/browser.js"(exports, module) {
      "use strict";
      module.exports = function() {
        throw new Error(
          "ws does not work in the browser. Browser clients must use the native WebSocket object"
        );
      };
    }
  });

  // dist/esm/base.model.js
  function lazyLoadAxios() {
    return new Promise((resolve) => {
      if (axios) {
        resolve(axios);
      } else {
        import("axios").then((axiosModule) => {
          axios = axiosModule.default;
          resolve(axios);
        });
      }
    });
  }
  function isAdminFirestore2(firestore) {
    return typeof firestore.collection === "function" && typeof firestore.doc === "function" && (firestore._settings !== void 0 || firestore.toJSON !== void 0);
  }
  async function deleteDocument(path) {
    const connection = FirestoreOrmRepository.getGlobalConnection();
    const firestore = connection.getFirestore();
    if (isAdminFirestore2(firestore)) {
      await path.delete();
    } else {
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(path);
    }
  }
  async function getDocument(path) {
    const connection = FirestoreOrmRepository.getGlobalConnection();
    const firestore = connection.getFirestore();
    if (isAdminFirestore2(firestore)) {
      if (typeof path === "string") {
        const docRef = firestore.doc(path);
        return await docRef.get();
      }
      return await path.get();
    } else {
      const { getDoc, doc: doc2 } = await import("firebase/firestore");
      if (typeof path === "string") {
        path = doc2(firestore, path);
      }
      return await getDoc(path);
    }
  }
  async function onDocumentSnapshot(path, callback) {
    const connection = FirestoreOrmRepository.getGlobalConnection();
    const firestore = connection.getFirestore();
    if (isAdminFirestore2(firestore)) {
      return path.onSnapshot(callback);
    } else {
      const { onSnapshot: onSnapshot2 } = await import("firebase/firestore");
      return onSnapshot2(path, callback);
    }
  }
  function lazyLoadFirebaseStorage() {
    return new Promise((resolve) => {
      if (getDownloadURL2 && ref2) {
        resolve({ getDownloadURL: getDownloadURL2, ref: ref2 });
      } else {
        Promise.resolve().then(() => (init_index_esm(), index_esm_exports)).then((firebaseStorage) => {
          getDownloadURL2 = firebaseStorage.getDownloadURL;
          ref2 = firebaseStorage.ref;
          resolve({ getDownloadURL: getDownloadURL2, ref: ref2 });
        });
      }
    });
  }
  function getMoment() {
    return new Promise((resolve) => {
      if (moment) {
        resolve(moment);
      } else {
      }
    });
  }
  var qs, axios, getDownloadURL2, ref2, globalVar, XMLHttpRequest2, moment, BaseModel;
  var init_base_model = __esm({
    "dist/esm/base.model.js"() {
      init_repository();
      init_query();
      init_utils();
      qs = __toESM(__require("qs"), 1);
      globalVar = typeof global !== "undefined" ? global : window;
      if (typeof atob === "undefined") {
        Promise.resolve().then(() => __toESM(require_browser_atob(), 1)).then((atob2) => {
          globalVar.atob = atob2;
        });
      }
      if (typeof btoa === "undefined") {
        Promise.resolve().then(() => __toESM(require_btoa(), 1)).then((btoa2) => {
          globalVar.btoa = btoa2;
        });
      }
      if (typeof XMLHttpRequest2 === "undefined") {
        Promise.resolve().then(() => __toESM(require_browser(), 1)).then((XMLHttpRequest3) => {
          globalVar.XMLHttpRequest = XMLHttpRequest3;
          Promise.resolve().then(() => __toESM(require_browser2(), 1)).then((WebSocket) => {
            globalVar.WebSocket = WebSocket;
          });
        });
      }
      BaseModel = class _BaseModel {
        constructor() {
          this.is_exist = false;
          this.data = {};
          this.pathParams = /* @__PURE__ */ new Map();
          getMoment();
          var connectionName = FirestoreOrmRepository.DEFAULT_KEY_NAME;
          if (this["connectionName"]) {
            connectionName = this["connectionName"];
          }
          this.repository = FirestoreOrmRepository.getGlobalConnection(connectionName);
          this.initProp();
        }
        /**
         * Initializes the properties of the model.
         */
        initProp() {
          if (!this["storedFields"]) {
            this["storedFields"] = [];
          }
          if (!this["fields"]) {
            this["fields"] = {};
          }
          if (!this["requiredFields"]) {
            this["requiredFields"] = [];
          }
          if (!this["aliasFieldsMapper"]) {
            this["aliasFieldsMapper"] = [];
          }
        }
        /**
         * Sets path parameters for the model.
         * Manages the pathParams map property that will be used in getPathList, etc.
         * @param key - The parameter key
         * @param value - The parameter value
         * @returns The updated model instance
         */
        setPathParams(key, value) {
          this.pathParams.set(key, value);
          return this;
        }
        /**
         * Gets the current path parameters map.
         * @returns The pathParams Map
         */
        getPathParams() {
          return this.pathParams;
        }
        /**
         * Static method to initialize a model with path parameters.
         * Provides a convenient way to set multiple path parameters at once.
         *
         * @template T - The type of the model
         * @param params - An object containing key-value pairs for path parameters
         * @returns A new instance of the model with path parameters set
         *
         * @example
         * // Simple usage with getAll()
         * const questions = await Question.initPathParams({
         *   'course_id': courseId,
         *   'lesson_id': lessonId
         * }).getAll();
         *
         * @example
         * // Chaining with where clause
         * const activeQuestions = await Question.initPathParams({
         *   'course_id': courseId,
         *   'lesson_id': lessonId
         * }).where('status', '==', 'active').get();
         *
         * @example
         * // Using query builder
         * const query = Question.initPathParams({
         *   'course_id': courseId,
         *   'lesson_id': lessonId
         * }).query().where('difficulty', '>', 3).limit(10);
         */
        static initPathParams(params) {
          const instance = new this();
          instance.setModelType(this);
          for (const key in params) {
            if (params.hasOwnProperty(key)) {
              instance.setPathParams(key, params[key]);
            }
          }
          return instance;
        }
        /**
         * Parses the text indexing fields.
         * @param text - The text to parse.
         * @returns An array of parsed text indexing fields.
         */
        parseTextIndexingFields(text) {
          var map = {};
          text = (text + "").toLowerCase();
          var edgeSymbol = "~~~";
          var result = [edgeSymbol + text + edgeSymbol, text];
          for (var i = 0; text.length > i; i++) {
            for (var x = 1; x < text.length; x++) {
              var subString = text.substr(i, text.length - x);
              map[subString] = true;
              if (i == 0) {
                subString = edgeSymbol + subString;
                map[subString] = true;
              } else if (i + 1 == text.length) {
                subString = subString + edgeSymbol;
              }
            }
          }
          for (var option in map) {
            result.push(option);
          }
          return result;
        }
        /**
         * Refreshes text indexing for all fields marked with is_text_indexing.
         * This method recreates the text index for fields that have values but missing text indices.
         */
        refreshTextIndexing() {
          const modelPrototype = Object.getPrototypeOf(this);
          if (modelPrototype && modelPrototype.textIndexingFields) {
            for (const fieldKey in modelPrototype.textIndexingFields) {
              if (modelPrototype.textIndexingFields.hasOwnProperty(fieldKey)) {
                const fieldName = this.getFieldName(fieldKey);
                const textIndexFieldName = "text_index_" + fieldName;
                let fieldValue = this.data[fieldName];
                if (!fieldValue && typeof this[fieldKey] !== "undefined") {
                  fieldValue = this[fieldKey];
                }
                if (!fieldValue && typeof this[this.getAliasName(fieldName)] !== "undefined") {
                  fieldValue = this[this.getAliasName(fieldName)];
                }
                if (fieldValue && (!this.data[textIndexFieldName] || !Array.isArray(this.data[textIndexFieldName]))) {
                  this.data[textIndexFieldName] = this.parseTextIndexingFields(fieldValue + "");
                }
              }
            }
          }
        }
        /**
         * Gets the ID of the object.
         * @returns The ID of the object.
         */
        getId() {
          return this.id;
        }
        /**
         * Initializes the fields of the model.
         */
        initFields() {
        }
        /**
         * Checks if the model exists.
         * @returns True if the model exists, false otherwise.
         */
        isExist() {
          return this.is_exist;
        }
        /**
         * Gets one relation (legacy method - use loadBelongsTo instead).
         * @param model - The model to get the relation from.
         * @returns A promise that resolves to the related model.
         */
        async getOneRel(model) {
          var object = this.getModel(model);
          var that = this;
          return await object.load(that[object["pathId"]]);
        }
        /**
         * Gets many relations (legacy method - use loadHasMany instead).
         * For backward compatibility, this method assumes the target model
         * has a foreign key field that matches this model's pathId.
         * @param model - The model to get the relations from.
         * @returns A promise that resolves to an array of related models.
         */
        async getManyRel(model) {
          var object = this.getModel(model);
          var that = this;
          return await object.where(that.pathId, "==", that.getId()).get();
        }
        /**
         * Load a belongsTo relationship
         * @param relationshipName - The name of the relationship property
         */
        async loadBelongsTo(relationshipName) {
          const relationships = this.relationships;
          if (!relationships || !relationships[relationshipName]) {
            throw new Error(`Relationship '${relationshipName}' not found`);
          }
          const relationship = relationships[relationshipName];
          if (relationship.type !== "belongsTo") {
            throw new Error(`Relationship '${relationshipName}' is not a belongsTo relationship`);
          }
          const localValue = this[relationship.localKey];
          if (!localValue) {
            throw new Error(`Local key '${relationship.localKey}' has no value`);
          }
          const relatedModel = this.getModel(relationship.model);
          return await relatedModel.load(localValue);
        }
        /**
         * Load a hasOne relationship
         * @param relationshipName - The name of the relationship property
         */
        async loadHasOne(relationshipName) {
          const relationships = this.relationships;
          if (!relationships || !relationships[relationshipName]) {
            throw new Error(`Relationship '${relationshipName}' not found`);
          }
          const relationship = relationships[relationshipName];
          if (relationship.type !== "hasOne") {
            throw new Error(`Relationship '${relationshipName}' is not a hasOne relationship`);
          }
          const relatedModel = this.getModel(relationship.model);
          const results = await relatedModel.where(relationship.foreignKey, "==", this.getId()).get();
          if (results.length === 0) {
            throw new Error(`No related record found for hasOne relationship '${relationshipName}'`);
          }
          return results[0];
        }
        /**
         * Load a hasMany relationship
         * @param relationshipName - The name of the relationship property
         */
        async loadHasMany(relationshipName) {
          const relationships = this.relationships;
          if (!relationships || !relationships[relationshipName]) {
            throw new Error(`Relationship '${relationshipName}' not found`);
          }
          const relationship = relationships[relationshipName];
          if (relationship.type !== "hasMany") {
            throw new Error(`Relationship '${relationshipName}' is not a hasMany relationship`);
          }
          const relatedModel = this.getModel(relationship.model);
          return await relatedModel.where(relationship.foreignKey, "==", this.getId()).get();
        }
        /**
         * Load a belongsToMany relationship
         * @param relationshipName - The name of the relationship property
         */
        async loadBelongsToMany(relationshipName) {
          const relationships = this.relationships;
          if (!relationships || !relationships[relationshipName]) {
            throw new Error(`Relationship '${relationshipName}' not found`);
          }
          const relationship = relationships[relationshipName];
          if (relationship.type !== "belongsToMany") {
            throw new Error(`Relationship '${relationshipName}' is not a belongsToMany relationship`);
          }
          const junctionModel = this.getModel(relationship.through);
          const junctionRecords = await junctionModel.where(relationship.thisKey, "==", this.getId()).get();
          const relatedIds = junctionRecords.map((record) => record[relationship.otherKey]);
          const relatedModel = this.getModel(relationship.model);
          const results = [];
          for (const id of relatedIds) {
            const related = this.getModel(relationship.model);
            await related.load(id);
            results.push(related);
          }
          return results;
        }
        /**
         * Load all defined relationships or specific ones
         */
        async loadWithRelationships(relationshipNames) {
          const relationships = this.relationships;
          if (!relationships) {
            return this;
          }
          const names = relationshipNames || Object.keys(relationships);
          for (const name3 of names) {
            const relationship = relationships[name3];
            try {
              switch (relationship.type) {
                case "belongsTo":
                  this[name3] = await this.loadBelongsTo(name3);
                  break;
                case "hasOne":
                  this[name3] = await this.loadHasOne(name3);
                  break;
                case "hasMany":
                  this[name3] = await this.loadHasMany(name3);
                  break;
                case "belongsToMany":
                  this[name3] = await this.loadBelongsToMany(name3);
                  break;
              }
            } catch (error) {
              console.warn(`Failed to load relationship '${name3}':`, error);
            }
          }
          return this;
        }
        /**
         * Gets the model instance.
         * @param model - The model to get the instance of.
         * @returns The model instance.
         */
        getModel(model) {
          var object = this.getRepository().getModel(model);
          var keys = object.getPathListKeys();
          var that = this;
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (that.pathParams.has(key)) {
              object[key] = that.pathParams.get(key);
            } else if (that[key]) {
              object[key] = that[key];
            } else if (key == that.pathId && that.getId()) {
              object[key] = that.getId();
            }
          }
          return object;
        }
        /**
         * Gets the current model instance.
         * @returns The current model instance.
         */
        getCurrentModel() {
          var object = this.getRepository().getModel(this.getModelType());
          var keys = object.getPathListKeys();
          var that = this;
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (that.pathParams.has(key)) {
              object[key] = that.pathParams.get(key);
            } else if (that[key]) {
              object[key] = that[key];
            } else if (key == that.pathId && that.getId()) {
              object[key] = that.getId();
            }
          }
          return object;
        }
        /**
         * Converts the model to a string.
         * @returns The model as a string.
         */
        toString() {
          var res = Object.assign({}, this.getDocumentData());
          if (this.getId()) {
            res.id = this.getId();
          }
          return JSON.stringify(res);
        }
        /**
         * Loads the model from a string.
         * @param jsonString - The string representation of the model.
         * @returns The loaded model.
         */
        loadFromString(jsonString) {
          var model = this;
          var params = JSON.parse(jsonString);
          this.createFromData(params, model);
          return model;
        }
        /**
         * Initializes the object from a string.
         * @param jsonString - The string representation of the model.
         * @returns The initialized model.
         */
        initFromString(jsonString) {
          var model = this.getCurrentModel();
          var params = JSON.parse(jsonString);
          this.createFromData(params, model);
          return model;
        }
        /**
         * Gets the repository reference for the model.
         * @returns The repository reference.
         */
        getRepositoryReference() {
          try {
            return this.getRepository().getCollectionReferenceByModel(this);
          } catch (error) {
            console.warn("Repository reference not available, setup may not be complete:", error.message);
            return null;
          }
        }
        /**
         * Gets the repository reference for the model (async version).
         * @returns The repository reference.
         */
        async getRepositoryReferenceAsync() {
          return await this.getRepository().getCollectionReferenceByModelAsync(this);
        }
        /**
         * Gets the document repository reference for the model.
         * @returns The document repository reference.
         */
        getDocRepositoryReference() {
          try {
            return this.getRepository().getDocReferenceByModel(this);
          } catch (error) {
            console.warn("Document repository reference not available, setup may not be complete:", error.message);
            return null;
          }
        }
        /**
         * Gets the document repository reference for the model (async version).
         * @returns The document repository reference.
         */
        async getDocRepositoryReferenceAsync() {
          return await this.getRepository().getDocReferenceByModelAsync(this);
        }
        /**
         * Gets the document reference for the model.
         * @returns The document reference.
         */
        getDocReference() {
          return this.getDocRepositoryReference();
        }
        /**
         * Gets the document reference for the model (async version).
         * @returns The document reference.
         */
        async getDocReferenceAsync() {
          return await this.getDocRepositoryReferenceAsync();
        }
        /**
         * Sets the model type.
         * @param model - The model type.
         * @returns The updated model instance.
         */
        setModelType(model) {
          this.modelType = model;
          return this;
        }
        /**
         * Gets the model type.
         * @returns The model type.
         */
        getModelType() {
          return this.modelType;
        }
        /**
         * Creates a query with a where clause.
         * @param fieldPath - The field path to filter on.
         * @param opStr - The operator string.
         * @param value - The value to compare against.
         * @returns The query with the where clause.
         */
        static where(fieldPath, opStr, value) {
          var that = this;
          var query3 = that.query().where(fieldPath, opStr, value);
          return query3;
        }
        /**
         * Creates a query with a where clause.
         * @param fieldPath - The field path to filter on.
         * @param opStr - The operator string.
         * @param value - The value to compare against.
         * @returns The query with the where clause.
         */
        where(fieldPath, opStr, value) {
          var that = this;
          var query3 = that.query().where(fieldPath, opStr, value);
          return query3;
        }
        /**
         * Gets one document from the current query.
         * @returns A promise that resolves to the document.
         */
        async getOne() {
          if (!this.currentQuery) {
            var that = this;
            this.currentQuery = this.getRepository().getCollectionReferenceByModel(that);
          }
          return await this.currentQuery.get();
        }
        /**
         * Sets the ID of the model.
         * @param id - The ID to set.
         * @returns The updated model instance.
         */
        setId(id) {
          this.id = id;
          return this;
        }
        /**
         * Loads the model with the specified ID.
         * @param id - The ID of the model to load.
         * @param params - Additional parameters for loading the model.
         * @returns A promise that resolves to the loaded model.
         */
        async load(id, params = {}) {
          var that = this;
          if (that.observeLoadBefore) {
            that.observeLoadBefore();
          }
          var res = null;
          this.setId(id);
          if (this.getRepository()) {
            res = await this.getRepository().load(this, id, params);
          } else {
            console.error("No repository!");
          }
          if (res && res.observeLoadAfter) {
            res.observeLoadAfter();
          }
          return this;
        }
        /**
         * Initializes the model with the specified ID.
         * @param id - The ID of the model to initialize.
         * @param params - Additional parameters for initializing the model.
         * @returns A promise that resolves to the initialized model.
         */
        async init(id, params = {}) {
          var object = this.getCurrentModel();
          var res;
          object.setId(id);
          if (object.getRepository()) {
            res = await this.getRepository().load(object, id, params);
          } else {
            console.error("No repository!");
          }
          return res;
        }
        /**
         * Initializes and loads the model with the specified ID.
         * Provides a simpler alternative to the `new Model(); await model.load(id)` pattern.
         *
         * @example
         * // Load a simple model
         * const user = await User.init(userId);
         * if (user) {
         *   console.log(user.name);
         * }
         *
         * // Load a nested model with path parameters
         * const member = await Member.init(memberId, { website_id: websiteId });
         * if (member) {
         *   console.log(member.name);
         * }
         *
         * // For creating new instances, use the constructor
         * const newUser = new User();
         * newUser.name = "John";
         * await newUser.save();
         *
         * @param id - The ID of the model to load. This parameter is required.
         * @param pathParams - Path parameters for nested collections (e.g., { website_id: 'abc123' }).
         * @returns A promise that resolves to the loaded model, or null if the model is not found.
         */
        static async init(id, pathParams = {}) {
          var object = new this();
          for (const key in pathParams) {
            object.setPathParams(key, pathParams[key]);
          }
          object.setId(id);
          if (object.getRepository()) {
            var res = await object.getRepository().load(object, object.getId(), pathParams);
            if (res && !res.isExist()) {
              return null;
            }
            return res;
          } else {
            console.error("No repository!");
            return null;
          }
        }
        /**
         * Removes the model from the database.
         * @returns A promise that resolves to true if the removal was successful, false otherwise.
         */
        async remove() {
          try {
            var that = this;
            if (that.observeRemoveBefore) {
              that.observeRemoveBefore();
            }
            const ref3 = await this.getDocReferenceAsync();
            await deleteDocument(ref3);
            if (that.observeRemoveAfter) {
              that.observeRemoveAfter();
            }
            return true;
          } catch (error) {
            console.error(error);
            return false;
          }
        }
        /**
         * Creates a query for the model.
         * @returns The query for the model.
         */
        static query() {
          var query3 = new Query();
          var object = new this();
          object.setModelType(this);
          query3.init(object, null);
          return query3;
        }
        /**
         * Creates a collection query for the model.
         * @returns The collection query for the model.
         */
        static collectionQuery() {
          const isCollectionGroup = true;
          var query3 = new Query();
          var object = new this();
          object.setModelType(this);
          query3.init(object, null, isCollectionGroup);
          return query3;
        }
        /**
         * Creates a query for the model.
         * @returns The query for the model.
         */
        query() {
          var query3 = new Query();
          var that = this;
          var object = that.getCurrentModel();
          query3.init(object);
          return query3;
        }
        /**
         * Gets the collection name for the model.
         * @returns The collection name.
         */
        getCollectionName() {
          var paths = this["referencePath"].split("/");
          return paths[paths.length - 1];
        }
        /**
         * Executes a full SQL query on Elasticsearch.
         * @param sql - The SQL query to execute.
         * @param limit - The maximum number of results to return.
         * @param filters - Additional filters to apply to the query.
         * @param cursor - The cursor for pagination.
         * @param columns - The columns to include in the result.
         * @param asObject - Whether to return the result as an object or not.
         * @returns A promise that resolves to the Elasticsearch SQL response.
         */
        static async elasticFullSql(sql, limit2, filters, cursor, columns, asObject = true) {
          var object = new this();
          object.setModelType(this);
          var that = this;
          var result = {
            data: []
          };
          try {
            var connection = FirestoreOrmRepository.getGlobalElasticsearchConnection();
          } catch (error) {
            console.error(error);
            return result;
          }
          if (!connection || !connection.url) {
            console.error("Elasticsearch is not defined!");
            return result;
          }
          var params = {};
          if (sql) {
            params["query"] = sql;
          }
          if (limit2) {
            params["fetch_size"] = limit2;
          }
          if (filters) {
            params["filter"] = filters;
          }
          if (cursor) {
            params["cursor"] = cursor;
          }
          var time = +/* @__PURE__ */ new Date() + Math.random() * 100;
          try {
            await lazyLoadAxios();
            var response = await axios({
              method: "POST",
              headers: { "content-type": "application/x-www-form-urlencoded" },
              data: qs.stringify(params),
              url: connection.url + "/_sql"
            });
            var data = response.data;
            columns = columns ? columns : response.data.columns;
            var rows = response.data.rows;
            rows.forEach((row) => {
              var data2 = {};
              columns.forEach((column, index) => {
                data2[column.name] = row[index];
              });
              if (asObject) {
                var newObject = new this();
                newObject.setModelType(this);
                newObject.initFromData(data2);
              } else {
                var newObject = data2;
              }
              result.data.push(newObject);
            });
            if (response.data.cursor) {
              result.next = async function() {
                if (!this["_next"]) {
                  this["_next"] = await that.elasticFullSql(null, null, null, response.data.cursor, columns);
                }
                return this["_next"];
              };
            } else {
            }
          } catch (error) {
            console.error(time, error);
          }
          return result;
        }
        /**
         * Escapes special characters in a string for SQL queries.
         * @param str - The string to escape.
         * @returns The escaped string.
         */
        escapeStringSql(str) {
          var string = str;
          string = string.split("'").join("");
          string = string.split('"').join("");
          return string.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
            switch (char) {
              case "\0":
                return "\\0";
              case "\b":
                return "\\b";
              case "	":
                return "\\t";
              case "":
                return "\\z";
              case "\n":
                return "\\n";
              case "\r":
                return "\\r";
              case '"':
              case "'":
              case "\\":
              case "%":
                return "\\" + char;
            }
          });
        }
        /**
         * Parses a value into a SQL string representation.
         *
         * @param value - The value to be parsed.
         * @returns The SQL string representation of the value.
         */
        parseValueSql(value) {
          var result = "";
          if (typeof value === "number") {
            return value + "";
          }
          if (Object.prototype.toString.call(value) === "[object Array]") {
            value.forEach((val) => {
              if (result != "") {
                result += ",";
              }
              result += "'" + this.escapeStringSql(val + "") + "'";
            });
            return result;
          }
          return "'" + this.escapeStringSql(value + "") + "'";
        }
        /**
         * Executes an Elasticsearch SQL query.
         *
         * @template T - The type of the model.
         * @param {string | any} whereSql - The SQL query or an array containing the query and its parameters.
         * @param {number} [limit] - The maximum number of results to return.
         * @param {any} [filters] - Additional filters to apply to the query.
         * @param {any} [cursor] - The cursor for pagination.
         * @param {any} [columns] - The columns to select in the query.
         * @param {boolean} [asObject=true] - Indicates whether to return the result as an object or an array.
         * @param {boolean} [asCount=false] - Indicates whether to return the count of the result.
         * @returns {Promise<ElasticWhereSqlResponse>} A promise that resolves to the result of the Elasticsearch SQL query.
         */
        static async elasticSql(whereSql, limit2, filters, cursor, columns, asObject = true, asCount = false) {
          var object = new this();
          var that = this;
          object.setModelType(this);
          var result = {
            data: []
          };
          if (whereSql && typeof whereSql !== "string" && Object.prototype.toString.call(whereSql) === "[object Array]" && whereSql.length == 2) {
            var query3 = whereSql[0];
            var params = whereSql[1];
            for (var key in params) {
              var search = ":" + key;
              var value = object.parseValueSql(params[key]);
              query3 = query3.split(search).join(value);
            }
            whereSql = query3;
            printLog("sql --- ", whereSql);
          }
          try {
            var connection = FirestoreOrmRepository.getGlobalElasticsearchConnection();
          } catch (error) {
            console.error(error);
            return result;
          }
          if (!connection || !connection.url) {
            console.error("Elasticsearch is not defined!");
            return result;
          }
          var params = {};
          var table = object.getReference().path.replace(new RegExp("/", "g"), "_").toLowerCase();
          var hasSelect = (whereSql + "").toLowerCase().trim().startsWith("select ");
          var sql = "";
          if (hasSelect) {
            sql = whereSql;
          } else {
            sql = "select * from " + table + " " + whereSql;
          }
          if (asCount) {
            sql = "SELECT count(*) as count from (" + sql + ") as t";
          }
          if (sql) {
            params["query"] = sql;
          }
          if (limit2) {
            params["fetch_size"] = limit2;
          }
          if (filters) {
            params["filter"] = filters;
          }
          if (cursor) {
            params["cursor"] = cursor;
          }
          try {
            var result = await that.elasticFullSql(sql, limit2, filters, null, null, !asCount && asObject);
            result.count = async function() {
              if (!this["_count"]) {
                var res = await that.elasticSql(whereSql, null, filters, null, null, null, true);
                this["_count"] = res && res.data && res && res.data[0] && res.data[0].count ? res.data[0].count : 0;
              }
              return this["_count"];
            };
          } catch (error) {
            console.error(error);
          }
          return result;
        }
        /**
         * Retrieves all documents of a specific model type from Firestore.
         *
         * @template T - The type of the model.
         * @param {Array<any>} [whereArr] - An array of where conditions to filter the documents.
         * @param {{ fieldPath: string | FieldPath; directionStr?: OrderByDirection; }} [orderBy] - The field to order the documents by and the direction of the ordering.
         * @param {number} [limit] - The maximum number of documents to retrieve.
         * @param {{ [key: string]: string }} [params] - Additional parameters for the query.
         * @returns {Promise<Array<T>>} - A promise that resolves to an array of documents of the specified model type.
         */
        static async getAll(whereArr, orderBy2, limit2, params) {
          var object = new this();
          object.setModelType(this);
          var query3 = object.query();
          if (whereArr && whereArr[0] && whereArr[0].length == 3) {
            for (var i = 0; i < whereArr.length; i++) {
              query3.where(whereArr[i][0], whereArr[i][1], whereArr[i][2]);
            }
          }
          if (limit2) {
            query3.limit(limit2);
          }
          var res = await query3.get();
          return res;
        }
        /**
         * Retrieves all the records from the database that match the specified conditions.
         *
         * @param whereArr - An optional array of conditions to filter the records.
         * @param orderBy - An optional object specifying the field to order the records by and the direction of the ordering.
         * @param limit - An optional number specifying the maximum number of records to retrieve.
         * @param params - An optional object containing additional parameters for the query.
         * @returns A promise that resolves to an array of records.
         */
        async getAll(whereArr, orderBy2, limit2, params) {
          var that = this.getModelType();
          var object = this.getCurrentModel();
          var query3 = object.query();
          if (whereArr && whereArr[0] && whereArr[0].length == 3) {
            for (var i = 0; i < whereArr.length; i++) {
              query3.where(whereArr[i][0], whereArr[i][1], whereArr[i][2]);
            }
          }
          if (limit2) {
            query3.limit(limit2);
          }
          var res = await query3.get();
          return res;
        }
        /**
         * Returns the repository associated with this model.
         * @returns The repository instance.
         */
        getRepository() {
          return this.repository;
        }
        /**
         * Sets the repository for the model.
         *
         * @param repository - The repository to set.
         * @returns The updated model instance.
         */
        setRepository(repository) {
          this.repository = repository;
          return this;
        }
        /**
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        on(callback) {
          var that = this;
          var res = () => {
          };
          if (!that.getId()) {
            console.error(this["referencePath"] + "/:" + this["pathId"] + " - The model not stored yet");
            return res;
          } else if (!that.getReference()) {
            console.error("The model path params is not set and can't run on() function ");
            return res;
          } else {
            return that.getReference().doc(that.getId()).onSnapshot((documentSnapshot) => {
              var data = documentSnapshot.data();
              for (let key in data) {
                let value = data[key];
                that[key] = value;
              }
              callback(that);
            });
          }
        }
        /**
         * Listens for changes on the current object and invokes the provided callback function.
         * @param callback - The callback function to be invoked when the object changes.
         * @returns A function that can be used to stop listening for changes.
         */
        listen(callback) {
          this.unlistenFunc = this.on((newObject) => {
            this.copy(newObject);
            if (callback) {
              callback(this);
            }
          });
          return this.unlistenFunc;
        }
        /**
         * Stops listening for changes on the model.
         * @returns {any} The result of the unlisten function, or `false` if there is no unlisten function.
         */
        unlisten() {
          if (this.unlistenFunc) {
            var res = this.unlistenFunc();
            this.unlistenFunc = null;
            return res;
          }
          return false;
        }
        /**
         * Creates an instance of the current model from a Firestore DocumentSnapshot.
         *
         * @param doc - The DocumentSnapshot containing the data.
         * @returns A Promise that resolves to an instance of the current model.
         */
        async createFromDoc(doc2) {
          var object = this.getCurrentModel();
          var d = doc2;
          var data = await doc2.data();
          var pathParams = object.getPathListParams();
          for (let key in pathParams) {
            let value = pathParams[key];
            object[key] = value;
          }
          for (let key in data) {
            let value = data[key];
            object[key] = value;
          }
          return object;
        }
        /**
         * Creates an instance of the model from a Firestore DocumentSnapshot.
         *
         * @template T - The type of the model.
         * @param {DocumentSnapshot} doc - The Firestore DocumentSnapshot.
         * @returns {Promise<T>} - A promise that resolves to the created model instance.
         */
        static async createFromDoc(doc2) {
          var object = new this();
          object.setModelType(this);
          var d = doc2;
          var data = await doc2.data();
          var pathParams = object.getPathListParams();
          for (let key in pathParams) {
            let value = pathParams[key];
            object[key] = value;
          }
          for (let key in data) {
            let value = data[key];
            object[key] = value;
          }
          return object;
        }
        static async createFromDocRef(doc2) {
          var object = new this();
          object.setModelType(this);
          var d = doc2;
          var data = (await getDocument(doc2)).data();
          if (data) {
            var pathParams = object.getPathListParams();
            for (let key in pathParams) {
              let value = pathParams[key];
              object[key] = value;
            }
            for (let key in data) {
              let value = data[key];
              object[key] = value;
            }
            return object;
          } else {
            return null;
          }
        }
        async createFromDocRef(doc2) {
          var object = new this();
          object.setModelType(this);
          var d = doc2;
          var data = (await getDocument(doc2)).data();
          if (data) {
            var pathParams = object.getPathListParams();
            for (let key in pathParams) {
              let value = pathParams[key];
              object[key] = value;
            }
            for (let key in data) {
              let value = data[key];
              object[key] = value;
            }
            return object;
          } else {
            return null;
          }
        }
        createFromData(data, targetObject) {
          var params = data;
          var object = !targetObject ? this.getCurrentModel() : targetObject;
          if (data["id"]) {
            this.is_exist = true;
            this.setId(data["id"]);
          }
          var pathParams = this.getPathListParams();
          for (let key in pathParams) {
            let value = pathParams[key];
            object[key] = value;
          }
          for (let key in params) {
            let value = params[key];
            if (object.aliasFieldsMapper && object.aliasFieldsMapper[key]) {
              object[object.aliasFieldsMapper[key]] = value;
            } else {
              if (object.getAliasName(key) !== key) {
                object[object.getAliasName(key)] = value;
                object.setParam(key, value);
              } else if (object.getOriginName(key)) {
                object[object.getOriginName(key)] = value;
              } else if (!(this["ignoredFields"] && this["ignoredFields"][key])) {
                object[key] = value;
              }
            }
          }
          return object;
        }
        getOriginName(key) {
          var that = this;
          for (var originKey in that.aliasFieldsMapper) {
            if (that.aliasFieldsMapper[originKey] == key) {
              return originKey;
            }
          }
          return null;
        }
        initFromData(data, targetObject) {
          return this.createFromData(data, this);
        }
        initFromDoc(doc2) {
          var that = this;
          var data = doc2.data();
          if (data)
            this.createFromData(data, this);
          return this;
        }
        /**
         * Set document data directly
         * @param key
         * @param value
         */
        setParam(key, value) {
          this[key] = value;
          this["storedFields"].push(key);
          return this;
        }
        /**
         * Get document data directly
         * @param key
         * @param value
         */
        getParam(key, defaultValue) {
          return typeof this[key] !== "undefined" ? this[key] : defaultValue;
        }
        /**
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        static onAllList(callback, eventType) {
          switch (eventType) {
            case LIST_EVENTS.ADDEDD:
              return this.onCreatedList(callback, LIST_EVENTS.ADDEDD);
              break;
            case LIST_EVENTS.REMOVED:
              return this.onAllList(callback, LIST_EVENTS.REMOVED);
              break;
            case LIST_EVENTS.MODIFIED:
              return this.onUpdatedList(callback, LIST_EVENTS.MODIFIED);
              break;
            default:
              return this.onAllList(callback);
              break;
          }
        }
        /**
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        onAllList(callback, eventType) {
          switch (eventType) {
            case LIST_EVENTS.ADDEDD:
              return this.onCreatedList(callback, LIST_EVENTS.ADDEDD);
              break;
            case LIST_EVENTS.REMOVED:
              return this.onAllList(callback, LIST_EVENTS.REMOVED);
              break;
            case LIST_EVENTS.MODIFIED:
              return this.onUpdatedList(callback, LIST_EVENTS.MODIFIED);
              break;
            default:
              return this.onAllList(callback);
              break;
          }
        }
        /**
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        onModeList(options) {
          var that = this;
          return that.query().orderBy(_BaseModel.CREATED_AT_FLAG).onMode(options);
        }
        /**
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        static onModeList(options) {
          var that = this;
          return that.query().orderBy(this.CREATED_AT_FLAG).onMode(options);
        }
        /**
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        static onList(callback, eventType) {
          var that = this;
          var res = () => {
          };
          var object = new this();
          object.setModelType(this);
          if (!object.getReference()) {
            console.error("The model path params is not set and can't run onList() function ");
            return res;
          } else {
            return this.query().orderBy(this.CREATED_AT_FLAG).on(callback, eventType);
          }
        }
        /**
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        onList(callback, eventType) {
          var that = this.getModelType();
          var res = () => {
          };
          var object = this.getCurrentModel();
          if (!object.getReference()) {
            console.error("The model path params is not set and can't run onList() function ");
            return res;
          } else {
            var that = this;
            return that.query().orderBy(_BaseModel.CREATED_AT_FLAG).on(callback, eventType);
          }
        }
        /**
         * Get New element in collectio
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        static onCreatedList(callback, eventType) {
          var res = () => {
          };
          var object = new this();
          object.setModelType(this);
          if (!object.getReference()) {
            console.error("The model path params is not set and can't run onAddList() function ");
            return res;
          }
          var timestamp = (/* @__PURE__ */ new Date()).getTime();
          return this.query().orderBy(this.CREATED_AT_FLAG).startAt(timestamp).on(callback, eventType);
        }
        /**
         * Get New element in collectio
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        onCreatedList(callback, eventType) {
          var res = () => {
          };
          var that = this.getModelType();
          var object = this.getCurrentModel();
          if (!object.getReference()) {
            console.error("The model path params is not set and can't run onAddList() function ");
            return res;
          }
          var timestamp = (/* @__PURE__ */ new Date()).getTime();
          var that = this;
          return that.query().orderBy(_BaseModel.CREATED_AT_FLAG).startAt(timestamp).on(callback, eventType);
        }
        /**
         * Get Updated element in collectio
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        onUpdatedList(callback, eventType) {
          var res = () => {
          };
          var that = this.getModelType();
          var object = this.getCurrentModel();
          if (!object.getReference()) {
            console.error("The model path params is not set and can't run onUpdatedList() function ");
            return res;
          }
          var timestamp = (/* @__PURE__ */ new Date()).getTime();
          var that = this;
          return that.query().orderBy(_BaseModel.UPDATED_AT_FLAG).startAt(timestamp).on(callback, eventType);
        }
        /**
         * Get Updated element in collectio
         * Attaches a listener for QuerySnapshot events. You may either pass
         * individual `onNext` and `onError` callbacks or pass a single observer
         * object with `next` and `error` callbacks. The listener can be cancelled by
         * calling the function that is returned when `onSnapshot` is called.
         *
         * NOTE: Although an `onCompletion` callback can be provided, it will
         * never be called because the snapshot stream is never-ending.
         *
         * @param callback A single object containing `next` and `error` callbacks.
         * @return An unsubscribe function that can be called to cancel
         * the snapshot listener.
         */
        static onUpdatedList(callback, eventType) {
          var res = () => {
          };
          var object = new this();
          object.setModelType(this);
          if (!object.getReference()) {
            console.error("The model path params is not set and can't run onUpdatedList() function ");
            return res;
          }
          var timestamp = (/* @__PURE__ */ new Date()).getTime();
          return this.query().orderBy(_BaseModel.UPDATED_AT_FLAG).startAt(timestamp).on(callback, eventType);
        }
        format(field, format) {
          return this.moment(field).format(format);
        }
        moment(field) {
          const value = this[field];
          return moment.unix(value === null || value === void 0 ? void 0 : value.seconds);
        }
        date(field) {
          const value = this[field];
          if (value === null || value === void 0 ? void 0 : value.seconds) {
            return new Date(value === null || value === void 0 ? void 0 : value.seconds);
          } else {
            return /* @__PURE__ */ new Date();
          }
        }
        initAutoTime() {
          if (this.isAutoTime) {
            if (!this.created_at) {
              this[_BaseModel.CREATED_AT_FLAG] = (/* @__PURE__ */ new Date()).getTime();
              this.created_at = (/* @__PURE__ */ new Date()).getTime();
            }
            this[_BaseModel.UPDATED_AT_FLAG] = (/* @__PURE__ */ new Date()).getTime();
            this["storedFields"].push(_BaseModel.CREATED_AT_FLAG);
            this["storedFields"].push(_BaseModel.UPDATED_AT_FLAG);
            this.updated_at = (/* @__PURE__ */ new Date()).getTime();
          }
        }
        makeId(length) {
          var result = "";
          var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
          var charactersLength = characters.length;
          for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
          }
          return result;
        }
        async getStorageFile(target) {
          var _a;
          await lazyLoadFirebaseStorage();
          var that = this;
          var uniqueId = this.getId() ? this.getId() : this.makeId(20);
          var path = ((_a = await this.getDocReferenceAsync()) === null || _a === void 0 ? void 0 : _a.path) + "/" + uniqueId + "/" + target;
          var storage = FirestoreOrmRepository.getGlobalStorage();
          var storageRef = ref2(storage);
          var fileRef = ref2(storageRef, path);
          fileRef["_put"] = fileRef.put;
          fileRef["_putString"] = fileRef.putString;
          fileRef.getRef = function() {
            if (that[target]) {
              var url = target[target];
              const refVal = ref2(storage, url);
              if (refVal) {
                return refVal;
              } else {
                return fileRef;
              }
            } else {
              return fileRef;
            }
          };
          fileRef.uploadFile = async function(data, metadata, onProcessingCallback = () => {
          }, onErrorCallback = () => {
          }, onFinishCallback = () => {
          }) {
            var uploadTask = this.put(data, metadata);
            return await that.initUpdateTask(uploadTask, target, onProcessingCallback, onErrorCallback, onFinishCallback);
          };
          fileRef.uploadString = async function(data, format, metadata, onProcessingCallback = () => {
          }, onErrorCallback = () => {
          }, onFinishCallback = () => {
          }) {
            var uploadTask = this.putString(data, format, metadata);
            return await that.initUpdateTask(uploadTask, target, onProcessingCallback, onErrorCallback, onFinishCallback);
          };
          fileRef.uploadFromUrl = async function(url, onProcessingCallback = () => {
          }, onErrorCallback = () => {
          }, onFinishCallback = () => {
          }) {
            try {
              await lazyLoadAxios();
              var response = await axios({
                method: "get",
                url,
                responseType: "arraybuffer"
              });
              var base642 = Buffer.from(response.data, "binary").toString("base64");
              return await this.uploadString(base642, "base64", void 0, onProcessingCallback, onErrorCallback, onFinishCallback);
            } catch (err) {
              throw Error(err);
            }
          };
          return fileRef;
        }
        initUpdateTask(uploadTask, target, onProcessingCallback = () => {
        }, onErrorCallback = () => {
        }, onFinishCallback = () => {
        }) {
          var that = this;
          return new Promise(async (resolve, reject) => {
            uploadTask.on(
              "state_changed",
              // Processing 
              onProcessingCallback,
              // Error 
              (error) => {
                reject(error);
                onErrorCallback(error);
              },
              // Finish
              async () => {
                await lazyLoadFirebaseStorage();
                onFinishCallback(uploadTask);
                getDownloadURL2(uploadTask.snapshot.ref).then((downloadURL) => {
                  that[target] = downloadURL;
                  resolve(downloadURL);
                });
              }
            );
          });
        }
        getCreatedAt() {
          return this.created_at ? moment.unix(this.created_at / 1e3) : null;
        }
        getUpdatedAt() {
          return this.updated_at ? moment.unix(this.updated_at / 1e3) : null;
        }
        async save(customId) {
          const that = this;
          if (that.observeSaveBefore) {
            that.observeSaveBefore();
          }
          if (!this.verifyRequiredFields()) {
            return this;
          }
          this.initAutoTime();
          if (this.getRepository()) {
            await this.getRepository().save(this, customId);
          } else {
            console.error("No repository!");
          }
          if (that.observeSaveAfter) {
            that.observeSaveAfter();
          }
          return this;
        }
        // ===========================
        // Generic ORM Instance Alias Functions
        // ===========================
        /**
         * Alias for save() - Persists the current instance to the database.
         * Common alias used in many ORM frameworks for creating new records.
         *
         * @param {string} [customId] - Optional custom ID for the document.
         * @returns {Promise<this>} A promise that resolves to the current instance after creation.
         */
        async create(customId) {
          return await this.save(customId);
        }
        /**
         * Alias for save() - Updates the current instance in the database.
         * Common alias used in many ORM frameworks for updating existing records.
         *
         * @param {Partial<this>} [updateData] - Optional data to update the instance with before saving.
         * @returns {Promise<this>} A promise that resolves to the current instance after update.
         */
        async update(updateData) {
          if (updateData) {
            Object.assign(this, updateData);
          }
          return await this.save();
        }
        /**
         * Alias for remove() - Destroys the current instance in the database.
         * Common alias used in many ORM frameworks.
         *
         * @returns {Promise<boolean>} A promise that resolves to true if the destruction was successful.
         */
        async destroy() {
          return await this.remove();
        }
        /**
         * Alias for remove() - Deletes the current instance from the database.
         * Common alias used in many ORM frameworks.
         *
         * @returns {Promise<boolean>} A promise that resolves to true if the deletion was successful.
         */
        async delete() {
          return await this.remove();
        }
        getReferencePath() {
          return this["referencePath"];
        }
        async getDocRefPath() {
          const ref3 = await this.getDocReferenceAsync();
          return ref3 === null || ref3 === void 0 ? void 0 : ref3.path;
        }
        /**
         * Initializes an instance of the model by retrieving data from a specified reference path.
         * @param path - The reference path to retrieve the data from.
         * @returns A promise that resolves to an instance of the model with the retrieved data, or null if the reference path is not provided or the repository is not available.
         */
        static async initByRef(path) {
          var object = new this();
          var res;
          if (!path) {
            console.error("No ref path!");
            return null;
          }
          if (object.getRepository()) {
            const doc2 = await getDocument(path);
            res = object.initFromDoc(doc2);
            object.id = doc2.id;
            object["referencePath"] = doc2.ref.parent.path;
            object.is_exist = true;
          } else {
            console.error("No repository!");
          }
          return res;
        }
        /**
         * Finds and retrieves an array of objects that match the specified criteria.
         *
         * @template T - The type of the objects to be retrieved.
         * @param {string} fieldPath - The field path to filter on.
         * @param {WhereFilterOp} opStr - The comparison operator.
         * @param {any} value - The value to compare against.
         * @returns {Promise<Array<T>>} - A promise that resolves to an array of objects that match the specified criteria.
         */
        static async find(fieldPath, opStr, value) {
          var that = this;
          return await that.where(fieldPath, opStr, value).get();
        }
        /**
         * Finds a single document in the collection that matches the specified criteria.
         *
         * @template T - The type of the document to be returned.
         * @param {string} fieldPath - The field path to query on.
         * @param {WhereFilterOp} opStr - The operator to use for the query.
         * @param {any} value - The value to compare against.
         * @returns {Promise<T | null>} A promise that resolves to the matching document, or null if no document is found.
         */
        static async findOne(fieldPath, opStr, value) {
          var that = this;
          return await that.where(fieldPath, opStr, value).getOne();
        }
        // ===========================
        // Generic ORM Alias Functions
        // ===========================
        /**
         * Alias for getAll() - Gets all documents from the collection.
         * Common alias used in many ORM frameworks.
         *
         * @template T - The type of the document to be returned.
         * @param {Array<any>} [whereArr] - An array of where conditions.
         * @param {{ fieldPath: string | FieldPath; directionStr?: OrderByDirection }} [orderBy] - The ordering specification.
         * @param {number} [limit] - The maximum number of documents to retrieve.
         * @param {{ [key: string]: string }} [params] - Additional parameters for the query.
         * @returns {Promise<Array<T>>} - A promise that resolves to an array of documents.
         */
        static async all(whereArr, orderBy2, limit2, params) {
          var that = this;
          return await that.getAll(whereArr, orderBy2, limit2, params);
        }
        /**
         * Alias for findOne() - Finds the first document that matches the specified criteria.
         * Common alias used in many ORM frameworks.
         *
         * @template T - The type of the document to be returned.
         * @param {string} fieldPath - The field path to query on.
         * @param {WhereFilterOp} opStr - The operator to use for the query.
         * @param {any} value - The value to compare against.
         * @returns {Promise<T | null>} A promise that resolves to the first matching document, or null if no document is found.
         */
        static async first(fieldPath, opStr, value) {
          var that = this;
          return await that.findOne(fieldPath, opStr, value);
        }
        /**
         * Creates a new instance of the model with the given data and saves it to the database.
         * Common alias used in many ORM frameworks.
         *
         * @template T - The type of the document to be created.
         * @param {Partial<T>} data - The data to populate the new instance with.
         * @param {string} [customId] - Optional custom ID for the document.
         * @returns {Promise<T>} A promise that resolves to the created and saved instance.
         */
        static async create(data, customId) {
          const instance = new this();
          Object.assign(instance, data);
          await instance.save(customId);
          return instance;
        }
        /**
         * Updates documents in the collection that match the specified criteria.
         * Common alias used in many ORM frameworks.
         *
         * @template T - The type of the document to be updated.
         * @param {string} fieldPath - The field path to query on.
         * @param {WhereFilterOp} opStr - The operator to use for the query.
         * @param {any} value - The value to compare against.
         * @param {Partial<T>} updateData - The data to update the matching documents with.
         * @returns {Promise<Array<T>>} A promise that resolves to an array of updated documents.
         */
        static async update(fieldPath, opStr, value, updateData) {
          var that = this;
          const instances2 = await that.find(fieldPath, opStr, value);
          const updatedInstances = [];
          for (const instance of instances2) {
            Object.assign(instance, updateData);
            await instance.save();
            updatedInstances.push(instance);
          }
          return updatedInstances;
        }
        /**
         * Alias for find() followed by remove() - Destroys documents that match the specified criteria.
         * Common alias used in many ORM frameworks.
         *
         * @template T - The type of the document to be destroyed.
         * @param {string} fieldPath - The field path to query on.
         * @param {WhereFilterOp} opStr - The operator to use for the query.
         * @param {any} value - The value to compare against.
         * @returns {Promise<boolean>} A promise that resolves to true if all documents were successfully destroyed.
         */
        static async destroy(fieldPath, opStr, value) {
          var that = this;
          const instances2 = await that.find(fieldPath, opStr, value);
          let allDestroyed = true;
          for (const instance of instances2) {
            const destroyed = await instance.remove();
            if (!destroyed) {
              allDestroyed = false;
            }
          }
          return allDestroyed;
        }
        /**
         * Finds documents in the collection that match the specified criteria.
         *
         * @param fieldPath - The field path to filter on.
         * @param opStr - The comparison operator.
         * @param value - The value to compare against.
         * @returns A promise that resolves to an array of documents that match the criteria.
         */
        async find(fieldPath, opStr, value) {
          var that = this;
          return await that.where(fieldPath, opStr, value).get();
        }
        /**
         * Retrieves a snapshot of the document associated with this model.
         * @returns A promise that resolves with the document snapshot.
         */
        async getSnapshot() {
          const docRef = await this.getDocReferenceAsync();
          if (!docRef) {
            throw new Error("Document reference is not available");
          }
          return new Promise((resolve, reject) => {
            onDocumentSnapshot(docRef, (doc2) => {
              if (doc2) {
                resolve(doc2);
              } else {
                reject(doc2);
              }
            });
          });
        }
        /**
         * Finds a single document in the collection that matches the specified criteria.
         *
         * @param fieldPath - The field path to query on.
         * @param opStr - The comparison operator.
         * @param value - The value to compare against.
         * @returns A promise that resolves to the found document or null if no document is found.
         */
        async findOne(fieldPath, opStr, value) {
          var that = this;
          return await that.where(fieldPath, opStr, value).getOne();
        }
        /**
         * Retrieves the required fields for the model.
         * @returns An array of strings representing the required fields.
         */
        getRequiredFields() {
          var that = this;
          return that.requiredFields ? that.requiredFields : [];
        }
        /**
         * Verifies if all the required fields of the model have values.
         * @returns {boolean} Returns true if all the required fields have values, otherwise returns false.
         */
        verifyRequiredFields() {
          var that = this;
          var fields = this.getRequiredFields();
          var result = true;
          for (var i = 0; fields.length > i; i++) {
            if (that[fields[i]] == null || typeof that[fields[i]] === void 0) {
              result = false;
              console.error(this["referencePath"] + "/:" + this["pathId"] + " - Can't save " + fields[i] + " with null!");
            }
          }
          return result;
        }
        /**
         * Retrieves the field name for the given key.
         * If an aliasFieldsMapper is defined and it contains a mapping for the key, the mapped field name is returned.
         * Otherwise, the key itself is returned as the field name.
         *
         * @param key - The key for which to retrieve the field name.
         * @returns The field name corresponding to the key.
         */
        getFieldName(key) {
          return this["aliasFieldsMapper"] && this["aliasFieldsMapper"][key] ? this["aliasFieldsMapper"][key] : key;
        }
        /**
         * Returns the alias name for the given key.
         * If a reverse alias fields mapper is defined and the key exists in the mapper, the corresponding alias name is returned.
         * Otherwise, the key itself is returned.
         *
         * @param key - The key for which to retrieve the alias name.
         * @returns The alias name for the given key.
         */
        getAliasName(key) {
          return this["reverseAliasFieldsMapper"] && this["reverseAliasFieldsMapper"][key] ? this["reverseAliasFieldsMapper"][key] : key;
        }
        /**
         * Retrieves the document data as an object.
         *
         * @param useAliasName - Indicates whether to use the alias name for field names.
         * @returns An object containing the document data.
         */
        getDocumentData(useAliasName = false) {
          var data = {};
          this["storedFields"].forEach((fieldName) => {
            fieldName = this.getFieldName(fieldName);
            var val;
            if (typeof this[this.getAliasName(fieldName)] !== "undefined") {
              val = this[this.getAliasName(fieldName)];
            } else if (typeof this[fieldName] !== "undefined") {
              val = this[fieldName];
            } else if (this["data"] && typeof this["data"][fieldName] !== "undefined") {
              val = this["data"][fieldName];
            }
            if (useAliasName) {
              fieldName = this.getAliasName(fieldName);
            }
            if (val instanceof _BaseModel) {
              data[fieldName] = val.getDocReference();
            } else if (typeof val !== "undefined") {
              data[fieldName] = val;
            }
          });
          return data;
        }
        /**
         * Copies the properties from the given object to the current object.
         * Only copies properties that are defined in the given object.
         *
         * @param object - The object from which to copy the properties.
         */
        copy(object) {
          for (let key in object.getData(true)) {
            if (typeof object[key] !== "undefined") {
              this[key] = object[key];
            }
          }
        }
        /**
         * Alias of getDocumentData
         */
        getData(useAliasName = false) {
          var result = {};
          var data = this.getDocumentData(useAliasName);
          for (var key in data) {
            if (!(this["ignoredFields"] && this["ignoredFields"].includes(key)) && typeof data[key] !== "undefined") {
              result[key] = data[key];
            }
          }
          return result;
        }
        /**
         * Retrieves the path list for the current model instance.
         * The path list is an array of objects, where each object represents a segment of the path.
         * Each object has a `type` property indicating whether it's a "collection" or "document",
         * and a `value` property containing the corresponding path segment value.
         * If any path segment is missing, it returns `false`.
         *
         * @returns An array of objects representing the path segments, or `false` if any segment is missing.
         */
        getPathList() {
          var that = this;
          var result = [];
          var path = this.getReferencePath();
          var newTxt = path.split("/");
          let prev = null;
          for (var x = 0; x < newTxt.length; x++) {
            const type = prev !== "collection" ? "collection" : "document";
            var subPath = newTxt[x];
            if (subPath.search(":") != -1) {
              subPath = subPath.replace(":", "");
              var value;
              if (that.pathParams.has(subPath)) {
                value = that.pathParams.get(subPath);
              } else if (that[subPath]) {
                value = that[subPath];
              } else if (FirestoreOrmRepository.getGlobalPath(subPath)) {
                value = FirestoreOrmRepository.getGlobalPath(subPath);
              } else {
                console.error(this["referencePath"] + "/:" + this["pathId"] + " - " + subPath + " is missing!");
                return false;
              }
              result.push({
                type,
                value
              });
            } else {
              result.push({
                type,
                value: subPath
              });
            }
            prev = type;
          }
          return result;
        }
        /**
         * Initializes the path of the model from a string.
         * @param path - The string representing the path.
         */
        initPathFromStr(path) {
          const keysWithPos = this.getPathListKeysWithPos();
          var that = this;
          var newTxt = path.split("/");
          for (const prop of keysWithPos) {
            that[prop.key] = newTxt[prop.pos];
          }
        }
        /**
         * Retrieves the parameters required for constructing the path list.
         * @returns An object containing the path list parameters.
         */
        getPathListParams() {
          var that = this;
          var result = {};
          var keys = this.getPathListKeys();
          for (var i = 0; i < keys.length; i++) {
            var subPath = keys[i];
            var value;
            if (that.pathParams.has(subPath)) {
              value = that.pathParams.get(subPath);
            } else if (that[subPath]) {
              value = that[subPath];
            } else if (FirestoreOrmRepository.getGlobalPath(subPath)) {
              value = FirestoreOrmRepository.getGlobalPath(subPath);
            } else {
              console.error(this["referencePath"] + "/:" + this["pathId"] + " - " + subPath + " is missing!");
              return false;
            }
            result[subPath] = value;
          }
          return result;
        }
        /**
         * Returns an array of keys extracted from the reference path.
         * @returns An array of string keys.
         */
        getPathListKeys() {
          var that = this;
          var result = [];
          var path = this.getReferencePath();
          var newTxt = path.split("/");
          for (var x = 0; x < newTxt.length; x++) {
            var subPath = newTxt[x];
            if (subPath.search(":") != -1) {
              subPath = subPath.replace(":", "");
              result.push(subPath);
            }
          }
          return result;
        }
        /**
         * Returns an array of objects containing the keys and positions of the path list.
         * @returns An array of objects with `key` and `pos` properties.
         */
        getPathListKeysWithPos() {
          var that = this;
          var result = [];
          var path = this.getReferencePath();
          var newTxt = path.split("/");
          for (var x = 0; x < newTxt.length; x++) {
            var subPath = newTxt[x];
            if (subPath.search(":") != -1) {
              subPath = subPath.replace(":", "");
              result.push({ key: subPath, pos: x });
            }
          }
          return result;
        }
        /**
         * Converts the model instance to a JSON object.
         * @returns The JSON representation of the model instance.
         */
        toJSON() {
          return this.getData();
        }
      };
      BaseModel.CREATED_AT_FLAG = "created_at";
      BaseModel.UPDATED_AT_FLAG = "updated_at";
      BaseModel.aliasFieldsMapper = {};
      BaseModel.reverseAliasFieldsMapper = {};
      BaseModel.textIndexingFields = {};
      BaseModel.ignoreFields = [];
      BaseModel.fields = {};
      BaseModel.requiredFields = [];
      BaseModel.internalFields = [];
    }
  });

  // dist/esm/utils/case-conversion.js
  function toSnakeCase(str) {
    return str.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
  }
  function classNameToPathId(className) {
    const snakeCase = toSnakeCase(className);
    return snakeCase.endsWith("_id") ? snakeCase : `${snakeCase}_id`;
  }
  var init_case_conversion = __esm({
    "dist/esm/utils/case-conversion.js"() {
    }
  });

  // dist/esm/decorators/model.js
  function applyMixins(derivedCtor, baseCtors) {
    baseCtors.forEach((baseCtor) => {
      Object.getOwnPropertyNames(baseCtor.prototype).forEach((name3) => {
        var t = Object.getOwnPropertyDescriptor(baseCtor.prototype, name3);
        Object.defineProperty(derivedCtor.prototype, name3, t);
      });
    });
  }
  function Model(options) {
    return function(constructor) {
      if (Object.getPrototypeOf(constructor) !== BaseModel) {
        applyMixins(constructor, [BaseModel]);
      }
      const globalConfig = FirestoreOrmRepository.getGlobalConfig();
      let pathId;
      if (options.path_id) {
        pathId = options.path_id;
      } else if (globalConfig.auto_path_id) {
        pathId = classNameToPathId(constructor.name);
      } else {
        throw new Error(`Model '${constructor.name}' must have a path_id defined in @Model decorator or enable auto_path_id in global configuration`);
      }
      FirestoreOrmRepository.registerPathId(pathId, constructor.name);
      return class extends constructor {
        get referencePath() {
          return this._referencePath ? this._referencePath : options.reference_path;
        }
        get pathId() {
          return pathId;
        }
        set pathId(value) {
        }
        get isAutoTime() {
          return typeof options.auto_time === "undefined" ? true : options.auto_time;
        }
        set isAutoTime(value) {
        }
        getId() {
          return options.static_id ? options.static_id : this.id;
        }
        set referencePath(val) {
          this._referencePath = val;
        }
      };
    };
  }
  var init_model = __esm({
    "dist/esm/decorators/model.js"() {
      init_repository();
      init_case_conversion();
      init_base_model();
    }
  });

  // dist/esm/decorators/field.js
  function Field(options) {
    return (target, key) => {
      let val;
      if (!target.requiredFields) {
        target.requiredFields = new Array();
      }
      if (!target.aliasFieldsMapper) {
        target.aliasFieldsMapper = {};
      }
      if (!target.reverseAliasFieldsMapper) {
        target.reverseAliasFieldsMapper = {};
      }
      if (!target.textIndexingFields) {
        target.textIndexingFields = {};
      }
      if (!target.fields) {
        target.fields = {};
      }
      if (!target.ignoredFields) {
        target.ignoredFields = [];
      }
      if (!target.internalFields) {
        target.internalFields = [];
      }
      let fieldName;
      if (options && options.field_name) {
        fieldName = options.field_name;
      } else {
        const globalConfig = FirestoreOrmRepository.getGlobalConfig();
        if (globalConfig.auto_lower_case_field_name) {
          fieldName = toSnakeCase(key);
        } else {
          fieldName = key;
        }
      }
      if (fieldName !== key) {
        target.aliasFieldsMapper[key] = fieldName;
        target.reverseAliasFieldsMapper[fieldName] = key;
      }
      target.fields[key] = options;
      if (options && options.is_required) {
        target.requiredFields.push(key);
      }
      if (!target.storedFields) {
        target.storedFields = [];
      }
      target.storedFields.push(fieldName);
      if (options && options.is_text_indexing) {
        target.textIndexingFields[key] = key;
        target["storedFields"].push("text_index_" + fieldName);
      }
      var update = Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        /*  writable: true, */
        set: function(value) {
          this["data"][this.getFieldName(key)] = value;
          if (this.textIndexingFields[key]) {
            this["data"]["text_index_" + this.getFieldName(key)] = this.parseTextIndexingFields(value + "");
          }
        },
        get: function() {
          return typeof this["data"][this.getFieldName(key)] === "undefined" ? void 0 : this["data"][this.getFieldName(key)];
        }
      });
      if (!update) {
        throw new Error("Unable to update property");
      }
      return target;
    };
  }
  var init_field = __esm({
    "dist/esm/decorators/field.js"() {
      init_repository();
      init_case_conversion();
    }
  });

  // dist/esm/decorators/relationships.js
  function BelongsTo(options) {
    return (target, key) => {
      if (!target.relationships) {
        target.relationships = {};
      }
      target.relationships[key] = Object.assign({ type: "belongsTo" }, options);
    };
  }
  function HasOne(options) {
    return (target, key) => {
      if (!target.relationships) {
        target.relationships = {};
      }
      target.relationships[key] = Object.assign({ type: "hasOne" }, options);
    };
  }
  function HasMany(options) {
    return (target, key) => {
      if (!target.relationships) {
        target.relationships = {};
      }
      target.relationships[key] = Object.assign({ type: "hasMany" }, options);
    };
  }
  function BelongsToMany(options) {
    return (target, key) => {
      if (!target.relationships) {
        target.relationships = {};
      }
      target.relationships[key] = Object.assign({ type: "belongsToMany" }, options);
    };
  }
  var init_relationships = __esm({
    "dist/esm/decorators/relationships.js"() {
    }
  });

  // dist/esm/interfaces/model.interface.js
  var init_model_interface = __esm({
    "dist/esm/interfaces/model.interface.js"() {
    }
  });

  // dist/esm/interfaces/current.model.interface.js
  var init_current_model_interface = __esm({
    "dist/esm/interfaces/current.model.interface.js"() {
    }
  });

  // dist/esm/interfaces/field.options.interface.js
  var init_field_options_interface = __esm({
    "dist/esm/interfaces/field.options.interface.js"() {
    }
  });

  // dist/esm/interfaces/model.alllist.options.interface.js
  var init_model_alllist_options_interface = __esm({
    "dist/esm/interfaces/model.alllist.options.interface.js"() {
    }
  });

  // dist/esm/interfaces/model.options.interface.js
  var init_model_options_interface = __esm({
    "dist/esm/interfaces/model.options.interface.js"() {
    }
  });

  // dist/esm/interfaces/relationship.options.interface.js
  var init_relationship_options_interface = __esm({
    "dist/esm/interfaces/relationship.options.interface.js"() {
    }
  });

  // dist/esm/interfaces/observe.load.model.interface.js
  var init_observe_load_model_interface = __esm({
    "dist/esm/interfaces/observe.load.model.interface.js"() {
    }
  });

  // dist/esm/interfaces/observe.remove.model.interface.js
  var init_observe_remove_model_interface = __esm({
    "dist/esm/interfaces/observe.remove.model.interface.js"() {
    }
  });

  // dist/esm/interfaces/observe.save.model.interface.js
  var init_observe_save_model_interface = __esm({
    "dist/esm/interfaces/observe.save.model.interface.js"() {
    }
  });

  // dist/esm/interfaces/global.config.interface.js
  var init_global_config_interface = __esm({
    "dist/esm/interfaces/global.config.interface.js"() {
    }
  });

  // (disabled):node_modules/firebase-admin/lib/esm/firestore/index.js
  var require_firestore = __commonJS({
    "(disabled):node_modules/firebase-admin/lib/esm/firestore/index.js"() {
    }
  });

  // dist/esm/admin.js
  var admin_exports = {};
  __export(admin_exports, {
    BaseModel: () => BaseModel,
    BelongsTo: () => BelongsTo,
    BelongsToMany: () => BelongsToMany,
    Field: () => Field,
    FirestoreOrmRepository: () => FirestoreOrmRepository,
    HasMany: () => HasMany,
    HasOne: () => HasOne,
    LIST_EVENTS: () => LIST_EVENTS,
    Model: () => Model,
    Query: () => Query,
    WHERE_FILTER_OP: () => WHERE_FILTER_OP,
    classNameToPathId: () => classNameToPathId,
    initializeAdminApp: () => initializeAdminApp,
    toSnakeCase: () => toSnakeCase
  });
  async function initializeAdminApp(adminApp, key = FirestoreOrmRepository.DEFAULT_KEY_NAME) {
    if (typeof window !== "undefined") {
      throw new Error("initializeAdminApp can only be called in a Node.js environment, not in the browser");
    }
    try {
      const adminFirestore = await Promise.resolve().then(() => __toESM(require_firestore(), 1));
      const connection = adminFirestore.getFirestore(adminApp);
      await FirestoreOrmRepository.initGlobalConnection(connection, key);
      return adminApp;
    } catch (error) {
      console.error("Error initializing Firebase Admin:", error);
      throw error;
    }
  }
  var init_admin = __esm({
    "dist/esm/admin.js"() {
      init_repository();
      init_repository();
      init_base_model();
      init_query();
      init_model();
      init_field();
      init_relationships();
      init_model_interface();
      init_current_model_interface();
      init_field_options_interface();
      init_model_alllist_options_interface();
      init_model_options_interface();
      init_relationship_options_interface();
      init_observe_load_model_interface();
      init_observe_remove_model_interface();
      init_observe_save_model_interface();
      init_global_config_interface();
      init_case_conversion();
    }
  });

  // dist/esm/repository.js
  var qs2, collection, doc, updateDoc, setDoc, query2, documentId, where2, getDocs2, axios2, FirestoreOrmRepository;
  var init_repository = __esm({
    "dist/esm/repository.js"() {
      qs2 = __toESM(__require("qs"), 1);
      FirestoreOrmRepository = class _FirestoreOrmRepository {
        /**
         * Determines if the provided Firestore instance is from Admin SDK
         * @param firestore - The Firestore instance to check
         * @returns true if it's Admin SDK, false if it's Client SDK
         */
        isAdminFirestore(firestore) {
          if (!firestore) {
            return false;
          }
          return typeof firestore.collection === "function" && typeof firestore.doc === "function" && (firestore._settings !== void 0 || firestore.toJSON !== void 0);
        }
        constructor(firestore) {
          this.firestore = firestore;
          const isAdminSDK = this.isAdminFirestore(firestore);
          if (isAdminSDK) {
            console.log("Admin SDK detected - setting up compatibility functions");
            this.setupAdminSDKCompatibility();
            _FirestoreOrmRepository.isReady = true;
            this.setupPromise = Promise.resolve();
          } else {
            this.setupPromise = this.setupClientSDKCompatibility();
          }
          import("axios").then((module) => {
            axios2 = module.default;
          });
        }
        setupAdminSDKCompatibility() {
          const firestore = this.firestore;
          collection = ((parent2, collectionId) => {
            if (parent2 === this.firestore) {
              return firestore.collection(collectionId);
            }
            if (parent2 && typeof parent2.collection === "function") {
              return parent2.collection(collectionId);
            }
            if (parent2 && parent2.path) {
              return firestore.collection(`${parent2.path}/${collectionId}`);
            }
            throw new Error(`Cannot access collection '${collectionId}' from parent object. Parent does not have a collection method and no path property found.`);
          });
          doc = ((parent2, docId) => {
            if (arguments.length === 1) {
              return parent2.doc();
            }
            if (parent2 === this.firestore) {
              return firestore.doc(docId);
            }
            return parent2.doc(docId);
          });
          updateDoc = ((docRef, data) => docRef.update(data));
          setDoc = ((docRef, data, options) => {
            return options ? docRef.set(data, options) : docRef.set(data);
          });
          query2 = ((ref3, ...constraints) => {
            let result = ref3;
            for (const constraint of constraints) {
              if (constraint && typeof constraint.apply === "function") {
                result = constraint.apply(result);
              }
            }
            return result;
          });
          documentId = (() => "__name__");
          where2 = ((field, op, value) => ({
            apply: (ref3) => ref3.where(field, op, value)
          }));
          getDocs2 = ((ref3) => ref3.get());
        }
        async setupClientSDKCompatibility() {
          try {
            const module = await import("firebase/firestore");
            collection = module.collection;
            doc = module.doc;
            updateDoc = module.updateDoc;
            setDoc = module.setDoc;
            query2 = module.query;
            documentId = module.documentId;
            where2 = module.where;
            getDocs2 = module.getDocs;
            _FirestoreOrmRepository.isReady = true;
          } catch (error) {
            console.log("Client SDK import failed, checking if Admin SDK is available...");
            if (this.isAdminFirestore(this.firestore)) {
              console.log("Falling back to Admin SDK compatibility mode");
              this.setupAdminSDKCompatibility();
              _FirestoreOrmRepository.isReady = true;
            } else {
              console.error("Failed to load Firebase modules and no Admin SDK detected");
              throw error;
            }
          }
        }
        /**
         * Initializes a global connection for Firestore ORM.
         * @param firestore - The Firestore instance.
         * @param key - The key to identify the global connection (optional).
         * @returns A promise that resolves when the connection is fully initialized.
         */
        static initGlobalConnection(firestore, key = _FirestoreOrmRepository.DEFAULT_KEY_NAME) {
          const repository = new _FirestoreOrmRepository(firestore);
          this.globalFirestores[key] = repository;
          const readyPromise = repository.setupPromise.then(() => {
            if (this.globalWait[key]) {
              this.globalWait[key](repository);
            }
            return repository;
          });
          this.readyPromises[key] = readyPromise;
          return readyPromise;
        }
        /**
         * Initializes the Firebase app and sets up a global connection for Firestore ORM.
         * @param options - The Firebase app options.
         * @param name - The name of the Firebase app (optional).
         * @returns The initialized Firebase app.
         */
        static async initializeApp(options, name3) {
          const app = await import("firebase/app");
          const firebaseApp = app.initializeApp(options, name3);
          const { getFirestore } = await import("firebase/firestore");
          const connection = getFirestore(firebaseApp);
          await this.initGlobalConnection(connection);
          return firebaseApp;
        }
        /**
         * Initializes Firebase Admin and sets up a global connection for Firestore ORM.
         * @deprecated Use the initializeAdminApp function from '@arbel/firebase-orm/admin' instead.
         * This method is kept for backward compatibility but will be removed in a future version.
         *
         * @param adminApp - The Firebase Admin app instance.
         * @param key - The key to identify the global connection (optional).
         * @returns The provided Firebase Admin app instance.
         */
        static async initializeAdminApp(adminApp, key = _FirestoreOrmRepository.DEFAULT_KEY_NAME) {
          console.warn('FirestoreOrmRepository.initializeAdminApp is deprecated. Please import initializeAdminApp from "@arbel/firebase-orm/admin" instead. This ensures proper tree-shaking in browser builds.');
          if (typeof window !== "undefined") {
            throw new Error("initializeAdminApp can only be called in a Node.js environment, not in the browser");
          }
          try {
            const adminModule = await Promise.resolve().then(() => (init_admin(), admin_exports));
            return await adminModule.initializeAdminApp(adminApp, key);
          } catch (error) {
            console.error("Error initializing Firebase Admin:", error);
            throw error;
          }
        }
        /**
         * Initializes a global storage for Firestore ORM.
         * @param storage - The Firebase storage instance.
         * @param key - The key to identify the global storage (optional).
         */
        static initGlobalStorage(storage, key = _FirestoreOrmRepository.DEFAULT_KEY_NAME) {
          this.globalFirebaseStoages[key] = storage;
        }
        /**
         * Initializes a global Elasticsearch connection for Firestore ORM.
         * @param url - The Elasticsearch URL.
         * @param key - The key to identify the global Elasticsearch connection (optional).
         */
        static initGlobalElasticsearchConnection(url, key = _FirestoreOrmRepository.DEFAULT_KEY_NAME) {
          this.elasticSearchConnections[key] = {
            url
          };
        }
        /**
         * Retrieves the global Firebase storage instance.
         * @param key - The key to identify the global storage (optional).
         * @returns The global Firebase storage instance.
         * @throws An error if the global Firebase storage is undefined.
         */
        static getGlobalStorage(key = _FirestoreOrmRepository.DEFAULT_KEY_NAME) {
          if (this.globalFirebaseStoages[key]) {
            return this.globalFirebaseStoages[key];
          } else {
            throw new Error("The global Firebase storage " + key + " is undefined!");
          }
        }
        /**
         * Retrieves the global Elasticsearch connection.
         * @param key - The key to identify the global Elasticsearch connection (optional).
         * @returns The global Elasticsearch connection.
         * @throws An error if the global Elasticsearch connection is undefined.
         */
        static getGlobalElasticsearchConnection(key = _FirestoreOrmRepository.DEFAULT_KEY_NAME) {
          if (this.elasticSearchConnections[key]) {
            return this.elasticSearchConnections[key];
          } else {
            throw new Error("The global Elasticsearch " + key + " is undefined!");
          }
        }
        /**
         * Retrieves the global Firestore connection.
         * @param key - The key to identify the global Firestore connection (optional).
         * @returns The global Firestore connection.
         * @throws An error if the global Firestore connection is undefined.
         */
        static getGlobalConnection(key = _FirestoreOrmRepository.DEFAULT_KEY_NAME) {
          if (this.globalFirestores[key]) {
            return this.globalFirestores[key];
          } else {
            throw new Error("The global Firestore " + key + " is undefined!");
          }
        }
        /**
         * Waits for the global Firestore connection to be ready.
         * @param key - The key to identify the global Firestore connection (optional).
         * @returns A promise that resolves to the global Firestore connection.
         */
        static waitForGlobalConnection(key = _FirestoreOrmRepository.DEFAULT_KEY_NAME) {
          if (this.readyPromises[key]) {
            return this.readyPromises[key];
          }
          if (this.globalFirestores[key]) {
            return Promise.resolve(this.globalFirestores[key]);
          }
          return new Promise((resolve) => {
            this.globalWait[key] = resolve;
          });
        }
        /**
         * Returns a promise that resolves when the global connection is ready.
         * This method provides a clean way to ensure initialization is complete.
         * @param key - The key to identify the global connection (optional).
         * @returns A promise that resolves when the connection is ready.
         */
        static ready(key = _FirestoreOrmRepository.DEFAULT_KEY_NAME) {
          return this.waitForGlobalConnection(key);
        }
        /**
         * Initializes a global path for Firestore ORM.
         * @param pathIdKey - The key to identify the global path.
         * @param pathIdValue - The value of the global path.
         */
        static initGlobalPath(pathIdKey, pathIdValue) {
          this.globalPaths[pathIdKey] = pathIdValue;
        }
        /**
         * Retrieves the global path by its key.
         * @param pathIdKey - The key of the global path.
         * @returns The value of the global path, or null if it is not defined.
         */
        static getGlobalPath(pathIdKey) {
          if (this.globalPaths[pathIdKey] && this.globalPaths[pathIdKey].trim() !== "") {
            return this.globalPaths[pathIdKey];
          } else {
            return null;
          }
        }
        /**
         * Sets the global configuration for the ORM.
         * @param config - The global configuration options.
         */
        static setGlobalConfig(config) {
          this.globalConfig = Object.assign(Object.assign({}, this.globalConfig), config);
        }
        /**
         * Gets the current global configuration.
         * @returns The current global configuration.
         */
        static getGlobalConfig() {
          return Object.assign({}, this.globalConfig);
        }
        /**
         * Registers a path_id and validates it's unique globally.
         * @param pathId - The path_id to register.
         * @param modelName - The name of the model for error reporting.
         * @throws An error if the path_id is already in use.
         */
        static registerPathId(pathId, modelName) {
          if (this.usedPathIds.has(pathId)) {
            throw new Error(`Path ID '${pathId}' is already in use by another model. Each model must have a unique path_id. Model '${modelName}' cannot use this path_id.`);
          }
          this.usedPathIds.add(pathId);
        }
        /**
         * Clears all registered path_ids. Useful for testing.
         */
        static clearRegisteredPathIds() {
          this.usedPathIds.clear();
        }
        /**
         * Ensures the repository setup is complete before using Firebase functions.
         * @returns A promise that resolves when setup is complete.
         */
        async ensureSetupComplete() {
          if (this.setupPromise) {
            await this.setupPromise;
          }
        }
        /**
         * Retrieves the collection or document reference based on the model object (synchronous version).
         * This method will throw an error if the setup is not complete.
         * Use getCollectionReferenceByModelAsync for proper async handling.
         * @param object - The model object.
         * @param isDoc - Indicates whether the reference should be a document reference (optional, default: false).
         * @param customId - The custom ID for the document reference (optional).
         * @returns The collection or document reference, or null if the path cannot be determined.
         */
        getCollectionReferenceByModel(object, isDoc = false, customId) {
          var _a;
          if (typeof collection !== "function") {
            throw new Error("Firebase functions not initialized. Repository setup is not complete. Use async methods or ensure initGlobalConnection is awaited.");
          }
          var current = this.firestore;
          var pathList = object.getPathList();
          const id = customId !== null && customId !== void 0 ? customId : object.getId();
          if (!pathList || pathList.length < 1) {
            console.error("Can't get collection path - ", object);
            return null;
          }
          for (var i = 0; i < pathList.length; i++) {
            var stage = pathList[i];
            if (!stage.value) {
              continue;
            }
            if (stage.type == "collection") {
              current = collection(current, stage.value);
              if (isDoc && i + 1 == pathList.length) {
                const id2 = (_a = customId !== null && customId !== void 0 ? customId : object.id) !== null && _a !== void 0 ? _a : null;
                if (id2) {
                  current = doc(current, id2);
                } else {
                  current = doc(current);
                }
              }
            } else if (stage.type == "document") {
              current = doc(current, stage.value);
            }
          }
          return current;
        }
        /**
         * Retrieves the collection or document reference based on the model object (async version).
         * @param object - The model object.
         * @param isDoc - Indicates whether the reference should be a document reference (optional, default: false).
         * @param customId - The custom ID for the document reference (optional).
         * @returns The collection or document reference, or null if the path cannot be determined.
         */
        async getCollectionReferenceByModelAsync(object, isDoc = false, customId) {
          await this.ensureSetupComplete();
          return this.getCollectionReferenceByModel(object, isDoc, customId);
        }
        /**
         * Retrieves the document reference based on the model object (synchronous version).
         * @param object - The model object.
         * @param customId - The custom ID for the document reference (optional).
         * @returns The document reference, or null if the path cannot be determined.
         */
        getDocReferenceByModel(object, customId) {
          return this.getCollectionReferenceByModel(object, true, customId);
        }
        /**
         * Retrieves the document reference based on the model object (async version).
         * @param object - The model object.
         * @param customId - The custom ID for the document reference (optional).
         * @returns The document reference, or null if the path cannot be determined.
         */
        async getDocReferenceByModelAsync(object, customId) {
          return await this.getCollectionReferenceByModelAsync(object, true, customId);
        }
        /**
         * Retrieves the Firestore instance.
         * @returns The Firestore instance.
         */
        getFirestore() {
          return this.firestore;
        }
        /**
         * Retrieves the model object based on the model class.
         * @param model - The model class.
         * @returns The model object.
         */
        getModel(model) {
          var m = model;
          var object = new m();
          object.setRepository(this);
          object.setModelType(model);
          object.currentModel = object;
          return object;
        }
        /**
         * Loads a model object by its ID.
         * @param object - The model class.
         * @param id - The ID of the model object.
         * @param params - The path parameters (optional).
         * @returns A promise that resolves to the model object.
         */
        async load(object, id, params = {}) {
          await this.ensureSetupComplete();
          if (typeof getDocs2 !== "function" || typeof query2 !== "function" || typeof where2 !== "function" || typeof documentId !== "function") {
            throw new Error("Firebase query functions not initialized. Repository setup is not complete. Ensure initGlobalConnection is awaited.");
          }
          for (let key in params) {
            let value = params[key];
            object[key] = value;
          }
          var ref3 = await this.getCollectionReferenceByModelAsync(object);
          if (!ref3) {
            console.error("Can't load the model " + object.getReferencePath() + " , please set all values");
            return object;
          } else {
            if (!id) {
              console.error("Can't load the model " + object.getReferencePath() + " , please set id");
            } else {
              const docsRef = await getDocs2(query2(ref3, where2(documentId(), "==", id)));
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
        }
        /**
         * Saves the model object.
         * @param model - The model object.
         * @param customId - The custom ID for the document reference (optional).
         * @returns A promise that resolves to the saved model object.
         */
        async save(model, customId) {
          var _a;
          await this.ensureSetupComplete();
          if (typeof updateDoc !== "function" || typeof setDoc !== "function") {
            throw new Error("Firebase update/set functions not initialized. Repository setup is not complete. Ensure initGlobalConnection is awaited.");
          }
          var object = model;
          var ref3 = await this.getDocReferenceByModelAsync(object, (_a = object.getId()) !== null && _a !== void 0 ? _a : customId);
          if (!ref3) {
            console.error("Can't save the model " + object.getReferencePath() + " , please set all values");
            return false;
          }
          if (object.getId()) {
            updateDoc(ref3, object.getDocumentData());
          } else {
            try {
              setDoc(ref3, object.getDocumentData());
              object.setId(ref3.id);
            } catch (error) {
              console.error("Error adding document: ", error);
            }
          }
          return object;
        }
        /**
         * Executes an Elasticsearch SQL query.
         * @param this - The model class.
         * @param sql - The SQL query (optional).
         * @param limit - The maximum number of results to retrieve (optional).
         * @param filters - The filters to apply to the query (optional).
         * @param cursor - The cursor for pagination (optional).
         * @param columns - The columns to retrieve (optional).
         * @returns A promise that resolves to the Elasticsearch SQL response.
         */
        static async elasticSql(sql, limit2, filters, cursor, columns) {
          var object = new this();
          object.setModelType(this);
          var result = {
            data: []
          };
          try {
            var connection = _FirestoreOrmRepository.getGlobalElasticsearchConnection();
          } catch (error) {
            console.error(error);
            return result;
          }
          if (!connection || !connection.url) {
            console.error("Elasticsearch is not defined!");
            return result;
          }
          var params = {};
          if (sql) {
            params["query"] = sql;
          }
          if (limit2) {
            params["fetch_size"] = limit2;
          }
          if (filters) {
            params["filter"] = filters;
          }
          if (cursor) {
            params["cursor"] = cursor;
          }
          try {
            var response = await axios2({
              method: "POST",
              headers: { "content-type": "application/x-www-form-urlencoded" },
              data: qs2.stringify(params),
              url: connection.url + "/_sql"
            });
            var data = response.data;
            columns = columns ? columns : response.data.columns;
            var rows = response.data.rows;
            rows.forEach((row) => {
              var newObject = {};
              columns.forEach((column, index) => {
                newObject[column.name] = row[index];
              });
              result.data.push(newObject);
            });
            if (response.data.cursor) {
              result.next = async () => {
                return await this.elasticSql(null, null, null, response.data.cursor, columns);
              };
            }
          } catch (error) {
            console.error(error);
          }
          return result;
        }
      };
      FirestoreOrmRepository.globalFirestores = {};
      FirestoreOrmRepository.globalWait = {};
      FirestoreOrmRepository.globalPaths = {};
      FirestoreOrmRepository.documentsRequiredFields = {};
      FirestoreOrmRepository.DEFAULT_KEY_NAME = "default";
      FirestoreOrmRepository.ormFieldsStructure = {};
      FirestoreOrmRepository.elasticSearchConnections = {};
      FirestoreOrmRepository.globalFirebaseStoages = {};
      FirestoreOrmRepository.isReady = false;
      FirestoreOrmRepository.readyPromises = {};
      FirestoreOrmRepository.globalConfig = {
        auto_lower_case_field_name: false,
        auto_path_id: false
      };
      FirestoreOrmRepository.usedPathIds = /* @__PURE__ */ new Set();
    }
  });

  // dist/esm/index.js
  init_repository();
  init_query();
  init_base_model();
  init_model();
  init_field();
  init_relationships();
  init_model_interface();
  init_current_model_interface();
  init_field_options_interface();
  init_model_alllist_options_interface();
  init_model_options_interface();
  init_relationship_options_interface();
  init_observe_load_model_interface();
  init_observe_remove_model_interface();
  init_observe_save_model_interface();
  init_global_config_interface();
  init_case_conversion();

  // .tmp-test/test-bundle.js
  console.log("FirestoreOrmRepository:", typeof FirestoreOrmRepository);
})();
/*! Bundled license information:

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/component/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/logger/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/storage/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

atob/browser-atob.js:
  (*!! Deliberately using an API that's deprecated in node.js because *)
  (*!! this file is for browsers and we expect them to cope with it. *)
  (*!! Discussion: github.com/node-browser-compat/atob/pull/9 *)
*/

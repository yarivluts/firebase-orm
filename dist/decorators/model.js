"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var firesql_1 = require("firesql");
var query_1 = require("../query");
require("firesql/rx");
function Model(options) {
    return function (constructor) {
        var _a;
        return _a = /** @class */ (function (_super) {
                __extends(class_1, _super);
                function class_1() {
                    var _this = _super !== null && _super.apply(this, arguments) || this;
                    _this.referencePath = options.reference_path;
                    _this.pathId = options.path_id;
                    _this.documentData = {};
                    return _this;
                }
                class_1.prototype.getId = function () {
                    return this.id;
                };
                class_1.prototype.getPathId = function () {
                    return this.pathId;
                };
                class_1.prototype.getOneRel = function (model) {
                    return __awaiter(this, void 0, void 0, function () {
                        var object;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    object = this.getModel(model);
                                    return [4 /*yield*/, object.load(this[object.getPathId()])];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        });
                    });
                };
                class_1.prototype.getManyRel = function (model) {
                    return __awaiter(this, void 0, void 0, function () {
                        var object;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    object = this.getModel(model);
                                    return [4 /*yield*/, object.where(object.getPathId(), '==', this[object.getPathId()]).get()];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        });
                    });
                };
                class_1.prototype.getModel = function (model) {
                    var object = this.getRepository().getModel(this.getModelType());
                    var keys = object.getPathListKeys();
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        if (this[key]) {
                            object[key] = this[key];
                        }
                    }
                    return object;
                };
                class_1.prototype.getReference = function () {
                    return this.getRepository().getReferenceByModel(this);
                };
                class_1.prototype.setModelType = function (model) {
                    this.modelType = model;
                    return this;
                };
                class_1.prototype.getModelType = function () {
                    return this.modelType;
                };
                class_1.prototype.where = function (fieldPath, opStr, value) {
                    var that = this;
                    var query = this.getQuery().where(fieldPath, opStr, value);
                    return query;
                };
                class_1.prototype.getOne = function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var that;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!this.currentQuery) {
                                        that = this;
                                        this.currentQuery = this.getRepository().getReferenceByModel(that);
                                    }
                                    return [4 /*yield*/, this.currentQuery.get()];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        });
                    });
                };
                class_1.prototype.setId = function (id) {
                    this.id = id;
                    return this;
                };
                class_1.prototype.load = function (id, params) {
                    if (params === void 0) { params = {}; }
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    this.setId(id);
                                    if (!this.getRepository()) return [3 /*break*/, 2];
                                    return [4 /*yield*/, this.getRepository().load(this, id, params)];
                                case 1: return [2 /*return*/, _a.sent()];
                                case 2:
                                    console.error("No repository!");
                                    _a.label = 3;
                                case 3: return [2 /*return*/, null];
                            }
                        });
                    });
                };
                class_1.prototype.getQuery = function () {
                    var that = this;
                    return new query_1.Query(that);
                };
                class_1.prototype.getAll = function (whereArr, orderBy, limit, params) {
                    return [this];
                };
                class_1.prototype.getRepository = function () {
                    return this.repository;
                };
                class_1.prototype.setRepository = function (repository) {
                    this.repository = repository;
                    return this;
                };
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
                class_1.prototype.on = function (callback) {
                    var _this = this;
                    var that = this;
                    if (!this.getId()) {
                        console.error("The model not stored yet");
                    }
                    else {
                        var doc = this.getReference()
                            .doc(this.getId())
                            .onSnapshot(function (documentSnapshot) {
                            var data = documentSnapshot.data();
                            for (var key in data) {
                                var value = data[key];
                                _this[key] = value;
                            }
                            callback(_this);
                        });
                    }
                };
                class_1.prototype.sql = function (sql, asObject, isInsideQuery) {
                    if (asObject === void 0) { asObject = false; }
                    if (isInsideQuery === void 0) { isInsideQuery = false; }
                    return __awaiter(this, void 0, void 0, function () {
                        var result, ref, fireSQL, sqlResult, i, data, error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    result = [];
                                    if (isInsideQuery && !this.getId()) {
                                        console.log("Can't search inside a model without id!");
                                        return [2 /*return*/, result];
                                    }
                                    ref = !isInsideQuery
                                        ? this.getReference().parent
                                        : this.getReference().doc(this.getId());
                                    fireSQL = new firesql_1.FireSQL(ref, { includeId: "id" });
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, fireSQL.query(sql)];
                                case 2:
                                    sqlResult = _a.sent();
                                    for (i = 0; i < sqlResult.length; i++) {
                                        data = sqlResult[i];
                                        if (asObject) {
                                            result.push(this.createFromData(data));
                                        }
                                        else {
                                            result.push(data);
                                        }
                                    }
                                    return [2 /*return*/, result];
                                case 3:
                                    error_1 = _a.sent();
                                    console.log("SQL GENERAL ERROR - ", error_1);
                                    return [2 /*return*/, result];
                                case 4: return [2 /*return*/];
                            }
                        });
                    });
                };
                class_1.prototype.onSql = function (sql, callback, asObject, isInsideQuery) {
                    var _this = this;
                    if (asObject === void 0) { asObject = false; }
                    if (isInsideQuery === void 0) { isInsideQuery = false; }
                    var result = [];
                    if (isInsideQuery && !this.getId()) {
                        console.log("Can't search inside a model without id!");
                    }
                    else {
                        var ref = !isInsideQuery
                            ? this.getReference().parent
                            : this.getReference().doc(this.getId());
                        var fireSQL = new firesql_1.FireSQL(ref, { includeId: "id" });
                        try {
                            var res = fireSQL.rxQuery(sql);
                            res.subscribe(function (sqlResult) {
                                for (var i = 0; i < sqlResult.length; i++) {
                                    var data = sqlResult[i];
                                    if (asObject) {
                                        result.push(_this.createFromData(data));
                                    }
                                    else {
                                        result.push(data);
                                    }
                                }
                                callback(result);
                            });
                        }
                        catch (error) {
                            console.log("SQL GENERAL ERROR - ", error);
                        }
                    }
                };
                class_1.prototype.createFromDoc = function (doc) {
                    var object = this.getModel(this.getModelType());
                    var data = doc.data();
                    var pathParams = this.getPathListParams();
                    for (var key in pathParams) {
                        var value = pathParams[key];
                        object[key] = value;
                    }
                    for (var key in data) {
                        var value = data[key];
                        object[key] = value;
                    }
                    return object;
                };
                class_1.prototype.createFromData = function (data) {
                    var object = this.getModel(this.getModelType());
                    var pathParams = this.getPathListParams();
                    for (var key in pathParams) {
                        var value = pathParams[key];
                        object[key] = value;
                    }
                    for (var key in data) {
                        var value = data[key];
                        object[key] = value;
                    }
                    return object;
                };
                class_1.prototype.initFromDoc = function (doc) {
                    var data = doc.data();
                    for (var key in data) {
                        var value = data[key];
                        this[key] = value;
                    }
                    return this;
                };
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
                class_1.prototype.onList = function (callback) {
                    var that = this;
                    this.getQuery().on(callback);
                };
                class_1.prototype.save = function () {
                    return __awaiter(this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            if (!this.verifyRequiredFields()) {
                                return [2 /*return*/, this];
                            }
                            if (this.getRepository()) {
                                this.getRepository().save(this);
                            }
                            else {
                                console.error("No repository!");
                            }
                            return [2 /*return*/, this];
                        });
                    });
                };
                class_1.prototype.getReferencePath = function () {
                    return this.referencePath;
                };
                class_1.prototype.getRequiredFields = function () {
                    return this.getModelType().requiredFields;
                };
                class_1.prototype.verifyRequiredFields = function () {
                    var fields = this.getRequiredFields();
                    var result = true;
                    for (var i = 0; fields.length > i; i++) {
                        if (this[fields[i]] == null || typeof this[fields[i]] == undefined) {
                            result = false;
                            console.error("Can't save " + fields[i] + " with null!");
                        }
                    }
                    return result;
                };
                class_1.prototype.getDocumentData = function () {
                    return this.documentData;
                };
                class_1.prototype.getPathList = function () {
                    var that = this;
                    var result = [];
                    var path = this.getReferencePath();
                    var newTxt = path.split("/");
                    for (var x = 0; x < newTxt.length; x++) {
                        var subPath = newTxt[x];
                        if (subPath.search(":") != -1) {
                            subPath = subPath.replace(":", "");
                            if (!that[subPath]) {
                                console.error(subPath + " is missing!");
                                return false;
                            }
                            else {
                                result.push({
                                    type: "document",
                                    value: that[subPath]
                                });
                            }
                        }
                        else {
                            result.push({
                                type: "collection",
                                value: subPath
                            });
                        }
                    }
                    return result;
                };
                class_1.prototype.getPathListParams = function () {
                    var that = this;
                    var result = {};
                    var keys = this.getPathListKeys();
                    for (var i = 0; i < keys.length; i++) {
                        var subPath = keys[i];
                        if (!that[subPath]) {
                            console.error(subPath + " is missing!");
                            return false;
                        }
                        else {
                            result[subPath] = that[subPath];
                        }
                    }
                    return result;
                };
                class_1.prototype.getPathListKeys = function () {
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
                };
                return class_1;
            }(constructor)),
            _a.requiredFields = [],
            _a;
    };
}
exports.Model = Model;
//# sourceMappingURL=model.js.map
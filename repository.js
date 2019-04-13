"use strict";
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
exports.__esModule = true;
var firesql_1 = require("firesql");
require("firesql/rx");
var FirestoreOrmRepository = /** @class */ (function () {
    function FirestoreOrmRepository(firestore) {
        this.firestore = firestore;
    }
    FirestoreOrmRepository.prototype.getReferenceByModel = function (object) {
        var current = this.firestore;
        var pathList = object.getPathList();
        console.log('pathList ************* ', pathList);
        if (!pathList || pathList.length < 1) {
            return false;
        }
        for (var i = 0; i < pathList.length; i++) {
            var stage = pathList[i];
            if (stage.type == 'collection') {
                current = current.collection(stage.value);
            }
            else if (stage.type == 'document') {
                current = current.doc(stage.value);
            }
        }
        return current;
    };
    FirestoreOrmRepository.prototype.getModel = function (model) {
        var m = model;
        var object = new m();
        object.setRepository(this);
        object.setModelType(model);
        return object;
    };
    FirestoreOrmRepository.prototype.sql = function (sql) {
        return __awaiter(this, void 0, void 0, function () {
            var fireSQL, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fireSQL = new firesql_1.FireSQL(this.firestore);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fireSQL.query(sql, { includeId: 'id' })];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_1 = _a.sent();
                        console.log('SQL GENERAL ERROR - ', error_1);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Listen to sql query result
     * @param sql - sql query
     * @param callback - running callback
     */
    FirestoreOrmRepository.prototype.onSql = function (sql, callback) {
        var fireSQL = new firesql_1.FireSQL(this.firestore);
        try {
            var res = fireSQL.rxQuery(sql, { includeId: 'id' });
            res.subscribe(function (results) {
                callback(results);
            });
        }
        catch (error) {
            console.log('SQL GENERAL ERROR - ', error);
        }
    };
    /**
     * Load model object by id
     * @param object - class
     * @param id -string id
     * @param params - path params
     * @return model object
     */
    FirestoreOrmRepository.prototype.load = function (object, id, params) {
        if (params === void 0) { params = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var key, value, ref, doc, key, value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        for (key in params) {
                            value = params[key];
                            object[key] = value;
                        }
                        ref = this.getReferenceByModel(object);
                        if (!!ref) return [3 /*break*/, 1];
                        console.error("Can't load the model, please set all values");
                        return [2 /*return*/, null];
                    case 1:
                        if (!!id) return [3 /*break*/, 2];
                        console.error("Can't load the model, please set id");
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, ref.doc(id).get()];
                    case 3:
                        doc = _a.sent();
                        if (!doc.exists) {
                            console.log(doc.exists, doc.data());
                            return [2 /*return*/, null];
                        }
                        else {
                            console.log(doc.exists, doc.data());
                            for (key in doc.data()) {
                                value = doc.data()[key];
                                object[key] = value;
                            }
                            return [2 /*return*/, object];
                        }
                        _a.label = 4;
                    case 4: return [2 /*return*/, object];
                }
            });
        });
    };
    /**
     * Save the model object
     * @param model
     */
    FirestoreOrmRepository.prototype.save = function (model) {
        return __awaiter(this, void 0, void 0, function () {
            var object, ref, docRef, docRef, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        object = model;
                        ref = this.getReferenceByModel(object);
                        if (!ref) {
                            console.error("Can't save the model, please set all values");
                            return [2 /*return*/, false];
                        }
                        if (!object.getId()) return [3 /*break*/, 2];
                        return [4 /*yield*/, ref.doc(object.getId()).set(object.getDocumentData())];
                    case 1:
                        docRef = _a.sent();
                        return [3 /*break*/, 5];
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, ref.add(object.getDocumentData())];
                    case 3:
                        docRef = _a.sent();
                        object.setId(docRef.id);
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _a.sent();
                        console.error("Error adding document: ", error_2);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/, object];
                }
            });
        });
    };
    FirestoreOrmRepository.documentsRequiredFields = {};
    return FirestoreOrmRepository;
}());
exports.FirestoreOrmRepository = FirestoreOrmRepository;

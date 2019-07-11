import { ModelInterface } from "../interfaces/model.interface";
import { ModelOptions } from "../interfaces/model.options.interface";
import { FirestoreOrmRepository } from "../repository";
import * as firebase from "firebase/app";
import 'firebase/firestore';
import { FireSQL } from "@arbel/firesql";
import { Query, LIST_EVENTS } from "../query";
import { Moment } from "moment";
import { FieldOptions } from "../interfaces/field.options.interface";
import { ObserveLoadModelInterface } from "../interfaces/observe.load.model.interface";
import { ObserveRemoveModelInterface } from "../interfaces/observe.remove.model.interface";
import { ObserveSaveModelInterface } from "../interfaces/observe.save.model.interface";

import * as moment_ from "moment";

const moment = moment_;

import { ModelAllListOptions } from "../interfaces/model.alllist.options.interface";
import { BaseModel } from "../base.model";

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      var t : any = Object.getOwnPropertyDescriptor(baseCtor.prototype, name);
      Object.defineProperty(derivedCtor.prototype, name, t);
    });
  });
}

export function Model(options: ModelOptions) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {

    if(Object.getPrototypeOf(constructor) !== BaseModel){
      applyMixins(constructor, [BaseModel]);
    }
    

    Object.defineProperty(constructor.prototype, 'referencePath', {
      get: function () {
        return this._referencePath ? this._referencePath : options.reference_path;
      },
      set: function (value) {
        this._referencePath = value;
      }
    });

    Object.defineProperty(constructor.prototype, 'isAutoTime', {
      get: function () {
        return typeof options.auto_time === "undefined" ? true : options.auto_time;
      },
      set: function (value) {

      }
    });

    Object.defineProperty(constructor.prototype, 'pathId', {
      get: function () {
        return options.path_id;
      },
      set: function (value) {

      }
    });


    return constructor;
  }
}

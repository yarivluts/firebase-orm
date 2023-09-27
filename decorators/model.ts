import { ModelOptions } from "../interfaces/model.options.interface";
import 'firebase/firestore';

import * as moment_ from "moment";

const moment = moment_;

import { ModelAllListOptions } from "../interfaces/model.alllist.options.interface";
import { BaseModel } from "../base.model";

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      var t: any = Object.getOwnPropertyDescriptor(baseCtor.prototype, name);
      Object.defineProperty(derivedCtor.prototype, name, t);
    });
  });
}

export function Model(options: ModelOptions): any {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    if (Object.getPrototypeOf(constructor) !== BaseModel) {
      applyMixins(constructor, [BaseModel]);
    }

    return class extends constructor {
      get referencePath() {

        return (this as any)._referencePath ? (this as any)._referencePath : options.reference_path;
      }
      get pathId() {
        return options.path_id;
      }
      get isAutoTime() {
        return typeof options.auto_time === "undefined" ? true : options.auto_time;
      }
      get hello() {
        return "world";
      }
      getId() {

        return options.static_id ? options.static_id : (this as any).id;
      }

      set referencePath(val) {

        (this as any)._referencePath = val;
      }
    };
    //return constructor;
  }
}

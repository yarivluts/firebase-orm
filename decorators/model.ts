import { ModelOptions } from "../interfaces/model.options.interface";
import { FirestoreOrmRepository } from "../repository";
import { classNameToPathId } from "../utils/case-conversion";

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

    // Get global configuration
    const globalConfig = FirestoreOrmRepository.getGlobalConfig();
    
    // Determine path_id to use
    let pathId: string;
    if (options.path_id) {
      // User explicitly provided path_id - use it
      pathId = options.path_id;
    } else if (globalConfig.auto_path_id) {
      // Auto generate path_id from class name
      pathId = classNameToPathId(constructor.name);
    } else {
      // No path_id provided and auto_path_id is not enabled - throw error
      throw new Error(`Model '${constructor.name}' must have a path_id defined in @Model decorator or enable auto_path_id in global configuration`);
    }

    return class extends constructor {
      get referencePath() {

        return (this as any)._referencePath ? (this as any)._referencePath : options.reference_path;
      }
      get pathId() {
        return pathId;
      }
      set pathId(value: string) {

      }
      get isAutoTime() {
        return typeof options.auto_time === "undefined" ? true : options.auto_time;
      }
      set isAutoTime(value: boolean) {

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

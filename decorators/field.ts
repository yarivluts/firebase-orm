import { FieldOptions } from "../interfaces/field.options.interface"; 
import * as firebase from "firebase/app";

export function Field(options?: FieldOptions): any {
  return (target: any, key: string) => {
    let val: any;
    if (!target.requiredFields) {
      target.requiredFields = new Array();
    }
    
    if (!target.aliasFieldsMapper) {
      target.aliasFieldsMapper = {};
    }
    
    if (!target.fields) {
      target.fields = {};
    }
    if(options && options.field_name){
      target.aliasFieldsMapper[options.field_name] = key;
    }
    
    target.fields[key] = options;

    if (options && options.is_required) {
      target.requiredFields.push(key);
    }
    var field_name =
    options && options.field_name ? options.field_name : key;

    if (!target.storedFields) {
      target.storedFields = [];
    }
    target.storedFields.push(field_name);


      var update = Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
      /*  writable: true, */
        set : function (value){
            this['_'+key] = value;
        },
        get : function () {
            return this['_'+key];
        },  
    });
     // If the update failed, something went wrong
     if (!update) {
     //Kill everything
      throw new Error("Unable to update property");
     }

  return target;
  };
}

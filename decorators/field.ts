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

     // Store the definition result
     const update = Object.defineProperty(
      target,
      key,
      {
          configurable: true,
          enumerable: true,
          set: function(value: any) {
            var that : any = this;
            let field_name =
              options && options.field_name ? options.field_name : key;
            val = value;
            that.documentData[field_name] = value;
          },
          get: function() {
            let field_name =
            options && options.field_name ? options.field_name : key;
            var value = this.documentData[field_name] ? this.documentData[field_name] : 
            (options && options.default_value ? options.default_value : null);

            if(value instanceof firebase.firestore.DocumentReference && options.init_as_object){
              var className:any = options.init_as_object;
              var object = className.createFromDocRef(value);
              //console.log(typeof this.documentData[field_name],field_name + ' value instanceof DocumentReference = ',object);
              return object;
            }
            return value;
          }
      },
  );
  // If the update failed, something went wrong
  if (!update) {
      // Kill everything
      throw new Error("Unable to update property");
  }
  return target;
  };
}

import { FieldOptions } from "../interfaces/field.options.interface"; 

export function Field(options?: FieldOptions): any {
  return (target: any, key: string) => {
    let val: any;
    if (!target.requiredFields) {
      target.requiredFields = new Array();
    }

    if (options && options.is_required) {
      target.requiredFields.push(key);
    }

    return {
      set: function(value: any) {
        var that : any = this;
        let field_name =
          options && options.field_name ? options.field_name : key;
        val = value;
        that.documentData[field_name] = value;
      },
      get: function() {
        return val;
      }
    };
  };
}

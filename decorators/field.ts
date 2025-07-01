import { FieldOptions } from "../interfaces/field.options.interface";

export function Field(options?: FieldOptions): any {
  return (target: any, key: string) => {
    let val: any;
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
    if (options && options.field_name) {
      target.aliasFieldsMapper[key] = options.field_name;
    }

    if (options && options.field_name) {
      target.reverseAliasFieldsMapper[options.field_name] = key;
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

    if (options && options.is_text_indexing) {
      target.textIndexingFields[key] = key;
      target['storedFields'].push('text_index_' + field_name);
    }

    var update = Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      /*  writable: true, */
      set: function (value) {
        this['data'][this.getFieldName(key)] = value;
        if (this.textIndexingFields[key]) {
          this['data']['text_index_' + this.getFieldName(key)] = this.parseTextIndexingFields(value + '');
        }
      },
      get: function () {
        return typeof this['data'][this.getFieldName(key)] === 'undefined' ? undefined : this['data'][this.getFieldName(key)];
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

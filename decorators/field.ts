import { FieldOptions } from "../interfaces/field.options.interface";
import { FirestoreOrmRepository } from "../repository";
import { toSnakeCase } from "../utils/case-conversion";

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

    // Determine the field name to use
    let fieldName: string;
    if (options && options.field_name) {
      // User explicitly provided field_name - use it as-is
      fieldName = options.field_name;
    } else {
      // Check global config for auto lower case conversion
      const globalConfig = FirestoreOrmRepository.getGlobalConfig();
      if (globalConfig.auto_lower_case_field_name) {
        fieldName = toSnakeCase(key);
      } else {
        fieldName = key;
      }
    }

    // Set up field name mapping if different from property name
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
      target['storedFields'].push('text_index_' + fieldName);
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

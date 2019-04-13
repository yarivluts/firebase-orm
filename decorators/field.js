"use strict";
exports.__esModule = true;
function Field(options) {
    return function (target, key) {
        var val;
        if (!target.requiredFields) {
            target.requiredFields = new Array();
        }
        if (options && options.is_required) {
            target.requiredFields.push(key);
        }
        return {
            set: function (value) {
                var field_name = options && options.field_name ? options.field_name : key;
                val = value;
                this.documentData[field_name] = value;
            },
            get: function () {
                return val;
            }
        };
    };
}
exports.Field = Field;

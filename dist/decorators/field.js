"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
                var that = this;
                var field_name = options && options.field_name ? options.field_name : key;
                val = value;
                that.documentData[field_name] = value;
            },
            get: function () {
                return val;
            }
        };
    };
}
exports.Field = Field;
//# sourceMappingURL=field.js.map
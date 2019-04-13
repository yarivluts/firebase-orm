interface FieldOptions {
    /**
     * Field name alias
     */
    field_name?: string;
    /**
     * If the field is required
     */
    is_required?: boolean;
}
export declare function Field(options?: FieldOptions): any;
export {};

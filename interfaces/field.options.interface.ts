import { BaseModel } from "../base.model";
import { ModelInterface } from "./model.interface";

export interface FieldOptions {
  /**
   * Field name alias
   */
  field_name?: string;
  /**
   * Field default value
   */
  default_value?: any;
  /**
   * If the field is required
   */
  is_required?: boolean;

  /**
   * Init as object
   */
  init_as_object?: Object;
}
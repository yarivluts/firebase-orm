import { BaseModel } from "../base.model";
import { ModelInterface } from "./model.interface";

export interface FieldOptions {
  /**
   * Field name alias
   */
  field_name?: string;
  /**
   * If the field is required
   */
  is_required?: boolean;

  /**
   * If the field need to be search in LIKE operator
   */
  is_text_indexing?: boolean;

  /**
   * If the field is file - if so then it use firebase storage
   */
  is_file?: boolean;

  /** 
   * Init as object
   */
  init_as_object?: Object;
}
/**
 * Global configuration options for Firebase ORM
 */
export interface GlobalConfig {
  /**
   * Automatically convert field names to lower case snake_case format
   * e.g., cartItem becomes cart_item
   * If explicit field_name is provided, this option is ignored for that field
   */
  auto_lower_case_field_name?: boolean;

  /**
   * Automatically generate path_id from class name when not explicitly provided
   * Uses the class name in snake_case format as the path_id
   */
  auto_path_id?: boolean;

  /**
   * Throw an exception when a required field is null during save
   * When enabled, attempting to save a model with null required fields will throw an error
   * When disabled (default), a console error is logged and save returns the model unchanged
   */
  throw_on_required_field_null?: boolean;
}
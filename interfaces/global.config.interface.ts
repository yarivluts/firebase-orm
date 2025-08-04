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
}
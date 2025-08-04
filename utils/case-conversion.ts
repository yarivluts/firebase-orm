/**
 * Utility functions for string case conversions
 */

/**
 * Converts camelCase or PascalCase to snake_case
 * @param str - The string to convert
 * @returns The string in snake_case format
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, ''); // Remove leading underscore if present
}

/**
 * Converts PascalCase class name to snake_case for use as path_id
 * @param className - The class name to convert
 * @returns The class name in snake_case format with _id suffix
 */
export function classNameToPathId(className: string): string {
  const snakeCase = toSnakeCase(className);
  return snakeCase.endsWith('_id') ? snakeCase : `${snakeCase}_id`;
}
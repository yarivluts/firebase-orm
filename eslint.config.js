const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '*.js']
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      ...tseslint.configs.recommended
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        ecmaVersion: 2020,
        sourceType: 'module'
      }
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'quotes': 'off', // Too many changes needed
      'max-len': 'off', // Too many changes needed  
      'no-var': 'off', // Legacy code, too many changes
      'prefer-const': 'off', // Legacy code
      '@typescript-eslint/ban-ts-comment': 'off', // Legacy code
      '@typescript-eslint/no-this-alias': 'off', // Legacy code
      '@typescript-eslint/no-unused-vars': 'off', // Too many test-related false positives
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off', // Legacy code using Object/Number types
      '@typescript-eslint/no-array-constructor': 'off', // Legacy code
      '@typescript-eslint/no-empty-object-type': 'off', // Legacy interfaces
      '@typescript-eslint/no-require-imports': 'off' // Test files may use require
    }
  }
);
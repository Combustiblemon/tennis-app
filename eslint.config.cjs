const importPlugin = require('eslint-plugin-import');
const jestPlugin = require('eslint-plugin-jest');
const prettierPlugin = require('eslint-plugin-prettier');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const sortDestructureKeys = require('eslint-plugin-sort-destructure-keys');
const nx = require('@nx/eslint-plugin');

module.exports = [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    plugins: {
      import: importPlugin,
      jest: jestPlugin,
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSort,
      'sort-destructure-keys': sortDestructureKeys,
    },
    rules: {
      'import/extensions': 'off',
      'jest/no-identical-title': 'error',
      'no-console': 'warn',
      'no-prototype-builtins': 'off',
      'no-underscore-dangle': ['error', { allow: ['_id'] }],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', next: 'if', prev: '*' },
      ],
      'prefer-destructuring': 'off',
      'prettier/prettier': 'error',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
      'sort-destructure-keys/sort-destructure-keys': [
        1,
        { caseSensitive: false },
      ],
    },
  },
];

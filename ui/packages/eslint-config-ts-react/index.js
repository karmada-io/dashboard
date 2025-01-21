/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/** @type {import('eslint').Linter.BaseConfig} **/
module.exports = {
  ...require('@karmada/eslint-config-ts'),
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: [
        '@typescript-eslint',
        'react',
        'react-hooks',
        //'jest',
        'log-filenames',
        'prettier',
      ],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        //'plugin:jest/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'prettier',
      ],
      rules: {
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-namespace': 'off',
        //'@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/ban-types': [
          'error',
          {
            extendDefaults: true,
            types: {
              '{}': false,
            },
          },
        ],
        'react-internal/no-production-logging': 'off',
        'react/display-name': 'off',
        'react/react-in-jsx-scope': 'off',
        '@next/next/no-img-element': 'off',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['packages/*/tsconfig.json', 'apps/*/tsconfig.json'],
      },
      settings: {
        react: {
          version: 'detect', // Tells eslint-plugin-react to automatically detect the version of React to use
        },
      },
    },
  ],
};

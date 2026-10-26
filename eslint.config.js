'use strict'

const globals = require('globals')

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node }
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none' }],
      'no-undef': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      semi: ['error', 'never'],
      quotes: ['error', 'single', { avoidEscape: true }],
      indent: ['error', 2],
      'space-before-function-paren': ['error', 'always']
    }
  },
  { ignores: ['node_modules/**', 'coverage/**'] }
]

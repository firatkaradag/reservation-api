module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-undef': 'off',
    'indent': [2, 2, {
      'SwitchCase': 1,
      'offsetTernaryExpressions': true
    }]
  },
  root: true,
};
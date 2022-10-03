module.exports = {
  extends: 'airbnb-base',
  settings: {
    'import/core-modules': ['aws-sdk'],
  },
  rules: {
    indent: ['error', 2, { MemberExpression: 0 }],
    'arrow-parens': 'off',
    'no-return-assign': 'off',
    'no-plusplus': 'off',
    'no-confusing-arrow': 'off',
    'class-methods-use-this': 'off',
    'import/no-unresolved': 'off',
    'no-await-in-loop': 'off',
    'arrow-body-style': 'off',
  },
};

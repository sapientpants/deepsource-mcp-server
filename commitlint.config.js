export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type enum
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only changes
        'style', // Changes that don't affect code meaning (formatting, etc)
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf', // Performance improvements
        'test', // Adding missing tests or correcting existing tests
        'build', // Changes that affect the build system or dependencies
        'ci', // Changes to CI configuration files and scripts
        'chore', // Other changes that don't modify src or test files
        'revert', // Reverts a previous commit
      ],
    ],
    // Ensure type is in lowercase
    'type-case': [2, 'always', 'lower-case'],
    // Ensure subject is not empty
    'subject-empty': [2, 'never'],
    // Ensure subject doesn't end with period
    'subject-full-stop': [2, 'never', '.'],
    // Ensure subject is in lower case
    'subject-case': [2, 'always', 'lower-case'],
    // Max header length
    'header-max-length': [2, 'always', 100],
    // Scope can be optional but must be lowercase when present
    'scope-case': [2, 'always', 'lower-case'],
    // Body should have blank line before it
    'body-leading-blank': [2, 'always'],
    // Footer should have blank line before it
    'footer-leading-blank': [2, 'always'],
  },
};

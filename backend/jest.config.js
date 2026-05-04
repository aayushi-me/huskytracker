module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/seeders/**',
    '!**/node_modules/**'
  ],

  // Coverage thresholds (optional - can be adjusted)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Setup files
  setupFilesAfterEnv: [],

  // Timeout for tests (in milliseconds)
  testTimeout: 10000,

  // Verbose output
  verbose: true
};


/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  // Default to node; individual test files can override with @jest-environment jsdom
  testEnvironment: "node",
  moduleNameMapper: {
    // Resolve Next.js path alias @/ → project root
    "^@/(.*)$": "<rootDir>/$1",
    // Stub out CSS modules and static assets
    "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.js",
  },
  // Runs after the test framework is installed in the environment
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          moduleResolution: "node",
          esModuleInterop: true,
          jsx: "react-jsx",
        },
      },
    ],
  },
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
    "**/tests/integration/**/*.test.ts",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
};

module.exports = config;

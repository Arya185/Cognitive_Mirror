import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Default environment for Node.js server/utility tests.
    // Component tests (.test.tsx) should use 'happy-dom' via environmentMatchGlobs.
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Current suite tests server helpers and pure utilities only.
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});

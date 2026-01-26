import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/utils/markupCalculator.ts',
        'src/services/markupTactic/calculation.ts',
        'src/services/markupTactic/aggregation.ts'
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/__tests__/**/*',
        // Runtime verification files - they are test utilities themselves
        'src/utils/verification/**/*.ts',
        // Parameters.ts is a data retrieval module, not core calculation logic
        'src/services/markupTactic/parameters.ts'
      ],
      thresholds: {
        // Core calculation files must meet strict coverage
        'src/utils/markupCalculator.ts': {
          branches: 90,
          functions: 70,
          lines: 95,
          statements: 95
        },
        'src/services/markupTactic/calculation.ts': {
          branches: 70,
          functions: 50,
          lines: 70,
          statements: 70
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});

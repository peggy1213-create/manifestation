import { configDefaults, defineConfig } from 'vitest/config';

// Pure domain tests run in Node. Anything touching D1 is a *.workers.test.ts file and runs
// in the Workers runtime instead — see vitest.workers.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, '**/*.workers.test.ts'],
  },
});

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// `pnpm test` roda os testes de unidade. Os testes que chamam a IA de verdade
// (*.eval.test.ts) só rodam com `pnpm eval` (vitest.eval.config.ts).
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    include: ['lib/**/*.test.ts'],
    exclude: ['lib/**/*.eval.test.ts', 'node_modules/**'],
    environment: 'node',
  },
})

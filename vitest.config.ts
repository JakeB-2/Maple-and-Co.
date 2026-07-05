/// <reference types="vitest" />
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

// This repo runs focused unit tests only (tests/unit). They cover shared
// helpers and do not need Supabase.
//
// Local env vars are loaded from .env.test.local (not committed).
// Usage:
//   npm test
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)
  return {
    resolve: {
      alias: {
        '@': resolve(__dirname),
        // `server-only` has no runtime behavior and isn't installed under the
        // node test env; stub it once here so server-module tests don't each
        // need their own `vi.mock('server-only')`.
        'server-only': resolve(__dirname, 'tests/stubs/server-only.ts'),
      },
    },
    test: {
      include: ['tests/unit/**/*.test.ts'],
      testTimeout: 30_000,
      hookTimeout: 30_000,
      // Each test file gets its own worker so writes don't bleed between RPCs.
      //
      // The worker pool is Node/vitest-version-sensitive: exactly one of
      // `threads`/`forks` evaluates test modules outside the runner context and
      // makes every file report "0 tests" (TypeError: Cannot read properties of
      // undefined reading 'config'), silently hollowing out every vitest-backed
      // gate. Which pool breaks has flipped across Node majors — on Node 22 it
      // was `forks`; on Node 24 + vitest 4.x it is `threads`. `forks` isolates
      // each file in its own process (at least as strong as `threads` for the
      // no-write-bleed requirement) and works on the current Node 24 runtime,
      // so it is the default. Override with VITEST_POOL=threads on a runtime
      // where `forks` is the broken one instead.
      pool: (process.env.VITEST_POOL as 'threads' | 'forks' | 'vmThreads' | 'vmForks') || 'forks',
      environment: 'node',
    },
  }
})

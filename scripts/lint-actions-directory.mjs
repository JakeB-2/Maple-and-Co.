#!/usr/bin/env node
// Lint: server actions live only in lib/actions or colocated app/**/actions.ts,
// and files directly under lib/actions must actually be server actions.
//
// Pure helpers, cache invalidators, and read-only loaders belong in lib/cache,
// lib/calculations, lib/auth, or lib/queries. Keeping lib/actions pure makes
// client/server boundaries easier to review.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ACTION_DIR = join(ROOT, 'lib', 'actions')
const LIB_DIR = join(ROOT, 'lib')
const APP_DIR = join(ROOT, 'app')
const HAS_USE_SERVER = /^['"]use server['"]/m

function* walk(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) continue
      yield* walk(path)
    } else if (entry.isFile()) {
      yield path
    }
  }
}

function relPath(file) {
  return relative(ROOT, file).split(sep).join('/')
}

function isAllowedUseServerFile(file) {
  const rel = relPath(file)
  if (rel.startsWith('lib/actions/') && file.endsWith('.ts') && !file.endsWith('.d.ts')) return true
  if (rel.startsWith('app/') && basename(file) === 'actions.ts') return true
  return false
}

function firstStatementLine(src) {
  const lines = src.split(/\r?\n/)
  let inBlockComment = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false
      continue
    }

    if (trimmed.startsWith('//')) continue
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlockComment = true
      continue
    }
    return trimmed
  }
  return ''
}

const violations = []

try { statSync(ACTION_DIR) } catch {
  console.error('[lint:actions-directory] FAIL - lib/actions does not exist.')
  process.exit(1)
}

for (const entry of readdirSync(ACTION_DIR, { withFileTypes: true })) {
  if (!entry.isFile()) continue
  if (!entry.name.endsWith('.ts')) continue
  if (entry.name.endsWith('.d.ts')) continue

  const file = join(ACTION_DIR, entry.name)
  const rel = relPath(file)
  const first = firstStatementLine(readFileSync(file, 'utf8'))

  if (first !== "'use server'" && first !== '"use server"') {
    violations.push({ rel, reason: `starts with ${first || '<empty>'}` })
  }
}

for (const dir of [LIB_DIR, APP_DIR]) {
  for (const file of walk(dir)) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue
    if (file.endsWith('.d.ts')) continue
    const src = readFileSync(file, 'utf8')
    if (!HAS_USE_SERVER.test(src)) continue
    if (isAllowedUseServerFile(file)) continue
    violations.push({ rel: relPath(file), reason: "has a top-level 'use server' directive outside lib/actions or app/**/actions.ts" })
  }
}

if (violations.length === 0) {
  console.log('[lint:actions-directory] OK - lib/actions contains server actions only.')
  process.exit(0)
}

console.error(`[lint:actions-directory] FAIL - ${violations.length} server-action boundary violation${violations.length === 1 ? '' : 's'}:\n`)
for (const v of violations) {
  console.error(`  - ${v.rel}: ${v.reason}`)
}
console.error('\nMove callable server actions to lib/actions or app/**/actions.ts. Move pure helpers to lib/cache, lib/calculations, lib/auth, or lib/queries without a top-level server directive.')
process.exit(1)

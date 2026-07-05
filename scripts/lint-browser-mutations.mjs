#!/usr/bin/env node
// Lint: client components must not call supabase.from(...).insert/update/delete
// or Supabase Storage mutators directly. Mutations belong in a server action
// so the server-side trust boundary is enforced — a browser-side mutation is
// an authorization bypass.
//
// Run: npm run lint:browser-mutations

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.LINT_BROWSER_MUTATIONS_ROOT
  ? join(process.env.LINT_BROWSER_MUTATIONS_ROOT)
  : join(__dirname, '..')

// Files that are allowed to mutate via supabase directly.
// Server-only code (server actions, route handlers) is exempt; only the
// scanned dirs below (app/, components/, lib/hooks) are checked, so entries
// here only matter for paths inside those dirs.
// - .next/ and node_modules/ are generated.
const ALLOWLIST_PATTERNS = [
  /^app\/api\//, // server route handlers
]

const SCAN_DIRS = [
  join(ROOT, 'app'),
  join(ROOT, 'components'),
  join(ROOT, 'lib', 'hooks'),
]

const IDENT = String.raw`[A-Za-z_$][\w$]*`
const BROWSER_CLIENT_IMPORT_RE = /import\s*{([\s\S]*?)}\s*from\s*['"]@\/lib\/supabase\/browser-client['"]/g
const BROWSER_CLIENT_EXPORTS = new Set(['createBrowserClient', 'createClient'])
const MUTATION_RE = /\bsupabase[\s\S]{0,40}?\.from\([^)]+\)[\s\S]{0,80}?\.(insert|update|upsert|delete)\b/g
const STORAGE_MUTATION_RE = /\bsupabase[\s\S]{0,40}?\.storage[\s\S]{0,40}?\.from\([^)]+\)[\s\S]{0,100}?\.(upload|uploadToSignedUrl|remove|move|copy|update)\b/g

function* walk(dir) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const path = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name.startsWith('.')) continue
      yield* walk(path)
    } else if (e.isFile()) {
      yield path
    }
  }
}

function isAllowlisted(rel) {
  for (const re of ALLOWLIST_PATTERNS) if (re.test(rel)) return true
  return false
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function lineNumberAt(src, index) {
  return src.slice(0, index).split('\n').length
}

function collectBrowserClientFactories(src) {
  const factories = new Set()
  BROWSER_CLIENT_IMPORT_RE.lastIndex = 0
  let match
  while ((match = BROWSER_CLIENT_IMPORT_RE.exec(src)) !== null) {
    for (const rawSpecifier of match[1].split(',')) {
      const specifier = rawSpecifier.replace(/\/\*[\s\S]*?\*\//g, '').trim()
      const parsed = specifier.match(new RegExp(`^(${[...BROWSER_CLIENT_EXPORTS].join('|')})(?:\\s+as\\s+(${IDENT}))?$`))
      if (parsed) factories.add(parsed[2] ?? parsed[1])
    }
  }
  return factories
}

function collectBrowserClientReceivers(src) {
  const factories = collectBrowserClientFactories(src)
  if (factories.size === 0) return new Set()

  const receivers = new Set()
  const calleeAlt = [...factories].map(escapeRegExp).join('|')
  const directBindingRe = new RegExp(`\\b(?:const|let|var)\\s+(${IDENT})\\s*=\\s*(?:await\\s+)?(?:${calleeAlt})\\s*\\(`, 'g')
  const memoBindingRe = new RegExp(`\\b(?:const|let|var)\\s+(${IDENT})\\s*=\\s*(?:React\\.)?useMemo\\s*\\(\\s*\\(\\s*\\)\\s*=>\\s*(?:${calleeAlt})\\s*\\(`, 'g')

  for (const re of [directBindingRe, memoBindingRe]) {
    re.lastIndex = 0
    let match
    while ((match = re.exec(src)) !== null) {
      receivers.add(match[1])
    }
  }

  return receivers
}

function mutationReForReceiver(receiver) {
  return new RegExp(`\\b${escapeRegExp(receiver)}\\b[\\s\\S]{0,40}?\\.from\\([^)]+\\)[\\s\\S]{0,80}?\\.(insert|update|upsert|delete)\\b`, 'g')
}

function storageMutationReForReceiver(receiver) {
  return new RegExp(`\\b${escapeRegExp(receiver)}\\b[\\s\\S]{0,40}?\\.storage[\\s\\S]{0,40}?\\.from\\([^)]+\\)[\\s\\S]{0,100}?\\.(upload|uploadToSignedUrl|remove|move|copy|update)\\b`, 'g')
}

const directViolations = []
const directViolationKeys = new Set()

function addDirectViolation(rel, line, op) {
  const key = `${rel}:${line}:${op}`
  if (directViolationKeys.has(key)) return
  directViolationKeys.add(key)
  directViolations.push({ rel, line, op })
}

for (const dir of SCAN_DIRS) {
  try { statSync(dir) } catch { continue }
  for (const file of walk(dir)) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue
    const rel = relative(ROOT, file).split(sep).join('/')
    if (isAllowlisted(rel)) continue
    const src = readFileSync(file, 'utf8')

    // Direct supabase mutations from a client component.
    MUTATION_RE.lastIndex = 0
    let m
    while ((m = MUTATION_RE.exec(src)) !== null) {
      addDirectViolation(rel, lineNumberAt(src, m.index), m[1])
    }

    STORAGE_MUTATION_RE.lastIndex = 0
    while ((m = STORAGE_MUTATION_RE.exec(src)) !== null) {
      addDirectViolation(rel, lineNumberAt(src, m.index), `storage.${m[1]}`)
    }

    // Browser clients bound to a local alias, e.g. `const db = createClient()`.
    for (const receiver of collectBrowserClientReceivers(src)) {
      const receiverMutationRe = mutationReForReceiver(receiver)
      while ((m = receiverMutationRe.exec(src)) !== null) {
        addDirectViolation(rel, lineNumberAt(src, m.index), m[1])
      }

      const receiverStorageMutationRe = storageMutationReForReceiver(receiver)
      while ((m = receiverStorageMutationRe.exec(src)) !== null) {
        addDirectViolation(rel, lineNumberAt(src, m.index), `storage.${m[1]}`)
      }
    }
  }
}

const total = directViolations.length
if (total === 0) {
  console.log('[lint:browser-mutations] OK — no client-side supabase mutations detected.')
  process.exit(0)
}

console.error(`[lint:browser-mutations] FOUND — ${total} surface site(s).`)
console.error('')
console.error(`Direct browser-client mutations from client components (${directViolations.length}):`)
for (const v of directViolations) {
  console.error(`  - ${v.rel}:${v.line}  .${v.op}() — move to a server action`)
}
console.error('')

// Browser-side table writes are a hard failure. Set REPORT_ONLY=1 to inspect
// without failing.
if (process.env.REPORT_ONLY === '1') process.exit(0)
process.exit(1)

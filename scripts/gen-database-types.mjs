#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outPath = join(root, 'lib', 'database.types.ts')
const npx = 'npx'

// Load .env.local so SUPABASE_DB_URL (and friends) are available when the
// script is run directly via `node scripts/gen-database-types.mjs`. Values
// already present in the environment win.
function loadEnvLocal() {
  let text
  try {
    text = readFileSync(join(root, '.env.local'), 'utf8')
  } catch {
    return
  }
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue
    if (match[1] in process.env) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[match[1]] = value
  }
}
loadEnvLocal()

const schema = process.env.SUPABASE_SCHEMA ?? 'public'
const dbUrl = process.env.SUPABASE_DB_URL
// Prefer generating straight from the database URL when available; fall back
// to the local Supabase stack. Override with SUPABASE_GEN_TYPES=db-url|local|remote.
const mode = process.env.SUPABASE_GEN_TYPES ?? (dbUrl ? 'db-url' : 'local')

const args = [
  'supabase',
  'gen',
  'types',
  'typescript',
  '--schema',
  schema,
]

if (mode === 'db-url') {
  if (!dbUrl) {
    console.error('[gen:types] SUPABASE_GEN_TYPES=db-url but SUPABASE_DB_URL is not set (checked env and .env.local).')
    process.exit(1)
  }
  args.push('--db-url', dbUrl)
} else if (mode === 'remote') {
  const projectId = process.env.SUPABASE_PROJECT_ID
  if (!projectId) {
    console.error('[gen:types] SUPABASE_GEN_TYPES=remote requires SUPABASE_PROJECT_ID to be set.')
    process.exit(1)
  }
  args.push('--project-id', projectId)
} else {
  args.push('--local')
}

function shellQuote(arg) {
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(arg)) return arg
  return `"${arg.replace(/"/g, '\\"')}"`
}

const command = process.platform === 'win32'
  ? [npx, ...args].map(shellQuote).join(' ')
  : npx
const commandArgs = process.platform === 'win32' ? [] : args

const result = spawnSync(command, commandArgs, {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
  shell: process.platform === 'win32',
})

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

const stdout = result.stdout ?? ''
const firstExport = stdout.search(/^export type /m)
const body = firstExport >= 0 ? stdout.slice(firstExport) : stdout
writeFileSync(outPath, body.endsWith('\n') ? body : `${body}\n`, 'utf8')
console.log(`[gen:types] wrote ${outPath}`)

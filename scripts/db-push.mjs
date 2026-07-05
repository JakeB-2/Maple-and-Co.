// Push pending migrations to the linked Supabase project.
// The db-url (with password) lives in .env.local so it never appears in
// package.json or shell history.
//
//   npm run db:push            → push pending migrations
//   npm run db:push -- --dry-run
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['supabase', 'db', 'push', '--db-url', process.env.SUPABASE_DB_URL, '--yes', ...process.argv.slice(2)],
  { stdio: 'inherit', shell: process.platform === 'win32' }
)
process.exit(result.status ?? 1)

// Run a SQL file against the linked Supabase database (used for seed.sql —
// there is no local psql, and `db push` only tracks migrations).
//
//   node scripts/db-run-sql.mjs supabase/seed.sql
//
// Uses the session pooler URL from .env.local (the direct db host is
// IPv6-only and unreachable from this machine).
import { readFileSync } from 'node:fs'
import pg from 'pg'

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/db-run-sql.mjs <file.sql>')
  process.exit(1)
}

const sql = readFileSync(file, 'utf8')
const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
try {
  await client.query('begin')
  const result = await client.query(sql)
  await client.query('commit')
  const results = Array.isArray(result) ? result : [result]
  for (const r of results) {
    if (r.command) console.log(`${r.command}${r.rowCount != null ? ` (${r.rowCount} rows)` : ''}`)
  }
  console.log(`OK: ${file}`)
} catch (err) {
  await client.query('rollback').catch(() => {})
  console.error(`FAILED: ${err.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}

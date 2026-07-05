// Create (or fix) a household auth user on the linked Supabase project.
// There is no public signup page — this is the only way accounts get made.
//
//   node scripts/create-user.mjs <email> <password> [display name]
//
// Idempotent: if the user already exists, it updates the password instead.
// The signup trigger creates the profiles row; seed.sql assigns name/color by
// email (re-run seed after adding a user: node scripts/db-run-sql.mjs supabase/seed.sql).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const [email, password, displayName] = process.argv.slice(2)
if (!email || !password) {
  console.error('Usage: node scripts/create-user.mjs <email> <password> [display name]')
  process.exit(1)
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: displayName ? { display_name: displayName } : undefined,
})

if (error) {
  if (!/already.*(registered|exists)/i.test(error.message)) {
    console.error('createUser failed:', error.message)
    process.exit(1)
  }
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listError) {
    console.error('listUsers failed:', listError.message)
    process.exit(1)
  }
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!existing) {
    console.error('User reported as existing but not found by email.')
    process.exit(1)
  }
  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, { password })
  if (updateError) {
    console.error('password update failed:', updateError.message)
    process.exit(1)
  }
  console.log(`User ${email} already existed — password updated. id: ${existing.id}`)
} else {
  console.log(`User created: ${email} id: ${data.user.id}`)
}

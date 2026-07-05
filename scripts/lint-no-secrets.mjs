#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)

const SKIP = new Set(['package-lock.json'])

const PATTERNS = [
  { name: 'Supabase access token', re: /\bsbp_[A-Za-z0-9_=-]{20,}\b/g },
  { name: 'Supabase secret key', re: /\bsb_secret_[A-Za-z0-9_=-]{20,}\b/g },
  { name: 'Supabase publishable key', re: /\bsb_publishable_[A-Za-z0-9_=-]{20,}\b/g },
  { name: 'JWT-looking token', re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Postgres URI with credentials', re: /\bpostgres(?:ql)?:\/\/[^:\s/@]+:[^@\s]+@/gi },
  { name: 'Hard-coded password field', re: /["']password["']\s*:\s*["'](?!<|REDACTED|CHANGE_ME|example\b)[^"']{8,}["']/gi },
]

const findings = []

for (const file of tracked) {
  if (SKIP.has(file)) continue

  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  for (const pattern of PATTERNS) {
    pattern.re.lastIndex = 0
    let match
    while ((match = pattern.re.exec(text)) !== null) {
      const before = text.slice(0, match.index)
      const line = before.split(/\r?\n/).length
      const lines = text.split(/\r?\n/)
      const lineText = lines[line - 1] ?? ''
      const prevLineText = lines[line - 2] ?? ''
      if (isAllowedFixture(pattern.name, lineText, prevLineText)) {
        continue
      }
      findings.push(`${file}:${line} ${pattern.name}`)
    }
  }
}

if (findings.length > 0) {
  console.error('Secret-like values found in tracked files:')
  for (const finding of findings) console.error(`  ${finding}`)
  process.exit(1)
}

console.log('No secret-like values found in tracked files.')

function isAllowedFixture(patternName, lineText, prevLineText) {
  if (patternName !== 'JWT-looking token') return false

  // Supabase's local development anon key is a public, deterministic fixture.
  return lineText.includes('LOCAL_ANON_KEY') || prevLineText.includes('LOCAL_ANON_KEY')
}

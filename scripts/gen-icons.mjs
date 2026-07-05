// Generates placeholder PWA icons (paw on maple amber) without any image
// tooling — pure Node PNG encoding. The M5 design pass replaces these with
// Maple's real illustrated icon; the sizes/paths stay the same.
//
//   node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const BG = [0xc9, 0x70, 0x2e, 255] // maple amber
const FG = [0xfb, 0xf7, 0xf1, 255] // warm cream

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Paw = one main pad + four toes, all ellipses, in unit coordinates.
const PAW = [
  { cx: 0.5, cy: 0.635, rx: 0.205, ry: 0.17 },
  { cx: 0.28, cy: 0.42, rx: 0.088, ry: 0.11 },
  { cx: 0.415, cy: 0.33, rx: 0.088, ry: 0.112 },
  { cx: 0.585, cy: 0.33, rx: 0.088, ry: 0.112 },
  { cx: 0.72, cy: 0.42, rx: 0.088, ry: 0.11 },
]

function inPaw(u, v, scale) {
  const x = (u - 0.5) / scale + 0.5
  const y = (v - 0.5) / scale + 0.5
  return PAW.some(({ cx, cy, rx, ry }) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1)
}

function inRoundedSquare(u, v, radius) {
  const x = Math.max(Math.abs(u - 0.5) - (0.5 - radius), 0)
  const y = Math.max(Math.abs(v - 0.5) - (0.5 - radius), 0)
  return x * x + y * y <= radius * radius
}

/**
 * @param {number} size px
 * @param {{rounded?: number, pawScale: number}} opts rounded = corner radius
 *   fraction (undefined = full-bleed square, for maskable/apple icons)
 */
function drawIcon(size, { rounded, pawScale }) {
  const px = Buffer.alloc(size * size * 4)
  const SS = 4 // 4x4 subsamples for antialiasing
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgCov = 0
      let fgCov = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size
          const v = (y + (sy + 0.5) / SS) / size
          const inside = rounded === undefined || inRoundedSquare(u, v, rounded)
          if (!inside) continue
          bgCov++
          if (inPaw(u, v, pawScale)) fgCov++
        }
      }
      const total = SS * SS
      const alpha = bgCov / total
      const mix = bgCov ? fgCov / bgCov : 0
      const i = (y * size + x) * 4
      px[i] = Math.round(BG[0] + (FG[0] - BG[0]) * mix)
      px[i + 1] = Math.round(BG[1] + (FG[1] - BG[1]) * mix)
      px[i + 2] = Math.round(BG[2] + (FG[2] - BG[2]) * mix)
      px[i + 3] = Math.round(255 * alpha)
    }
  }
  return encodePng(size, px)
}

mkdirSync(new URL('../public/icons', import.meta.url), { recursive: true })
const out = (name, buf) => {
  writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), buf)
  console.log(`public/icons/${name} (${buf.length} bytes)`)
}

out('icon-192.png', drawIcon(192, { rounded: 0.22, pawScale: 0.82 }))
out('icon-512.png', drawIcon(512, { rounded: 0.22, pawScale: 0.82 }))
out('icon-maskable-512.png', drawIcon(512, { pawScale: 0.6 })) // full bleed, paw inside the 80% safe zone
out('apple-touch-icon.png', drawIcon(180, { pawScale: 0.72 })) // iOS applies its own mask

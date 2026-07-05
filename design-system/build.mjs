// Generates the Maple & Co design-system preview cards for the claude.ai Design project.
// Each card is a self-contained HTML file whose first line is a @dsCard marker.
// Source of truth for tokens: docs/DESIGN-BRIEF.md (palette converted hex -> OKLCH).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// --- Design tokens (OKLCH), computed from the brief's hex palette -------------
const TOKENS = `
  :root {
    --paper: oklch(0.978 0.009 78.3);
    --card: oklch(0.994 0.006 84.6);
    --ink: oklch(0.280 0.027 61.6);
    --ink-soft: oklch(0.485 0.037 65.2);
    --line: oklch(0.905 0.023 75.8);
    --maple: oklch(0.634 0.137 53.4);
    --maple-deep: oklch(0.539 0.122 52.6);
    --maple-wash: oklch(0.936 0.027 69.3);
    --kayla: oklch(0.640 0.153 17.5);
    --jake: oklch(0.544 0.071 153.2);
    --good: var(--jake);
    --shadow: 0 1px 2px rgba(78,52,26,.06), 0 8px 24px rgba(78,52,26,.07);
    --r-sm: 10px; --r-md: 14px; --r-lg: 18px; --r-xl: 26px; --r-full: 999px;
    --font-head: Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'Trebuchet MS', system-ui, sans-serif;
    --font-body: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  :root[data-theme="dark"] {
    --paper: oklch(0.225 0.017 58.6);
    --card: oklch(0.260 0.020 63.4);
    --ink: oklch(0.932 0.018 73.1);
    --ink-soft: oklch(0.738 0.041 68.4);
    --line: oklch(0.327 0.025 64.3);
    --maple: oklch(0.711 0.135 57.2);
    --maple-deep: oklch(0.789 0.116 62.7);
    --maple-wash: oklch(0.302 0.032 64.1);
    --kayla: oklch(0.715 0.129 15.4);
    --jake: oklch(0.693 0.067 154.8);
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.25);
  }`;

const BASE = `
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 28px;
    background: var(--paper); color: var(--ink);
    font-family: var(--font-body); font-size: 15px; line-height: 1.55;
  }
  h1.ds { font-family: var(--font-head); font-size: 15px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.01em; }
  p.lede { font-size: 12px; color: var(--ink-soft); margin: 0 0 22px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .panel { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow); padding: 18px; }
  .themetag { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); margin: 0 0 12px; font-weight: 600; }`;

function page({ title, marker, css = '', body, split = false }) {
  const dark = split
    ? `<div class="panel" data-theme="dark" style="--paper:oklch(0.225 0.017 58.6);--card:oklch(0.260 0.020 63.4);--ink:oklch(0.932 0.018 73.1);--ink-soft:oklch(0.738 0.041 68.4);--line:oklch(0.327 0.025 64.3);--maple:oklch(0.711 0.135 57.2);--maple-deep:oklch(0.789 0.116 62.7);--maple-wash:oklch(0.302 0.032 64.1);--kayla:oklch(0.715 0.129 15.4);--jake:oklch(0.693 0.067 154.8);--shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.25);background:var(--paper);color:var(--ink)">
         <p class="themetag">Dark</p>${body}</div>`
    : '';
  const inner = split
    ? `<div class="grid2"><div class="panel"><p class="themetag">Light</p>${body}</div>${dark}</div>`
    : body;
  return `${marker}
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — Maple & Co</title>
<style>${TOKENS}${BASE}${css}</style>
</head>
<body>
<h1 class="ds">${title}</h1>
${inner}
</body>
</html>
`;
}

function write(path, content) {
  const full = join(OUT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  console.log('wrote', path);
}

const files = {};

// ===== COLORS ================================================================
files['foundations/colors/index.html'] = page({
  title: 'Palette',
  marker: `<!-- @dsCard group="Colors" name="Palette" subtitle="Grounds, ink, household accent, 2 signature colors · light + dark" width="760" height="620" -->`,
  css: `
  .swrap { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .sw { border-radius: var(--r-md); border: 1px solid var(--line); overflow: hidden; }
  .sw .chip { height: 46px; }
  .sw .meta { padding: 7px 9px; background: var(--card); }
  .sw .name { font-weight: 700; font-size: 12px; }
  .sw .val { font-size: 9.5px; color: var(--ink-soft); font-family: ui-monospace, monospace; }
  .sect { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: var(--ink-soft); font-weight: 700; margin: 4px 0 8px; }`,
  split: true,
  body: (() => {
    const groups = [
      ['Grounds & ink', [['paper', 'ground'], ['card', 'surface'], ['ink', 'text'], ['ink-soft', 'muted'], ['line', 'border']]],
      ['Household accent', [['maple', 'primary'], ['maple-deep', 'deep'], ['maple-wash', 'wash']]],
      ['Signature colors', [['kayla', 'Kayla'], ['jake', 'Jake']]],
    ];
    return groups.map(([label, rows]) => `
      <p class="sect">${label}</p>
      <div class="swrap" style="margin-bottom:14px">
        ${rows.map(([tok, role]) => `
          <div class="sw">
            <div class="chip" style="background: var(--${tok})"></div>
            <div class="meta"><div class="name">--${tok}</div><div class="val">${role}</div></div>
          </div>`).join('')}
      </div>`).join('');
  })(),
});

// ===== TYPE ==================================================================
files['foundations/type/index.html'] = page({
  title: 'Type scale',
  marker: `<!-- @dsCard group="Type" name="Type scale" subtitle="Display / Title / Heading / Body / Label · system faces" width="720" height="600" -->`,
  css: `
  .row { padding: 12px 0; border-bottom: 1px dashed var(--line); }
  .row:last-child { border-bottom: 0; }
  .role { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--ink-soft); font-weight: 600; margin-bottom: 3px; }
  .spec { font-size: 10px; color: var(--ink-soft); font-family: ui-monospace, monospace; margin-top: 4px; }
  .d { font-family: var(--font-head); }`,
  body: [
    ['Display', 'font-head · 800 · -0.02em · clamp(2.4–3.4rem)', 'style="font-size:44px;font-weight:800;letter-spacing:-0.02em;line-height:1.1" class="d"', 'Good morning ☀️'],
    ['Title (h2)', 'font-head · 700 · -0.01em · 1.55rem', 'style="font-size:25px;font-weight:700;letter-spacing:-0.01em" class="d"', "Maple's day"],
    ['Heading (h3)', 'font-head · 700 · 1.05rem', 'style="font-size:17px;font-weight:700" class="d"', 'Recent activity'],
    ['Lede', 'font-body · 1.2rem · ink-soft', 'style="font-size:19px;color:var(--ink-soft)"', 'A private household companion for two people and one dog.'],
    ['Body', 'font-body · 1.0625rem · 1.65', 'style="font-size:17px;line-height:1.65"', 'Jake logged $340 MXN — Groceries. Kayla walked Maple 20 minutes ago.'],
    ['Label / Eyebrow', 'font-body · .75rem · 600 · .14em · uppercase', 'style="font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--maple-deep)"', 'Today · July 4'],
    ['Caption', 'font-body · .85rem · ink-soft', 'style="font-size:13px;color:var(--ink-soft)"', 'walked 2h ago'],
  ].map(([role, spec, attr, text]) => `
    <div class="row">
      <div class="role">${role}</div>
      <div ${attr}>${text}</div>
      <div class="spec">${spec}</div>
    </div>`).join(''),
});

// ===== RADIUS + SHADOW =======================================================
files['foundations/radius-shadow/index.html'] = page({
  title: 'Radius & elevation',
  marker: `<!-- @dsCard group="Foundations" name="Radius & elevation" subtitle="Rounded, soft, low-contrast depth" width="720" height="440" -->`,
  css: `
  .box { display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end; margin-bottom:26px; }
  .r { width:96px; height:70px; background:var(--maple-wash); border:1px solid var(--line); display:flex; align-items:flex-end; justify-content:center; padding-bottom:6px; font-size:11px; color:var(--ink-soft); font-family:ui-monospace,monospace; }
  .e { width:150px; height:78px; background:var(--card); border:1px solid var(--line); border-radius:var(--r-lg); display:flex;align-items:center;justify-content:center; font-size:11px; color:var(--ink-soft); }
  .sect { font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--ink-soft); font-weight:700; margin:0 0 12px; }`,
  body: `
    <p class="sect">Radius</p>
    <div class="box">
      ${[['sm','10'],['md','14'],['lg','18'],['xl','26']].map(([n,v])=>`<div class="r" style="border-radius:${v}px">${n} · ${v}</div>`).join('')}
      <div class="r" style="border-radius:999px;width:70px">full</div>
    </div>
    <p class="sect">Elevation — one soft warm shadow, no hard edges</p>
    <div class="box">
      <div class="e" style="box-shadow:none">flat</div>
      <div class="e" style="box-shadow:var(--shadow)">card · --shadow</div>
      <div class="e" style="box-shadow:0 6px 20px rgba(78,52,26,.14), 0 2px 6px rgba(78,52,26,.10)">sheet / FAB</div>
    </div>`,
});

// ===== AVATAR CHIPS ==========================================================
files['components/avatar-chip/index.html'] = page({
  title: 'Avatar chip',
  marker: `<!-- @dsCard group="Components" name="Avatar chip" subtitle="Signature color = who · survives both themes" width="720" height="360" -->`,
  css: `
  .people { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
  .person { display:inline-flex; align-items:center; gap:8px; font-weight:600; font-size:15px; border:1px solid var(--line); border-radius:var(--r-full); padding:6px 15px 6px 8px; background:var(--card); }
  .dot { width:26px; height:26px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:800; }
  .bare { display:flex; gap:10px; margin-top:18px; }
  .note { font-size:12px; color:var(--ink-soft); margin-top:20px; }`,
  split: true,
  body: `
    <div class="people">
      <span class="person"><span class="dot" style="background:var(--jake)">J</span> Jake</span>
      <span class="person"><span class="dot" style="background:var(--kayla)">K</span> Kayla</span>
      <span class="person"><span class="dot" style="background:var(--maple)">🐾</span> Maple</span>
    </div>
    <div class="bare">
      <span class="dot" style="background:var(--jake)">J</span>
      <span class="dot" style="background:var(--kayla)">K</span>
      <span class="dot" style="background:var(--maple)">🐾</span>
    </div>
    <p class="note">Colors carry identity — never names alone.</p>`,
});

// ===== PILL / TAG CHIPS ======================================================
files['components/pill-chip/index.html'] = page({
  title: 'Pill & tag chips',
  marker: `<!-- @dsCard group="Components" name="Pill & tag chips" subtitle="Categories, filters, recency" width="720" height="300" -->`,
  css: `
  .chips { display:flex; flex-wrap:wrap; gap:10px; padding:0; margin:0 0 16px; list-style:none; }
  .chip { background:var(--maple-wash); border:1px solid var(--line); color:var(--ink); border-radius:var(--r-full); padding:6px 15px; font-size:14px; font-weight:600; }
  .chip.on { background:var(--maple); color:#fff; border-color:transparent; }
  .chip.recency { background:transparent; color:var(--ink-soft); font-weight:600; display:inline-flex; gap:6px; align-items:center; }
  .chip.recency::before { content:""; width:8px; height:8px; border-radius:50%; background:var(--jake); }`,
  body: `
    <ul class="chips">
      <li class="chip on">Groceries</li><li class="chip">Dining</li><li class="chip">Maple</li><li class="chip">Home</li><li class="chip">Fun</li>
    </ul>
    <ul class="chips">
      <li class="chip recency">walked 2h ago</li>
      <li class="chip recency" style="--jake:var(--kayla)">fed just now</li>
      <li class="chip recency" style="--jake:var(--maple)">meds due 6pm</li>
    </ul>`,
});

// ===== CARD ==================================================================
files['components/card/index.html'] = page({
  title: 'Card',
  marker: `<!-- @dsCard group="Components" name="Card" subtitle="Warm surface, soft shadow, generous radius" width="720" height="360" -->`,
  css: `
  .card { background:var(--card); border:1px solid var(--line); border-radius:var(--r-lg); padding:18px 20px; box-shadow:var(--shadow); max-width:420px; }
  .card h3 { font-family:var(--font-head); margin:0 0 6px; font-size:17px; }
  .card p { margin:0; color:var(--ink-soft); font-size:14px; }
  .card + .card { margin-top:12px; }`,
  split: true,
  body: `
    <div class="card"><h3>Today — the digest</h3><p>What happened and what's due, both people's activity interleaved.</p></div>
    <div class="card"><h3>Spending</h3><p>A shared diary you react to — never a debt ledger.</p></div>`,
});

// ===== TAB BAR + FAB =========================================================
files['components/tab-bar/index.html'] = page({
  title: 'Tab bar & FAB',
  marker: `<!-- @dsCard group="Components" name="Tab bar & FAB" subtitle="5 tabs · floating paw quick-capture" width="440" height="360" -->`,
  css: `
  .phone { max-width:380px; margin:0 auto; border:1px solid var(--line); border-radius:var(--r-xl); background:var(--card); box-shadow:var(--shadow); overflow:hidden; }
  .screen { position:relative; min-height:120px; padding:16px 16px 60px; }
  .hint { font-size:13px; color:var(--ink-soft); margin:0; }
  .fab { position:absolute; right:16px; bottom:66px; width:52px; height:52px; border-radius:50%; background:var(--maple); color:#fff; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 6px 20px rgba(78,52,26,.22); }
  .tabbar { display:grid; grid-template-columns:repeat(5,1fr); border-top:1px solid var(--line); background:var(--card); padding:8px 6px 12px; }
  .tab { display:flex; flex-direction:column; align-items:center; gap:3px; font-size:10px; font-weight:600; color:var(--ink-soft); }
  .tab svg { width:22px; height:22px; stroke:currentColor; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
  .tab.active { color:var(--maple-deep); }`,
  body: `
    <div class="phone">
      <div class="screen">
        <p class="hint"><strong>Friday, July 4</strong> — good morning ☀️</p>
        <div class="fab">🐾</div>
      </div>
      <nav class="tabbar">
        <span class="tab active"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>Today</span>
        <span class="tab"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.3c-.5-.8-1.4-1.3-2.5-1.3-1.6 0-2.8.9-2.8 2.1 0 1.1.9 1.7 2.8 2 1.9.3 2.8.9 2.8 2 0 1.2-1.2 2.1-2.8 2.1-1.1 0-2-.5-2.5-1.3"/></svg>Spend</span>
        <span class="tab"><svg viewBox="0 0 24 24"><path d="M5 7h15l-1.8 8.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.6L4.5 4.8A1.5 1.5 0 0 0 3 3.5H2"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="16.5" cy="20" r="1.4"/></svg>Groceries</span>
        <span class="tab"><svg viewBox="0 0 24 24"><path d="M12 13.5c-2.3 0-4.2 1.7-4.2 3.7 0 1.2.9 2.1 2.1 2.1.9 0 1.5-.4 2.1-.4s1.2.4 2.1.4c1.2 0 2.1-.9 2.1-2.1 0-2-1.9-3.7-4.2-3.7z"/><ellipse cx="7.4" cy="9.5" rx="1.4" ry="1.8"/><ellipse cx="16.6" cy="9.5" rx="1.4" ry="1.8"/><ellipse cx="9.9" cy="6" rx="1.4" ry="1.8"/><ellipse cx="14.1" cy="6" rx="1.4" ry="1.8"/></svg>Maple</span>
        <span class="tab"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 2.8v4M16 2.8v4"/></svg>Calendar</span>
      </nav>
    </div>`,
});

// ===== BOTTOM SHEET ==========================================================
files['components/bottom-sheet/index.html'] = page({
  title: 'Bottom sheet',
  marker: `<!-- @dsCard group="Components" name="Bottom sheet" subtitle="URL-driven create/edit · keyboard-aware · quick-log grid" width="440" height="480" -->`,
  css: `
  .phone { max-width:360px; margin:0 auto; border:1px solid var(--line); border-radius:var(--r-xl); background:var(--paper); box-shadow:var(--shadow); overflow:hidden; height:420px; position:relative; }
  .scrim { position:absolute; inset:0; background:rgba(40,28,16,.28); }
  .sheet { position:absolute; left:0; right:0; bottom:0; background:var(--card); border-radius:var(--r-xl) var(--r-xl) 0 0; padding:14px 18px 22px; box-shadow:0 -8px 30px rgba(78,52,26,.18); }
  .grab { width:38px; height:4px; border-radius:99px; background:var(--line); margin:2px auto 14px; }
  .sheet h3 { font-family:var(--font-head); margin:0 0 14px; font-size:18px; }
  .tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .tile { border:1px solid var(--line); border-radius:var(--r-md); background:var(--paper); padding:14px 6px; text-align:center; font-size:13px; font-weight:600; }
  .tile .em { display:block; font-size:24px; margin-bottom:4px; }
  .tile.on { background:var(--maple-wash); border-color:var(--maple); }`,
  body: `
    <div class="phone">
      <div class="scrim"></div>
      <div class="sheet">
        <div class="grab"></div>
        <h3>Log for Maple</h3>
        <div class="tiles">
          ${[['🍖','Feed',1],['🚶','Walk',0],['💊','Meds',0],['🌳','Potty',0],['⚖️','Weight',0],['🩺','Vet',0]].map(([e,l,on])=>`<div class="tile${on?' on':''}"><span class="em">${e}</span>${l}</div>`).join('')}
        </div>
      </div>
    </div>`,
});

// ===== CHECK-OFF ROW =========================================================
files['components/checkoff-row/index.html'] = page({
  title: 'Check-off row',
  marker: `<!-- @dsCard group="Components" name="Check-off row" subtitle="Shopping mode · huge one-hand targets" width="440" height="420" -->`,
  css: `
  .list { max-width:360px; margin:0 auto; background:var(--card); border:1px solid var(--line); border-radius:var(--r-lg); box-shadow:var(--shadow); overflow:hidden; }
  .aisle { font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--ink-soft); font-weight:700; padding:12px 16px 6px; }
  .item { display:flex; align-items:center; gap:14px; padding:16px; border-top:1px solid var(--line); font-size:16px; font-weight:600; min-height:56px; }
  .cb { width:28px; height:28px; border-radius:9px; border:2px solid var(--line); flex:none; }
  .item.done { color:var(--ink-soft); }
  .item.done .cb { background:var(--jake); border-color:var(--jake); display:flex; align-items:center; justify-content:center; color:#fff; }
  .item.done .txt { text-decoration:line-through; }
  .qty { margin-left:auto; font-size:13px; color:var(--ink-soft); font-weight:600; }
  .foot { padding:14px 16px; border-top:1px solid var(--line); display:flex; justify-content:space-between; font-weight:700; }`,
  body: `
    <div class="list">
      <div class="aisle">Produce</div>
      <div class="item done"><span class="cb">✓</span><span class="txt">Bananas</span><span class="qty">×1</span></div>
      <div class="item"><span class="cb"></span><span class="txt">Avocados</span><span class="qty">×3</span></div>
      <div class="aisle">Dairy</div>
      <div class="item"><span class="cb"></span><span class="txt">Milk</span><span class="qty">×1</span></div>
      <div class="item done"><span class="cb">✓</span><span class="txt">Yogurt</span><span class="qty">×2</span></div>
      <div class="foot"><span>Running total</span><span>$182 MXN</span></div>
    </div>`,
});

// ===== RECENCY / FRESHNESS ===================================================
files['components/recency-freshness/index.html'] = page({
  title: 'Freshness bars',
  marker: `<!-- @dsCard group="Components" name="Freshness bars" subtitle="Gradual decay · never guilt-red · Skip is first-class" width="720" height="380" -->`,
  css: `
  .task { display:flex; align-items:center; gap:14px; padding:12px 0; border-bottom:1px dashed var(--line); }
  .task:last-child { border-bottom:0; }
  .bar { flex:1; height:8px; border-radius:99px; background:var(--line); overflow:hidden; }
  .fill { height:100%; border-radius:99px; }
  .name { width:120px; font-weight:600; font-size:14px; }
  .age { width:80px; text-align:right; font-size:12px; color:var(--ink-soft); }
  .skip { border:1px solid var(--line); background:var(--card); color:var(--ink-soft); border-radius:var(--r-full); padding:5px 12px; font-size:12px; font-weight:600; }
  .note { font-size:12px; color:var(--ink-soft); margin-top:16px; }`,
  body: `
    ${[['Water plants','fresh','var(--jake)','96%'],['Vacuum','aging','var(--maple)','52%'],['Trash night','due','var(--maple-deep)','14%'],['Wipe counters','overdue','var(--maple-deep)','6%']].map(([n,a,c,w])=>`
      <div class="task"><span class="name">${n}</span><span class="bar"><span class="fill" style="width:${w};background:${c}"></span></span><span class="age">${a}</span><button class="skip">Skip today</button></div>`).join('')}
    <p class="note">Bars desaturate toward the warm accent as tasks age — they never turn alarm-red, and never snap back to zero.</p>`,
});

// ===== MASCOT ================================================================
files['brand/maple-mascot/index.html'] = page({
  title: 'Maple — mascot states',
  marker: `<!-- @dsCard group="Brand" name="Maple mascot" subtitle="normal · happy wiggle · zoomies · sleeping (never sad)" width="720" height="360" -->`,
  css: `
  .states { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .state { text-align:center; }
  .puck { aspect-ratio:1; border-radius:var(--r-lg); background:var(--maple-wash); border:1px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:52px; margin-bottom:8px; }
  .state .n { font-weight:700; font-size:13px; }
  .state .d { font-size:11px; color:var(--ink-soft); }
  .note { font-size:12px; color:var(--ink-soft); margin-top:18px; }`,
  body: `
    <div class="states">
      <div class="state"><div class="puck">🐶</div><div class="n">Normal</div><div class="d">resting default</div></div>
      <div class="state"><div class="puck">🐕</div><div class="n">Happy wiggle</div><div class="d">a log just landed</div></div>
      <div class="state"><div class="puck">🐕‍🦺</div><div class="n">Zoomies</div><div class="d">rare milestone</div></div>
      <div class="state"><div class="puck">😴</div><div class="n">Sleeping</div><div class="d">all-done reward</div></div>
    </div>
    <p class="note">Placeholder art — final direction: hand-drawn, rounded, warm line. Maple is never sad, sick, or neglected-looking as a motivator. No points, no XP, no streak-shame.</p>`,
});

// ===== SCREEN: TODAY =========================================================
files['screens/today/index.html'] = page({
  title: 'Screen — Today',
  marker: `<!-- @dsCard group="Screens" name="Today" subtitle="The morning-coffee digest" width="440" height="620" -->`,
  css: `
  .phone { max-width:360px; margin:0 auto; border:1px solid var(--line); border-radius:var(--r-xl); background:var(--paper); box-shadow:var(--shadow); overflow:hidden; }
  .hd { padding:20px 18px 6px; }
  .eyebrow { font-size:12px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--maple-deep); margin:0; }
  .hd h2 { font-family:var(--font-head); font-size:26px; margin:4px 0 0; }
  .feed { padding:8px 14px 18px; }
  .fr { display:flex; align-items:center; gap:12px; padding:13px 6px; border-bottom:1px dashed var(--line); font-size:14px; }
  .fr:last-child { border-bottom:0; }
  .d { width:14px; height:14px; border-radius:50%; flex:none; }
  .fab { position:relative; }
  .fabb { position:absolute; right:16px; bottom:14px; width:52px; height:52px; border-radius:50%; background:var(--maple); color:#fff; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 6px 20px rgba(78,52,26,.22); }`,
  body: `
    <div class="phone fab">
      <div class="hd"><p class="eyebrow">Friday · July 4</p><h2>Good morning ☀️</h2></div>
      <div class="feed">
        <div class="fr"><span class="d" style="background:var(--maple)"></span> Maple walked 20 min ago — by Kayla</div>
        <div class="fr"><span class="d" style="background:var(--jake)"></span> Jake logged $340 MXN — Groceries</div>
        <div class="fr"><span class="d" style="background:var(--kayla)"></span> Trash night tonight</div>
        <div class="fr"><span class="d" style="background:var(--maple)"></span> Maple's dinner — not yet</div>
        <div class="fr"><span class="d" style="background:var(--jake)"></span> Milk added to groceries</div>
      </div>
      <div class="fabb">🐾</div>
    </div>`,
});

// ===== SCREEN: SHOPPING MODE =================================================
files['screens/shopping-mode/index.html'] = page({
  title: 'Screen — Shopping mode',
  marker: `<!-- @dsCard group="Screens" name="Shopping mode" subtitle="Aisle-ordered, big check targets, running total" width="440" height="620" -->`,
  css: `
  .phone { max-width:360px; margin:0 auto; border:1px solid var(--line); border-radius:var(--r-xl); background:var(--card); box-shadow:var(--shadow); overflow:hidden; }
  .hd { padding:18px; border-bottom:1px solid var(--line); }
  .hd .eyebrow { font-size:12px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--maple-deep); margin:0; }
  .hd h2 { font-family:var(--font-head); font-size:22px; margin:3px 0 0; }
  .aisle { font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--ink-soft); font-weight:700; padding:12px 18px 4px; }
  .item { display:flex; align-items:center; gap:14px; padding:15px 18px; border-top:1px solid var(--line); font-size:16px; font-weight:600; }
  .cb { width:26px; height:26px; border-radius:8px; border:2px solid var(--line); flex:none; }
  .item.done { color:var(--ink-soft); }
  .item.done .cb { background:var(--jake); border-color:var(--jake); display:flex; align-items:center; justify-content:center; color:#fff; font-size:15px; }
  .item.done .txt { text-decoration:line-through; }
  .foot { padding:16px 18px; border-top:1px solid var(--line); display:flex; justify-content:space-between; font-weight:800; font-size:17px; }`,
  body: `
    <div class="phone">
      <div class="hd"><p class="eyebrow">Bodega Aurrerá</p><h2>Shopping · 6 left</h2></div>
      <div class="aisle">Produce</div>
      <div class="item done"><span class="cb">✓</span><span class="txt">Bananas</span></div>
      <div class="item"><span class="cb"></span><span class="txt">Avocados ×3</span></div>
      <div class="item"><span class="cb"></span><span class="txt">Limes</span></div>
      <div class="aisle">Dairy</div>
      <div class="item"><span class="cb"></span><span class="txt">Milk</span></div>
      <div class="item done"><span class="cb">✓</span><span class="txt">Yogurt ×2</span></div>
      <div class="foot"><span>Total</span><span>$182 MXN</span></div>
    </div>`,
});

// ===== SCREEN: MAPLE PROFILE =================================================
files['screens/maple-profile/index.html'] = page({
  title: 'Screen — Maple profile',
  marker: `<!-- @dsCard group="Screens" name="Maple profile" subtitle="Character first, medical ledger one tap deeper" width="440" height="620" -->`,
  css: `
  .phone { max-width:360px; margin:0 auto; border:1px solid var(--line); border-radius:var(--r-xl); background:var(--paper); box-shadow:var(--shadow); overflow:hidden; }
  .hero { background:var(--maple-wash); padding:26px 18px 20px; text-align:center; }
  .avatar { width:88px; height:88px; border-radius:50%; background:var(--card); border:1px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:46px; margin:0 auto 10px; }
  .hero h2 { font-family:var(--font-head); margin:0; font-size:24px; }
  .hero p { margin:2px 0 0; color:var(--ink-soft); font-size:13px; }
  .chips { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-top:12px; }
  .chip { background:var(--card); border:1px solid var(--line); border-radius:var(--r-full); padding:5px 12px; font-size:12px; font-weight:600; }
  .body { padding:16px 18px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:var(--r-lg); box-shadow:var(--shadow); padding:14px 16px; margin-bottom:12px; }
  .card h3 { font-family:var(--font-head); margin:0 0 10px; font-size:15px; }
  .spark { display:flex; align-items:flex-end; gap:5px; height:44px; }
  .spark span { flex:1; background:var(--maple); border-radius:3px 3px 0 0; opacity:.85; }
  .dose { display:flex; justify-content:space-between; font-size:14px; }`,
  body: `
    <div class="phone">
      <div class="hero">
        <div class="avatar">🐶</div>
        <h2>Maple</h2>
        <p>Golden mix · 4 yrs · loves socks</p>
        <div class="chips"><span class="chip">walked 2h ago</span><span class="chip">fed ✓</span><span class="chip">12.4 kg</span></div>
      </div>
      <div class="body">
        <div class="card"><h3>Weight</h3><div class="spark">${[60,64,58,66,70,68,74,72,78,76].map(h=>`<span style="height:${h}%"></span>`).join('')}</div></div>
        <div class="card"><h3>Next dose</h3><div class="dose"><span>Heartworm tablet</span><span style="color:var(--maple-deep);font-weight:700">in 3 days</span></div></div>
      </div>
    </div>`,
});

// ===== GUIDELINES: EMPTY + CELEBRATION =======================================
files['guidelines/empty-celebration/index.html'] = page({
  title: 'Empty states & celebration',
  marker: `<!-- @dsCard group="Guidelines" name="Empty & celebration" subtitle="Delight scaled to rarity · humor never in errors" width="720" height="440" -->`,
  css: `
  .cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:var(--r-lg); box-shadow:var(--shadow); padding:18px; }
  .card h3 { font-family:var(--font-head); margin:0 0 8px; font-size:15px; }
  .empty { text-align:center; padding:14px; }
  .empty .em { font-size:44px; }
  .empty p { color:var(--ink-soft); font-size:13px; margin:6px 0 0; }
  .scale { list-style:none; padding:0; margin:0; font-size:13px; }
  .scale li { padding:8px 0; border-bottom:1px dashed var(--line); display:flex; gap:8px; }
  .scale li:last-child { border-bottom:0; }
  .scale b { color:var(--maple-deep); }`,
  body: `
    <div class="cols">
      <div class="card">
        <h3>Empty states have personality</h3>
        <div class="empty"><div class="em">😴</div><p>Everything's done. Maple's napping — come back later.</p></div>
      </div>
      <div class="card">
        <h3>Celebration scaled to rarity</h3>
        <ul class="scale">
          <li><b>Daily log</b> check-morph + soft haptic</li>
          <li><b>Weekly streak</b> a small Maple wiggle</li>
          <li><b>Rare milestone</b> paw-print confetti + zoomies</li>
        </ul>
      </div>
    </div>
    <p style="font-size:12px;color:var(--ink-soft);margin-top:16px">The anti-confetti rule: if everything celebrates, nothing does. Humor lives in empty and all-done states — never in error states.</p>`,
});

for (const [path, content] of Object.entries(files)) write(path, content);
console.log('\n' + Object.keys(files).length + ' cards generated');

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'assets', 'docs', 'public'];
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.html', '.css'];

const forbiddenPatterns = [
  { name: 'Hard-coded /skyaetherius', regex: /\/skyaetherius\//g },
  { name: 'Relative asset (./ or ../) to resource', regex: /["'`]\.\.?\/[^"'`\n]+\.(png|jpg|jpeg|svg|mp3|wav|ogg|ico|css|json)["'`]/gi }
];

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    const basename = path.basename(full);
    if (stat && stat.isDirectory()) {
      if (IGNORED_DIRS.includes(basename)) continue;
      results.push(...walk(full));
    } else {
      if (FILE_EXTENSIONS.includes(path.extname(full))) results.push(full);
    }
  }
  return results;
}

function run() {
  const files = walk(ROOT);
  const findings = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const p of forbiddenPatterns) {
      const matches = text.match(p.regex);
      if (matches && matches.length) {
        findings.push({ file: path.relative(ROOT, f), type: p.name, matches: [...new Set(matches)].slice(0, 10) });
      }
    }
  }

  if (findings.length) {
    console.error('\n[asset-path-check] Found forbidden asset path patterns:');
    for (const f of findings) {
      console.error(`\n- ${f.type} in ${f.file}`);
      for (const m of f.matches) console.error(`    ${m}`);
    }
    console.error('\nFix the above paths (use root-absolute paths like /audio/.. or use services/basePath) and re-run.');
    process.exit(1);
  }

  console.log('[asset-path-check] No forbidden patterns found.');
}

run();

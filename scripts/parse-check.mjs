import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  const globalTypescript = '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
  if (fs.existsSync(globalTypescript)) ts = require(globalTypescript);
}
if (!ts) {
  console.error('PARSE_CHECK could not load TypeScript. Run npm ci first.');
  process.exit(2);
}

const root = process.cwd();
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) files.push(p);
  }
}
walk(path.join(root, 'src'));
files.push(path.join(root, 'server.ts'));

const failures = [];
for (const file of files) {
  const isTsx = file.endsWith('.tsx');
  const sf = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.ES2022,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  if (sf.parseDiagnostics.length) {
    failures.push({ file, diagnostics: sf.parseDiagnostics.map((d) => {
      const pos = sf.getLineAndCharacterOfPosition(d.start ?? 0);
      return `${pos.line + 1}:${pos.character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`;
    }) });
  }
}

console.log(`PARSE_CHECK files=${files.length} failures=${failures.length}`);
for (const failure of failures) {
  console.error(`${failure.file}: ${failure.diagnostics.join(' | ')}`);
}
process.exitCode = failures.length ? 1 : 0;

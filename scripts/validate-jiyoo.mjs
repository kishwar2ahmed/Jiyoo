import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','.git','dist'].includes(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(p);
  }
}
walk(path.join(root, 'src'));
files.push(path.join(root, 'server.ts'));

const checks = [];
const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
const cart = fs.readFileSync(path.join(root, 'src/features/cart/components/CartModal.tsx'), 'utf8');

checks.push(['Server checkout requires authentication', /app\.post\('\/api\/orders\/create', orderLimiter, requireAuth/.test(server)]);
checks.push(['Razorpay order requires authentication', /app\.post\('\/api\/razorpay\/order', orderLimiter, requireAuth/.test(server)]);
checks.push(['Razorpay verify requires authentication', /app\.post\('\/api\/razorpay\/verify', requireAuth/.test(server)]);
checks.push(['Client checkout has auth guard', /const requireCheckoutAuth = \(\) =>/.test(cart) && /if \(!requireCheckoutAuth\(\)\) return;/.test(cart)]);
checks.push(['Client checkout button is auth guarded', /onClick=\{\(\) => \{ if \(requireCheckoutAuth\(\)\) setStep\("checkout"\); \}\}/.test(cart)]);
checks.push(['No global guest order endpoint remains', !/app\.post\('\/api\/orders\/create', orderLimiter, optionalAuth/.test(server)]);
checks.push(['No global guest Razorpay endpoints remain', !/app\.post\('\/api\/razorpay\/(order|verify)'[^\n]*optionalAuth/.test(server)]);
checks.push(['Server direct order schema does not accept a userId override', (() => { const start = server.indexOf('const directOrderSchema'); const end = server.indexOf('const trackOrderSchema', start); return start >= 0 && end > start && !server.slice(start, end).includes('userId:'); })()]);
checks.push(['Client has no guest userId checkout fallback', !/userId:\s*user\?\.id\s*\|\|\s*['\"]guest['\"]/.test(cart)]);
checks.push(['Firebase config missing does not throw during module startup', !/Missing required env var\(s\)/.test(fs.readFileSync(path.join(root,'src/services/firebase.ts'),'utf8'))]);
checks.push(['Global postal code field allows non-numeric formats', !/pincode.*replace\(\/\\D\/g/.test(cart)]);
checks.push(['International phone validation is used in checkout UI', /\^\\\+\?\[1-9\]\\d\{6,14\\\\\\\\?\\$/.test(cart) || /international phone number required/.test(cart)]);
checks.push(['Locked visual tokens still present', /rounded-xl/.test(fs.readFileSync(path.join(root,'src/features/product/components/ProductCard.tsx'),'utf8'))]);
checks.push(['No new global sticky bar component introduced', !files.some(f => /Sticky.*Bar|Global.*Sticky/i.test(path.basename(f)) && f.includes('src'))]);

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (!ok) failed++;
}
console.log(`Checked ${files.length} TypeScript/TSX source files structurally.`);
process.exitCode = failed ? 1 : 0;

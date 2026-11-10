import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
function check(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) check(file);
    else if (/\.m?js$/.test(file)) {
      const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
      if (result.status !== 0) process.exit(result.status || 1);
    }
  }
}
for (const dir of ['src', 'worker', 'scripts', 'tests']) check(dir);
console.log('PASS: JavaScript syntax checked.');

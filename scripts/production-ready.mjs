import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const database = config.d1_databases?.find(binding => binding.binding === 'DB');
if (!/^[a-f0-9]{32}$/.test(config.account_id || '') || !/^[a-f0-9-]{36}$/.test(database?.database_id || '')) {
  console.error('Deployment is not configured. Set the existing Reclaim Cloudflare account_id and the D1 database_id in wrangler.jsonc. See docs/ACCOUNTS.md.');
  process.exit(1);
}

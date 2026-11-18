// Đóng gói scripts/phu-troi-eval.ts bằng esbuild rồi chạy (tham số chuyển nguyên cho phu-troi-eval.ts).
import { build } from 'esbuild';
import { spawnSync } from 'child_process';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(mkdtempSync(join(tmpdir(), 'phu-troi-eval-')), 'eval.cjs');
await build({
  entryPoints: [join(here, 'phu-troi-eval.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: out,
  tsconfig: join(here, '..', 'tsconfig.json'),
  logLevel: 'error',
});
const run = spawnSync(process.execPath, [out, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(run.status ?? 1);

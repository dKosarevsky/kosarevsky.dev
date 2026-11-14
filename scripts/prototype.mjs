import { build, context } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';

const root = fileURLToPath(new URL('../prototypes/multiverse/', import.meta.url));
const options = {
  entryPoints: [`${root}main.js`],
  outfile: `${root}dist/main.js`,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  minify: true,
  legalComments: 'linked',
  logLevel: 'info',
};

if (process.argv.includes('--serve')) {
  const development = await context(options);
  await development.watch();
  const server = await development.serve({ servedir: root, host: '127.0.0.1', port: 4174 });
  console.log(`Multiverse prototype: http://${server.hosts[0]}:${server.port}/`);
  const stop = async () => { await development.dispose(); process.exit(0); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} else {
  await build(options);
  const bytes = await readFile(options.outfile);
  console.log(`Prototype JS: ${(bytes.length / 1024).toFixed(1)} KiB raw / ${(gzipSync(bytes).length / 1024).toFixed(1)} KiB gzip.`);
}

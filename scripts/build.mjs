import { mkdir, rm, copyFile, cp } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'conta.html', 'forum.html', 'missoes.html', 'privacidade.html', '_headers', '_routes.json']) await copyFile(file, `dist/${file}`);
await cp('assets', 'dist/assets', { recursive: true });
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'pages', 'functions', 'build', '--outdir', 'dist/_worker.js', '--minify'], { stdio: 'inherit', env: process.env });
if (result.status !== 0) process.exit(result.status || 1);
console.log('Site e API prontos em dist/. Nenhuma credencial é copiada para o site.');

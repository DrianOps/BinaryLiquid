import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const distDir = path.join(pkgRoot, 'dist');

fs.mkdirSync(distDir, { recursive: true });

function resolveBin(name) {
  const candidates = [
    path.join(pkgRoot, 'node_modules', '.bin', name),
    path.resolve(pkgRoot, '..', '..', 'frontend', 'node_modules', '.bin', name)
  ];
  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }
  return name;
}

const esbuildBin = resolveBin('esbuild');
const tscBin = resolveBin('tsc');
const externals = ['@noble/curves', '@noble/hashes', 'nostr-tools'];
const externalFlags = externals.flatMap((pkg) => [`--external:${pkg}`]);

const entry = path.join(pkgRoot, 'src', 'index.ts');

execFileSync(
  esbuildBin,
  [
    entry,
    '--bundle',
    '--format=esm',
    '--platform=neutral',
    '--target=es2022',
    ...externalFlags,
    `--outfile=${path.join(distDir, 'index.mjs')}`
  ],
  { stdio: 'inherit', cwd: pkgRoot }
);

execFileSync(
  esbuildBin,
  [
    entry,
    '--bundle',
    '--format=cjs',
    '--platform=node',
    '--target=es2022',
    ...externalFlags,
    `--outfile=${path.join(distDir, 'index.cjs')}`
  ],
  { stdio: 'inherit', cwd: pkgRoot }
);

const frontendModules = path.resolve(pkgRoot, '..', '..', 'frontend', 'node_modules');
const tscArgs = ['-p', path.join(pkgRoot, 'tsconfig.json')];
if (!fs.existsSync(path.join(pkgRoot, 'node_modules')) && fs.existsSync(frontendModules)) {
  // Resolve installed peer types seamlessly inside monorepo checkouts without extra npm install
  const tmpTsconfig = {
    extends: './tsconfig.json',
    compilerOptions: {
      baseUrl: '.',
      paths: {
        '*': [path.relative(pkgRoot, frontendModules) + '/*']
      }
    }
  };
  const tmpPath = path.join(pkgRoot, '.tsconfig.build.json');
  fs.writeFileSync(tmpPath, JSON.stringify(tmpTsconfig, null, 2));
  try {
    execFileSync(tscBin, ['-p', tmpPath], { stdio: 'inherit', cwd: pkgRoot });
  } finally {
    fs.rmSync(tmpPath, { force: true });
  }
} else {
  execFileSync(tscBin, tscArgs, { stdio: 'inherit', cwd: pkgRoot });
}

console.log('Built @binaryliquid/userlink-sdk -> dist/index.mjs, dist/index.cjs, dist/index.d.ts');

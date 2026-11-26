import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import rollupConfig from '../../rollup.config.js';

// Package export targets must match the emitted file names exactly, including
// case: Linux and other case-sensitive filesystems will not resolve
// `dist/Webdggrid.js` when the build writes `dist/webdggrid.js`.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

// Files rollup writes, e.g. ./dist/webdggrid.js and ./dist/webdggrid.umd.js
const rollupOutputs = new Set<string>(
    (rollupConfig({}) as { output: { file: string }[] }[])
        .flatMap(c => c.output.map(o => `./${o.file}`)),
);

// Declarations tsc writes, one per top-level src-ts/*.ts file
const declarationOutputs = new Set<string>(
    readdirSync(resolve(root, 'src-ts'))
        .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'))
        .map(f => `./types/${basename(f, '.ts')}.d.ts`),
);

const targets: [string, string, string][] = Object.entries(
    pkg.exports as Record<string, Record<string, string>>,
).flatMap(([subpath, conditions]) =>
    Object.entries(conditions).map(([cond, target]) => [subpath, cond, target] as [string, string, string]),
);

describe('package.json exports', () => {
    test.each(targets)('%s (%s) → %s is an emitted file', (_subpath, cond, target) => {
        const emitted = cond === 'types' ? declarationOutputs : rollupOutputs;
        expect([...emitted]).toContain(target);
    });

    test('the documented webdggrid/Webdggrid subpath is exported', () => {
        expect(pkg.exports).toHaveProperty(['./Webdggrid']);
    });
});

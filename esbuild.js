/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

"use strict";

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const distDir = path.join(__dirname, 'dist');

// Modules that must NOT be bundled into extension.bundle.js:
// - vscode: provided by the extension host at runtime.
// - bufferutil / utf-8-validate: optional native addons for `ws`; left external so `ws` uses its JS
//   fallback when they are not present (they are excluded from the VSIX via .vscodeignore).
// - open: ESM-only and locates its platform helper scripts relative to its own files, so bundling it
//   would break browser-launch on Linux. It is kept external and copied into dist/node_modules together
//   with its dependency closure, matching the previous webpack build.
const external = ['vscode', 'bufferutil', 'utf-8-validate', 'open'];

// Copies `open` and its transitive dependency closure into dist/node_modules so that the external
// `require('open')` in the bundle resolves at runtime. Nested (non-hoisted) dependencies travel with
// their parent package because each package directory is copied whole.
function copyExternalRuntimeModules() {
    const srcRoot = path.join(__dirname, 'node_modules');
    const destRoot = path.join(distDir, 'node_modules');
    const copied = new Set();
    const stack = ['open'];

    while (stack.length > 0) {
        const name = stack.pop();
        if (copied.has(name)) {
            continue;
        }
        const srcDir = path.join(srcRoot, name);
        if (!fs.existsSync(srcDir)) {
            continue; // hoisted under a parent package; already copied with that package
        }
        copied.add(name);

        const destDir = path.join(destRoot, name);
        fs.rmSync(destDir, { recursive: true, force: true });
        fs.mkdirSync(path.dirname(destDir), { recursive: true });
        fs.cpSync(srcDir, destDir, { recursive: true });

        const pkg = JSON.parse(fs.readFileSync(path.join(srcDir, 'package.json'), 'utf8'));
        for (const dep of Object.keys(pkg.dependencies || {})) {
            stack.push(dep);
        }
    }

    console.log(`[esbuild] copied ${copied.size} external runtime module(s) into dist/node_modules`);
}

/** @type {import('esbuild').Plugin} */
const buildReporterPlugin = {
    name: 'build-reporter',
    setup(build) {
        build.onEnd((result) => {
            for (const err of result.errors) {
                console.error(`✘ [ERROR] ${err.text}${err.location ? ` (${err.location.file}:${err.location.line})` : ''}`);
            }
            console.log(`[esbuild] build finished: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
        });
    },
};

async function main() {
    fs.rmSync(distDir, { recursive: true, force: true });

    const ctx = await esbuild.context({
        entryPoints: ['extension.bundle.ts'],
        outfile: 'dist/extension.bundle.js',
        bundle: true,
        format: 'cjs',
        platform: 'node',
        target: 'node20',
        external,
        sourcemap: !production,
        sourcesContent: false,
        minify: production,
        keepNames: true,
        logLevel: 'warning',
        plugins: [buildReporterPlugin],
    });

    await ctx.rebuild();
    copyExternalRuntimeModules();

    if (watch) {
        await ctx.watch();
    } else {
        await ctx.dispose();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

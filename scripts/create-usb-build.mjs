import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');
const releaseDir = path.join(projectRoot, 'usb-release');

let html = await readFile(path.join(distDir, 'index.html'), 'utf8');
const jsFiles = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)];
const cssFiles = [...html.matchAll(/<link\b[^>]*\bhref="([^"]+\.css)"[^>]*>/g)];

if (jsFiles.length !== 1 || cssFiles.length !== 1) {
  throw new Error('Expected one bundled JavaScript file and one bundled CSS file in dist/index.html.');
}

const jsPath = path.join(distDir, jsFiles[0][1].replace(/^\//, ''));
const cssPath = path.join(distDir, cssFiles[0][1].replace(/^\//, ''));
const [js, css] = await Promise.all([readFile(jsPath, 'utf8'), readFile(cssPath, 'utf8')]);

html = html.replace(jsFiles[0][0], () => `<script type="module">${js}</script>`);
html = html.replace(cssFiles[0][0], () => `<style>${css}</style>`);

if (/\b(?:src|href)="\/assets\//.test(html)) {
  throw new Error('The generated page still refers to external asset files and cannot run by itself.');
}

await rm(releaseDir, { recursive: true, force: true });
await mkdir(releaseDir, { recursive: true });
await writeFile(path.join(releaseDir, 'QuantumSIM.html'), html, 'utf8');
await copyFile(path.join(projectRoot, 'Start-QuantumSIM.bat'), path.join(releaseDir, 'Start-QuantumSIM.bat'));
await copyFile(path.join(projectRoot, 'USB-README.txt'), path.join(releaseDir, 'USB-README.txt'));
console.log(`USB-ready website created at ${path.join(releaseDir, 'QuantumSIM.html')}`);

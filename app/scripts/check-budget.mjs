// Bundle budget for the production build (run after `npm run build`).
// Fails if the first paint gets heavier than it needs to be.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

// Optional first argument: another build folder to check.
const DIST = process.argv[2] ? `${process.argv[2].replace(/[\\/]$/, "")}/` : fileURLToPath(new URL("../dist/", import.meta.url));
// Lazy 3D chunks: the roof scene, the props stage, and the shared three.js chunk
// (Rollup names that one after a module inside it, currently the meshopt decoder).
const THREE_CHUNK = /^(assets|RoofScene|stage|kinds|meshopt_decoder\.module|three\.module)-.*\.js$/;
const glbBytes = (dir) => {
  const url = new URL(`../public/${dir}/`, import.meta.url);
  return readdirSync(fileURLToPath(url))
    .filter((f) => f.endsWith(".glb"))
    .reduce((n, f) => n + statSync(new URL(f, url)).size, 0);
};
const html = readFileSync(`${DIST}index.html`, "utf8");
const assets = readdirSync(`${DIST}assets`);
const gz = (f) => gzipSync(readFileSync(`${DIST}assets/${f}`)).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

// What index.html loads before anything else (entry script, preloads, CSS).
const entry = [...html.matchAll(/(?:src|href)="\.\/assets\/([^"]+)"/g)].map((m) => m[1]);
const entryJs = entry.filter((f) => f.endsWith(".js")).reduce((n, f) => n + gz(f), 0);
const entryCss = entry.filter((f) => f.endsWith(".css")).reduce((n, f) => n + gz(f), 0);
const landing = assets.filter((f) => /^Landing-.*\.js$/.test(f)).reduce((n, f) => n + gz(f), 0);
const three = assets.filter((f) => THREE_CHUNK.test(f)).reduce((n, f) => n + gz(f), 0);
const models = glbBytes("models");
// The two tool-card props load one at a time as their card nears the viewport.
const props = glbBytes("props");

const rows = [
  ["Entry JS (gzip)", entryJs, 200 * 1024],
  ["Entry CSS (gzip)", entryCss, 50 * 1024],
  ["Landing route JS (gzip)", landing, 30 * 1024],
  ["3D chunks, lazy (gzip)", three, 450 * 1024],
  ["CC0 models (meshopt)", models, 700 * 1024],
  ["CC0 props, tool cards", props, 300 * 1024],
];
let fail = false;
for (const [name, size, max] of rows) {
  const ok = size <= max;
  fail ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(26)} ${kb(size).padStart(10)}  budget ${kb(max)}`);
}
// three.js must not be on the critical path.
const threeOnEntry = entry.some((f) => THREE_CHUNK.test(f));
console.log(`${threeOnEntry ? "FAIL" : "ok  "} three.js stays off the entry path`);
if (fail || threeOnEntry) process.exit(1);

// Downloads the CC0 "props" drawn in the landing's tool cards (a magnifying
// glass for Quote Check, a multimeter for Bill Audit; the solar panel is
// built in code), and packs
// them for the web the same way fetch-assets.mjs packs the rooftop models:
// meshopt geometry, WebP textures, one .glb each.
//
// Separate from fetch-assets.mjs so the rooftop assets stay byte-identical.
// Every model is CC0 from Poly Haven (https://polyhaven.com/license);
// public/props/credits.json lists the source page of each one anyway.
//
// Usage: node scripts/fetch-props.mjs   (writes public/props)

import { mkdirSync, rmSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, weld, simplify, textureCompress, meshopt, resample, flatten, join as joinMeshes } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "node_modules", ".cache", "polyhaven");
const OUT = join(ROOT, "public", "props");
const API = "https://api.polyhaven.com";

/**
 * id: Poly Haven asset id. as: output name. ratio: simplify (1 = keep).
 * tex: texture edge in px. nodes: keep the node tree (for parts that move).
 */
const PROPS = [
  { id: "magnifying_glass_01", as: "magnifier", ratio: 1, tex: 512, role: "Quote Check: the second look before you sign" },
  { id: "retro_multimeter", as: "multimeter", ratio: 0.7, tex: 512, role: "Bill Audit: checks the meter arithmetic" },
];

async function getJSON(url) {
  const r = await fetch(url, { headers: { "user-agent": "chhat-asset-fetch" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function download(url, file) {
  if (existsSync(file) && statSync(file).size > 0) return;
  mkdirSync(dirname(file), { recursive: true });
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      writeFileSync(file, Buffer.from(await r.arrayBuffer()));
      return;
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise((res) => setTimeout(res, 2 ** attempt * 1000));
    }
  }
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function pack(m, io) {
  const files = await getJSON(`${API}/files/${m.id}`);
  const g = files.gltf["1k"].gltf;
  const dir = join(CACHE, m.id);
  const gltfPath = join(dir, `${m.id}.gltf`);
  await download(g.url, gltfPath);
  for (const [rel, info] of Object.entries(g.include)) await download(info.url, join(dir, rel));

  const doc = await io.read(gltfPath);
  doc.getRoot().listExtensionsUsed().forEach((ext) => {
    if (ext.extensionName === "KHR_materials_variants") ext.dispose();
  });
  await doc.transform(
    ...(m.nodes ? [] : [flatten(), joinMeshes()]),
    dedup(),
    weld(),
    ...(m.ratio < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio: m.ratio, error: 0.002 })] : []),
    resample(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [m.tex, m.tex], quality: 80 }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const out = join(OUT, `${m.as}.glb`);
  await io.write(out, doc);
  const size = statSync(out).size;
  const tris = doc
    .getRoot()
    .listMeshes()
    .flatMap((mesh) => mesh.listPrimitives())
    .reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0);
  const nodes = doc.getRoot().listNodes().map((n) => n.getName()).filter(Boolean);
  console.log(`prop  ${m.as.padEnd(11)} ${kb(size).padStart(7)}  ${String(Math.round(tris)).padStart(6)} tris  <- ${m.id}${m.nodes ? `  nodes: ${nodes.join(", ")}` : ""}`);
  return { file: `props/${m.as}.glb`, source: `https://polyhaven.com/a/${m.id}`, id: m.id, license: "CC0", role: m.role, bytes: size, tris: Math.round(tris) };
}

async function main() {
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  const only = process.argv.slice(2);
  if (!only.length) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const io = new NodeIO(fetch).registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });

  const props = [];
  for (const m of PROPS) {
    if (only.length && !only.includes(m.as)) continue;
    props.push(await pack(m, io));
  }
  if (only.length) return;
  writeFileSync(
    join(OUT, "credits.json"),
    JSON.stringify({ note: "All props are CC0 (public domain) from Poly Haven. Processed by scripts/fetch-props.mjs.", generated: new Date().toISOString().slice(0, 10), props }, null, 2) + "\n",
  );
  console.log(`\n${props.length} props, ${kb(props.reduce((n, p) => n + p.bytes, 0))} in total`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

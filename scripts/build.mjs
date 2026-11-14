import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
const entries = [
  "index.html",
  "404.html",
  "assets",
  "CNAME",
  ".nojekyll",
  "robots.txt",
  "sitemap.xml",
];

// Validate inputs before touching the previous build.
await Promise.all([...entries, "src/multiverse/scene.js"].map((entry) => stat(path.join(root, entry))));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of entries) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true, filter: source => path.basename(source) !== '.DS_Store' });
}
await build({
  entryPoints: [path.join(root, "src/multiverse/scene.js")],
  outfile: path.join(output, "assets/multiverse-scene.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  treeShaking: true,
  legalComments: "linked",
  logLevel: "info",
});
// One content revision keeps HTML and the complete lazy module graph in sync.
const hash = createHash("sha256");
for (const name of ["app.js", "projects.js", "multiverse.js", "multiverse-scene.js", "style.css", "hero/multiverse-poster.webp"]) {
  hash.update(name + "\0").update(await readFile(path.join(output, "assets", name)));
}
const revision = hash.digest("hex").slice(0, 12);
const versionedReferences = {
  "index.html": ["./assets/app.js", "./assets/style.css", "./assets/hero/multiverse-poster.webp"],
  "assets/app.js": ["./projects.js", "./multiverse.js"],
  "assets/multiverse.js": ["./multiverse-scene.js"],
};
for (const [file, references] of Object.entries(versionedReferences)) {
  const destination = path.join(output, file);
  let source = await readFile(destination, "utf8");
  for (const reference of references) source = source.replaceAll(reference, `${reference}?v=${revision}`);
  await writeFile(destination, source);
}
console.log(`Built public files and the local Multiverse scene into dist/ (revision ${revision}).`);

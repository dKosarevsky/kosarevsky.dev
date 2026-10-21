import { cp, mkdir, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

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
await Promise.all(entries.map((entry) => stat(path.join(root, entry))));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of entries) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}
console.log(`Built ${entries.length} entries into dist/.`);

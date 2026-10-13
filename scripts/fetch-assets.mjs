// Downloads every image listed in assets.json that isn't already on disk.
// Runs as part of `npm run build`.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { files } = JSON.parse(await readFile(join(root, "assets.json"), "utf8"));
const force = process.argv.includes("--force");

let failed = 0;
await Promise.all(
  Object.entries(files).map(async ([path, url]) => {
    const dest = join(root, path);
    if (!force) {
      try {
        await access(dest);
        return;
      } catch {}
    }
    try {
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 eve-gomez.com build" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      console.log(`fetched ${path}`);
    } catch (err) {
      failed++;
      console.error(`could not fetch ${path}: ${err.message}`);
    }
  })
);

if (failed) process.exit(1);

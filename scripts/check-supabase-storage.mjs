import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const requiredFiles = [
  "drizzle/0003_supabase_storage_images.sql",
  "lib/server/supabase-storage.ts",
  "lib/server/inspection-images.ts",
  "app/api/images/upload-url/route.ts",
  "app/api/images/complete/route.ts",
  "app/api/images/route.ts",
  "app/api/agent/images/upload-url/route.ts",
  "app/api/agent/images/complete/route.ts",
  "app/api/agent/detections/route.ts",
  "docs/api/images-v1.md",
];

const read = (path) => readFileSync(resolve(root, path), "utf8");
const failures = [];
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => failures.push(message);

for (const path of requiredFiles) {
  try {
    read(path);
    pass(path);
  } catch {
    fail(`missing ${path}`);
  }
}

const hosting = read(".openai/hosting.json");
if (/"r2"|site-creator-r2/.test(hosting)) fail(".openai/hosting.json still contains R2");
else pass("hosting config has no R2 binding");

const vite = read("vite.config.ts");
if (/r2_buckets|site-creator-r2|\br2\b/i.test(vite)) fail("vite.config.ts still contains R2 binding");
else pass("Vite binding config has no R2");

const worker = read("worker/index.ts");
if (/env\.IMAGES|handleImageOptimization|vinext\/server\/image-optimization/.test(worker)) fail("Worker still depends on Cloudflare Images");
else pass("Worker has no Cloudflare Images dependency");

const wrangler = read("wrangler.staging.jsonc");
if (!/0 20 \* \* \*/.test(wrangler)) fail("staging cron is not 03:00 Asia/Bangkok (20:00 UTC)");
else pass("staging retention cron configured");

const migration = read("drizzle/0003_supabase_storage_images.sql");
if (!/inspection_images/.test(migration) || !/image_id/.test(migration)) fail("image migration is incomplete");
else pass("image migration includes image table and detection link");

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
for (const path of tracked) {
  const content = read(path);
  if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?!\s*$|<|your|replace)/i.test(content)) fail(`possible Service Role Key value in ${path}`);
}
pass("no non-placeholder Service Role Key assignment in tracked files");

if (failures.length) {
  console.error(`FAIL ${failures.length} storage checks`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Storage checks complete.");
}

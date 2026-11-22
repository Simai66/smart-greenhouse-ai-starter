import { readFile, writeFile } from "node:fs/promises";

const databaseName = process.env.CLOUDFLARE_PREVIEW_D1_NAME?.trim();
const databaseId = process.env.CLOUDFLARE_PREVIEW_D1_ID?.trim();
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const localDatabaseId = "00000000-0000-4000-8000-000000000000";

if (!databaseName || !databaseId || !uuid.test(databaseId) || databaseId === localDatabaseId || databaseId === "00000000-0000-0000-0000-000000000000") {
  throw new Error("Set CLOUDFLARE_PREVIEW_D1_NAME and CLOUDFLARE_PREVIEW_D1_ID to a real preview D1 database.");
}

const generatedConfig = new URL("../dist/server/wrangler.json", import.meta.url);
const previewConfig = new URL("wrangler.preview.json", generatedConfig);
const config = JSON.parse(await readFile(generatedConfig, "utf8"));
const database = config.d1_databases?.find(({ binding }) => binding === "DB");

if (!database) {
  throw new Error("The built Wrangler configuration is missing the DB binding. Run npm run build first.");
}

config.name = "smart-greenhouse-ai-starter";
config.topLevelName = config.name;
config.vars = { ...config.vars, GREENHOUSE_AUTH_MODE: "cloudflare-access" };
database.database_name = databaseName;
database.database_id = databaseId;

// Keep the preview config beside the generated config so bundle and asset paths still resolve.
await writeFile(previewConfig, `${JSON.stringify(config, null, 2)}\n`);

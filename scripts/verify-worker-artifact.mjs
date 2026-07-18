const workerUrl = process.env.SITES_WORKER_URL;

if (!workerUrl) {
  throw new Error("SITES_WORKER_URL must point to a local Wrangler worker");
}

const response = await fetch(new URL("/", workerUrl), {
  headers: { accept: "text/html" },
});

if (response.status !== 200) {
  throw new Error(`Local Worker root request returned ${response.status}`);
}

const contentType = response.headers.get("content-type") ?? "";
if (!/^text\/html\b/i.test(contentType)) {
  throw new Error(`Local Worker root request returned ${contentType || "no content-type"}`);
}

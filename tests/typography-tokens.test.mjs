import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the readable rem typography baseline for the active dashboard", async () => {
  const [css, header] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/site-header.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(css, /--type-caption:\s*0\.875rem;/);
  assert.match(css, /--type-label:\s*1rem;/);
  assert.match(css, /--type-body:\s*1rem;/);
  assert.match(css, /--type-section:\s*1\.25rem;/);
  assert.match(css, /--type-page:\s*2\.5rem;/);
  assert.match(css, /--type-display:\s*3rem;/);
  assert.doesNotMatch(css, /font-size:\s*\d+(?:\.\d+)?px/);
  assert.match(
    css,
    /font-family:\s*"Noto Sans Thai",\s*"Leelawadee UI",\s*Tahoma,\s*Arial,\s*sans-serif;/,
  );
  assert.match(css, /outline:\s*0\.125rem solid var\(--ring\);/);
  assert.match(css, /\.text-xs\s*\{\s*font-size:\s*var\(--type-caption\);/);
  assert.doesNotMatch(header, /text-\[0\.625rem\]/);
});

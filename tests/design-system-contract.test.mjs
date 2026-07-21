import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("configures shadcn with the approved greenhouse token contract", async () => {
  const config = JSON.parse(
    await readFile(new URL("../components.json", import.meta.url), "utf8"),
  );
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.equal(config.style, "new-york");
  assert.equal(config.rsc, true);
  assert.equal(config.tailwind.baseColor, "neutral");
  assert.equal(config.tailwind.cssVariables, true);
  assert.equal(config.iconLibrary, "lucide");
  assert.match(css, /--primary:\s*#25734f;/i);
  assert.match(css, /--sidebar:\s*#173f2d;/i);
  assert.match(css, /--background:\s*#f3f5f3;/i);
  assert.match(css, /--destructive:\s*#b9413a;/i);
  assert.match(
    css,
    /body\s*\{[^}]*font-family:\s*"Noto Sans Thai",\s*"Leelawadee UI",\s*Tahoma,\s*Arial,\s*sans-serif;/i,
  );

  const definedCustomProperties = new Set(
    [...css.matchAll(/(--[a-z0-9_-]+)\s*:/gi)].map((match) => match[1]),
  );
  const unresolvedCustomProperties = [
    ...new Set(
      [...css.matchAll(/var\((--[a-z0-9_-]+)/gi)]
        .map((match) => match[1])
        .filter((property) => !definedCustomProperties.has(property)),
    ),
  ].sort();

  assert.deepEqual(unresolvedCustomProperties, []);
});

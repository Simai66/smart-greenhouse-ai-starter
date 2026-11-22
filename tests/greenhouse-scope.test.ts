import assert from "node:assert/strict";
import test from "node:test";
import { authorizeGreenhouseScope } from "../lib/greenhouse-scope.ts";

test("pilot scope allows only GH-01", async () => {
  assert.equal(authorizeGreenhouseScope("GH-01"), null);

  const denied = authorizeGreenhouseScope("GH-02");
  assert.ok(denied);
  assert.equal(denied.status, 403);
  assert.deepEqual(await denied.json(), {
    error: {
      code: "GREENHOUSE_FORBIDDEN",
      message: "Only GH-01 is available in the pilot.",
    },
  });
  assert.equal(authorizeGreenhouseScope(null)?.status, 403);
});

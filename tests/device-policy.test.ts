import assert from "node:assert/strict";
import test from "node:test";
import { policyAllowsManualCommand, validateDevicePolicy } from "../lib/server/device-policy.ts";

const capabilities = {
  manual: true,
  schedule: true,
  thresholdMetrics: ["temperature", "soil_moisture"],
  maxRuntimeSeconds: 300,
  maxCooldownSeconds: 600,
};

const policy = {
  mode: "auto" as const,
  manualAllowed: true,
  threshold: { metric: "soil_moisture" as const, operator: "below" as const, value: 35 },
  maxRuntimeSeconds: 180,
  cooldownSeconds: 60,
};

test("accepts a policy only when every requested capability is present", () => {
  assert.deepEqual(validateDevicePolicy(policy, capabilities).policy, policy);
  assert.match(validateDevicePolicy({ ...policy, threshold: { metric: "humidity", operator: "below", value: 60 } }, capabilities).error ?? "", /threshold/);
  assert.match(validateDevicePolicy({ ...policy, maxRuntimeSeconds: 301 }, capabilities).error ?? "", /Runtime/);
});

test("manual command enforcement is fail closed for absent or excessive policy", () => {
  assert.equal(policyAllowsManualCommand(null, "turn_on").allowed, false);
  assert.equal(policyAllowsManualCommand(JSON.stringify(policy), "turn_on", 181).allowed, false);
  assert.equal(policyAllowsManualCommand(JSON.stringify(policy), "turn_on", 180).allowed, true);
  assert.equal(policyAllowsManualCommand(null, "emergency_stop").allowed, true);
});

import { spawn } from "node:child_process";

function parseDuration(value) {
  const match = /^(\d+)(ms|s|m)$/.exec(value);
  if (!match) throw new Error(`Unsupported duration: ${value}`);

  const amount = Number(match[1]);
  return amount * ({ ms: 1, s: 1_000, m: 60_000 }[match[2]]);
}

const separator = process.argv.indexOf("--");
if (separator === -1 || separator === process.argv.length - 1) {
  throw new Error("Usage: run-with-timeout.mjs --timeout=3m --kill-after=10s -- command [args...]");
}

const options = Object.fromEntries(
  process.argv.slice(2, separator).map((option) => {
    const [key, value] = option.split("=", 2);
    return [key, value];
  }),
);
const timeoutMs = parseDuration(options["--timeout"] ?? "3m");
const killAfterMs = parseDuration(options["--kill-after"] ?? "10s");
const [command, ...args] = process.argv.slice(separator + 1);
const child = spawn(command, args, { stdio: "inherit" });

let timedOut = false;
const timeout = setTimeout(() => {
  timedOut = true;
  console.error(`Build exceeded ${options["--timeout"] ?? "3m"}; sending SIGTERM.`);
  child.kill("SIGTERM");
}, timeoutMs);
const forceKill = setTimeout(() => {
  if (!child.killed) {
    console.error("Build did not stop after SIGTERM; sending SIGKILL.");
    child.kill("SIGKILL");
  }
}, timeoutMs + killAfterMs);

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  clearTimeout(timeout);
  clearTimeout(forceKill);
  process.exitCode = timedOut ? 124 : (code ?? (signal ? 1 : 0));
});

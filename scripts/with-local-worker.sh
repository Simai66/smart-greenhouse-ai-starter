#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

if [[ "$#" -eq 0 ]]; then
  echo "usage: scripts/with-local-worker.sh command [args...]" >&2
  exit 64
fi

worker_config="${SITES_PROJECT_ROOT}/dist/server/wrangler.json"
[[ -f "${worker_config}" ]] || {
  echo "Missing Worker configuration: dist/server/wrangler.json" >&2
  exit 66
}

port="$(node --input-type=module <<'NODE'
import { createServer } from "node:net";

const server = createServer();
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (typeof address === "string" || !address) process.exitCode = 1;
  else process.stdout.write(String(address.port));
  server.close();
});
NODE
)"

worker_url="http://127.0.0.1:${port}"
worker_log="$(mktemp "${TMPDIR}/smart-greenhouse-worker.XXXXXX.log")"
worker_pid=""

cleanup() {
  local status="$?"
  trap - EXIT INT TERM
  if [[ -n "${worker_pid}" ]] && kill -0 "${worker_pid}" 2>/dev/null; then
    kill "${worker_pid}" 2>/dev/null || true
    for _ in {1..20}; do
      kill -0 "${worker_pid}" 2>/dev/null || break
      sleep 0.1
    done
    kill -9 "${worker_pid}" 2>/dev/null || true
  fi
  rm -f "${worker_log}"
  exit "${status}"
}
trap cleanup EXIT INT TERM

"${SITES_PROJECT_ROOT}/node_modules/.bin/wrangler" dev \
  --local \
  --config "${worker_config}" \
  --cwd "${SITES_PROJECT_ROOT}/dist/server" \
  --ip 127.0.0.1 \
  --port "${port}" \
  --persist-to "${SITES_RUNTIME_ROOT:-${SITES_PROJECT_ROOT}/.sites-runtime}/wrangler/state" \
  --log-level error \
  --show-interactive-dev-session=false \
  >"${worker_log}" 2>&1 &
worker_pid="$!"

for _ in {1..120}; do
  if curl --silent --show-error --fail --output /dev/null "${worker_url}/" 2>/dev/null; then
    SITES_WORKER_URL="${worker_url}" "$@"
    exit "$?"
  fi
  if ! kill -0 "${worker_pid}" 2>/dev/null; then
    cat "${worker_log}" >&2
    echo "Local Wrangler worker exited before becoming ready." >&2
    exit 70
  fi
  sleep 0.25
done

cat "${worker_log}" >&2
echo "Timed out waiting for local Wrangler worker at ${worker_url}." >&2
exit 70

#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

worker="${SITES_PROJECT_ROOT}/dist/server/index.js"
hosting="${SITES_PROJECT_ROOT}/dist/.openai/hosting.json"

[[ -f "${worker}" ]] || {
  echo "Missing Sites Worker entry: dist/server/index.js" >&2
  exit 66
}
[[ -f "${hosting}" ]] || {
  echo "Missing packaged Sites manifest: dist/.openai/hosting.json" >&2
  exit 66
}

node --input-type=module - "${hosting}" <<'NODE'
import { readFile } from "node:fs/promises";

const [hostingPath] = process.argv.slice(2);
JSON.parse(await readFile(hostingPath, "utf8"));
NODE

"${script_dir}/with-local-worker.sh" node "${script_dir}/verify-worker-artifact.mjs"

echo "Validated Sites artifact: hosting manifest parsed and Worker served through local workerd."

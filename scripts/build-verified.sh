#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

vinext="${SITES_PROJECT_ROOT}/node_modules/.bin/vinext"
if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm run install:ci and wait for it to finish before building." >&2
  exit 69
fi

echo "Running bounded vinext build..."
node "${script_dir}/run-with-timeout.mjs" \
  --timeout="${SITES_BUILD_TIMEOUT:-3m}" \
  --kill-after="${SITES_BUILD_KILL_AFTER:-10s}" \
  -- "${vinext}" build

"${script_dir}/validate-artifact.sh"

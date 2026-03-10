#!/usr/bin/env bash
set -euo pipefail

REPO="agustif/only-test"
PACKAGE_NAME="@agustif/only-test"

if ! command -v node >/dev/null 2>&1; then
  echo "only-test requires Node.js to install the CLI package." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "only-test requires npm for the curl installer path." >&2
  exit 1
fi

latest_json="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest")"
version="$(
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const tag = payload.tag_name;
    if (typeof tag !== "string" || tag.length === 0) {
      process.exit(1);
    }
    process.stdout.write(tag.replace(/^v/, ""));
  ' "$latest_json"
)"
asset_url="$(
  node -e '
    const payload = JSON.parse(process.argv[1]);
    const assets = Array.isArray(payload.assets) ? payload.assets : [];
    const match = assets.find((asset) => typeof asset.name === "string" && asset.name.endsWith(".tgz"));
    if (!match || typeof match.browser_download_url !== "string") {
      process.exit(1);
    }
    process.stdout.write(match.browser_download_url);
  ' "$latest_json"
)"

echo "Installing ${PACKAGE_NAME}@${version}"
npm install -g "$asset_url"
echo
echo "Installed only-test."
echo "Run: only-test --help"

#!/usr/bin/env bash
# Draco-compress the raw Blender exports into assets/models/*.glb
# Requires Node.js; uses @gltf-transform/cli via npx.
set -euo pipefail
cd "$(dirname "$0")/.."
for f in assets/models/raw/*.glb; do
  name=$(basename "$f")
  npx --yes @gltf-transform/cli@4 optimize "$f" "assets/models/$name" \
      --compress draco --texture-compress false --simplify false --instance false --flatten false --join false --palette false
  ls -la "assets/models/$name"
done

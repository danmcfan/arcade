#!/bin/sh
# Regenerate every Go parity fixture under test/fixtures (run from the repo
# root). Must run under amd64 so Go does not fuse multiply-adds (§0 fact 3);
# CGO is required by Ebitengine's macOS driver. `frames` opens a window per
# scenario. See test/fixtures/README.md.
set -eu

export CGO_ENABLED=1 GOARCH=amd64
unset GOAMD64 # default v1; v3 re-enables FMA

bin="$(mktemp -d)/golden"
go build -o "$bin" ./tools/golden

"$bin" rng
if [ "${1:-}" = "--gen" ]; then
  "$bin" gen
fi
"$bin" trace all
for script in test/fixtures/inputs/*.json; do
  "$bin" frames "$script"
done
"$bin" verify
"$bin" coverage

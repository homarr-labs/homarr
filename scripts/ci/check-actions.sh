#!/usr/bin/env bash

set -euo pipefail

actionlint_version="1.7.12"
actionlint_checksum="8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8"
actionlint_archive="${RUNNER_TEMP:-/tmp}/actionlint_${actionlint_version}_linux_amd64.tar.gz"
actionlint_directory="${RUNNER_TEMP:-/tmp}/homarr-actionlint-${actionlint_version}"

curl --fail --silent --show-error --location \
  --output "$actionlint_archive" \
  "https://github.com/rhysd/actionlint/releases/download/v${actionlint_version}/actionlint_${actionlint_version}_linux_amd64.tar.gz"
printf '%s  %s\n' "$actionlint_checksum" "$actionlint_archive" | sha256sum --check -

mkdir -p "$actionlint_directory"
tar -xzf "$actionlint_archive" -C "$actionlint_directory"
"$actionlint_directory/actionlint" -shellcheck= -pyflakes= .github/workflows/*.yml

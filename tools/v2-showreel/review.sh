#!/usr/bin/env bash
# Downscale stills for the image reviewer: review.sh <tag> files...
set -euo pipefail
tag=${1:?usage: review.sh tag files...}
shift
case "$tag" in
  ""|*[!a-zA-Z0-9_-]*)
    echo "tag must contain only letters, digits, underscores or hyphens" >&2
    exit 1
    ;;
esac
out="out/review/$tag"
rm -rf -- "$out"
mkdir -p -- "$out"
for f in "$@"; do
  b=$(basename "$f" .png)
  magick "$f" -resize 1280x720 -quality 85 "$out/$b.jpg"
done
ls -- "$out"/*.jpg

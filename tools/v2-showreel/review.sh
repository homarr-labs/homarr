#!/usr/bin/env bash
# Downscale stills for the image reviewer: review.sh <tag> files...
tag=$1; shift
rm -rf out/review/$tag; mkdir -p out/review/$tag
for f in "$@"; do
  b=$(basename "$f" .png)
  magick "$f" -resize 1280x720 -quality 85 out/review/$tag/$b.jpg
done
ls out/review/$tag/*.jpg

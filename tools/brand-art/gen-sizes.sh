#!/bin/sh
# Records the natural size of every image the concepts crop from into assets/sizes.json.
set -eu
cd "$(dirname "$0")"
tmp=$(mktemp)
(
  echo "{"
  first=1
  for f in shots/widgets/*.webp shots/*.webp assets/blog/*.webp assets/blog/*.png; do
    [ -e "$f" ] || continue
    d=$(sips -g pixelWidth -g pixelHeight "$f" | tail -2 | awk '{print $2}' | paste -sd, -)
    [ $first = 0 ] && echo ","
    first=0
    printf '"%s":[%s]' "$f" "$d"
  done
  echo "}"
) > "$tmp"
mv "$tmp" assets/sizes.json
../../node_modules/.bin/oxfmt assets/sizes.json

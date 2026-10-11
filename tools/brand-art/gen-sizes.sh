#!/bin/sh
# Records the natural size of every image the concepts crop from into assets/sizes.json.
cd "$(dirname "$0")"
(
  echo "{"
  first=1
  for f in shots/widgets/*.webp shots/*.webp assets/blog/*.webp assets/blog/*.png; do
    d=$(sips -g pixelWidth -g pixelHeight "$f" | tail -2 | awk '{print $2}' | paste -sd, -)
    [ $first = 0 ] && echo ","
    first=0
    printf '"%s":[%s]' "$f" "$d"
  done
  echo "}"
) > assets/sizes.json

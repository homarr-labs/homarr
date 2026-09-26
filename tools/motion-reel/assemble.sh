#!/usr/bin/env bash
# Joins rendered chunks with the soundtracks into the two deliverables:
#   homarr-motion-reel.mp4     original reel (chunks-a) + everything new in v2 (chunks-b)
#   homarr-motion-reel-v2.mp4  black pre-roll + the v2 half only
set -euo pipefail
cd "$(dirname "$0")"

list() { for d in "$@"; do ls "$d"/c_*.mkv | grep -v '\.part\.mkv$'; done | sed "s|^|file '$PWD/|; s|$|'|"; }
encode() { # concat-list soundtrack output [extra video filter]
  ffmpeg -y -loglevel error -f concat -safe 0 -i "$1" -i "$2" -map 0:v -map 1:a \
    -vf "${4:+$4,}scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
    -c:v libx264 -preset slow -crf 15 -profile:v high -tune film \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -c:a aac -b:a 320k -movflags +faststart -shortest "$3"
}

list chunks-a chunks-b > list-global.txt
list chunks-b > list-v2cut.txt
pre=$(python3 -c "import json; print(round(json.load(open('warp-v2cut.json'))['pre'] * 60))")
encode list-global.txt soundtrack-global.wav homarr-motion-reel.mp4
encode list-v2cut.txt soundtrack-v2cut.wav homarr-motion-reel-v2.mp4 "tpad=start=$pre:color=black"
for f in homarr-motion-reel.mp4 homarr-motion-reel-v2.mp4; do
  ffprobe -v error -show_entries format=duration,size -of compact "$f"
done

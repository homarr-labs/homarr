#!/usr/bin/env bash
# Concatenate rendered segments, mux the soundtrack and encode the deliverable.
# The bitrate cap keeps the per-frame grain from inflating the file (2.3 GB at crf 17 vs ~650 MB) at little structural cost.
set -euo pipefail
cd "$(dirname "$0")"
out="${1:-out/homarr-v2-showreel.mp4}"
ffmpeg -y -loglevel error -f concat -safe 0 -i out/seg/list.txt -c copy out/master.mkv
ffmpeg -y -loglevel error -stats \
  -i out/master.mkv -i out/soundtrack.wav \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -crf 19 -maxrate 24M -bufsize 48M -pix_fmt yuv420p -profile:v high -tune film \
  -c:a aac -b:a 256k \
  -shortest -movflags +faststart \
  "$out"
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate -of compact "$out"

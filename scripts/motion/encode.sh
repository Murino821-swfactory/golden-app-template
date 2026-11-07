#!/usr/bin/env bash
# Encode a rendered light loop (T-340) into the three files the page ships:
#   public/motion/<name>.webm (VP9), .mp4 (H.264, Safari), .webp (the still: poster and reduced motion).
# Usage: scripts/motion/encode.sh <name> <frames-dir> <width> <height> [poster-frame]
# GOP=12 shortens the keyframe interval for a clip the scroll scrubs (T-368 `beam-layers`): a seek lands on a
# keyframe at most half a second away instead of decoding up to ten seconds of frames. Costs bytes; loops omit it.
# The frames are the PNG sequence `blender -b --factory-startup -P scripts/motion/<name>.py -- --out <dir> --anim …`
# writes (f_0001.png …). Grey light on black; the page tints it, so no colour is encoded.
set -euo pipefail
name=$1; frames=$2; w=$3; h=$4; poster=${5:-0001}
out=$(cd "$(dirname "$0")/../.." && pwd)/public/motion
mkdir -p "$out"
scale="scale=${w}:${h}:flags=lanczos,format=yuv420p"
gop=(); [ -n "${GOP:-}" ] && gop=(-g "$GOP")
ffmpeg -v error -y -framerate 24 -i "$frames/f_%04d.png" -vf "$scale" -c:v libvpx-vp9 -b:v 0 -crf "${VP9_CRF:-40}" \
  -row-mt 1 -deadline good -cpu-used 1 -pass 1 -an -f null /dev/null
ffmpeg -v error -y -framerate 24 -i "$frames/f_%04d.png" -vf "$scale" -c:v libvpx-vp9 -b:v 0 -crf "${VP9_CRF:-40}" \
  -row-mt 1 -deadline good -cpu-used 1 -pass 2 "${gop[@]}" -an "$out/$name.webm"
ffmpeg -v error -y -framerate 24 -i "$frames/f_%04d.png" -vf "$scale" -c:v libx264 -preset slow -tune grain -crf "${X264_CRF:-30}" \
  -profile:v high -movflags +faststart "${gop[@]}" -an "$out/$name.mp4"
ffmpeg -v error -y -i "$frames/f_${poster}.png" -vf "scale=${w}:${h}:flags=lanczos" -c:v libwebp -quality 82 "$out/$name.webp"
rm -f ffmpeg2pass-0.log
for f in "$name.webm" "$name.mp4" "$name.webp"; do printf "%-22s %7d B\n" "$f" "$(stat -c %s "$out/$f")"; done

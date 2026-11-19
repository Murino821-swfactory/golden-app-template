#!/usr/bin/env bash
# encode.sh — one hero film (T-460): real footage behind the editorial hero, played once and held.
#
#   scripts/film/encode.sh <name> <desktop source> <desktop crop> <phone source> <phone crop>
#
# Writes public/film/<name>.mp4 (1280x720), <name>-sm.mp4 (540x960) and the first frame of each
# as <name>.webp / <name>-sm.webp — the poster a visitor sees before the film (and instead of it
# under reduced motion), so playback starts from the picture already on screen. H.264 only: every
# browser plays it and a second codec would double what each prototype ships. No audio track.
# The crops are ffmpeg `crop=` arguments on the source (w:h:x:y); keep tests/hero-film.spec.ts green
# (the budget) after a re-encode.
set -euo pipefail
export LC_ALL=C
name="$1"; dsrc="$2"; dcrop="$3"; psrc="$4"; pcrop="$5"
out="$(cd "$(dirname "$0")/../.." && pwd)/public/film"
mkdir -p "$out"
x264=(-c:v libx264 -preset veryslow -profile:v high -pix_fmt yuv420p -g 48 -an -movflags +faststart)
ffmpeg -v error -y -i "$dsrc" -vf "crop=$dcrop,scale=1280:720:flags=lanczos,fps=24" "${x264[@]}" -crf "${CRF:-27}" "$out/$name.mp4"
ffmpeg -v error -y -i "$psrc" -vf "crop=$pcrop,scale=540:960:flags=lanczos,fps=24" "${x264[@]}" -crf "${CRF_SM:-28}" "$out/$name-sm.mp4"
ffmpeg -v error -y -i "$out/$name.mp4" -frames:v 1 -c:v libwebp -quality 72 "$out/$name.webp"
ffmpeg -v error -y -i "$out/$name-sm.mp4" -frames:v 1 -c:v libwebp -quality 72 "$out/$name-sm.webp"
ls -l "$out/$name"*

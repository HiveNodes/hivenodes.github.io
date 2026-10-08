#!/usr/bin/env bash
# Turn one raw delivery into exactly the files the site expects, then mark the shot ready in media/manifest.json.
#   tools/encode.sh SHOT RAW_FILE            e.g. tools/encode.sh shot03_network raw/shot03_network.mov
# Output, in media/cine/:
#   SHOT-av1.mp4   AV1 10-bit, 1920x804 (2.39:1; 803 rounded to even for 4:2:0), 24 fps, film-grain synthesis
#   SHOT.mp4       H.264 High, same frame, fallback for browsers without AV1
#   SHOT-2560-av1.mp4 / SHOT-2560.mp4   hero only (shot01_hero): 2560x1070
#   SHOT_poster.webp, SHOT_{400,800,1600}.webp   stills from the shot's text frame (cards also get a 16:9 crop)
# Every file is tagged BT.709 (browsers decode untagged HD as 709 anyway; tagging keeps the colours right everywhere),
# keyframes every 2 s (-g 48) so scroll-scrubbing seeks fast, +faststart so playback starts before the download ends.
set -euo pipefail
SHOT="${1:?shot name}"; RAW="${2:?raw file}"
cd "$(dirname "$0")/.."
OUT=media/cine; mkdir -p "$OUT"
[ -f "$RAW" ] || { echo "no such file: $RAW"; exit 2; }
TF=$(python3 -c "import json,sys;m=json.load(open('media/manifest.json'));print(m['$SHOT'].get('textFrame',24))")
CARD=$(python3 -c "import json;m=json.load(open('media/manifest.json'));print(1 if m['$SHOT'].get('card') else 0)")
DUR=$(python3 -c "import json;m=json.load(open('media/manifest.json'));print(m['$SHOT'].get('dur',6))")   # trim to the shot's length
COLOR="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
# centre crop to 2.39:1 (or 16:9 for cards), 24 fps, Lanczos scale
if [ "$CARD" = 1 ]; then CROP="crop='min(iw,ih*16/9)':'min(ih,iw*9/16)'"; W=1280; H=720; else CROP="crop='min(iw,ih*2.39)':'min(ih,trunc(iw/2.39/2)*2)'"; W=1920; H=804; fi
enc() { # $1 width $2 height $3 suffix
  local vf="$CROP,fps=24,scale=$1:$2:flags=lanczos,format=yuv420p10le,setsar=1"
  ffmpeg -v error -y -i "$RAW" -t "$DUR" -an -vf "$vf,zscale=matrix=709:transfer=709:primaries=709" -c:v libsvtav1 -preset 5 -crf 33 -g 48 \
    -svtav1-params "film-grain=8:film-grain-denoise=1" $COLOR -movflags +faststart "$OUT/$SHOT$3-av1.mp4" 2>/dev/null \
  || ffmpeg -v error -y -i "$RAW" -t "$DUR" -an -vf "$vf" -c:v libsvtav1 -preset 5 -crf 33 -g 48 -svtav1-params "film-grain=8:film-grain-denoise=1" \
    $COLOR -movflags +faststart "$OUT/$SHOT$3-av1.mp4"
  ffmpeg -v error -y -i "$RAW" -t "$DUR" -an -vf "$CROP,fps=24,scale=$1:$2:flags=lanczos,format=yuv420p,setsar=1" -c:v libx264 -preset slow -crf 21 \
    -profile:v high -g 48 -maxrate 4M -bufsize 8M $COLOR -movflags +faststart "$OUT/$SHOT$3.mp4"
}
enc $W $H ""
[ "$SHOT" = shot01_hero ] && enc 2560 1070 "-2560"
# stills from the text frame
T=$(python3 -c "print($TF/24)")
for w in 400 800 1600; do
  ffmpeg -v error -y -ss "$T" -i "$RAW" -frames:v 1 -vf "$CROP,scale=$w:-2:flags=lanczos" -q:v 80 "$OUT/${SHOT}_$w.webp"
done
cp "$OUT/${SHOT}_1600.webp" "$OUT/${SHOT}_poster.webp"
# verify, then mark ready
for f in "$OUT/$SHOT-av1.mp4" "$OUT/$SHOT.mp4"; do
  n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f")
  echo "$f: $n frames, $(stat -c %s "$f") bytes"
done
python3 - "$SHOT" <<'PY'
import json, sys
s = sys.argv[1]; m = json.load(open('media/manifest.json')); m[s]['ready'] = True
json.dump(m, open('media/manifest.json', 'w'), indent=1); print('manifest:', s, 'ready')
PY

#!/bin/bash
# Turns one reel into an adaptive HLS stream for the portfolio-media bucket.
#   bash scripts/encode-reel.sh "Eve Gomez - Vocal Reel.mp4" out/vocal-reel
# Writes master.m3u8 with 1080p, 720p, 540p and 360p renditions (fMP4, 4s
# segments with aligned keyframes) plus 720p.mp4 as a fallback. Add a
# poster.jpg to the folder, then upload it to
# portfolio-media/<site>/<reel>/ (served at https://media.austindevs.com/).
set -e
src=$1; out=$2
[ -n "$src" ] && [ -n "$out" ] || { echo "usage: $0 input.mp4 out-dir"; exit 1; }
mkdir -p "$out"
ffmpeg -v error -y -i "$src" \
  -filter_complex "[0:v]split=4[a][b][c][d];[a]scale=-2:1080[v0];[b]scale=-2:720[v1];[c]scale=-2:540[v2];[d]scale=-2:360[v3]" \
  -map "[v0]" -map 0:a:0 -map "[v1]" -map 0:a:0 -map "[v2]" -map 0:a:0 -map "[v3]" -map 0:a:0 \
  -c:v libx264 -preset medium -profile:v high -pix_fmt yuv420p -g 96 -keyint_min 96 -sc_threshold 0 \
  -b:v:0 4800k -maxrate:v:0 5300k -bufsize:v:0 9600k \
  -b:v:1 2600k -maxrate:v:1 2900k -bufsize:v:1 5200k \
  -b:v:2 1400k -maxrate:v:2 1600k -bufsize:v:2 2800k \
  -b:v:3 700k -maxrate:v:3 800k -bufsize:v:3 1400k \
  -c:a aac -b:a 128k -ac 2 -ar 48000 \
  -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_type fmp4 -hls_flags independent_segments \
  -hls_fmp4_init_filename init.mp4 -hls_segment_filename "$out/%v/seg_%03d.m4s" \
  -master_pl_name master.m3u8 -var_stream_map "v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:540p v:3,a:3,name:360p" \
  "$out/%v/index.m3u8"
ffmpeg -v error -y -i "$src" -map 0:v:0 -map 0:a:0 -vf scale=-2:720 -c:v libx264 -preset medium -crf 23 -maxrate 3000k -bufsize 6000k -pix_fmt yuv420p \
  -c:a aac -b:a 128k -ac 2 -movflags +faststart "$out/720p.mp4"
echo "done $out"

#!/bin/bash
i=$1; n=$(printf "%03d" $i)
[ -s work/ocr/$n.txt ] && exit 0
timeout 60 pdftoppm -r 220 -gray -png -f $i -l $i "/mnt/user-data/uploads/Dip_IFRS_Kit_2025_.pdf" /tmp/w$n 2>/dev/null
img=$(ls /tmp/w$n-*.png 2>/dev/null | head -1)
[ -n "$img" ] && timeout 90 tesseract "$img" work/ocr/$n --psm 6 -l eng 2>/dev/null
rm -f /tmp/w$n-*.png

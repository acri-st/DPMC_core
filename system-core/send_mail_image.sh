#! /bin/sh

if [ $# -lt 3 ]; then
    echo "$0: subject image_file users..."
    exit 2
fi
SUBJECT=$1
IMGFILE=$2
shift 2    

while [ $# -gt 0 ]; do
    metasend -S 10000000 -b -s "$SUBJECT" -/ mixed -t $1 -f $IMGFILE -m image/jpeg -e base64 -D "rgb Image on zone" 
    shift
done

#!/bin/bash

DIN1=$1
DIN2=$2

S1=$(date -u --date "${DIN1:0:4}-${DIN1:4:2}-${DIN1:6:2} ${DIN1:9:2}:${DIN1:11:2}:${DIN1:13:2}" +"%s")
S2=$(date -u --date "${DIN2:0:4}-${DIN2:4:2}-${DIN2:6:2} ${DIN2:9:2}:${DIN2:11:2}:${DIN2:13:2}" +"%s")

echo $((S2-S1))

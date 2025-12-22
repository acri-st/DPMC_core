#!/bin/bash

LOG=$1

if [ ! -f "$LOG" ]; then
  echo " Log path shall be specified "
  exit 1
fi

grep File_Name $LOG | grep S3 | sed "s+..*/S3+S3+" | sed "s/SEN3..*/SEN3/" | sort | uniq


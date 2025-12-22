#!/bin/bash

# -------------------------------------------------------------------
#
# This script increases regularly the number of jobs per host
#
# History:
#
# 2019-07-04 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
#  5 : invalid HOST_ID
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

#if [ $# -lt 2 ]; then
#  echo
#  echo " Syntax: $0 host_id nb_threads "
#  echo
#  exit 3
#else
#  HOST_ID=$1
#  NB_THREADS=$2
#fi

source ${LTA_HOME}/definitions.include

for N in 5 6 7 8 ; do
  for i in 70 71 72 73 74 75 76 77 78 79 80 81 82 83 ; do
    echo $i $N
    host_nb_threads.sh ${i} $N
    sleep 30
  done
  sleep 30
done

#for N in 15 16 17 18 19 20 ; do
#  for i in 70 71 72 73 74 77 78 79 80 81 82 83 ; do
#    echo $i $N
#    host_nb_threads.sh ${i} $N
#    sleep 5
#  done
#  sleep 240
#done

#for N in 21 22 23 24 ; do
#  for i in 78 79 80 81 82 83 ; do
#    echo $i $N
#    host_nb_threads.sh ${i} $N
#    sleep 5
#  done
#  sleep 240
#done

exit $ERROR


#!/bin/bash

# -------------------------------------------------------------------
#
# This script cleans the cache
#
# History:
#
# 2016-05-12 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

source ${LTA_HOME}/definitions.include

FORCE=false

while :
do
  case "$1" in
    -f)
      FORCE=true
      break
      ;;
    *)
      break
      ;;
  esac
done

# get host name
HOSTNAME=$(hostname | awk -F"." '{print $1}')
export HOSTNAME
echo " HOSTNAME=$HOSTNAME"

# get local cache directory from the database
CACHE_DIR_HOME=$(${PSQL_CMD} "SELECT cache_dir FROM processing.hosts WHERE hostname = '${HOSTNAME}';" | sed "s/|/ /g")
export CACHE_DIR_HOME

if $FORCE ; then
  OK=true
else
  echo " Clean $CACHE_DIR_HOME/s3_cache (y/n) ? "
  read AUX
  if [ "$AUX" = "y" -o "$AUX" = "Y" ]; then
    OK=true
  else
    OK=false
    ERROR=1
  fi 
fi

# remove cache content
if $OK ; then
  echo " Clean $CACHE_DIR_HOME/s3_cache in 3 seconds ... "
  sleep 3
  /bin/rm -rvf ${CACHE_DIR_HOME}/s3_cache/data/*
  /bin/rm -rvf ${CACHE_DIR_HOME}/s3_cache/locks/*
fi

exit $ERROR


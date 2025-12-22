#!/bin/bash

# -------------------------------------------------------------------
#
# This script modifies the batch values
#
# History:
#
# 2018-07-30 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-p] [-q]"
  echo
  echo " -p : set all Queued to Paused "
  echo " -q : set Paused to Queued "
  echo
}

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

source ${LTA_HOME}/definitions.include

PAUSE=false
QUEUED=false

while :
do
  case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -p)
      PAUSE=true
      shift
      ;;
    -q)
      QUEUED=true
      shift
      ;;
    -*)
      print_syntax
      echo
      echo " -----> Error: unknown option $1 !"
      echo
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

if $PAUSE ; then
  ${PSQL_CMD} "update processing.batch set state='Paused' where state='Queued';" 
  exit 0
fi

if $QUEUED ; then
  ${PSQL_CMD} "update processing.batch set state='Queued' where state='Paused';"
  exit 0
fi

exit $ERROR


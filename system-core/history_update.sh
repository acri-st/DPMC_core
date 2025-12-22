#!/bin/bash

# -------------------------------------------------------------------
#
# This script update an history record 
#
# History:
#
# 2017-07-1r31 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
#  5 : history id not specified
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-l log] hist_id "
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

ID=0
NEW=false
TAG="NULL"
LOG="NULL"
KEY="NULL"
VALUE="NULL"

while :
do
  case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -t)
      TAG=$2
      shift 2
      ;;
    -c)
      NEW=true
      shift
      ;;
    -l)
      LOG=$2
      shift 2
      ;;
    -kv)
      KEY=$2
      VALUE=$3
      shift 3
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

ID=$1

if [ "$ID" = "0" ]; then
  echo
  echo " Error --> history id not specified !"
  echo
  exit 5
fi

if $NEW ; then
  ${PSQL_CMD} "insert into processing.history (history_id) values (${ID});"
fi

if [ "$LOG" != "NULL" ]; then
  ${PSQL_CMD} "update processing.history set log_file = '${LOG}' where history_id = ${ID};"
fi

if [ "$KEY" != "NULL" ]; then
  ${PSQL_CMD} "update processing.history set ${KEY} = '${VALUE}' where history_id = ${ID};"
fi

exit $ERROR


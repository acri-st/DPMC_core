#!/bin/bash

# -------------------------------------------------------------------
#
# This script looks for products covering a given temporal range
#
# History:
#
# 2017-05-15 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 start"
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

if [ "x$1" = "x" ]; then
  print_syntax
  exit 3 
fi

MARGIN=0
NAMES_ONLY=false

if [ -z "$1" ]; then
  print_syntax
  exit 0
fi

while :
do
  case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -d)
      DATE=$2
      shift 2
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

if [ -z "$DATE" ]; then
  echo
  echo " -----> Error: date shall be specified!"
  echo
  exit 5
fi

ACRONYM=$1

if [ -z "$ACRONYM" ]; then
  echo
  echo " -----> Error: product acronym shall be specified!"
  echo
  exit 6
fi

${PSQL_CMD} "SELECT p.name FROM internal.product AS p, internal.sensing_product AS sp WHERE p.name LIKE '%${ACRONYM}%' AND sp.product=p.id AND start_date_time <= timestamp '${DATE}' AND timestamp '${DATE}' <= stop_date_time;" | sed "s/ //g" | sed "/^$/d" | sort

exit $ERROR


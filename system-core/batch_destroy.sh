#!/bin/bash

# -------------------------------------------------------------------
#
# This script cleans the batch/job tables
#
# History:
#
# 2016-05-12 :  gb : initial version
# 2018-01-10 :  gb : add robustness...
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error 
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 -a -i id "
  echo
}

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  echo
  echo "LTA_HOME is not defined"
  echo
  exit 2 
fi

source ${LTA_HOME}/definitions.include

if [ "x$1" = "x" ]; then
  print_syntax
  exit 3 
fi

ALL=false
ID=NONE

while :
do
  case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -a)
      ALL=true
      shift
      break
      ;;
    -i)
      ID=$2
      shift 2
      break
      ;;
    *)
      break
      ;;
  esac
done

if $ALL ; then
  AUX=$(${PSQL_CMD} "DELETE FROM processing.top;")
  AUX=$(${PSQL_CMD} "DELETE FROM processing.parameters_set;")
  AUX=$(${PSQL_CMD} "DELETE FROM processing.batch_x_product;")
  AUX=$(${PSQL_CMD} "DELETE FROM processing.batch;")
fi

if [ "$ID" != "NONE" ]; then
  re='^[1-9][0-9]*$'
  if ! [[ $ID =~ $re ]] ; then
    echo
    echo " -----> Error: $1 is not a number !"
    echo
    exit 4
  fi
  AUX=$(${PSQL_CMD} "DELETE FROM processing.top WHERE batch_id=$ID;")
  AUX=$(${PSQL_CMD} "DELETE FROM processing.parameters_set WHERE id=$ID;")
  AUX=$(${PSQL_CMD} "DELETE FROM processing.batch_x_product WHERE batch=$ID;")
  AUX=$(${PSQL_CMD} "DELETE FROM processing.batch WHERE batch_id=$ID;")
fi

exit $ERROR


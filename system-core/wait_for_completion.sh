#!/bin/bash

# -------------------------------------------------------------------
#
# This script wait until the list of specified processing is
# completed
#
# History:
#
# 2016-03-29 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  1 : wrong option
#  2 : LTA_HOME is not set
#  3 : syntax error
# 10 : specified software name not found in the database
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-N] sw [sw...]"
  echo
  echo " Pause while the list of sw acronyms are found in the batch table "
  echo
  echo " -N : sleep N seconds (instead of 10 s by default) "
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

if [ $# -lt 1 ]; then
  print_syntax
  exit 3
fi

SLEEP=10

while :
do
  case "$1" in
    -*)
      SLEEP=$(echo $1 | sed "s/\-//")
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

# check if all specified software names exist
for SW_NAME in $@ ; do
  AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.software WHERE name='${SW_NAME}';")
  if [ $AUX -eq 0 ]; then
    echo
    echo " Error: software name $SW_NAME not found in the database ! "
    echo
    exit 10
  fi
done

# loop until specified software names are no more present in the batch table
NB=1
while [ $NB -gt 0 ]; do
  NB=0
  for SW_NAME in $@ ; do
    AUX=$(${PSQL_CMD} "SELECT count(*) FROM processing.batch, internal.request, internal.software
      WHERE request.id = batch.request_id AND software.id = request.software AND software.name='$SW_NAME';")
    NB=$(($NB + $AUX))
  done
  if [ $NB -gt 0 ]; then
    sleep $SLEEP
  fi
done

exit $ERROR


#!/bin/bash

# -------------------------------------------------------------------
#
# This script removes history records from the database 
# (from history and history_x_product tables)
#
# History:
#
# 2017-07-11 :  gb : initial version
# 2018-01-10 :  gb : add options (-h -i)
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
#  4 : argument is not a number
#  5 : history id not found
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-i id] [-t tag] "
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

ID=none
TAG=none

while :
do
  case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -i)
      ID=$2
      shift 2
      ;;
    -t)
      TAG=$2
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

if [ "$ID" != "none" ]; then

  re='^[1-9][0-9]*$'
  if ! [[ $ID =~ $re ]] ; then
    echo
    echo " -----> Error: $1 is not a number !"
    echo
    exit 4
  fi

  NB=$(${PSQL_CMD} "select count(*) from processing.history as h where h.history_id = ${ID};")

  if [ $NB -eq 0 ]; then
    echo
    echo " -----> Error: history record not found ($ID) !"
    echo
    exit 6
  fi

  ${PSQL_CMD} "delete from processing.history_x_product as hxp where hxp.history = ${ID};"
  ${PSQL_CMD} "delete from processing.history as h where h.history_id = ${ID};"

fi

if [ "$TAG" != "none" ]; then

  ${PSQL_CMD} "select * from processing.history as h where h.tag = '${TAG}';" > ${SYSTEM_TMP}/history_destroy_${TAG}.log

  ${PSQL_CMD} "delete from processing.history_x_product as hxp where hxp.history in (select h.history_id from processing.history as h where h.tag = '${TAG}');"
  ${PSQL_CMD} "delete from processing.history as h where h.tag = '${TAG}';"

fi

exit $ERROR


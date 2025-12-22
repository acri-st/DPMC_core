#!/bin/bash

# -------------------------------------------------------------------
#
# This script lists the sxac configurations
#
# History:
#
# 2018-01-16 :  gb : initial version
# 2018-05-22 :  gb : add n option
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error 
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-n] [-a|-i id] "
  echo
  echo " -n : list only ADF names "
  echo " -a : list all configurations "
  echo " -i : list only specified configuration "
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
NAME=false

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
      ;;
    -i)
      ID=$2
      shift 2
      ;;
    -n)
      NAME=true
      shift
      ;;
    *)
      break
      ;;
  esac
done

if $ALL ; then
  if $NAME ; then
    ${PSQL_CMD} "select adf_name from internal.give_ipf_processing_sxac order by sxac, adf_name;" | sed "/^$/d"
  else
    ${PSQL_CMD} "select * from internal.give_ipf_processing_sxac order by sxac, adf_name;" | sed "/^$/d"
  fi
fi

if [ "$ID" != "NONE" ]; then
  re='^[1-9][0-9]*$'
  if ! [[ $ID =~ $re ]] ; then
    echo
    echo " -----> Error: $1 is not a number !"
    echo
    exit 4
  fi
  if $NAME ; then
    ${PSQL_CMD} "select adf_name from internal.give_ipf_processing_sxac where sxac=${ID} order by adf_name;" | sed "/^$/d" | sort
  else
    ${PSQL_CMD} "select * from internal.give_ipf_processing_sxac where sxac=${ID} order by adf_name;" | sed "/^$/d"
  fi
fi

exit $ERROR


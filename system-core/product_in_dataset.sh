#!/bin/bash

# -------------------------------------------------------------------
#
# This script returns the number of products specified by an acronym
# in a dataset
#
# History:
#
# 2017-01-03 :  gb : initial version
# 2017-05-12 :  gb : add print_syntax where no parameter is provided
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-c] dataset acronym"
  echo
  echo " -c : only returns the number of products "
  echo
}

if [ "x${LTA_HOME}" = "x" ]; then
  export LTA_HOME=/exports/dpmc/scripts
fi

source ${LTA_HOME}/definitions.include

print_syntax() {
  echo
  echo " Syntax: $0 dataset_name acronym "
  echo
}

if [ "x$1" = "x" ]; then
  print_syntax
  exit 3
fi

COUNT=false

while :
do
  case "$1" in
    -c)
      COUNT=true
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

if [ "x$2" = "x" ]; then
  echo
  echo " -----> Error: dataset and product acronym shall be specified !"
  echo
  exit 1
fi

DNAME=$1
ACRONYM=$2

if $COUNT ; then
  echo $(${PSQL_CMD} "SELECT count(*) FROM internal.dataset_content WHERE dataset_name='${DNAME}' AND product_name like '%${ACRONYM}%';")
else
  ${PSQL_CMD} "SELECT * FROM internal.dataset_content WHERE dataset_name='${DNAME}' AND product_name like '%${ACRONYM}%';" | grep "${ACRONYM}" | sed "s/|//g"
fi


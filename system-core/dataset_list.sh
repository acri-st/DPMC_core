#!/bin/bash

# -------------------------------------------------------------------
#
# This script lists the existing datasets and main characteristics
#
# History:
#
# 2016-03-22 :  gb : initial version
# 2017-05-17 :  gb : add option to get only the list of dataset names
# 2018-10-08 :  gb : add option -a to get details about the datasets
#                    (nb products, size, etc)
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-n] [-a]"
  echo
  echo " -n : list dataset names "
  echo " -a : provide dataset information"
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

DNAME=false
INFO=false
STRING=""

while :
do
  case "$1" in
    -n)
      DNAME=true
      shift
      ;;
    -a)
      INFO=true
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

if $DNAME ; then
  ${PSQL_CMD} "SELECT name FROM internal.dataset ORDER BY id;" | sed "/^$/d"
elif $INFO ; then
  DLIST=$(${PSQL_CMD} "SELECT name FROM internal.dataset ORDER BY id;" | sed "/^$/d")
  for DS in $DLIST ; do
    NB=$(${PSQL_CMD} "SELECT count(p.name) from internal.dataset AS d, internal.dataset_x_product AS dxp, internal.product AS p WHERE dxp.dataset_id=d.id AND p.id=dxp.product_id AND p.name LIKE '%${STRING}%' AND d.name='${DS}';" | sed "s/ //g" | sed "/^$/d")
    SIZE=$(${PSQL_CMD} "SELECT p.size FROM internal.dataset AS d, internal.dataset_x_product AS dxp, internal.product AS p WHERE dxp.dataset_id=d.id AND p.id=dxp.product_id AND p.name LIKE '%${STRING}%' AND d.name='${DS}';" | sed "s/ //g" | sed "/^$/d" | awk '{S+=$1} END {print S/1024/1024/1024}')
    SIZE_TB=$(echo "scale=2 ; $SIZE / 1024." | bc)
    echo $DS $NB $SIZE $SIZE_TB
  done
else
  ${PSQL_CMD} "SELECT * FROM internal.dataset ORDER BY id;" | sed "/^$/d"
fi

exit $ERROR


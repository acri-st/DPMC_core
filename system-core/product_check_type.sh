#!/bin/bash

# -------------------------------------------------------------------
#
# This script checks the product_type of all products
#
# History:
#
# 2016-03-23 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 string"
  echo
  echo " -c : corrects the product type Id "
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

CORRECT=false

while :
do
  case "$1" in
    -c)
      CORRECT=true
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

if [ "x$1" = "x" ]; then
  STRING=""
else
  STRING=$1
fi

# scratch file
FICTMP=zzz_$$.tmp

# get the full list of products
${PSQL_CMD} "SELECT name FROM internal.product WHERE product.name like '%${STRING}%';" > $FICTMP

# loop over the products
NL=0
NLMAX=`wc -l $FICTMP | awk '{print $1}'`
while [ $NL -lt $NLMAX ]; do
  NL=`expr $NL + 1`
  PRD_NAME=`head -$NL $FICTMP | tail -1 | sed 's/ //g'`
  TYPE_FROM_PRD=${PRD_NAME:4:11}
  TYPE_FROM_DB=$(${PSQL_CMD} "SELECT pt.name FROM internal.product as p, internal.product_type as pt
    WHERE p.product_type=pt.id AND p.name='${PRD_NAME}';" | sed 's/ //g')
  if [ "$TYPE_FROM_PRD" = "$TYPE_FROM_DB" ]; then
    CHECK=""
  else
    CHECK="=========="
  fi
  echo $PRD_NAME $TYPE_FROM_PRD $TYPE_FROM_DB $CHECK
done

# delete the scratch file
/bin/rm -f $FICTMP

exit $ERROR


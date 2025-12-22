#!/bin/bash

# -------------------------------------------------------------------
#
# This script updates a filed of the product table
#
# History:
#
# 2020-06-13 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# 10 : specified product not found
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-st time] [-et time] -v prd_name"
  echo
  echo " -st : update start time "
  echo " -et : update stop time "
  echo " -pt : update product_type "
  echo " -v  : verbose mode, display product record after update "
  echo
  echo " Example: product_update.sh -st 2018-05-16T11:02:34.187263 S3B_SL_0_SLT____20181217T140559_20181217T141059_20181217T152422_0299_020_010______LN2_O_NR_002.SEN3 "
  echo
}

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

if [ $# -lt 2 ]; then
  print_syntax
  exit 3
fi

source ${LTA_HOME}/definitions.include

START_TIME=NULL
STOP_TIME=NULL
PRODUCT_TYPE=NULL
VERBOSE=false

while :
do
  case "$1" in
    -st)
      START_TIME=$2
      shift 2
      ;;
    -et)
      STOP_TIME=$2
      shift 2
      ;;
    -pt)
      PRODUCT_TYPE=$2
      shift 2
      ;;
    -v)
      VERBOSE=true
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

if [ ! -z "$1" ]; then
  PRD=$1
else
  print_syntax
  exit 1
fi

# check if product exists
AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.product WHERE name='${PRD}';")

if [ $AUX -eq 0 ]; then
  echo " ---> Error : specified product $PRD not found"
  exit 10
fi

# get product_id
PRD_ID=$(${PSQL_CMD} "SELECT id FROM internal.product WHERE name='${PRD}';")

if $VERBOSE ; then
   echo " --------------------------------------------------- "
   ${PSQL_CMD} "SELECT * FROM internal.product WHERE name='${PRD}';"
   ${PSQL_CMD} "SELECT * FROM internal.sensing_product WHERE product='${PRD_ID}';"
fi

# update start time
if [ "$START_TIME" != "NULL" ]; then
  ${PSQL_CMD} "UPDATE internal.sensing_product SET start_date_time='$START_TIME' WHERE product=${PRD_ID};"
fi

# update stop time
if [ "$STOP_TIME" != "NULL" ]; then
  ${PSQL_CMD} "UPDATE internal.sensing_product SET stop_date_time='$STOP_TIME' WHERE product=${PRD_ID};"
fi

# update product_type
if [ "$PRODUCT_TYPE" != "NULL" ]; then
  ${PSQL_CMD} "UPDATE internal.product SET product_type=$PRODUCT_TYPE WHERE id=${PRD_ID};"
fi

if $VERBOSE ; then
   echo " --------------------------------------------------- "
   ${PSQL_CMD} "SELECT * FROM internal.product WHERE name='${PRD}';"
   ${PSQL_CMD} "SELECT * FROM internal.sensing_product WHERE product='${PRD_ID}';"
   echo " --------------------------------------------------- "
fi

exit $ERROR


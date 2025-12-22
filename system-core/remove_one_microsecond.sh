#!/bin/bash

# -------------------------------------------------------------------
#
# This script remove one microsecond from the stop time of a product
#
# History:
#
# 2019-03-11 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 prd_name"
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

#FPATH=false

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

PRD_NAME=$1

PRD_ID=$(${PSQL_CMD} "SELECT id FROM internal.product as p WHERE p.name='${PRD_NAME}';")

D_OLD=$(${PSQL_CMD} "SELECT stop_date_time FROM internal.sensing_product as sp WHERE sp.product=${PRD_ID};" | sed "/^$/d")

D_NEW=$(date -d "${D_OLD} 0.000001 second ago" +"%Y-%m-%d %H:%M:%S.%6N")

echo Old stop_time = $D_OLD
echo New stop_time = $D_NEW

${PSQL_CMD} "UPDATE internal.sensing_product SET stop_date_time='${D_NEW}' WHERE product='${PRD_ID}';"

D_UPD=$(${PSQL_CMD} "SELECT stop_date_time FROM internal.sensing_product as sp WHERE sp.product=${PRD_ID};" | sed "/^$/d")

echo Updated stop_time = $D_UPD
exit $ERROR


#!/bin/bash

# -------------------------------------------------------------------
#
# This script extracts a product footprint from the database 
#
# History:
#
# 2017-01-26 :  gb : initial version
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

FPATH=false

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
    -p)
      FPATH=true
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

PRD_NAME=$1

PRD_ID=$(${PSQL_CMD} "SELECT id FROM internal.product WHERE product.name like '${PRD_NAME}';" | sed "s/ //g")

${PSQL_CMD} "SELECT footprint FROM public.prd_geoloc as pg WHERE pg.product_id=${PRD_ID};"  | sed "/^$/d"

exit $ERROR


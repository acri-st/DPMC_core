#!/bin/bash

# -------------------------------------------------------------------
#
# This script returns metadata information from the database for
# a specified product
#
# History:
#
# 2017-05-15 :  gb : initial version
# 2017-05-18 :  gb : add -i option to get product name from id
# 2018-05-22 :  gb : add -a option to get extended info of product
# 2020-01-09 :  gb : add -s option to get product size
# 2020-01-24 :  gb : add options re-organised
# 2021-07-12 :  gb : add dataset search option
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-a|-s|-m|-sti] [-d prd_name | -n prd_name | -i prd_id] "
  echo
  echo " -a : provides extended informations about the product (default) "
  echo " -s : product size in bytes "
  echo " -m : provides mid-product time "
  echo " -st : display start and stop times "
  echo " -d : list all datasets including this product "
  echo
  echo " -n : product name specified "
  echo " -i : product id is specified instead of product name "
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

if [ "x$1" = "x" ]; then
  print_syntax
  exit 3 
fi

if [ -z "$1" ]; then
  print_syntax
  exit 0
fi

ID=false
NAME=true

INFO="ALL"
DATASET=false

while :
do
  case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -m)
      INFO="MIDDLE_DATE"
      shift 1
      ;;
    -i)
      ID=true 
      NAME=false
      PRD_ID=$2
      shift 2
      ;;
    -n)
      ID=false
      NAME=true
      PRD_NAME=$2
      shift 2
      ;;    
    -s)
      INFO="SIZE"
      shift 1
      ;;
    -d)
      INFO=false
      DATASET=true
      PRD_NAME=$2
      shift 2
      ;;
    -a)
      INFO="ALL"
      shift 1
      ;;
    -st)
      INFO="TIME"
      shift 1
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

if ${ID} ; then
  NB=$(${PSQL_CMD} "SELECT count(*) FROM internal.product as p where p.id = ${PRD_ID};")
  if [ $NB -eq 0 ]; then
    echo
    echo " -----> Error: specified product with id=${PRD_ID} not found in database!"
    echo
    exit 6
  fi
  PRD_NAME=$(${PSQL_CMD} "SELECT p.name FROM internal.product as p WHERE p.id = ${PRD_ID};" | sed "s/ //g" | sed "/^$/d")
  NAME=true
fi

if [ "${INFO}" = "MIDDLE_DATE" ]; then
  ${PSQL_CMD} "SELECT sp.start_date_time + (sp.stop_date_time - sp.start_date_time)/2 FROM internal.product as p, internal.sensing_product as sp where sp.product=p.id and p.name = '${PRD_NAME}';" 
fi

if [ "${INFO}" = "SIZE" ]; then
  ${PSQL_CMD} "SELECT p.size FROM internal.product as p WHERE p.name='${PRD_NAME}';" | sed "s/ //g" | sed "/^$/d"
fi

if [ "${INFO}" = "ALL" ]; then
  ${PSQL_CMD} "SELECT p.*, sp.* FROM internal.sensing_product as sp, internal.product as p WHERE sp.product=p.id AND p.name='${PRD_NAME}';" | sed "s/ //g" | sed "/^$/d"
fi

if [ "${INFO}" = "TIME" ]; then
  ${PSQL_CMD} "SELECT p.*, sp.* FROM internal.sensing_product as sp, internal.product as p WHERE sp.product=p.id AND p.name='${PRD_NAME}';" | sed "s/ //g" | sed "/^$/d"
fi

if ${DATASET} ; then
  ${PSQL_CMD} "SELECT d.name FROM internal.product as p, internal.dataset as d, internal.dataset_x_product as dxp WHERE dxp.dataset_id=d.id AND dxp.product_id=p.id AND p.name='${PRD_NAME}';" | sed "s/ //g" | sed "/^$/d"
fi

exit $ERROR


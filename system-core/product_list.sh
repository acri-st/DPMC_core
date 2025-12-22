#!/bin/bash

# -------------------------------------------------------------------
#
# This script lists the existing products
#
# History:
#
# 2016-03-23 :  gb : initial version
# 2016-04-27 :  gb : add option -n to list only product names
# 2017-01-18 :  gb : add help
# 2017-07-31 :  gb : add option -t to specify a time range
# 2018-01-14 :  gb : sort output
# 2018-02-14 :  gb : add option -s to get the size of the products
# 2018-02-14 :  gb : add option -S to get the total size of the products
# 2018-11-09 :  gb : add option -c to have product covering the specified time range
# 2019-01-22 :  gb : add option -sv to get the state vector id of the products (only sensing products)
# 2019-02-12 :  gb : add second parameter string to have two name criterias for the select
#                    example SL_0_SLT and S3B
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-p|-h|-n|-t|-S|-i|-c|-sv] string [straux]"
  echo
  echo " string = used for wildcarding in the list of products "
  echo " straux = second string to be used for wildcarding (optional) "
  echo
  echo " -i : use product id instead of regexp "
  echo " -p : list products path "
  echo " -n : only list of product names "
  echo " -t : product name + start and stop times (intersection)"
  echo " -c : product name + start and stop times (coverage)"
  echo " -s : get the size of each product "
  echo " -S : get the total size of the products (GBytes) "
  echo " -sv : get the state vector id (only for sensing products or dynamic ones) "
  echo
  echo " Examples: product_list.sh OL_1_ERR --> lists all OLCI L1 RR products (including browse...) "
  echo "           product_list.sh 20160601T04 --> lists all products with this date inside the product name "
  echo "           product_list.sh OL_1_EFR | grep 20160601T04 "
  echo "           product_list.sh -n OL_1_EFR | grep 20160601T04 : lists only product names "
  echo "           product_list.sh -p OL_1_EFR | grep 20160601T04 : lists only product paths "
  echo "           product_list.sh -t 20160601T000000 20160602T000000 OL_1_EFR : lists only products intersecting the specified time range "
  echo "           product_list.sh -S OL_1_EFR : provides the total size of the products (GBytes)"
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
NAMES_ONLY=false
TIME_RANGE=false
COVERAGE=false
START_TIME=19000101T000000
STOP_TIME=21000101T000000
TSIZE=false
SIZE=false
ID_MODE=false
STATE_VECTOR=false

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
    -i)
      ID_MODE=true
      PRD_ID=$2
      shift 2
      ;;
    -p)
      FPATH=true
      shift
      ;;
    -n)
      NAMES_ONLY=true
      shift
      ;;
    -t)
      TIME_RANGE=true
      START_TIME=$2
      STOP_TIME=$3
      shift 3
      ;;
    -c)
      COVERAGE=true
      START_TIME=$2
      STOP_TIME=$3
      shift 3
      ;;
    -s)
      SIZE=true
      shift
      ;;
    -S)
      TSIZE=true
      shift
      ;;
    -sv)
      STATE_VECTOR=true
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

if [ "x$2" = "x" ]; then
  STRAUX=""
else
  STRAUX=$2
fi

if $TSIZE ; then
  ${PSQL_CMD} "SELECT sum(product.size) FROM internal.product WHERE product.name like '%${STRING}%' and product.name like '%${STRAUX}%';" | sed "/^$/d" | awk '{print $1/1024/1024/1024}'
elif $SIZE ; then
  ${PSQL_CMD} "SELECT product.size, product.name FROM internal.product WHERE product.name like '%${STRING}%' and product.name like '%${STRAUX}%';" | sed "s/|/ /" | sed "s/  */ /g" | sed "/^$/d"
elif $TIME_RANGE ; then
  ${PSQL_CMD} "SELECT name FROM internal.product_time_range WHERE name like '%${STRING}%' and name like '%${STRAUX}%' and '${STOP_TIME}' >= start_time + interval '1 second' and stop_time - interval '1 second' >= '${START_TIME}' order by start_time;" | sed "s/  / /g" | sed "s/ S/S/" | sed "/^$/d"
elif $COVERAGE ; then
  ${PSQL_CMD} "SELECT name FROM internal.product_time_range WHERE name like '%${STRING}%' and name like '%${STRAUX}%' and '${START_TIME}' >= start_time and stop_time >= '${STOP_TIME}' order by start_time;" | sed "s/  / /g" | sed "s/ S/S/" | sed "/^$/d"
elif $NAMES_ONLY ; then
  ${PSQL_CMD} "SELECT name FROM internal.product WHERE product.name like '%${STRING}%' and product.name like '%${STRAUX}%';" | sed "s/ S/S/" | sed "/^$/d" | sort
elif $FPATH ; then
  ${PSQL_CMD} "SELECT disk_location FROM public.files_location WHERE official_name like '%${STRING}%' and official_name like '%${STRAUX}%' ORDER BY disk_location;" | sed "s/  / /g" | sed "/^$/d" | sort
elif $ID_MODE ; then
  ${PSQL_CMD} "SELECT * FROM internal.product WHERE product.id=${PRD_ID};" | sed "s/  / /g" | sed "/^$/d"
elif $STATE_VECTOR ; then
  ${PSQL_CMD} "SELECT * FROM internal.product as p, internal.sensing_product as sp WHERE sp.product=p.id and p.name like '%${STRING}%' and p.name like '%${STRAUX}%' order by p.name;" | sed "s/  / /g" | sed "/^$/d"
else
  ${PSQL_CMD} "SELECT * FROM internal.product WHERE product.name like '%${STRING}%' and product.name like '%${STRAUX}%' order by product.name;" | sed "s/  / /g" | sed "/^$/d"
fi

exit $ERROR


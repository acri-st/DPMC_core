#!/bin/bash

# -------------------------------------------------------------------
#
# This script lists the products included in a dataset
#
# History:
#
# 2016-03-22 :  gb : initial version
# 2016-11-08 :  gb : options -n and -s added (products name or size)
#                    option -S added (total size in bytes)
# 2018-01-14 :  gb : sort output
# 2018-04-13 :  gb : option -i to have products id
# 2018-05-31 :  gb : update script to allow -p and -s working together
#                    to retrieve products path and size
# 2018-12-05 :  gb : add -t option to have the size of each dataset
# 2019-10-31 :  gb : add -l to act as dataset_list.sh
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  1 : wrong option
#  2 : LTA_HOME is not set
#  3 : syntax error
# 10 : specified dataset not found in the database
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-p|-n|-i|-s|-S|-t] dataset_name string"
  echo
  echo " -p : list products path "
  echo " -n : list products name "
  echo " -i : list products ids "
  echo " -s : list products size "
  echo " -S : computes specified dataset size (Gibytes) "
  echo " -t : computes all datasets size (Gibytes) "
  echo " -l : same as dataset_list.sh "
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

if [ $# -lt 1 ]; then
  print_syntax
  exit 3
fi

FPATH=false
FNAME=false
FSIZE=false
FSTOT=false
FID=false
FSTOTG=false
DLIST=false
TIME_RANGE=false

START_TIME=19000101T000000
STOP_TIME=21000101T000000

while :
do
  case "$1" in
    -p)
      FPATH=true
      shift
      ;;
    -n)
      FNAME=true
      shift
      ;;
    -i)
      FID=true
      shift
      ;;
    -s)
      FSIZE=true
      shift
      ;;
    -S)
      FSTOT=true
      shift
      ;;
    -t)
      FSTOTG=true
      shift
      ;;
    -l)
      DLIST=true
      shift
      ;;
    -*)
      print_syntax
      echo
      echo " -----> Error: unknown option $1 !"
      echo
      exit 1
      ;;
    -t)
      TIME_RANGE=true
      START_TIME=$2
      STOP_TIME=$3
      shift 3
      ;;
    *)
      break
      ;;
  esac
done

DS_NAME=$1
STRING=$2

# check if dataset exists
AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.dataset WHERE name='${DS_NAME}';")

if [ $AUX -eq 0 -a ! $FSTOTG ]; then
  echo " ---> Error : specified dataset $DS_NAME not found in the database"
  exit 10
fi

if ${FPATH} ; then
  if ${FSIZE} ; then
    ${PSQL_CMD} "SELECT disk_location, p.size from public.files_location, internal.dataset AS d, internal.dataset_x_product AS dxp, internal.product AS p WHERE official_name=p.name AND dxp.dataset_id=d.id AND p.id=dxp.product_id AND p.name LIKE '%${STRING}%' AND d.name='${DS_NAME}' order by p.name;" | sed "s/ //g" | sed "/^$/d" | sort
  else
    ${PSQL_CMD} "SELECT disk_location from public.files_location, internal.dataset AS d, internal.dataset_x_product AS dxp, internal.product AS p WHERE official_name=p.name AND dxp.dataset_id=d.id AND p.id=dxp.product_id AND p.name LIKE '%${STRING}%' AND d.name='${DS_NAME}' order by p.name;" | sed "s/ //g" | sed "/^$/d" | sort
  fi
elif ${FNAME} ; then
  ${PSQL_CMD} "SELECT p.name from internal.dataset AS d, internal.dataset_x_product AS dxp, internal.product AS p WHERE dxp.dataset_id=d.id AND p.id=dxp.product_id AND p.name LIKE '%${STRING}%' AND d.name='${DS_NAME}' order by p.name;" | sed "s/ //g" | sed "/^$/d" | sort
elif $FID ; then
    ${PSQL_CMD} "SELECT p.id from internal.dataset AS d, internal.dataset_x_product AS dxp, internal.product AS p WHERE dxp.dataset_id=d.id AND p.id=dxp.product_id AND p.name LIKE '%${STRING}%' AND d.name='${DS_NAME}' order by p.id;" | sed "s/ //g" | sed "/^$/d" | sort
elif ${FSIZE} ; then
  ${PSQL_CMD} "SELECT p.size FROM internal.dataset AS d, internal.dataset_x_product AS dxp, internal.product AS p WHERE dxp.dataset_id=d.id AND p.id=dxp.product_id AND p.name LIKE '%${STRING}%' AND d.name='${DS_NAME}';" | sed "s/ //g" | sed "/^$/d" | sort
elif ${TIME_RANGE} ; then
  echo "Not implemented"
  ${PSQL_CMD} "SELECT name FROM internal.product_time_range WHERE name like '%${STRING}%' and name like '%${STRAUX}%' and '${STOP_TIME}' >= start_time + interval '1 second' and stop_time - interval '1 second' >= '${START_TIME}' order by start_time;" | sed "s/  / /g" | sed "s/ S/S/" | sed "/^$/d"
elif ${FSTOT} ; then
  ${PSQL_CMD} "SELECT p.size FROM internal.dataset AS d, internal.dataset_x_product AS dxp, internal.product AS p WHERE dxp.dataset_id=d.id AND p.id=dxp.product_id AND p.name LIKE '%${STRING}%' AND d.name='${DS_NAME}';" | sed "s/ //g" | sed "/^$/d" | awk '{S+=$1} END {print S/1024/1024/1024}' | sort
elif ${FSTOTG} ; then
  #${PSQL_CMD} "SELECT d.name FROM internal.dataset as d order by d.name;"
  AUX=$(${PSQL_CMD} "SELECT d.name FROM internal.dataset as d order by d.name;" | grep -v dummy)
  for DS_NAME in $AUX ; do
    SIZE=$(${PSQL_CMD} "SELECT p.size FROM internal.dataset AS d, internal.dataset_x_product AS dxp, internal.product AS p WHERE dxp.dataset_id=d.id AND p.id=dxp.product_id AND p.name LIKE '%${STRING}%' AND d.name='${DS_NAME}';" | sed "s/ //g" | sed "/^$/d" | awk '{S+=$1} END {printf "%d\n",S/1024/1024/1024}')
    echo $SIZE $DS_NAME 
  done | sort -n
elif $DLIST ; then
  ${PSQL_CMD} "SELECT * FROM internal.dataset ORDER BY id;" | sed "/^$/d"
else
  ${PSQL_CMD} "SELECT d.name, d.id, p.name, p.id, p.size FROM internal.dataset AS d, internal.dataset_x_product AS dxp, internal.product AS p WHERE dxp.dataset_id=d.id AND p.id=dxp.product_id AND p.name LIKE '%${STRING}%' AND d.name='${DS_NAME}' order by p.id;" | sed "/^$/d" | sort
fi

exit $ERROR


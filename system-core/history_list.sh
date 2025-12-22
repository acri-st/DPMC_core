#!/bin/bash

# -------------------------------------------------------------------
#
# This script lists history records from the database 
#
# History:
#
# 2017-07-11 :  gb : initial version
# 2018-01-22 :  gb : sort by start time
# 2018-02-12 :  gb : add -o option to get history for an output
#                    product name
# 2018-02-15 :  gb : add -a option to get all history records
# 2018-04-06 :  gb : add history summary
# 2018-08-29 :  gb : add -op option to get output file
#                    add -x option to get history with no output product
#                    add -or option to get output products generated from specified product
#                    add -tr option to get input product used to generate specified product
# 2018-09-06 :  gb : -tr option do not need history tag anymore
# 2020-07-15 :  jh : --header option add the header of the query results
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
#  5 : history id not specified
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: "
  echo
  echo "     $0 -a "
  echo "     $0 -o prd_name "
  echo "     $0 -s "
  echo "     $0 -i id "
  echo "     $0 [-ip] -t tag "
  echo "     $0 [-op] -t tag "
  echo "     $0 [-x] -t tag "
  echo "     $0 [-or] -t tag "
  echo "     $0 -tr prd_name "
  echo
  echo " -a for all records "
  echo " -o for specific product name "
  echo " -s to display a summary "
  echo " -i for a specific history id record "
  echo " -t for records with a specific tag "
  echo " -ip list input products (when -t is also used) "
  echo " -op list output products (when -t is also used) "
  echo " -x list history record with no output product "
  echo " -or list products generated from specified input product "
  echo " -tr list product used to generate specified output product "
  echo " --header add the query header as the first line of the results "
  echo
}

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

if [ "x$1" = "x" ]; then
  print_syntax
  exit 0
fi

source ${LTA_HOME}/definitions.include

PSQL_CMD_HEADER="psql -q -c"

ID=0
TAG="NULL"
PRD="NULL"
ALL=false
SUMMARY=true
INPUT_PRD=false
OUTPUT_PRD=false
NO_OUTPUT=false
ORIGIN=false
TARGET=false
LOGFILE=false
HEADER=false

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
    -o)
      PRD=$2
      shift 2
      ;;
    -s)
      SUMMARY=true
      shift
      ;;
    -t)
      TAG=$2
      shift 2
      ;;
    -ip)
      INPUT_PRD=true
      shift
      ;;
    -op)
      OUTPUT_PRD=true
      shift
      ;;
    -x)
      NO_OUTPUT=true
      shift
      ;;
    -or)
      ORIGIN=true
      PRD2=$2
      shift 2
      ;;
    -tr)
      TARGET=true
      PRD2=$2
      shift 2
      ;;
    -l)
      LOGFILE=true
      shift
      ;;
    --header)
      HEADER=true
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

# Enable header mode
if $HEADER = "true" ; then
  CMD="${PSQL_CMD_HEADER}"
else
  CMD="${PSQL_CMD}"
fi

if $ALL ; then

  ${CMD} "SELECT * FROM processing.history as h order by h.started;" | sed "s/|/;/g" | sed "s/  */ /g" | sed "/^$/d"

elif [ "$PRD" != "NULL" ]; then

  ${CMD} "SELECT h.* FROM processing.history AS h, processing.history_x_product AS hxp, internal.product as p WHERE hxp.history = h.history_id AND hxp.product = p.id AND p.name = '${PRD}';" | sed "s/|/;/g" | sed "s/  */ /g" | sed "/^$/d"

elif [ "$ID" != "0" ]; then

  ${CMD} "SELECT * FROM processing.history as h where h.history_id = ${ID};" | sed "s/|/;/g" | sed "s/  */ /g" | sed "/^$/d"

elif $TARGET ; then

  ${CMD} "SELECT p.name, h.history_id FROM processing.history as h, processing.history_x_product as hxp, internal.product as p, internal.product as p2 where hxp.history=h.history_id and h.file_input_id=p.id and hxp.product=p2.id and p2.name='${PRD2}' order by p.name;" | sed "s/|/;/g" | sed "s/ //g" | sed "/^$/d"

elif [ "$TAG" != "NULL" ]; then

  if $INPUT_PRD ; then
    ${CMD} "SELECT p.name FROM processing.history as h, internal.product as p where h.file_input_id=p.id and h.tag = '${TAG}' order by p.name;" | sed "s/ //g" | sed "/^$/d"
  elif $NO_OUTPUT ; then
    ${CMD} "SELECT * FROM processing.history as h left join processing.history_x_product as hxp on hxp.history=h.history_id where h.tag = 'rep_006_sl2_l' and hxp.product is NULL;" | sed "s/|/;/g" | sed "s/  */ /g" | sed "/^$/d"
  elif $OUTPUT_PRD ; then
    ${CMD} "SELECT p.name FROM processing.history as h, processing.history_x_product as hxp, internal.product as p where hxp.history=h.history_id and hxp.product=p.id and h.tag = '${TAG}' order by p.name;" | sed "s/ //g" | sed "/^$/d"
  elif $ORIGIN ; then
    ${CMD} "SELECT p2.name, h.history_id FROM processing.history as h, processing.history_x_product as hxp, internal.product as p, internal.product as p2 where hxp.history=h.history_id and hxp.product=p2.id and h.file_input_id=p.id and p.name='${PRD2}' and h.tag = '${TAG}' order by p.name;" | sed "s/|/;/g" | sed "s/ //g" | sed "/^$/d"
  elif $LOGFILE ; then
    ${CMD} "SELECT log_file FROM processing.history WHERE tag = '${TAG}'" | sed "s/|/;/g" | sed "s/ //g" | sed "/^$/d"
  else
    ${CMD} "SELECT * FROM processing.history as h where h.tag = '${TAG}' order by h.started;" | sed "s/|/;/g" | sed "s/  */ /g" | sed "/^$/d"
  fi

elif $SUMMARY ; then

  ${CMD} "SELECT h.tag, count(*), min(h.started), max(h.ended) FROM processing.history as h group by h.tag order by h.tag;" | sed "s/|/;/g" | sed "s/  */ /g" | sed "/^$/d"

fi

exit $ERROR


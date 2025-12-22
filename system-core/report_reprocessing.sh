#!/bin/bash

# -------------------------------------------------------------------
#
# This script  generates the reprocessing report, starting from a 
# list of input products
#
# History:
#
# 2016-04-26 :  gb : initial version
# 2016-11-08 :  gb : syntax updated. Start date added
# 2016-11-11 :  gb : output dir filtering added
# 2017-01-23 :  gb : add -f option for full report (including ADF list)
# 2017-02-03 :  gb : add -t and -p option (tag and prefix)
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  1 : no parameter... print syntax
#  2 : LTA_HOME is not set
#  3 : wrong parameters
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  exit 2 
fi

source ${LTA_HOME}/definitions.include

print_syntax() {
  echo
  echo " Syntax: $0 [-c N] [-s sdate edate] [-f] -o string -l logs_dir -p prefix -d dataset_name prd_in_list "
  echo
  echo " -c + configuration Id "
  echo " -o + output directory wildcarding (mandatory) "
  echo " -s + start_date + end_date as 'yyyy-mm-dd hh:mm:ss' "
  echo " -f : full report i.e. ADF list per job "
  echo " -l + logs directory (mandatory) "
  echo " -d + dataset_name (mandatory) "
  echo " -p + prefix (mandatory) "
  echo " -t + tag (mandatory) "
  echo
}

if [ "x$1" = "x" ]; then
  print_syntax
  exit 1
fi

# default parameters value
PRD="NULL"

SXAC_ID=0
SDATE='2000-01-01'
EDATE='2100-01-01'
ODIR=NULL
FULL=false
LOGS_DIR=NULL
DS_NAME=NULL
TAG=NULL
PREFIX=NULL

while :
do
  case "$1" in
    -h | --help)
      print_syntax
      exit 2
      ;;
    -f)
      FULL=true
      shift
      ;;
    -c)
      SXAC_ID=$2
      shift 2
      ;;
    -l)
      LOGS_DIR=$2
      shift 2
      ;;
    -s)
      SDATE=$2
      EDATE=$3
      shift 3
      ;;
    -d)
      DS_NAME=$2
      shift 2
      ;;
    -o)
      ODIR=$2
      shift 2
      ;;
    -t)
      TAG=$2
      shift 2
      ;;
    -p)
      PREFIX=$2
      shift 2
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

PRD_LIST=$1

if [ $SXAC_ID == 0 ]; then
  echo
  echo " -----> Error: SXAC identifier not specified !"
  echo
  exit 4
fi

if [ "$DS_NAME" == "NULL" ]; then
  echo
  echo " -----> Error: dataset name not specified !"
  echo
  exit 5
fi

if [ "$LOGS_DIR" == "NULL" ]; then
  echo
  echo " -----> Error: logs directory name not specified !"
  echo
  exit 6
fi

if [ "$ODIR" == "NULL" ]; then
  echo
  echo " -----> Error: output directory name wildcard not specified !"
  echo
  exit 7
fi

if [ "$PREFIX" == "NULL" ]; then
  echo
  echo " -----> Error: prefix for output file not specified !"
  echo
  exit 7
fi

P=$$
FICTMP=zzz_${P}_1.tmp
FICTMP2=zzz_${P}_2.tmp
FICTMP3=zzz_${P}_3.tmp
REPORT=${PREFIX}_report_jobs.csv

dataset_content.sh $DS_NAME | awk -F"|" '{print $3,$4}' > $FICTMP2

/bin/rm -f $REPORT

SOFT_ID=$(${PSQL_CMD} "SELECT software FROM internal.software_x_auxiliary_configuration as sxac WHERE sxac.id='${SXAC_ID}';" | sed "s/ //g")

echo " Looking for log files... "
find $LOGS_DIR -name "log*.txt" > $FICTMP

echo " Building history table... "
${PSQL_CMD} "SELECT file_input_id, history_id, state, ended-started, output_dir, started, tag FROM processing.history WHERE software_id=${SOFT_ID} and output_dir like '%${ODIR}%' and started > '${SDATE}'  and started < '${EDATE}' order by history_id;" | sed "s/|/ /g" > $FICTMP3

NMAX=$(wc -l $PRD_LIST | awk '{print $1}')
N=0

for PRD_NAME in $(cat $PRD_LIST) ; do

  N=$((N+1))

  PRD_ID=$(grep ${PRD_NAME} $FICTMP2 | awk '{print $2}' | sed "s/ //g")

  if [ "$TAG" = "NULL" ]; then
    read HST_ID STATE DURATION DIR <<< $(cat $FICTMP3 | awk '{if ($1=='$PRD_ID') print $2,$3,$4,$5}')
  else
    read HST_ID STATE DURATION DIR <<< $(cat $FICTMP3 | awk '{if ($1=='$PRD_ID') if ($8=="'$TAG'") print $2,$3,$4,$5}')
  fi

  LOG=$(grep "log_${PRD_ID}" $FICTMP | sort | tail -1)

  #echo " PRD_NAME=$PRD_NAME "
  #echo " PRD_ID=$PRD_ID "
  #echo " HST_ID=$HST_ID "

  echo "$N - $NMAX - $HST_ID - $PRD_NAME - $PRD_ID - $STATE - $DURATION"
  echo "$HST_ID;job;$PRD_NAME;$PRD_ID;$STATE;$DURATION" | sed "s/ //g" >> $REPORT

  if [ "$HST_ID" != "" ]; then
    if [ ! -z "$LOG" ]; then
      if $FULL ; then
        cat $LOG | egrep 's3_cache|inputs' | sed "s/..*S3/S3/" | sed "s/SEN3..*/SEN3/" | grep SEN3 | sort | uniq | awk '{print '"${HST_ID}"',";input;",$0}' \
          | sed "s/ //g" >> $REPORT
      fi
      ${PSQL_CMD} "SELECT p.name FROM processing.history_x_product AS hxp, internal.product AS p WHERE p.id=hxp.product and hxp.history=${HST_ID};" \
        | sed "/^$/d" | awk '{print '${HST_ID}',";output;",$0}' | sed "s/ //g" >> $REPORT
    fi
  fi

  if [ ! -z "$LOG" ]; then
    echo $(basename $LOG) | awk '{print '${HST_ID}',";log_file;",$0}' | sed "s/ //g" >> $REPORT
  fi

done

/bin/rm -f zzz_${P}_*.tmp

exit $ERROR



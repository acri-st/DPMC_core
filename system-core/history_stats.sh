#!/bin/bash

# -------------------------------------------------------------------
#
# This script provides history information 
#
# History:
#
# 2018-09-05 :  gb : initial version
# 2018-09-07 :  gb : add estimation of the remaining elapsed time and 
#                    expected end of task
# 2018-12-21 :  gb : add option to specify the CPU offset (default 8s)
# 2019-03-10 :  gb : set option -a by default
# 2019-03-18 :  gb : correct a bug in if test
# 2019-03-30 :  gb : exit properly when nb of jobs is equal to 0
# 2020-03-02 :  gb : add -pt option
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
  echo "     $0 -t tag -h|-a|-s|-e delta_h [-m max_cpu] [-st start_time] [-o cpu_offset]"
  echo
  echo " -t for records with a specific tag (mandatory) "
  echo
  echo " -h average CPU time per host "
  echo " -a average CPU time (default)"
  echo " -s total CPU time for the specified tag "
  echo
  echo " -pt product_type (to be used with -a option) "
  echo
  echo " -e expected elapsed time and end of task"
  echo
  echo " -m max_cpu do not use CPU time greater than this value (default=10000) "
  echo " -st start_time (YYYY-MM-DDTHH:MM:SS) provide statistics after this start time (default=2010-01-01T00:00:00"
  echo " -o cpu_offset to specify the CPU offset (in s)"
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

STARTED="2010-01-01T00:00:00"
MAX_CPU=10000

TAG="NULL"
AVERAGE=false
SUM=false
HOST=false
ESTIM=false
OFFSET=8
PRD_TYPE="NULL"

while :
do
  case "$1" in
    -h)
      HOST=true
      shift
      ;;
    -a)
      AVERAGE=true
      shift
      ;;
    -pt)
      PRD_TYPE=$2
      shift 2
      ;;
    -s)
      SUM=true
      shift
      ;;
    -t)
      TAG=$2
      shift 2
      ;;
    -e)
      ESTIM=true
      shift
      ;;
    -m)
      MAX_CPU=$2
      shift 2
      ;;
    -st)
      STARTED=$2
      shift 2
      ;;
    -o)
      OFFSET=$2
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

if [ "$TAG" = "NULL" ]; then
  echo
  echo " Error: TAG shall be specified ! "
  echo
  exit 4
fi

if ! $HOST && ! $AVERAGE && ! $SUM && ! $ESTIM ; then
  AVERAGE=true
fi

#echo HOST=$HOST SUM=$SUM ESTIM=$ESTIM
#echo AVERAGE=$AVERAGE

if $HOST ; then

  ${PSQL_CMD} "select host_id, count(*), trunc(avg(extract('epoch' from (ended-started)))) from processing.history where tag='${TAG}' and started>'${STARTED}' and extract('epoch' from (ended-started))<${MAX_CPU} group by host_id order by host_id;" | sed "s/|/;/g" | sed "s/  */ /g" | sed "/^$/d"

elif $AVERAGE ; then

  if [ "$PRD_TYPE" == "NULL" ]; then

    echo " Average CPU (in s) = " $(${PSQL_CMD} "select avg(extract('epoch' from (ended-started))) from processing.history where tag='${TAG}' and started>'${STARTED}' and extract('epoch' from (ended-started))<${MAX_CPU}" | sed "s/|/;/g" | sed "s/  */ /g" | sed "/^$/d")

  else

    echo " Average CPU (in s) = " $(${PSQL_CMD} "select avg(extract('epoch' from (h.ended-h.started))) from processing.history as h, internal.product as p, internal.product_type as pt where p.product_type=pt.id and pt.acronym like '%${PRD_TYPE}%' and h.file_input_id=p.id and h.tag='${TAG}' and h.started>'${STARTED}' and extract('epoch' from (h.ended-h.started))<${MAX_CPU}" | sed "s/|/;/g" | sed "s/  */ /g" | sed "/^$/d")

  fi

elif $SUM ; then

  echo " Total CPU (in days) = " $(${PSQL_CMD} "select sum(extract('epoch' from (ended-started)))/3600/24 from processing.history where tag='${TAG}' and extract('epoch' from (ended-started))<${MAX_CPU};" | sed "s/|/;/g" | sed "s/  */ /g" | sed "/^$/d")

elif $ESTIM ; then

  REQ_LIST=$(${PSQL_CMD} "select request_id from processing.batch as b, processing.parameters_set as ps where ps.id=b.batch_id and ps.value='${TAG}' group by request_id;")
  echo " Request(s) = " $REQ_LIST
  unset POOL_LIST
  for REQ in $REQ_LIST ; do
    POOL_LIST=" ${POOL_LIST} $(${PSQL_CMD} "select pool from internal.request where id=${REQ};")"
  done
  echo " Pool(s) = " $POOL_LIST
  NTHREADS=0
  for POOL in $POOL_LIST ; do
    NTHREADS=$((NTHREADS + $(${PSQL_CMD} "select coalesce(sum(ncpu),0) from processing.pool_x_hosts as pxh, processing.hosts as h where pxh.hosts=h.host_id and pxh.pool=$POOL;")))
  done
  echo " Number of parallel jobs = " $NTHREADS
  echo " Maximum CPU (for stats) = " $MAX_CPU
  NB_MAX=$(${PSQL_CMD} "select count(*) from processing.history where tag='${TAG}' and started>'${STARTED}' and extract('epoch' from (ended-started))>=${MAX_CPU}")
  if [ $NB_MAX -gt 0 ]; then
    STRING=" <<<<<<<<<<<<<<<<<<< "
  else
    STRING=""
  fi
  echo " Number of runs above maximum CPU = " $NB_MAX $STRING
  NB_CPU=$(${PSQL_CMD} "select count(extract('epoch' from (ended-started))) from processing.history where tag='${TAG}' and started>'${STARTED}' and extract('epoch' from (ended-started))<${MAX_CPU}")
  echo " Nb jobs for CPU estimation = " $NB_CPU
  if [ $NB_CPU -eq 0 ]; then
    exit 0
  fi
  AVG_CPU=$(${PSQL_CMD} "select avg(extract('epoch' from (ended-started))) from processing.history where tag='${TAG}' and started>'${STARTED}' and extract('epoch' from (ended-started))<${MAX_CPU}")
  # 8 seconds are added to each job to take into account an average launch time
  # due to scheduler loop
  AVG_CPU=$(echo "scale=2 ; $AVG_CPU + $OFFSET" | bc)
  echo " Average CPU (s) = " $AVG_CPU
  NORM_CPU=$(echo "scale=2 ; $AVG_CPU / $NTHREADS" | bc)
  echo " Normalized CPU (s) = " $NORM_CPU
  NJOBS=0
  for REQ in $REQ_LIST ; do
    NJOBS=$((NJOBS + $(${PSQL_CMD} "select count(*) from processing.batch where request_id=$REQ")))
  done
  echo " Remaining number of jobs = " $NJOBS
  CPU_S=$(echo "scale=2 ; $NJOBS * $AVG_CPU" | bc)
  echo " Remaining CPU time (s) = " $CPU_S
  DUR_S=$(echo "scale=2 ; $CPU_S / $NTHREADS" | bc)
  echo " Remaining elapsed time (s) = " $DUR_S
  DUR_D=$(echo "scale=2 ; $DUR_S / 86400." | bc)
  echo " Remaining elapsed time (d) = " $DUR_D
  END=$(date -d "today $DUR_S seconds")
  echo " Expected end of task = " $END

fi

exit $ERROR


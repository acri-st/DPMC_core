#!/bin/bash

# -------------------------------------------------------------------
#
# This script lists the existing batches
#
# History:
#
# 2017-12-28 :  gb : initial version
# 2020-02-27 :  gb : add -a option
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-h|-r|-q]"
  echo
  echo " -r : only running jobs "
  echo " -q : only queued jobs "
  echo " -t : group by request Id "
  echo " -i : list all parameters of specified batch Id "
  echo " -a : list parameters of all jobs "
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

RUNNING=false
QUEUED=false
TYPE=false
INFO=false
ALL=false

while :
do
  case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -r)
      RUNNING=true
      shift
      ;;
    -q)
      QUEUED=true
      shift
      ;;
    -t)
      TYPE=true
      shift
      ;;
    -i)
      INFO=true
      BATCH_ID=$2
      shift 2
      ;;
    -a)
      ALL=true
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

if $QUEUED ; then
  ${PSQL_CMD} "select b.batch_id, p.name, b.state, b.request_id, r.software, r.auxiliary_configuration, r.processing_comment, r.pool from processing.batch as b, internal.product as p, internal.request as r where b.state='Queued' and b.file_input_id=p.id and b.request_id=r.id order by batch_id;" | sed "s/  / /g" | sed "/^$/d"
  exit 0
fi

if $RUNNING ; then
  ${PSQL_CMD} "select b.batch_id, p.name, b.state, b.request_id, r.software, r.auxiliary_configuration, r.processing_comment, r.pool from processing.batch as b, internal.product as p, internal.request as r where b.state='Running' and b.file_input_id=p.id and b.request_id=r.id order by batch_id;" | sed "s/  / /g" | sed "/^$/d"
  exit 0
fi
  
if $TYPE ; then
  ${PSQL_CMD} "select count(r.id), r.software, r.auxiliary_configuration, r.processing_comment, r.pool from processing.batch as b, internal.product as p, internal.request as r where b.file_input_id=p.id and b.request_id=r.id group by r.id;" | sed "s/  / /g" | sed "/^$/d"
  exit 0
fi

if $INFO ; then
  ${PSQL_CMD} "select b.* from processing.batch as b where b.batch_id=$BATCH_ID;" | sed "s/  / /g" | sed "/^$/d"
  ${PSQL_CMD} "select distinct b.* from processing.batch as b, processing.parameters_set as ps where b.batch_id=$BATCH_ID and ps.id=$BATCH_ID;" | sed "s/  / /g" | sed "/^$/d"
  ${PSQL_CMD} "select ps.* from processing.batch as b, processing.parameters_set as ps where b.batch_id=$BATCH_ID and ps.id=$BATCH_ID;" | sed "s/  / /g" | sed "/^$/d"
  exit 0
fi

if $ALL ; then
  ${PSQL_CMD} "select ps.* from processing.batch as b, processing.parameters_set as ps where ps.id=b.batch_id;" | sed "s/  / /g" | sed "/^$/d"
  exit 0
fi

${PSQL_CMD} "select b.batch_id, p.name, b.state, b.request_id, r.software, r.auxiliary_configuration, r.processing_comment, r.pool from processing.batch as b, internal.product as p, internal.request as r where b.file_input_id=p.id and b.request_id=r.id order by batch_id;" | sed "s/  / /g" | sed "/^$/d"

exit $ERROR


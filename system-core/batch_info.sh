#!/bin/pgbash

# -------------------------------------------------------------------
#
# This script displays the running jobs
#
# History:
#
# 2019-07-25 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------


print_syntax() {
  echo
  echo " Syntax: $0 [-h|-s|-l|-f]"
  echo
  echo " -s : software acronym "
  echo " -l : force loop mode "
  echo " -f nsec : sleep nsec seconds in loop mode "
  echo " -t : use start and stop times instead of input product name "
  echo
}

display_header() {
  echo "    Date: `date `"
  CONNECT_TODB >/dev/null
  SELECT coalesce(sum(ncpu),0) INTO :AVAIL FROM processing.hosts WHERE available = true;
  SELECT coalesce(sum(ncpu_available),0) INTO :USED FROM processing.available_hosts;
  SELECT coalesce(count(batch_id),0) INTO :QUEUE FROM processing.batch WHERE state = 'Queued';
  echo " Cluster [${SYSTEM_NAME}] status - Available threads: $USED/$AVAIL"   
  echo "                 Jobs in queue: $QUEUE"
}

display_top() {
 SELECT batch.batch_id AS batch,
    batch.request_id AS request,
    site.name AS site,
    product.name AS product,
    processing_comment.acronym AS chain,
    software.name AS software,
    request.auxiliary_configuration AS aux_conf,
    split_part(hosts.hostname::text, '.'::text, 1) AS node,
    top.pid,
    date_trunc('seconds'::text, now() - top.started::timestamp with time zone) AS elapsed,
    ' '::character varying AS extra
   FROM processing.top
     JOIN processing.batch ON batch.batch_id = top.batch_id
     JOIN processing.hosts ON hosts.host_id = top.hostname_id
     JOIN internal.request ON request.id = batch.request_id
     JOIN internal.site ON site.id = request.site
     JOIN internal.product ON product.id = batch.file_input_id
     JOIN internal.software ON software.id = request.software
     JOIN internal.auxiliary_configuration ON auxiliary_configuration.id = request.auxiliary_configuration
     JOIN processing.processing_comment ON request.processing_comment = processing_comment.id
  WHERE software.name like '${SW}'
  ORDER BY batch;
  DISCONNECT all; >/dev/null
}

display_top_time() {
 SELECT batch.batch_id AS batch,
    batch.request_id AS request,
    site.name AS site,
    parameters_set.value AS start_time,
    processing_comment.acronym AS chain,
    software.name AS software,
    request.auxiliary_configuration AS aux_conf,
    split_part(hosts.hostname::text, '.'::text, 1) AS node,
    top.pid,
    date_trunc('seconds'::text, now() - top.started::timestamp with time zone) AS elapsed,
    ' '::character varying AS extra
   FROM processing.top
     JOIN processing.batch ON batch.batch_id = top.batch_id
     JOIN processing.hosts ON hosts.host_id = top.hostname_id
     JOIN internal.request ON request.id = batch.request_id
     JOIN internal.site ON site.id = request.site
     JOIN internal.product ON product.id = batch.file_input_id
     JOIN internal.software ON software.id = request.software
     JOIN internal.auxiliary_configuration ON auxiliary_configuration.id = request.auxiliary_configuration
     JOIN processing.processing_comment ON request.processing_comment = processing_comment.id
     JOIN processing.parameters_set ON parameters_set.id = top.batch_id
  WHERE software.name like '${SW}' AND parameters_set.keyword = 'start_time'
  ORDER BY batch;
  DISCONNECT all; >/dev/null
}

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

source ${LTA_HOME}/definitions.include

SLEEP=10
SW="%"
LOOP=false
TIME=false

if [ -z "$1" ]; then
  ONCE=true
else
  ONCE=false
fi

while :
do
  case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -f)
      SLEEP=$2
      shift 2
      ;;
    -s)
      SW=$2
      shift 2
      ;;
    -l)
      LOOP=true
      shift
      ;;
    -t)
      TIME=true
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

source ${LTA_HOME}/definitions.include

if $ONCE ; then
  echo
  display_header
  if $TIME ; then
    display_top_time
  else
    display_top
  fi
  echo
  exit 0
elif ! $LOOP ; then
  echo
  display_header
  if $TIME ; then
    display_top_time
  else
    display_top
  fi
  echo
  exit 0
else
  while true ; do
    echo
    display_header
    if $TIME ; then
      display_top_time "$SW"
    else
      display_top "$SW"
    fi
    echo
    sleep $SLEEP
  done
fi


exit $ERROR


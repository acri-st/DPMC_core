#!/bin/pgbash

# -------------------------------------------------------------------
#
# This script is used to launch a script on the clusters 
#
# History:
#
# ?          :  ?? : initial version
# 2020-07-23 :  jh : fix log issues and add custom log filname
# 2020-08-27 :  jh : add -p pool_id to specify the pool to use 
#
#   


#############
# VARIABLES #
#############

NAME=""
V_COMMAND=""
POOL_ID=0
TARGET_DIR="/exports/dpmc/tmp/dummy"

# Default values
DEFAULT_SITE=645
DEFAULT_REQUESTER=0
DEFAULT_MIN_DATE_TIME="2001-01-01 00:00:00"
DEFAULT_MAX_DATE_TIME="2100-01-01 00:00:00"
DEFAULT_CENTER=14
DEFAULT_SUBMISSION_DATE_TIME="2015-04-13 16:30:00"
DEFAULT_PRODUCT_TYPE=0
DEFAULT_MEDIA_CATALOG=0
DEFAULT_SOFTWARE=0
DEFAULT_AUXILIARY_CONFIGURATION=0
DEFAULT_PROCESSING_COMMENT=0
DEFAULT_IS_OUTPUT_REFERENCED=false

#############

function print_syntax() {
  echo
  echo " Syntax: $0 -c COMMAND [--name filename]"
  echo
  echo "  -h                show this help, then exit"
  echo "  -c  COMMAND       specify the command to run"
  echo "  -t  TARGET_DIR    specify the dir to save the log: eg. /exports/dpmc/tmp/dummy"
  echo "  -p  POOL_ID       specify the pool id to use"
  echo "  --name | -n  FILENAME  specify a custom log filename"
  echo
}

function parse_arguments() {
  while :; do
    case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    --name | -n)
      NAME="$2"
      if [ ! "$NAME" = $(echo $NAME | sed 's/\///g' | sed 's/ //g') ]; then
        echo "Sythax error: $NAME"
        exit 1
      fi
      shift 2
      ;;
    -c)
      V_COMMAND="$2"
      shift 2
      ;;
    -p)
      POOL_ID="$2"
      shift 2
      ;;
    -t)
      TARGET_DIR="$2"
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
}


function main() {
  LTA_HOME=/exports/dpmc/scripts

  source ${LTA_HOME}/definitions.include

  if [ "$#" -lt 2 ]; then
    print_syntax
    exit 1
  fi
  
  parse_arguments "${@}"

  CONNECT_TODB > /dev/null

  BEGIN transaction;

    # Get internal.request with pool_id and default values. If not exists insert new request.    
    select id into :REQ_ID from internal.request where 
      site=$DEFAULT_SITE AND requester=$DEFAULT_REQUESTER AND 
      min_date_time='$DEFAULT_MIN_DATE_TIME' AND 
      max_date_time='$DEFAULT_MAX_DATE_TIME' AND 
      center=$DEFAULT_CENTER AND 
      submission_date_time='$DEFAULT_SUBMISSION_DATE_TIME' AND  
      pool=$POOL_ID AND 
      answer_date_time is null AND
      priority is null AND
      lock is null AND
      product_type=$DEFAULT_PRODUCT_TYPE AND
      media_catalog=$DEFAULT_MEDIA_CATALOG AND
      server_account is null AND
      software=$DEFAULT_SOFTWARE AND
      auxiliary_configuration=$DEFAULT_AUXILIARY_CONFIGURATION AND
      processing_comment=$DEFAULT_PROCESSING_COMMENT AND
      processing_stage is null AND
      is_output_referenced=$DEFAULT_IS_OUTPUT_REFERENCED;

    if [ -z "$REQ_ID" ]; then
      echo "No request found: creating a new one with default values."
      select nextval('internal.request_seq') into :REQ_ID;

      insert into internal.request(
        id, pool, site, requester, min_date_time, max_date_time, center, submission_date_time, product_type,
        media_catalog, software, auxiliary_configuration, processing_comment, is_output_referenced)
        values (
          $REQ_ID,
          $POOL_ID,
          $DEFAULT_SITE,
          $DEFAULT_REQUESTER,
          '$DEFAULT_MIN_DATE_TIME',
          '$DEFAULT_MAX_DATE_TIME',
          $DEFAULT_CENTER,
          '$DEFAULT_SUBMISSION_DATE_TIME',
          $DEFAULT_PRODUCT_TYPE,
          $DEFAULT_MEDIA_CATALOG,
          $DEFAULT_SOFTWARE,
          $DEFAULT_AUXILIARY_CONFIGURATION,
          $DEFAULT_PROCESSING_COMMENT,
          $DEFAULT_IS_OUTPUT_REFERENCED);
        
    fi
    
    echo "Request with id REQ_ID=$REQ_ID"


    select nextval('processing.processing_batch_batch_id') into :BATCH_ID;

    echo " New batch ID = ${BATCH_ID} "

    # file_input_id has been fixed to an existing L0 product just to allow
    # the scheduler to launch the computations (the L0 product is not used)

    insert into processing.batch(batch_id, file_input_id, processing_set_id, 
      state, output_dir, request_id, output_media_catalog) 
        values(${BATCH_ID}, 0, 0, 'Edited', '/exports/dpmc/tmp', $REQ_ID, 445); 

    # the parameter is in fact the command to submit to the cluster

    insert into processing.parameters_set (id, keyword_index, keyword,
      value) values (${BATCH_ID}, 1, 'v_command', '${V_COMMAND}'); 

    # insert target_dir keyword for the logs
    insert into processing.parameters_set (id, keyword_index, keyword,
      value) values (${BATCH_ID}, 2, 'target_dir', '${TARGET_DIR}');

    # insert log_filename 
    insert into processing.parameters_set (id, keyword_index, keyword,
      value) values (${BATCH_ID}, 3, 'log_filename', '${NAME}');

    # activate the batch

    update processing.batch set state='Queued'
      where batch_id=${BATCH_ID};


  COMMIT;

  DISCONNECT all; > /dev/null

}

# Allows to parse arguments containing quotes. eg: ./add_generic_batch.sh -c "echo 'Hello World!' | sed 's/World/Jeremy/g'"
main "${@}"

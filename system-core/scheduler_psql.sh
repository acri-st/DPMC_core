#!/bin/bash

# -------------------------------------------------------------------
#
# This script is the scheduler of the LTA DPMC tasks
#
# History:
#
# 2014-06-26 :  gb : initial version
# 2015-04-07 :  gb : replace rsh by ssh
# 2015-04-24 :  gb : replace pgbash by bash and use only pgsql
#                      commands
#                    force nice=15
# 2015-04-27 :  gb : change lock file name
# 2015-04-28 :  gb : user postgresql environment variables
# 2015-04-29 :  gb : use read command and $(psql...) syntax
# 2016-01-08 :  gb : add -q to the psql options
# 2016-02-24 :  gb : add some comments
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : database connection error
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0
LTA_HOME=/exports/dpmc/scripts

# check if working environment variable is set
if [ -z "${LTA_HOME}" ]; then
  echo
  echo " Error: environment is not correctly defined " 
  echo "   LTA_HOME is not set "
  echo
  exit 2
fi

# upload global variables
# ----------------------------------------------------------------------------------
source ${LTA_HOME}/definitions.include

# retrieve useful information from the database
# ----------------------------------------------------------------------------------
EMAIL=$(${PSQL_CMD} "SELECT email FROM internal.requester WHERE name like 'Operator';")

# lock file
LOCK_FILE=${SYSTEM_LOCK}/`basename $0 | sed 's/sh/lock/'`

# infinite loop...

while true; do

  # checks if some jobs have been launch a long time ago wihout being handle by the processing node...
  # global.launch_time_out database record is the maximum time allowed to start a job. If this is
  # the case, the corresponding batch are set back in queue. The computation node is not 
  # desactivated
  REQUEUED_COUNT=$(${PSQL_CMD} "SELECT processing.check_launch_time_outs();")

  # if jobs are stopped, a message is send to the operator
  if [ $REQUEUED_COUNT -gt 0 ]; then
    BODY=$(${PSQL_CMD} "SELECT hostname AS unavailable_nodes FROM processing.hosts WHERE NOT available;")
    TITLE="[LTA-DPMC] ${REQUEUED_COUNT} batches have been queued back because of launch time-out"
    send_mail ${EMAIL} "${TITLE}" "$BODY"
  fi

  # checks if some jobs are running since too much time...
  # global.run_time_out database record is the maximum elapsed time allowed per job. If this is
  # the case, the corresponding batch are set back in queue. The processing node is also disabled.
  REQUEUED_COUNT=$(${PSQL_CMD} "SELECT processing.check_run_time_outs();")

  # if jobs are stopped, a message is send to the operator
  if [ $REQUEUED_COUNT -gt 0 ]; then
    BODY=$(${PSQL_CMD} "SELECT hostname AS unavailable_nodes FROM processing.hosts WHERE NOT available;")
    TITLE="[LTA-DPMC] ${REQUEUED_COUNT} batches have been queued back because of run time-out"
    send_mail ${EMAIL} "${TITLE}" "$BODY"
  fi

  # Create couples (batch_id, host_id) in the processing.top table using Queued batchs and
  # nodes with available processing ressources. NB_TO_LAUNCH contains the number of couples.
  # Corresponding batchs are marked at 'Dispatched'
  NB_TO_LAUNCH=$(${PSQL_CMD} "SELECT processing.schedule_batches_new();")

  # Loop on the list of new batchs if any (i.e. NB_TO_LAUNCH>0) ... do nothing if a lock file is found
  
  while [ ! -f ${LOCK_FILE} -a $NB_TO_LAUNCH -gt 0 ]; do

    # Get information related to the current batch
    read BATCH_ID NEXT_HOST <<< $(${PSQL_CMD} "SELECT batch.batch_id, hosts.hostname FROM processing.batch JOIN processing.top ON top.batch_id = batch.batch_id JOIN processing.hosts ON top.hostname_id = hosts.host_id WHERE state = 'Dispatched' ORDER BY batch.batch_id LIMIT 1;" | sed "s/|/ /g")

    INDEX=1

    # Launch only a maximum of $SCHEDULER_MAX_LAUNCH per scheduler cycle time. This is to avoid having
    # too much jobs starting at the same time... 

    while [ ! -z "${BATCH_ID}" -a $INDEX -le $SCHEDULER_MAX_LAUNCH ]; do

      # Set output_dir and output_media_catalog (inside the function) with the value read from request.media_catalog and internal.media_catalog 
      NEW_CAT=$(${PSQL_CMD} "SELECT CASE processing.update_batch_output_media_catalog(${BATCH_ID}) WHEN TRUE THEN 'TRUE' ELSE 'FALSE' END;")

      # Set the batch status to 'Launched' meaning that the batch has been send to the node (by ssh)
      # and update the processing.top table with the current time (this time will be used to check
      # the job maximum allowed duration)
      ${PSQL_CMD} "UPDATE processing.batch SET state = 'Launched' WHERE batch_id = $BATCH_ID; UPDATE processing.top SET started = now() WHERE batch_id = $BATCH_ID;"

      # Launch the process on the node in background
      ssh -n ${NEXT_HOST} nice -15 ${SYSTEM_CORE}/run_job_psql.sh ${BATCH_ID} ${LTA_HOME} &

      SSH_ERR=`echo $?`

      if [ $SSH_ERR -ne 0 ]; then
        ${PSQL_CMD} "UPDATE processing.batch SET state = 'Problem_ssh_$NEXTHOST' WHERE batch_id = $BATCH_ID;"
      fi

      # Get information for the next batch
      read BATCH_ID NEXT_HOST <<< $(${PSQL_CMD} "SELECT batch.batch_id, hosts.hostname FROM processing.batch JOIN processing.top ON top.batch_id = batch.batch_id JOIN processing.hosts ON top.hostname_id = hosts.host_id WHERE state = 'Dispatched' ORDER BY batch.batch_id LIMIT 1;" | sed "s/|/ /g")

      INDEX=`expr $INDEX + 1`

    done # end loop on jobs to be launched

    REQUEUED_COUNT=`${PSQL_CMD} "SELECT processing.check_launch_time_outs();"`

    if [ $REQUEUED_COUNT -gt 0 ]; then
      BODY=$(${PSQL_CMD} "SELECT hostname AS unavailable_nodes FROM processing.hosts WHERE NOT available;")
      TITLE="[CLUSTER] ${REQUEUED_COUNT} batches have been queued back because of ssh time-out"
      send_mail ${EMAIL} "${TITLE}" "$BODY"
    fi

    # force to exit
    NB_TO_LAUNCH=0

  done

  sleep ${SCHEDULER_SLEEP}

done # end of infinite loop

exit 0


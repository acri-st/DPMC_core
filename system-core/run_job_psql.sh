#!/bin/bash

# -------------------------------------------------------------------
#
# This script is the generic job launcher of the DPMC
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
# 2016-01-08 :  gb : rename some variables. remove commented lines
#                    correct a bug when reading output of SQL commands
#                    hardcoding of processing stage = 'N'
# 2016-02-24 :  gb : remove commands already inside definitions.include
# 2016-03-09 :  gb : add LIBS variable = $BINARIES/lib
# 2016-03-16 :  gb : export PROCESSING_DIR_HOME
#                    export GRIB_DEFINITION_PATH
# 2016-03-21 :  gb : export CACHE_DIR_HOME
# 2016-03-22 :  gb : replace check_ok logic
#                    stop process if one of the scripts returns an error
# 2016-12-06 :  gb : add IPF name in the log filename
# 2017-05-17 :  gb : add error status in the log filename
# 2020-07-23 :  jh : fix issue for the logfile with add_specific_batch.sh
# 2020-09-09 :  jh : add report handling: write into the stdout and the 
#                    report file if provided in the parameters_set
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  if [ -z $2 ]; then
    log_error "cannot guess LTA_HOME (from env or second argument). exiting."
    exit 2 
  else
    LTA_HOME=$2
    export LTA_HOME
  fi 
fi

source ${LTA_HOME}/definitions.include

if [ $# -lt 1 ]; then
  log_message "Error: no batch_id given to run_job.sh !!!" >> ${LOG_FILE}
  exit 4
fi

EMAIL=$(${PSQL_CMD} "SELECT email FROM internal.requester WHERE name like 'Operator';")

PID=$$
HOSTNAME=$(hostname | awk -F"." '{print $1}')
BATCH_ID=$1

${PSQL_CMD} "UPDATE processing.top SET pid = ${PID}, started = now() WHERE batch_id = ${BATCH_ID};"
${PSQL_CMD} "UPDATE processing.batch SET state = 'Running' WHERE batch_id = ${BATCH_ID};"

OUTPUT_MODE=$(${PSQL_CMD} "SELECT CASE WHEN request.media_catalog IS NULL THEN 'MEDIA_POOL' ELSE 'USER_MEDIA' END FROM processing.batch JOIN internal.request ON (request.id = batch.request_id) WHERE batch_id = ${BATCH_ID};")
export OUTPUT_MODE

OUTPUT_DIR=$(${PSQL_CMD} "SELECT output_dir FROM processing.batch WHERE batch_id = ${BATCH_ID};")
export OUTPUT_DIR

if [ ! -d ${OUTPUT_DIR} ]; then
    ${MKDIR} -p ${OUTPUT_DIR}
fi

read HOST_ID PROCESSING_DIR_HOME CACHE_DIR_HOME <<< $(${PSQL_CMD} "SELECT host_id, processing_dir, cache_dir FROM processing.hosts WHERE hostname = '${HOSTNAME}';" | sed "s/|/ /g")
export HOST_ID
export PROCESSING_DIR_HOME
export CACHE_DIR_HOME

if [ ! -d ${OUTPUT_DIR} ]; then
    # Disable the system in the processing.hosts table    
    ${PSQL_CMD} "UPDATE processing.hosts SET available = false WHERE host_id = ${HOST_ID};"
    # Current batch send back to "Queued" state
    ${PSQL_CMD} "UPDATE processing.batch SET state = 'Queued' WHERE batch_id = ${BATCH_ID};"
    ${PSQL_CMD} "DELETE FROM processing.top WHERE batch_id = ${BATCH_ID};"
    # Error message send by mail
    STRING=" ${OUTPUT_DIR} not available on ${HOSTNAME} "
    log_error "$STRING"
    send_mail_to_user ${EMAIL} ${HOSTNAME} ${BATCH_ID} "$STRING"
    exit 5
fi

# check if a working directory is specified
# ----------------------------------------------------------------------------------

if [ "${PROCESSING_DIR_HOME}" = "" ]; then
  # disable the system in the processing.hosts table    
  ${PSQL_CMD} "UPDATE processing.hosts SET available = false WHERE host_id = ${HOST_ID};"
  # current batch send back to "Queued" state
  ${PSQL_CMD} "UPDATE processing.batch SET state = 'Queued' WHERE batch_id = ${BATCH_ID};"
  ${PSQL_CMD} "DELETE FROM processing.top WHERE batch_id = ${BATCH_ID};"
  # error message send by mail
  STRING=" ${PROCESSING_DIR} not defined on ${HOSTNAME} "
  log_error "$STRING"
  send_mail_to_user ${EMAIL} ${HOSTNAME} ${BATCH_ID} "$STRING"
  exit 6
fi
 
# check if the cache directory is specified
# ----------------------------------------------------------------------------------

if [ "${CACHE_DIR_HOME}" = "" ]; then
  # disable the system in the processing.hosts table
  ${PSQL_CMD} "UPDATE processing.hosts SET available = false WHERE host_id = ${HOST_ID};"
  # current batch send back to "Queued" state
  ${PSQL_CMD} "UPDATE processing.batch SET state = 'Queued' WHERE batch_id = ${BATCH_ID};"
  ${PSQL_CMD} "DELETE FROM processing.top WHERE batch_id = ${BATCH_ID};"
  # error message send by mail
  STRING=" ${CACHE_DIR_HOME} not defined on ${HOSTNAME} "
  log_error "$STRING"
  send_mail_to_user ${EMAIL} ${HOSTNAME} ${BATCH_ID} "$STRING"
  exit 6
fi

# check if the working directory is available
# ----------------------------------------------------------------------------------

if [ ! -d ${PROCESSING_DIR_HOME} ]; then
  # disable the system in the processing.hosts table    
  ${PSQL_CMD} "UPDATE processing.hosts SET available = false WHERE host_id = ${HOST_ID};"
  # current batch send back to "Queued" state
  ${PSQL_CMD} "UPDATE processing.batch SET state = 'Queued' WHERE batch_id = ${BATCH_ID};"
  ${PSQL_CMD} "DELETE FROM processing.top WHERE batch_id = ${BATCH_ID};"
  # error message send by mail
  STRING=" ${PROCESSING_DIR_HOME} not available on ${HOSTNAME} "
  log_error "$STRING"
  send_mail_to_user ${EMAIL} ${HOSTNAME} ${BATCH_ID} "$STRING"
  exit 7
fi

# check if the cache directory is available
# ----------------------------------------------------------------------------------

if [ ! -d ${CACHE_DIR_HOME} ]; then
  # disable the system in the processing.hosts table
  ${PSQL_CMD} "UPDATE processing.hosts SET available = false WHERE host_id = ${HOST_ID};"
  # current batch send back to "Queued" state
  ${PSQL_CMD} "UPDATE processing.batch SET state = 'Queued' WHERE batch_id = ${BATCH_ID};"
  ${PSQL_CMD} "DELETE FROM processing.top WHERE batch_id = ${BATCH_ID};"
  # error message send by mail
  STRING=" ${CACHE_DIR_HOME} not available on ${HOSTNAME} "
  log_error "$STRING"
  send_mail_to_user ${EMAIL} ${HOSTNAME} ${BATCH_ID} "$STRING"
  exit 7
fi

# processing directory for the current process
# ----------------------------------------------------------------------------------
PROCESSING_DIR=${PROCESSING_DIR_HOME}/${PID}
export PROCESSING_DIR

# create the working directory
$MKDIR -p ${PROCESSING_DIR}

if [ $? -ne 0 ]; then
  # disable the system in the processing.hosts table    
  ${PSQL_CMD} "UPDATE processing.hosts SET available = false WHERE host_id = ${HOST_ID};"
  # current batch send back to "Queued" state
  ${PSQL_CMD} "UPDATE processing.batch SET state = 'Queued' WHERE batch_id = ${BATCH_ID};"
  ${PSQL_CMD} "DELETE FROM processing.top WHERE batch_id = ${BATCH_ID};"
  # error message send by mail
  STRING=" ${PROCESSING_DIR} could not be created on ${HOSTNAME} "
  log_error "$STRING"
  send_mail_to_user EMAIL ${HOSTNAME} ${BATCH_ID} "$STRING"
  exit 8
fi

# go inside the working directory and create a local tag 
cd ${PROCESSING_DIR}
touch .processing_dir

OS=`uname`
export OS    

RUNTIME_CFG=${PROCESSING_DIR}/runtime_config.txt
export RUNTIME_CFG

echo "----------------------------------------------" >> ${RUNTIME_CFG}
echo " Start time : $(date)" >> ${RUNTIME_CFG}
echo "----------------------------------------------" >> ${RUNTIME_CFG}
echo " BATCH_ID : ${BATCH_ID}" >> ${RUNTIME_CFG}
echo " HOSTNAME : ${HOSTNAME}" >> ${RUNTIME_CFG}
echo " OS : ${OS}" >> ${RUNTIME_CFG}

# retrieve software configuration and environment
# ----------------------------------------------------------------------------------

read CFG_SOFTWARE_NAME CFG_AUX_CONFIG_ID CFG_BIN_SUBDIR CFG_DB_PATH CFG_PROCESSING_STAGE CFG_REFERENCE_OUTPUT <<< $(${PSQL_CMD} "SELECT software.name || '_' || software.version, auxiliary_configuration.id, center_x_software.system_subdirectory, media.name || '/' || media_catalog.name, 'N', CASE WHEN request.is_output_referenced IS TRUE THEN 1 ELSE 0 END
FROM internal.global cross join 
  processing.batch join 
  internal.product on (batch.file_input_id = product.id) join
  internal.request on (batch.request_id = request.id) join  
  internal.default_center_x_product_type_software as df 
  on (df.center = global.center and df.product_type = request.product_type) join
  internal.software on (software.id = coalesce(request.software, df.software)) join 
  internal.software_x_auxiliary_configuration as ds on (software.id = ds.software and
  ds.auxiliary_configuration = coalesce(request.auxiliary_configuration, software.default_auxiliary_configuration)) join 
  internal.auxiliary_configuration on (auxiliary_configuration.id = coalesce(request.auxiliary_configuration, software.default_auxiliary_configuration)) join 
  internal.center_x_software on (center_x_software.center = global.center and center_x_software.software = software.id) join
  internal.media_catalog on (auxiliary_configuration.index_media_catalog = media_catalog.id) join 
  internal.media on (media.id = media_catalog.media)
WHERE
  batch.batch_id = $BATCH_ID;" | sed "s/|/ /g")

export CFG_SOFTWARE_NAME
export CFG_AUX_CONFIG_ID
export CFG_BIN_SUBDIR
export CFG_DB_PATH
export CFG_PROCESSING_STAGE
export CFG_REFERENCE_OUTPUT

export DATABASE_DIR=${CFG_DB_PATH}
export BINARIES=${SPECIFIC_BIN}/${OS}/${CFG_BIN_SUBDIR}
export LIBS=${BINARIES}/lib
export GRIB_DEFINITION_PATH=/exports/dpmc/scripts/specific-package/S3/COTS/share/grib_api/definitions

echo "----------------------------------------------" >> ${RUNTIME_CFG}
echo " CFG_SOFTWARE_NAME=${CFG_SOFTWARE_NAME}" >> ${RUNTIME_CFG}
echo " CFG_REFERENCE_OUTPUT=${CFG_REFERENCE_OUTPUT}" >> ${RUNTIME_CFG}
echo "----------------------------------------------" >> ${RUNTIME_CFG}
echo " CFG_AUX_CONFIG_ID=${CFG_AUX_CONFIG_ID}" >> ${RUNTIME_CFG}
echo "----------------------------------------------" >> ${RUNTIME_CFG}
echo "export CACHE_DIR_HOME=${CACHE_DIR_HOME}" >> ${RUNTIME_CFG}
echo "export PROCESSING_DIR_HOME=${PROCESSING_DIR_HOME}" >> ${RUNTIME_CFG}
echo "export PROCESSING_DIR=${PROCESSING_DIR}" >> ${RUNTIME_CFG}
echo "export BINARIES=${BINARIES}" >> ${RUNTIME_CFG}
echo "export LIBS=${LIBS}" >> ${RUNTIME_CFG}
echo "export GRIB_DEFINITION_PATH=$GRIB_DEFINITION_PATH" >> ${RUNTIME_CFG}
echo "----------------------------------------------" >> ${RUNTIME_CFG}

BATCH_PARAMETERS=$(${PSQL_CMD} "SELECT keyword, value FROM processing.parameters_set WHERE id=${BATCH_ID};" | sed "s/ //g")
echo BATCH_PARAMETERS=$BATCH_PARAMETERS >> ${RUNTIME_CFG}

# retrieve the processing chain to be run
# ----------------------------------------------------------------------------------
NB_TODO=$(${PSQL_CMD} "SELECT count(seq_index) FROM processing.processing_set,processing.batch WHERE batch_id = $BATCH_ID AND processing_set.id = batch.processing_set_id;")

# Retrieve REPORT_PATH from the parameters_set
REPORT_PATH=$(${PSQL_CMD} "SELECT value FROM processing.parameters_set WHERE id=${BATCH_ID} AND keyword='report_path';" | sed "s/ //g")

# For the report mode, only run pre.sh which is the first one.
if [ -n "$REPORT_PATH" ]; then
  NB_TODO=1
fi

index=1
x=0

while [ $x -lt $NB_TODO ]; do

  # read from the database the current step ($index) to be performed
  read JOB_TYPE JOB_NAME <<< $(${PSQL_CMD} "SELECT s_type, function_name
  FROM processing.processing_set, processing.processing_type, processing.batch
  WHERE batch.batch_id = $BATCH_ID AND
    processing_set.id = batch.processing_set_id AND
    processing_set.type = processing_type.id AND
    processing_set.seq_index = $index
  ORDER BY seq_index;" | sed "s/|/ /g")

  echo "----------------------------------------------" >> ${RUNTIME_CFG}
  echo " Start ${JOB_NAME} ${JOB_TYPE} at $(date)" >> ${RUNTIME_CFG}
  echo "----------------------------------------------" >> ${RUNTIME_CFG}

  # execute the current step
  ERROR=0
  if [ ${JOB_TYPE} = "bash" -o ${JOB_TYPE} = "pgbash" ]; then
    AUX=$(${SPECIFIC_BATCH}/${JOB_NAME} $BATCH_ID >> ${RUNTIME_CFG} 2>&1)
    ERROR=$?
  elif [ ${JOB_TYPE} = "plsql" ]; then
    AUX=$(${PSQL_CMD} "SELECT ${JOB_NAME}($BATCH_ID);")
    ERROR=$?
  elif [ ${JOB_TYPE} = "sql" ]; then
    AUX=$(${PSQL_CMD} "${JOB_NAME}")
    ERROR=$?
  fi

  echo " Job ${JOB_NAME} returns error code $ERROR " >> ${RUNTIME_CFG}

  # check the status of the current script
  if [ $ERROR -ne 0 ]; then
    break
  fi

  # skip to next step
  x=`expr $x + 1`
  index=`expr $index + 1`

done

# target directory
TARGET_DIR=$(${PSQL_CMD} "SELECT value FROM processing.parameters_set WHERE id=${BATCH_ID} AND keyword='target_dir';" | sed "s/ //g")
echo TARGET_DIR=$TARGET_DIR >> ${RUNTIME_CFG}

# id and name of the input product
PRD_ID=$(${PSQL_CMD} "SELECT file_input_id FROM processing.batch WHERE batch_id=${BATCH_ID};" | sed "s/ //g")
PRD_NAME=$(${PSQL_CMD} "SELECT name FROM internal.product WHERE id=${PRD_ID};" | sed "s/ //g")

# software name
REQ_ID=$(${PSQL_CMD} "SELECT request_id FROM processing.batch WHERE batch_id=${BATCH_ID};" | sed "s/ //g")
SOFT_ID=$(${PSQL_CMD} "SELECT software FROM internal.request WHERE id=${REQ_ID};" | sed "s/ //g")
AUX_ID=$(${PSQL_CMD} "SELECT auxiliary_configuration FROM internal.request WHERE id=${REQ_ID};" | sed "s/ //g")
SOFT_NAME=$(${PSQL_CMD} "SELECT name FROM internal.software WHERE id=${SOFT_ID};" | sed "s/ //g")

CONF_ID=$(${PSQL_CMD} "SELECT value FROM processing.parameters_set WHERE id=${BATCH_ID} and keyword='processing_configuration_id';" | sed "s/ //g")
if [ -z "${CONF_ID}" ]; then
  CONF_ID="0"
fi

V_COMMAND=$(${PSQL_CMD} "SELECT value FROM processing.parameters_set WHERE id=${BATCH_ID} and keyword='v_command';" | sed "s/ //g")

# eg: PRD_NAME = S3A_OL_1_ERR____20160908T125025_20160908T125223_20171004T155248_0118_008_252______MR1_R_NT_002.SEN3
if [ ! "$V_COMMAND" = "" -o "${PRD_NAME}" = "dummy" ]; then
  # output directory
  SENSOR="generic"
  YEAR=$(date +"%Y")
  MONTH=$(date +"%m")
  DAY=$(date +"%d")
  LVL="log"
else
  if [ "${SOFT_NAME:2:1}" = "_" ]; then
    LVL="L0"
  else
    LVL="L${SOFT_NAME:2:1}"
  fi
  # output directory
  SENSOR=${PRD_NAME:4:2}
  YEAR=${PRD_NAME:16:4}
  MONTH=${PRD_NAME:20:2}
  DAY=${PRD_NAME:22:2}
fi

OUTPUT_DIR=${TARGET_DIR}/${SENSOR}/${YEAR}/${MONTH}/${DAY}/${LVL}
echo OUTPUT_DIR=$OUTPUT_DIR >> ${RUNTIME_CFG}
date >> ${RUNTIME_CFG}

# if report is enabled: do not create output dir and do not insert history rows
if [ -z "$REPORT_PATH" ]; then
  # create the output directory if it does not exist
  mkdir -p ${OUTPUT_DIR}


  # update the batch record with output_dir information
  ${PSQL_CMD} "UPDATE processing.batch SET output_dir='${OUTPUT_DIR}' WHERE batch_id=${BATCH_ID};"

  if [ $ERROR -eq 0 ]; then
      ERROR_S='Done'
  else
      ERROR_S='Error'
  fi

  # Check if a custom log filename is found for the current batch (used by add_generic_batch)
  LOG_FILENAME=$(${PSQL_CMD} "SELECT value FROM processing.parameters_set WHERE id=${BATCH_ID} and keyword='log_filename';" | sed "s/ //g")
  if [ ! "$LOG_FILENAME" = "" ]; then
    LOG=${OUTPUT_DIR}/log_"$LOG_FILENAME".txt
  else
    # new log filename 
    NRAND=$(date +"%N" | awk '{print substr($1,7,3)}')
    LOG=${OUTPUT_DIR}/log_${PRD_ID}_${SOFT_ID}_${AUX_ID}_${SOFT_NAME:0:3}_${CONF_ID}_$(date +"%Y%m%d_%H%M%S")_${NRAND}_${ERROR_S}.txt
  fi
  echo LOG=$LOG >> ${RUNTIME_CFG}

  # read in the parameters_set if the working environment has to be removed or not
  WORKING_DIR=$(${PSQL_CMD} "SELECT value
    FROM processing.parameters_set AS ps, processing.batch AS b
    WHERE b.batch_id = $BATCH_ID AND ps.id = b.batch_id AND ps.keyword = 'working_dir';" | sed "s/ //g")

  # read the tag parameter
  TAG=$(${PSQL_CMD} "SELECT value FROM processing.parameters_set WHERE id=${BATCH_ID} and keyword='tag';" | sed "s/ //g")
  if [ -z "${TAG}" ]; then
    TAG="none"
  fi
  echo "Execution tag = $TAG" >> ${RUNTIME_CFG}

  # remove the job from the top table and from the batch table + parameters_set
  echo "Clean top table and create history record... " >> ${RUNTIME_CFG}
  STATUS=$(${PSQL_CMD} "SELECT processing.delete_top_item(${BATCH_ID}, '${ERROR_S}');")

  # save the configuration processing id in the history record
  echo "Save configuration processing id in history table... " >> ${RUNTIME_CFG}
  STATUS=$(${PSQL_CMD} "UPDATE processing.history SET processing_configuration_id='${CONF_ID}' WHERE batch_id=${BATCH_ID};")

  # save the log filename in the history record
  echo "Save log filenames in history table... " >> ${RUNTIME_CFG}
  STATUS=$(${PSQL_CMD} "UPDATE processing.history SET log_file='${LOG}' WHERE batch_id=${BATCH_ID};")

  # save tag in history record
  STATUS=$(${PSQL_CMD} "UPDATE processing.history SET tag='${TAG}' WHERE batch_id=${BATCH_ID};")

  NB_JOBS_IN_PARALLEL=$(${PSQL_CMD} "SELECT count(*) FROM processing.batch WHERE state='Running' AND request_id=${REQ_ID};" | sed "s/ //g")
  NB_JOBS_IN_PARALLEL=$(($NB_JOBS_IN_PARALLEL+1))

  BATCH_PARAMETERS_UPDATED=$(echo $BATCH_PARAMETERS "jobs_in_parallel|${NB_JOBS_IN_PARALLEL}")

  BATCH_PARAMETERS_JSON=`echo '{"'$BATCH_PARAMETERS_UPDATED'"}' | sed 's/|/":"/g' | sed 's/ /", "/g'`
  # save batch parameters in history record
  STATUS=$(${PSQL_CMD} "UPDATE processing.history SET batch_parameters='${BATCH_PARAMETERS_JSON}' WHERE batch_id=${BATCH_ID};")

  # copy the runtime information into the log file
  cp -f ${RUNTIME_CFG} ${LOG}
else
  # The report is provided
  if [ -d "$REPORT_PATH" ]; then
    cat $RUNTIME_CFG >> $REPORT_PATH/report_$BATCH_ID.txt
    echo "Cleaning top, batch, batch_x_product and parameters_set tables... " >> $REPORT_PATH/report_$BATCH_ID.txt
    ${PSQL_CMD} "DELETE FROM processing.top WHERE batch_id=${BATCH_ID};"
    ${PSQL_CMD} "DELETE FROM processing.parameters_set WHERE parameters_set.id=${BATCH_ID};"
    ${PSQL_CMD} "DELETE FROM processing.batch_x_product WHERE batch=${BATCH_ID};"
    ${PSQL_CMD} "DELETE FROM processing.batch WHERE batch_id=${BATCH_ID};"
    echo "REPORT ENDED ON THE $(date +'%D %H:%M:%S')" >> $REPORT_PATH/report_$BATCH_ID.txt
  else
    echo "Report file provided but not found or not accessible. REPORT_PATH=$REPORT_PATH"
    ${PSQL_CMD} "DELETE FROM processing.top WHERE batch_id=${BATCH_ID};"
    ${PSQL_CMD} "DELETE FROM processing.parameters_set WHERE parameters_set.id=${BATCH_ID};"
    ${PSQL_CMD} "DELETE FROM processing.batch_x_product WHERE batch=${BATCH_ID};"
    ${PSQL_CMD} "DELETE FROM processing.batch WHERE batch_id=${BATCH_ID};"
  fi
fi

if [ "x$WORKING_DIR" = "x" ]; then

  # remove the working directory
  echo " Removing the working directory... " >> ${RUNTIME_CFG}
  cd ${PROCESSING_DIR_HOME}
  if [ -f ${PID}/.processing_dir ]; then
    $RM -rf ${PID}
  fi

fi

exit $ERROR


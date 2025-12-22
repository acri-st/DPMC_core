#!/bin/bash

# -------------------------------------------------------------------
#
# This script is use to reference product in the DPMC database
#
# History:
#
# 2016-01-11 :  gb : initial version
# 2016-01-12 :  gb : add errors. Add the creation of sensing and
#                    auxiliary products records.
# 2016-02-08 :  nme : read starttime , stoptime and abs_orbit from the manifest file.
# 2016-02-25 :  sol : force the MODE (MODE=S) for dynamic ADF that must be inserted as sensing_products
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : wrong parameters
# 10 : specified filename not found
# 11 : specified product type does not exist
# 13 : absolute product path has not been specified
# 15 : error in disk_location_create
# 16 : error when filling the auxiliary_product table
# 17 : error when filling the sensing_product table
# 18 : error when filling the product table
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

LTA_HOME=/exports/dpmc/scripts

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  exit 2 
fi

source ${LTA_HOME}/definitions.include

# check parameters
if [ $# -lt 1 ]
then
  echo
  echo "Syntax: $0 physical_path/name.zip"
  echo
  exit 3
else
  FPATH=$1
fi

LOG=${SYSTEM_LOG}/insert_product_psql.log

FDIR=$(dirname ${FPATH})
FNAME=$(basename ${FPATH})

PRD_NAME=`echo $FNAME | awk -F'.zip' '{print $1}'`
PRD_TYPE=$(echo ${PRD_NAME} | cut -c5-15)

echo $FDIR" "$FNAME" "$PRD_NAME" "$PRD_TYPE

# check if product is already referenced. If this is the case, only create a new disk location record
AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.product WHERE name='${PRD_NAME}';")

if [ $AUX -gt 0 ]; then

  # product is already referenced in the database... just add the new location
  log_message "insert_product: product $PRD_NAME already referenced. Add the new location!" >> $LOG

  $(${PSQL_CMD} "SELECT * FROM internal.disk_location_create('${PRD_NAME}', '${FPATH}');")
  ERR=$?

  if [ $ERR -ne 0 ]; then
    log_message "insert_product: product $PRD_NAME not referenced. Error $ERR during disk_location_create!" >>   $LOG
    exit 15
  fi

  exit 0
  
fi

# check if product type is referenced and get id
PRD_TYPE_ID=$(${PSQL_CMD} "SELECT id FROM internal.product_type WHERE name='${PRD_TYPE}';" | sed "s/ //g")

if [ "x${PRD_TYPE_ID}" = "x" ]; then
  log_message "insert_product: specified product_type $PRD_TYPE does not exist!" >> $LOG
  exit 11
fi

#force the MODE to be S even if the product is an ADF (for dynamique ADF only!!!)
MODE=S


#           1         2         3         4         5         6         7         8         9
# 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9
# S3A_AX___FPO_AX_20000101T000000_20991231T235959_20130123T160000____________________________001.SEN3.zip

# S3A_OL_0_EFR____20141221T065357_20141221T073803_20151106T165616_2646_178_063______LN1_D_NR____.SEN3
# S3__SR_2_WNDLAX_20000101T000000_20991231T235959_20151214T120000___________________MPC_O_AL_001.SEN3

PRD_CREATION_DATE=$(echo ${PRD_NAME} | cut -c49-63)
PRD_SIZE=$(stat --format "%s" $FPATH)



    PRD_START_TIME=$(echo ${PRD_NAME} | cut -c17-31)
    PRD_STOP_TIME=$(echo ${PRD_NAME} | cut -c33-47)
    PRD_ABS_ORBIT=0

    echo "PRD_ABS_ORBIT : ${PRD_ABS_ORBIT}"
    echo "PRD_START_TIME : ${PRD_START_TIME}" 
    echo "PRD_STOP_TIME : ${PRD_STOP_TIME}"   

# check if time is 99999999T999999 (test first 4 digits) and this is the case
# set the stop time to a valid time
#if [ "$(echo ${PRD_STOP_TIME} | cut -c1-4)" = "9999" ]; then
#  PRD_STOP_TIME="2099-12-31 23:59:59"
#fi

#if [ $MODE = "S" ]; then
#  PRD_OBSOLESCENCE="2099-12-31 23:59:59"
#else
  PRD_OBSOLESCENCE=${PRD_STOP_TIME}
#fi

# create product record in the database
$(${PSQL_CMD} "INSERT INTO internal.product (processing, product_type, document, generation_date_time, size, checked, name, obsolescence_date_time)
  VALUES(0, ${PRD_TYPE_ID}, 0, timestamp '${PRD_CREATION_DATE}', ${PRD_SIZE}, FALSE, '${PRD_NAME}', timestamp '${PRD_OBSOLESCENCE}');")
ERR=$?

if [ $ERR -ne 0 ]; then
  log_message "insert_product: product $PRD_NAME not referenced. Error $ERR when filling the product table!" >> $LOG
  exit 18
fi

# retrieve product Id
PRD_ID=$(${PSQL_CMD} "SELECT id FROM internal.product WHERE product.name='${PRD_NAME}';" | sed "s/ //g")

# MODE="S" for sensing products and "A" for auxiliary products
if [ $MODE = "S" ]; then

  PRD_ERROR=FALSE
  PRD_STATE_VECTOR_ID=0

  # specific for production centre
  # TODO : currently not used
  PRD_PROD_CENTER=$(echo ${PRD_NAME} | cut -c83-85)
  AUX=$(${PSQL_CMD} "SELECT id FROM internal.center WHERE center.code_in_product_name='${PRD_PROD_CENTER}';" | sed "s/ //g")
  if [ "x${AUX}" = "x" ]; then
    PRD_PROD_CENTER_ID=999
  else
    PRD_PROD_CENTER_ID=$AUX
  fi

  # specific for product type counter
  # TODO : PRD_TYPE_COUNTER shall be computed
  PRD_TYPE_COUNTER=0

  # specific for orbit number 
  PRD_CYCLE=$(echo ${PRD_NAME} | cut -c70-72)
  PRD_REL_ORBIT=$(echo ${PRD_NAME} | cut -c74-76)
  SATELLITE_ACRONYM=$(echo ${PRD_NAME} | cut -c1-3)
  SATELLITE_ID=$(${PSQL_CMD} "SELECT id FROM internal.satellite WHERE satellite.name='${SATELLITE_ACRONYM}';" | sed "s/ //g")
  # TODO : cycle length has to be retrieved from the database as a function of actual measurement date
  # and satellite phases definitions
  CYCLE_LENGTH=385
  #PRD_ABS_ORBIT=$(echo ${PRD_CYCLE} ${CYCLE_LENGTH} ${PRD_REL_ORBIT} | awk '{print ($1-1)*$2+$3}')

  # sensing product... add internal.sensing_product record
  $(${PSQL_CMD} "INSERT INTO internal.sensing_product (product, start_date_time, stop_date_time,
    start_absolute_orbit_number, product_type_counter, error, state_vector)
    VALUES(${PRD_ID}, timestamp '${PRD_START_TIME}', timestamp '${PRD_STOP_TIME}', ${PRD_ABS_ORBIT},
    ${PRD_TYPE_COUNTER}, ${PRD_ERROR}, ${PRD_STATE_VECTOR_ID});")
  ERR=$?

  if [ $ERR -ne 0 ]; then
    log_message "insert_product: product $PRD_NAME not referenced. Error $ERR when filling the sensing_product table!" >> $LOG
    exit 17
  fi
  
#else
#
#  PRD_VERSION=" "

  # auxiliary product... add internal.auxiliary_product record (note: version field is not
  # initialised and is implicitely set to the default value (NULL)
#  $(${PSQL_CMD} "INSERT INTO internal.auxiliary_product (product, validity_start_date_time,
#    validity_stop_date_time)
#    VALUES(${PRD_ID}, timestamp '${PRD_START_TIME}', timestamp '${PRD_STOP_TIME}');")
#  ERR=$?

#  if [ $ERR -ne 0 ]; then
#    log_message "insert_product: product $PRD_NAME not referenced. Error $ERR when filling the auxiliary_product table!" >> $LOG
#    exit 16
#  fi
#
fi

# reference product in DPMC database
$(${PSQL_CMD} "SELECT * FROM internal.disk_location_create('${PRD_NAME}', '${FPATH}');")
ERR=$?

if [ $ERR -ne 0 ]; then
  log_message "insert_product: product $PRD_NAME not referenced. Error $ERR during disk_location_create!" >> $LOG
  exit 15
fi

log_message "insert_product: ${PRD_NAME} has been referenced in the database!" >> $LOG

exit $ERROR

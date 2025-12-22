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
# 2016-02-08 : nme : read starttime , stoptime and abs_orbit from the manifest file.
# 2016-02-21 :  gb : add insertion of dynamic ADFs
# 2016-02-23 :  gb : improve robustness, add logs
#                    allow update of the sensing_product or aux_product tables
# 2016-05-12 :  gb : add rm of tmp file when pbm with manifest
# 2017-05-02 :  gb : add unzipped product (directories)
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : wrong parameters
#  4 : only new location of product is performed
#  5 : product not in zip format
#  6 : input product not found or not a file
#  7 : manifest file not found in product
# 10 : specified filename not found
# 11 : specified product type does not exist
# 12 : startTime or validityStartTime not found in the product manifest
# 13 : absolute product path has not been specified
# 15 : error in disk_location_create
# 16 : error when filling the auxiliary_product table
# 17 : error when filling the sensing_product table
# 18 : error when filling the product table
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  exit 2 
fi

source ${LTA_HOME}/definitions.include

# check parameters
if [ $# -lt 3 ]
then
  echo
  echo "Syntax: $0 physical_path database_name product_type_acronym"
  echo
  exit 3
else
  PRD_PATH=$1
  PRD_NAME=$2
  PRD_TYPE=$3
fi

LOG=${SYSTEM_LOG}/insert_product_psql.log

log_message "insert_product: inserting product $PRD_PATH" >> $LOG

echo "PRD_PATH : ${PRD_PATH}"
echo "PRD_NAME : ${PRD_NAME}"
echo "PRD_TYPE : ${PRD_TYPE}"

# check if absolute path is provided
if [ `basename $PRD_PATH` = $PRD_PATH ]; then
  log_message "insert_product: absolute product path shall be specified!" >> $LOG
  exit 13
fi

# check if specified product is a file or a directory
if [ ! -f $PRD_PATH -a ! -d $PRD_PATH ]; then
  log_message "insert_product: specified input product shall be a file or file $PRD_PATH not found!" >> $LOG
  echo " ---> Error : specified input product shall be a file or file not found "
  exit 6
fi

# check if product type is referenced and get id
PRD_TYPE_ID=$(${PSQL_CMD} "SELECT id FROM internal.product_type WHERE name='${PRD_TYPE}';" | sed "s/ //g")

if [ "x${PRD_TYPE_ID}" = "x" ]; then
  log_message "insert_product: specified product_type $PRD_TYPE does not exist!" >> $LOG
  echo " ---> Error : specified input type does not exist "
  exit 11
fi

# check if product is a sensing product or an ADF
PROC_LEVEL=$(${PSQL_CMD} "SELECT processing_level FROM internal.product_type WHERE name='${PRD_TYPE}';" | sed "s/ //g")

if [ "${PROC_LEVEL}" = "A" ]; then
  MODE=A
else
  MODE=S
fi

# check if product is already referenced. If this is the case, only create a new disk location record
AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.product WHERE name='${PRD_NAME}';")

if [ $AUX -gt 0 ]; then
  ALREADY_IN_DB=1
else
  ALREADY_IN_DB=0
fi

# extract path and filename from FNAME
FDIR=$(dirname ${PRD_PATH})
FNAME=$(basename ${PRD_PATH})

# check if the product is zipped
#if [[ ${FNAME: -4} != ".zip" ]]; then
#  log_message "insert_product: product $PRD_PATH not in zip format!" >> $LOG
#  echo " ---> Error : specified input product is not a zip file "
#  exit 5
#fi

#           1         2         3         4         5         6         7         8         9
# 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9 1 3 5 7 9
# S3A_OL_0_EFR____20141221T065357_20141221T073803_20151106T165616_2646_178_063______LN1_D_NR____.SEN3
# S3__SR_2_WNDLAX_20000101T000000_20991231T235959_20151214T120000___________________MPC_O_AL_001.SEN3

PRD_CREATION_DATE=$(echo ${PRD_NAME} | cut -c49-63)

MANIFEST_FILE="${SYSTEM_TMP}/${PRD_NAME}/${PRD_NAME}/xfdumanifest.xml"

# create a working folder (to be removed at the end of processing)
if [ -f ${PRD_PATH} ]; then
  mkdir -p ${SYSTEM_TMP}/${PRD_NAME}
  unzip -d ${SYSTEM_TMP}/${PRD_NAME} ${PRD_PATH} ${PRD_NAME}/xfdumanifest.xml >> /dev/null
  PRD_SIZE=$(stat --format "%s" $PRD_PATH)
else
  mkdir -p ${SYSTEM_TMP}/${PRD_NAME}/${PRD_NAME}
  cp ${PRD_PATH}/xfdumanifest.xml ${SYSTEM_TMP}/${PRD_NAME}/${PRD_NAME}/xfdumanifest.xml
  PRD_SIZE=$(grep "size=" ${MANIFEST_FILE} | awk '{print $NF}' | sed "s/size=.//" | sed "s/.>//" | awk '{S+=$1} END {print S}')
fi

if [ ! -f ${MANIFEST_FILE} ]; then
  log_message "insert_product: manifest file not found in $PRD_PATH!" >> $LOG
  echo " ---> Error : manifest file not found in the product "
  /bin/rm -rf ${SYSTEM_TMP}/${PRD_NAME}
  exit 7
fi

# set environement for python scripts
. ${SPECIFIC_PACKAGE}/S3/python_stable/bin/env.sh
    
# get startTime and stopTime (or validity versions)
if [ `grep -c startTime $MANIFEST_FILE` -gt 0 ]; then
  PRD_START_TIME=$(python ${SYSTEM_CORE}/get_manifest_tag.py ${MANIFEST_FILE} "startTime" )
  PRD_STOP_TIME=$(python ${SYSTEM_CORE}/get_manifest_tag.py ${MANIFEST_FILE} "stopTime" )
elif [ `grep -c validityStartTime $MANIFEST_FILE` -gt 0 ]; then
  PRD_START_TIME=$(python ${SYSTEM_CORE}/get_manifest_tag.py ${MANIFEST_FILE} "validityStartTime" )
  PRD_STOP_TIME=$(python ${SYSTEM_CORE}/get_manifest_tag.py ${MANIFEST_FILE} "validityStopTime" )
else
  log_message "insert_product: manifest does not contain startTime nor validityStartTime information" >> $LOG
  echo " ---> Error : manifest does not contain any valid start/stop time "
  /bin/rm -rf ${SYSTEM_TMP}/${PRD_NAME}
  exit 12
fi
    
# get orbitNumber
if [ `grep -c orbitNumber $MANIFEST_FILE` -gt 0 ]; then
  PRD_ABS_ORBIT=$(python ${SYSTEM_CORE}/get_manifest_tag.py ${MANIFEST_FILE} "orbitNumber" )
else
  PRD_ABS_ORBIT=0
fi
    
echo "PRD_ABS_ORBIT : ${PRD_ABS_ORBIT}"
echo "PRD_START_TIME : ${PRD_START_TIME}" 
echo "PRD_STOP_TIME : ${PRD_STOP_TIME}"   

# clean ${SYSTEM_TMP} folder
/bin/rm -rf ${SYSTEM_TMP}/${PRD_NAME}
   
if [ $MODE = "S" ]; then
  PRD_OBSOLESCENCE="2099-12-31 23:59:59"
else
  PRD_OBSOLESCENCE=${PRD_STOP_TIME}
fi

# create product record in the database
if [ ${ALREADY_IN_DB} -eq 0 ]; then

  echo " Insert product in database (internal.product) "

  $(${PSQL_CMD} "INSERT INTO internal.product (processing, product_type, document, generation_date_time, size,
    checked, name, obsolescence_date_time)
    VALUES(0, ${PRD_TYPE_ID}, 0, timestamp '${PRD_CREATION_DATE}', ${PRD_SIZE},
    FALSE, '${PRD_NAME}', timestamp '${PRD_OBSOLESCENCE}');")
  ERR=$?

  if [ $ERR -ne 0 ]; then
    log_message "insert_product: product $PRD_NAME not referenced. Error $ERR when filling the product table!" >> $LOG
    echo " ---> Error : error when filling the product table "
    exit 18
  fi

else

  echo " ---> Warning : product already referenced in the product table "

fi

# retrieve product Id
PRD_ID=$(${PSQL_CMD} "SELECT id FROM internal.product WHERE product.name='${PRD_NAME}';" | sed "s/ //g")

echo "PRD_ID : ${PRD_ID}"

# MODE="S" for sensing products and "A" for auxiliary products
if [ $MODE = "S" ]; then

  echo "Sensing product mode : update the internal.sensing_product table"

  # check if product is already referenced in the sensing_product table
  AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.sensing_product WHERE product='${PRD_ID}';")

  # not referenced... create new record in the sensing_product table
  if [ $AUX -eq 0 ]; then

    echo "Create new record in the sensing_product table "

    PRD_ERROR=FALSE
    PRD_STATE_VECTOR_ID=0

    # specific for product type counter
    # TODO : PRD_TYPE_COUNTER should be computed
    PRD_TYPE_COUNTER=0

    # specific for orbit number 
    SATELLITE_ACRONYM=$(echo ${PRD_NAME} | cut -c1-3)
    SATELLITE_ID=$(${PSQL_CMD} "SELECT id FROM internal.satellite WHERE satellite.name='${SATELLITE_ACRONYM}';" | sed "s/ //g")
    echo "Satellite : ${SATELLITE_ACRONYM}"
    
    # sensing product... add internal.sensing_product record
    $(${PSQL_CMD} "INSERT INTO internal.sensing_product (product, start_date_time, stop_date_time,
      start_absolute_orbit_number, product_type_counter, error, state_vector)
      VALUES(${PRD_ID}, timestamp '${PRD_START_TIME}', timestamp '${PRD_STOP_TIME}', ${PRD_ABS_ORBIT},
      ${PRD_TYPE_COUNTER}, ${PRD_ERROR}, ${PRD_STATE_VECTOR_ID});")
    ERR=$?

    if [ $ERR -ne 0 ]; then
      log_message "insert_product: product $PRD_NAME not referenced. Error $ERR when filling the sensing_product table!" >> $LOG
      echo " ---> Error : error when filling the sensing_product table "
      exit 17
    fi

  else

    echo " ---> Warning : product already referenced in the sensing_product table "

    # product already referenced in sensing_product. Do nothing...
    log_message "insert_product: product $PRD_NAME already referenced in the sensing_product table. Do not modify it!" >> $LOG

  fi
  
else

  echo "Auxiliary product mode : update the internal.auxiliary_product table"

  # check if product is already referenced in the auxiliary_product table
  AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.auxiliary_product WHERE product='${PRD_ID}';")

  # not referenced... create new record in the auxiliary_product table
  if [ $AUX -eq 0 ]; then

    echo "Create new record in the auxiliary_product table "

    PRD_VERSION=" "

    # auxiliary product... add internal.auxiliary_product record (note: version field is not
    # initialised and is implicitely set to the default value (NULL)
    $(${PSQL_CMD} "INSERT INTO internal.auxiliary_product (product, validity_start_date_time,
      validity_stop_date_time)
      VALUES(${PRD_ID}, timestamp '${PRD_START_TIME}', timestamp '${PRD_STOP_TIME}');")
    ERR=$?

    if [ $ERR -ne 0 ]; then
      log_message "insert_product: product $PRD_NAME not referenced. Error $ERR when filling the auxiliary_product table!" >> $LOG
      echo " ---> Error : error when filling the auxiliary_product table "
      exit 16
    fi

  else

    echo " ---> Warning : product already referenced in the auxiliary_product table "

    # product already referenced in auxiliary_product. Do nothing...
    log_message "insert_product: product $PRD_NAME already referenced in the auxiliary_product table. Do not modify it!" >> $LOG

  fi

fi

# check if specified path is already referenced in the database
AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.product
  JOIN internal.product_x_media_catalog_entry ON (product.id = product_x_media_catalog_entry.product)
  JOIN internal.media_catalog_entry ON (product_x_media_catalog_entry.media_catalog_entry = media_catalog_entry.id)
  JOIN internal.media_catalog ON (media_catalog_entry.media_catalog = media_catalog.id)
  JOIN internal.media ON (media_catalog.media = media.id)
  JOIN internal.media_type ON (media.media_type = media_type.id)
  WHERE product.name = '${PRD_NAME}' AND media.name || '/' || media_catalog.name = '${FDIR}';")

# not referenced... create new record in the media_catalog/media_catalog_entry table
if [ $AUX -eq 0 ]; then

  # reference product in DPMC database (do nothing if path already exists)
  echo "Insert the location of the product in the database"
  $(${PSQL_CMD} "SELECT * FROM internal.disk_location_create('${PRD_NAME}', '${PRD_PATH}');")
  ERR=$?

  if [ $ERR -ne 0 ]; then
    log_message "insert_product: product $PRD_NAME not referenced. Error $ERR during disk_location_create!" >> $LOG
    echo " ---> Error : error $ERR during disk_location_create!"
    exit 15
  fi

else

    echo " ---> Warning : specified location of product already referenced in the database "

fi

log_message "insert_product: ${PRD_NAME} has been referenced in the database!" >> $LOG
echo "${PRD_NAME} has been referenced in the database" >> $LOG

echo

exit $ERROR



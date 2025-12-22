#!/bin/bash

if [ "x${LTA_HOME}" = "x" ]; then
  export LTA_HOME=/exports/dpmc/scripts
fi

source ${LTA_HOME}/definitions.include

print_syntax() {
  echo
  echo " Syntax: $0 [parameters] "
  echo "   -s | --sxac + software_x_auxiliary_configuration Id "
  echo "   -p | --product + product name (without .zip)"
  echo "   -i | --dataset_in + input dataset name "
  echo "   -r | --reference (output products are referenced in the DB) "
  echo "   -o | --dataset_out + output dataset name (optional, no output dataset used by default) "
  echo "   -b | --processing_conf_id + processing configuration Id "
  echo "   -x | --pool + pool Id (optional, 1 by default) "
  echo "   -t | --target_dir + directory path "
  echo "   -c | --pcomment + Id (optional, 1 by default) "
  echo "   -lw | --landwater + land or water"
  echo "   -m | --mode + mode (e.g. calibration or measurement)"
  echo "   -tr | --time_range + start and stop times (e.g. 2016-05-01T04:16:56.278129)"
  echo "   -d | --debug_mode + mode (e.g. ERROR or DEBUG or INFO)"
  echo "   -cm | --cache_mode + mode (e.g. local or automatic)"
  echo "   -wd | --working_dir + mode (e.g. keep or removed)"
  echo "   -bp | --breakpoint "
  echo "   -tg | --tag + text to tab the batches "
  echo "   -pt | --product_type + product type (like : OL_1_EFR___ )"
  echo "   -z | --zip_mode + on/off (zip=on by default)"
  echo "   -fn | --frame_number + frame number 1...N (for PUG)"
  echo "   -dt | --delta_pdu + value of PDU in seconds (for PUG)"
  echo "   -st | --satellite + satellite acronym (S3A/S3B)"
  echo "   --report | --report + absolute path for the report file"
  echo
}

if [ "x$1" = "x" ]; then
  print_syntax
  exit 1
fi

SCRIPT=$(basename $0)

# default parameters value
PRD="NULL"
IS_OUTPUT_REFERENCED=FALSE
POOL_ID=1
PROCESSING_COMMENT_ID=1
TARGET_DIR="NULL"
DOUT="NULL"
PROC_CONF_ID="NULL"
LW="NULL"
MODE="NULL"
DEBUG_MODE="NULL"
CACHE_MODE="NULL"
WORKING_DIR="NULL"
USER_START_TIME="NULL"
USER_STOP_TIME="NULL"
BREAKPOINT=false
TAG="NULL"
PRD_TYPE="NULL"
ZIP_MODE="on"
FRAME_NUMBER=0
SATELLITE=""
DELTA=0
REPORT_PATH=""

while :
do
  case "$1" in
    -h | --help)
      print_syntax
      exit 2
      ;;
    -s | --sxac)
      SXAC_ID=$2
      #echo SXAC_ID=$SXAC_ID
      shift 2
      ;;
    -p | --product)
      PRD=$2
      #echo PRD=$PRD
      shift 2
      ;;
    -i | --dataset_in)
      DIN=$2
      #echo DIN=$DIN
      shift 2
      ;;
    -o | --dataset_out)
      DOUT=$2
      #echo DOUT=$DOUT
      shift 2
      ;;
    -r | --reference)
      IS_OUTPUT_REFERENCED=TRUE
      #echo IS_OUTPUT_REFERENCED=$IS_OUTPUT_REFERENCED
      shift 1
      ;;
    -x | --pool)
      POOL_ID=$2
      #echo POOL_ID=$POOL_ID
      shift 2
      ;;
    -t | --target_dir)
      TARGET_DIR=$2
      #echo TARGET_DIR=$TARGET_DIR
      shift 2
      ;;
    -c | --pcomment)
      PROCESSING_COMMENT_ID=$2
      #echo PROCESSING_COMMENT_ID=$PROCESSING_COMMENT_ID
      shift 2
      ;;
    -b | --baselineCollection)
      PROC_CONF_ID=$2
      #echo PROC_CONF_ID=$PROC_CONF_ID
      shift 2
      ;;
    -lw | --landwater)
      LW=$2
      #echo LW=$LW
      shift 2
      ;;
    -m | --mode)
      MODE=$2
      #echo MODE=$MODE
      shift 2
      ;;
    -d | --debug_mode)
      DEBUG_MODE=$2
      #echo DEBUG_MODE=$DEBUG_MODE
      shift 2
      ;;
    -tr | --time_range)
      USER_START_TIME=$2
      USER_STOP_TIME=$3
      #echo USER_START_TIME=$USER_START_TIME
      #echo USER_STOP_TIME=$USER_STOP_TIME
      shift 3
      ;;
    -tg | --tag)
      TAG=$2
      #echo TAG=$TAG
      shift 2
      ;;
    -cm | --cache_mode)
      CACHE_MODE=$2
      #echo CACHE_MODE=$CACHE_MODE
      shift 2
      ;;
    -wd | --working_dir)
      WORKING_DIR=$2
      #echo WORKING_DIR=$WORKING_DIR
      shift 2
      ;;
    -bp | --breakpoint)
      BREAKPOINT=true
      #echo BREAKPOINT=$BREAKPOINT
      shift
      ;;
    -pt | --product_type)
      PRD_TYPE=$2
      #echo PRD_TYPE=$PRD_TYPE
      shift 2
      ;;
    -z | --zip_mode)
      ZIP_MODE=$2
      shift 2
      ;;
    -fn | --frame_number)
      FRAME_NUMBER=$2
      shift 2
      ;;
    -st | --satellite)
      SATELLITE=$2
      shift 2
      ;;
    -dt | --delta_pdu)
      DELTA=$2
      shift 2
      ;;
    --report)
      REPORT_PATH=$2
      if [ ! -d "$REPORT_PATH" ]; then
        echo
        echo " -----> Error: No such directory $REPORT_PATH !"
        echo
        exit 1
      fi
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

# Init report file
if [ -n "$REPORT_PATH" ]; then
    echo "REPORT_PATH=$REPORT_PATH"
    if [ ${REPORT_PATH:0:1} = '/' ] && [ -d $(dirname "$REPORT_PATH") ]; then
        echo "REPORT FILE GENERATED ON THE $(date +'%D %H:%M:%S')" >> $REPORT_PATH/launch_processing.log
    else
        echo "$REPORT_PATH is not a valid filepath. Must be an absolute path with pre created folders."
        exit 1
  fi
fi

if [ "$IS_OUTPUT_REFERENCED" = "FALSE" -a "$DOUT" != "NULL" ]; then
  echo
  echo " Error: -o requires -r "
  echo
  exit 8
fi

# Current date
DATE=$(date +'%Y-%m-%dT%H:%M:%S')

# Check if target directory exists
if [ ! -d ${TARGET_DIR} ]; then
  echo
  echo " -----> Error: target directory $TARGET_DIR does not exist "
  echo
  exit 7
fi

# Check if the sxac id exists in the database...
SXAC_EXISTS=$(${PSQL_CMD} "SELECT count(*) FROM internal.software_x_auxiliary_configuration WHERE id=${SXAC_ID};" | sed "s/ //g")

# If process configuration does not exist, stop the process
if [ ${SXAC_EXISTS} -eq 0 ]; then
  echo
  echo " -----> Error: software_x_aux_configuration $SXAC_ID not found in the database "
  echo
  exit 4
fi

# Check if the pool id exists in the database...
POOL_EXISTS=$(${PSQL_CMD} "SELECT count(*) FROM processing.pool WHERE id=${POOL_ID};" | sed "s/ //g")

# If pool does not exist, stop the process
if [ ${POOL_EXISTS} -eq 0 ]; then
  echo
  echo " -----> Error: pool $POOL_ID not found in the database "
  echo
  exit 5
fi

# Check if product exists.. 
PRD_EXISTS=$(${PSQL_CMD} "SELECT count(*) FROM internal.product WHERE product.name='${PRD}';" | sed "s/ //g")

# If product does not exist, stop the process
if [ ${PRD_EXISTS} -eq 0 ]; then
  echo
  echo " -----> Error: product $PRD not found in the database "
  echo
  exit 3
fi

# Product exists... get its Id
PRD_ID=$(${PSQL_CMD} "SELECT product.id FROM internal.product WHERE product.name='${PRD}';" | sed "s/ //g")
echo
echo " Product name = $PRD "
echo " Product Id = $PRD_ID "

# Check if the product is a sensing product.. 
SP_EXISTS=$(${PSQL_CMD} "SELECT count(*) FROM internal.sensing_product as sp WHERE sp.product='${PRD_ID}';" | sed "s/ //g")

# If product is not a sensing product, stop the process
if [ ${SP_EXISTS} -eq 0 ]; then
  echo
  echo " -----> Error: product $PRD is not a sensing product "
  echo
  exit 6
fi

# Check if dataset_in exists.. 
DIN_EXISTS=$(${PSQL_CMD} "SELECT count(*) FROM internal.dataset WHERE dataset.name='${DIN}';" | sed "s/ //g")

# If dataset_in does not exist in the database, then create it...
if [ ${DIN_EXISTS} -eq 0 ]; then
  $(${PSQL_CMD} "INSERT INTO internal.dataset (cdate, name, comment) VALUES ('${DATE}', '${DIN}', 'created by ${SCRIPT}');")
  echo " Create new dataset $DIN "
else
  echo " Dataset $DIN already exists"
fi

# Dataset exists... get its Id
DIN_ID=$(${PSQL_CMD} "SELECT dataset.id FROM internal.dataset WHERE dataset.name='${DIN}';" | sed "s/ //g")
echo " Dataset Id = $DIN_ID "

# Check if the product is already included in the dataset
INCLUDED=$(${PSQL_CMD} "SELECT count(*) FROM internal.dataset_x_product AS dxp WHERE dxp.dataset_id=${DIN_ID} and dxp.product_id=${PRD_ID};" | sed "s/ //g")

# If the product is not in the dataset, then add it...
if [ ${INCLUDED} -eq 0 ]; then
  STATUS=$(${PSQL_CMD} "SELECT internal.add_product_to_dataset(${DIN_ID},${PRD_ID});" | sed "s/ //g")
  echo " Add product $PRD ($PRD_ID) to dataset $DIN ($DIN_ID)"
else
  echo " Product $PRD is already in dataset $DIN"
fi

# Check if a dataset out has been specified
if [ "$DOUT" != "NULL" ]; then
  echo " Output products will be added to dataset $DOUT "
else
  echo " Output products will not be added to any dataset "
fi

# If the satellite is not given as parameter, get satellite from product name
if [ "$SATELLITE" == "" ]; then
  SATELLITE=${PRD:0:3}
fi

# Check if satellite acronym is valid
if [ "$SATELLITE" != "S3A" -a "$SATELLITE" != "S3B" ]; then
  echo
  echo " -----> Error: satellite acronym $SATELLITE is not valid (shall be S3A or S3B) "
  echo
  exit 9
fi

# Get software Id from SXAC
SOFT_ID=$(${PSQL_CMD} "SELECT sxac.software FROM internal.software_x_auxiliary_configuration as sxac WHERE id=${SXAC_ID};" | sed "s/ //g")
echo " Software Id = $SOFT_ID "

# Get auxiliary configuration Id from SXAC
AUX_ID=$(${PSQL_CMD} "SELECT sxac.auxiliary_configuration FROM internal.software_x_auxiliary_configuration as sxac WHERE id=${SXAC_ID};" | sed "s/ //g")
echo " Auxiliary configuration Id = $AUX_ID "

echo " Target directory = $TARGET_DIR"

# Misc. parameters
SITE_ID=645
REQUESTER_ID=0
MIN_DATE_TIME='2001-01-01 00:00:00'
MAX_DATE_TIME='2100-01-01 00:00:00'
CENTER_ID=14
SUBMISSION_DATE_TIME="${DATE}"
ANSWER_DATE_TIME='2100-01-01 00:00:00'
PRIORITY=0
LOCK=FALSE
PRODUCT_TYPE_ID=0
MEDIA_CATALOG=0
SERVER_ACCOUNT=0
PROCESSING_STAGE=''

# Create a scratch request with all provided information

# Check if a similar request already exists or not...
REQ_ID=""
REQ_ID=$(${PSQL_CMD} "SELECT id FROM internal.request WHERE pool=${POOL_ID} AND software=${SOFT_ID} and auxiliary_configuration=${AUX_ID} AND processing_comment=${PROCESSING_COMMENT_ID} limit 1;" | sed "s/ //g")

if [ "x${REQ_ID}" = "x" ]; then
  # Get next request Id
  REQ_ID=$(${PSQL_CMD} "SELECT nextval FROM nextval('internal.request_seq');" | sed "s/ //g")
  echo " Creation of new request $REQ_ID "
  # Create new request
  $(${PSQL_CMD} "INSERT INTO internal.request (id, site, requester, min_date_time, max_date_time, center, submission_date_time, answer_date_time, priority, lock, product_type, media_catalog, server_account, pool, software, auxiliary_configuration, processing_comment, processing_stage, is_output_referenced)
    VALUES (${REQ_ID}, ${SITE_ID}, ${REQUESTER_ID}, '${MIN_DATE_TIME}', '${MAX_DATE_TIME}', ${CENTER_ID}, '${SUBMISSION_DATE_TIME}', '${ANSWER_DATE_TIME}', ${PRIORITY}, '${LOCK}', ${PRODUCT_TYPE_ID}, ${MEDIA_CATALOG}, ${SERVER_ACCOUNT}, ${POOL_ID}, ${SOFT_ID}, ${AUX_ID}, ${PROCESSING_COMMENT_ID}, '${PROCESSING_STAGE}', ${IS_OUTPUT_REFERENCED});")
  echo " New request $REQ_ID has been created "
else
  echo " Use already existing request ${REQ_ID} "
fi

# Create new batch to process input product

# Get start time from database
START_TIME=$(${PSQL_CMD} "SELECT sp.start_date_time FROM internal.sensing_product AS sp WHERE sp.product=${PRD_ID};" | sed "s/^  *//" | sed "s/\([0-9][0-9]*\) /\1T/")
STOP_TIME=$(${PSQL_CMD} "SELECT sp.stop_date_time FROM internal.sensing_product AS sp WHERE sp.product=${PRD_ID};" | sed "s/^  *//" | sed "s/\([0-9][0-9]*\) /\1T/")
echo " Product start time = |$START_TIME| "
echo " Product stop time = |$STOP_TIME| "

if [ "$USER_START_TIME" != "NULL" ]; then
  START_TIME=$USER_START_TIME
  echo " Overwritten product start time = |$START_TIME| "
fi
if [ "$USER_STOP_TIME" != "NULL" ]; then
  STOP_TIME=$USER_STOP_TIME
  echo " Overwritten product stop time = |$STOP_TIME| "
fi

# Get next batch Id
BATCH_ID=$(${PSQL_CMD} "SELECT nextval FROM nextval('processing.processing_batch_batch_id');" | sed "s/ //g")
echo " Creation of new batch $BATCH_ID "

$(${PSQL_CMD} "INSERT INTO processing.batch(batch_id, file_input_id, processing_set_id, state, output_dir, request_id, output_media_catalog) VALUES (${BATCH_ID}, ${PRD_ID}, ${PROCESSING_COMMENT_ID}, 'Edited', ' ', ${REQ_ID}, ${MEDIA_CATALOG});") 

# Add batch parameters 
#$(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 1, 'nb_threads', '24');")
#$(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 2, 'block_size', '1000');") 
$(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 3, 'target_dir', '${TARGET_DIR}');") 
$(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 4, 'dataset_in', '${DIN}');") 
if [ ${DOUT} != "NULL" ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 5, 'dataset_out', '${DOUT}');") 
fi
$(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 6, 'start_time', '${START_TIME}');") 
$(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 7, 'stop_time', '${STOP_TIME}');") 
if [ ${PROC_CONF_ID} != "NULL" ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 8, 'processing_configuration_id', '${PROC_CONF_ID}');") 
fi
if [ ${LW} != "NULL" ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 9, 'land_water', '${LW}');") 
fi
if [ ${MODE} != "NULL" ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 10, 'processing_mode', '${MODE}');") 
fi
if [ ${DEBUG_MODE} != "NULL" ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 11, 'debug_mode', '${DEBUG_MODE}');") 
fi
if [ ${CACHE_MODE} != "NULL" ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 12, 'cache_mode', '${CACHE_MODE}');") 
fi
if [ ${WORKING_DIR} != "NULL" ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 13, 'working_dir', '${WORKING_DIR}');") 
fi
if ${BREAKPOINT} ; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 14, 'breakpoint', 'active');") 
fi
if [ "${TAG}" != "NULL" ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 15, 'tag', '${TAG}');") 
  echo " Tag = ${TAG}"
fi
if [ "${ZIP_MODE}" = "off" ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 16, 'zip_mode', 'off');")
fi
if [ ${PRD_TYPE} != "NULL" ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 17, 'product_type', '${PRD_TYPE}');")
fi
if [ ${FRAME_NUMBER} -ne 0 ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 18, 'frame_number', '${FRAME_NUMBER}');")
fi
$(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 19, 'satellite', '${SATELLITE}');")

if [ ${DELTA} -ne 0 ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 20, 'delta', '${DELTA}');")
fi

if [ -n "$REPORT_PATH" ]; then
  $(${PSQL_CMD} "INSERT INTO processing.parameters_set (id, keyword_index, keyword, value) VALUES (${BATCH_ID}, 21, 'report_path', '${REPORT_PATH}');")
fi

# Activate the batch
$(${PSQL_CMD} "UPDATE processing.batch SET state='Queued' WHERE batch_id=${BATCH_ID};";)
echo " Batch $BATCH_ID has been activated "
echo


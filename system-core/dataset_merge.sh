#!/bin/bash

# -------------------------------------------------------------------
#
# This script merge two datasets in a third one
#
# History:
#
# 2017-02-10 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# 10 : source dataset not found
# 11 : target dataset already exists
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

if [ $# -lt 2 ]; then
  echo
  echo " Syntax: $0 dataset_name_in1 dataset_name_in2 dataset_name_out [comment]"
  echo
  exit 3
else
  CDATE=$(date +'%Y-%m-%dT%H:%M:%S')
  DS_NAME_IN1=$1
  DS_NAME_IN2=$2
  DS_NAME_OUT=$3
  COMMENT=$4
fi

source ${LTA_HOME}/definitions.include

# check if source dataset 1 exists
AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.dataset WHERE name='${DS_NAME_IN1}';")
if [ $AUX -eq 0 ]; then
  echo " ---> Error : specified source dataset $DS_NAME_IN1 not found"
  exit 10
fi

# check if source dataset 2 exists
AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.dataset WHERE name='${DS_NAME_IN2}';")
if [ $AUX -eq 0 ]; then
  echo " ---> Error : specified source dataset $DS_NAME_IN2 not found"
  exit 10
fi

# get source datasets Id
DS_ID_IN1=$(${PSQL_CMD} "SELECT id FROM internal.dataset WHERE name='${DS_NAME_IN1}';")
DS_ID_IN2=$(${PSQL_CMD} "SELECT id FROM internal.dataset WHERE name='${DS_NAME_IN2}';")

# check if target dataset exists
AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.dataset WHERE name='${DS_NAME_OUT}';")

if [ $AUX -ne 0 ]; then
  echo " ---> Error : specified target dataset $DS_NAME_OUT already exists (delete it first)"
  exit 11
fi

# create target dataset
${PSQL_CMD} "INSERT INTO internal.dataset (cdate, name, comment) VALUES ('$CDATE', '$DS_NAME_OUT', '$COMMENT');"

# get target dataset Id
DS_ID_OUT=$(${PSQL_CMD} "SELECT id FROM internal.dataset WHERE name='$DS_NAME_OUT';")

# merge the two source dataset
${PSQL_CMD} "SELECT internal.merge_datasets(${DS_ID_IN1},${DS_ID_IN2},${DS_ID_OUT});"

exit $ERROR


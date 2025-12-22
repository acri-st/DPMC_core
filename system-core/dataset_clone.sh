#!/bin/bash

# -------------------------------------------------------------------
#
# This script creates a clone of an existing dataset
#
# History:
#
# 2017-01-03 :  gb : initial version
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
  echo " Syntax: $0 dataset_name_in dataset_name_out [comment]"
  echo
  exit 3
else
  CDATE=$(date +'%Y-%m-%dT%H:%M:%S')
  DS_NAME_IN=$1
  DS_NAME_OUT=$2
  COMMENT=$3
fi

source ${LTA_HOME}/definitions.include

# check if source dataset exists
AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.dataset WHERE name='${DS_NAME_IN}';")

if [ $AUX -eq 0 ]; then
  echo " ---> Error : specified source dataset $DS_NAME_IN not found"
  exit 10
fi

# get source dataset Id
DS_ID_IN=$(${PSQL_CMD} "SELECT id FROM internal.dataset WHERE name='${DS_NAME_IN}';")

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

# fill target dataset with source dataset list of products
${PSQL_CMD} "INSERT INTO internal.dataset_x_product (dataset_id, product_id) SELECT ${DS_ID_OUT}, product_id FROM internal.dataset_x_product WHERE dataset_id = ${DS_ID_IN};"

exit $ERROR


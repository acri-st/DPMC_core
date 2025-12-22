#!/bin/bash

# -------------------------------------------------------------------
#
# This script adds a product to an existing dataset
#
# History:
#
# 2016-02-09 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

if [ $# -lt 1 ]; then
  echo
  echo " Syntax: $0 dataset_name product_name"
  echo
  exit 3
else
  CDATE=$(date +'%Y-%m-%dT%H:%M:%S')
  DS_NAME=$1
  PRD_NAME=$2
fi

source ${LTA_HOME}/definitions.include

${PSQL_CMD} "SELECT internal.add_product_to_dataset_by_name('$DS_NAME','$PRD_NAME');" > /dev/null

exit $ERROR


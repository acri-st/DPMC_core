#!/bin/bash

# -------------------------------------------------------------------
#
# This script removes all products from an existing dataset with a
# specified type
#
# History:
#
# 2016-04-25 :  gb : initial version
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
  echo " Syntax: $0 dataset_name product_type"
  echo
  exit 3
else
  DS_NAME=$1
  PRD_TYPE=$2
fi

source ${LTA_HOME}/definitions.include

for PRD_NAME in `${SYSTEM_CORE}/dataset_content.sh $DS_NAME $PRD_TYPE | awk -F"|" '{print $3}'` ; do

  echo $PRD_NAME
  ${SYSTEM_CORE}/dataset_remove_product.sh $DS_NAME $PRD_NAME

done

exit $ERROR


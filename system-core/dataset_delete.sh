#!/bin/bash

# -------------------------------------------------------------------
#
# This script deletes a dataset record 
#
# History:
#
# 2016-03-21 :  gb : initial version
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
  echo " Syntax: $0 name "
  echo
  exit 3
else
  NAME=$1
fi

source ${LTA_HOME}/definitions.include

# save the list of all products in the dataset
echo " Saving dataset content into ${SYSTEM_TMP}/dataset_delete_${NAME}.log"
${SYSTEM_CORE}/dataset_content.sh -p ${NAME} | sort > ${SYSTEM_TMP}/dataset_delete_${NAME}.log

${PSQL_CMD} "SELECT internal.delete_dataset_by_name ('$NAME');"

exit $ERROR


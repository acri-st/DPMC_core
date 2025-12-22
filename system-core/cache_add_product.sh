#!/bin/bash

# -------------------------------------------------------------------
#
# This script includes a product in the local cache
#
# History:
#
# 2016-03-24 :  gb : initial version
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

source ${LTA_HOME}/definitions.include

# load python environment
. ${SPECIFIC_PACKAGE}/S3/python_stable/bin/env.sh 

# get host name
HOSTNAME=$(hostname | awk -F"." '{print $1}')
export HOSTNAME

# get local cache directory from the database
CACHE_DIR_HOME=$(${PSQL_CMD} "SELECT cache_dir FROM processing.hosts WHERE hostname = '${HOSTNAME}';" | sed "s/|/ /g")
export CACHE_DIR_HOME

# cache specified products
for PRD_PATH in "$@"; do
  ${SPECIFIC_PACKAGE}/S3/cache_get.sh $PRD_PATH
done

exit $ERROR


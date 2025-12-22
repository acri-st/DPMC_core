#!/bin/bash

# -------------------------------------------------------------------
#
# This script creates a dataset record
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
# 10 : specified dataset already exists
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
  echo " Syntax: $0 name comment"
  echo
  exit 3
else
  CDATE=$(date +'%Y-%m-%dT%H:%M:%S')
  DS_NAME=$1
  COMMENT=$2
fi

source ${LTA_HOME}/definitions.include

# check if dataset exists
AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.dataset WHERE name='${DS_NAME}';")

if [ $AUX -ne 0 ]; then
  echo " ---> Error : specified dataset $DS_NAME already exists"
  exit 10
fi

${PSQL_CMD} "INSERT INTO internal.dataset (cdate, name, comment) VALUES ('$CDATE', '$DS_NAME', '$COMMENT');"

exit $ERROR


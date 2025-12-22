#!/bin/bash

# -------------------------------------------------------------------
#
# This script renames an existing dataset
#
# History:
#
# 2018-06-07 :  gb : initial version
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
  echo
  echo " If datasets in and out are the same, o,nly the comment is updated "
  echo
  exit 3
else
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

# check if datasets in and out are the same
if [ "$DS_NAME_IN" != "$DS_NAME_OUT" ]; then

  # check if target dataset exists
  AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.dataset WHERE name='${DS_NAME_OUT}';")

  if [ $AUX -ne 0 ]; then
    echo " ---> Error : specified target dataset $DS_NAME_OUT already exists (delete it first)"
    exit 11
  fi

  # rename dataset
  ${PSQL_CMD} "UPDATE internal.dataset SET name='$DS_NAME_OUT' WHERE id=${DS_ID_IN};"

fi

# update the comment (if any)
if [ ! -z "$COMMENT" ]; then
  ${PSQL_CMD} "UPDATE internal.dataset SET comment='$COMMENT' WHERE id=${DS_ID_IN};"
fi

exit $ERROR


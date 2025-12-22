#!/bin/bash

# -------------------------------------------------------------------
#
# This script is the generic chain launcher of the DPMC
#
# History:
#
# 2016-01-08 :  gb : convert into psql 
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z "${LTA_HOME}" ]; then
  echo
  echo " Error: environment is not correctly defined " 
  echo "   LTA_HOME is not set "
  echo
  exit 2
fi

# upload global variables
# ----------------------------------------------------------------------------------
source ${LTA_HOME}/definitions.include

# set postgresql variables
export PGHOST=${DB_SERVER}
export PGUSER=${DB_USER}
export PGDATABASE=${DB_NAME}
export PGPORT=5432

# build generic psql command 
PSQL_CMD="psql -t -q -c"

# retrieve useful information from the database
# ----------------------------------------------------------------------------------
#EMAIL=$(${PSQL_CMD} "SELECT email FROM internal.requester WHERE name like 'Operator';")
#export EMAIL

BATCH_ID=$1

cd $PROCESSING_DIR
echo PROCESSING_DIR=$PROCESSING_DIR >> /exports/dpmc/tmp/zzz.txt

V_COMMAND=$(${PSQL_CMD} "SELECT value FROM processing.parameters_set WHERE id=${BATCH_ID} and keyword_index=1;")

eval ${V_COMMAND}

exit $ERROR


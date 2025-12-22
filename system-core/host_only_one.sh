#!/bin/bash

# -------------------------------------------------------------------
#
# This script disables all hosts except one
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
  echo " Syntax: $0 host_id "
  echo
  echo " If host_id=0 then disables all hosts "
  echo
  exit 3
else
  HOST_ID=$1
fi

source ${LTA_HOME}/definitions.include

# disable all hosts
${PSQL_CMD} "UPDATE processing.hosts SET available=false;"

# enable only specified host
if [ ${HOST_ID} -ne 0 ]; then
  ${PSQL_CMD} "UPDATE processing.hosts SET available=true WHERE hosts.host_id=${HOST_ID};"
fi

# display list of hosts
${PSQL_CMD} "SELECT * FROM processing.hosts ORDER BY host_id;"

exit $ERROR


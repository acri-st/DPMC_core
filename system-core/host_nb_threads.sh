#!/bin/bash

# -------------------------------------------------------------------
#
# This script modifies the number of threads of a specified host
#
# History:
#
# 2016-03-25 :  gb : initial version
# 2019-12-09 :  gb : list all host info by default
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
#  5 : invalid HOST_ID
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

HOST_ID=9999

if [ ! -z "$1" ]; then
  HOST_ID=$1
  NB_THREADS=$2
else
  echo " Syntax: $0 host_id nb_threads "
  exit 3
fi

source ${LTA_HOME}/definitions.include

if [ $HOST_ID -ne 9999 ]; then

  # check if host_id is valid
  AUX=$(${PSQL_CMD} "SELECT count(*) FROM processing.hosts WHERE host_id=${HOST_ID};")
  if [ $AUX -eq 0 ]; then
    echo
    echo " -----> Error: HOST_ID ${HOST_ID} not found! "
    echo
    exit 5
  fi

  # set the number of threads
  if [ ${HOST_ID} -ne 0 ]; then
    ${PSQL_CMD} "UPDATE processing.hosts SET ncpu=${NB_THREADS} WHERE host_id=${HOST_ID};"
  else
    ${PSQL_CMD} "UPDATE processing.hosts SET ncpu=${NB_THREADS} WHERE host_id>0;"
  fi

fi

# display list of hosts
${PSQL_CMD} "SELECT * FROM processing.hosts ORDER BY host_id;" | head -1000

exit $ERROR


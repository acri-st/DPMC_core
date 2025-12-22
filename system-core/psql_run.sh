#!/bin/bash

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

if [ $# -lt 1 ]; then
  echo
  echo " Syntax: $0 SQL_command"
  echo
  exit 3
else
  CMD=$1
fi

source ${LTA_HOME}/definitions.include

${PSQL_CMD} "$CMD;" | sed "/^$/d"

exit $ERROR


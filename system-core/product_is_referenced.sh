#!/bin/bash

# -------------------------------------------------------------------
#
# This script can be used to check if a product is referenced
# in the DPMC database
#
# History:
#
# 2016-01-11 :  gb : initial version
# 2017-12-31 :  gb : allows path and zip names 
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : wrong parameters
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  exit 2 
fi

source ${LTA_HOME}/definitions.include

# check parameters
if [ $# -lt 1 ]
then
  echo
  echo "Syntax: $0 product_name"
  echo
  exit 3
else
  AUX=$1
fi

PRD_NAME=$(basename $AUX | sed "s/.zip//")

RESULT=$(${PSQL_CMD} "SELECT count(*) FROM internal.product where name='${PRD_NAME}';")

echo $RESULT

exit 0


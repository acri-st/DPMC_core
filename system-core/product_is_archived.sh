#!/bin/bash

# -------------------------------------------------------------------
#
# This script can be used to check if a product is archived on HSM
#
# History:
#
# 2018-01-14 :  gb : initial version
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

RESULT=$(${PSQL_CMD} "select count(product_name) from s3ome.hsm_copy where product_name='${PRD_NAME}';")

echo $RESULT

exit 0


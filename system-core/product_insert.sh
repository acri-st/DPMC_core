#!/bin/bash

# -------------------------------------------------------------------
#
# This script insert a standard product in the DPMC database
#
# History:
#
# 2016-03-30 :  gb : initial version
# 2017-07-03 :  gb : correct bug: product not ingested if directory
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  1 : wrong option
#  2 : LTA_HOME is not set
#  3 : syntax error
# 10 : specified product is not a zip file or a directory
# 11 : absolute path must be specified
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 prd_path (.zip file or directory)"
  echo
}

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

source ${LTA_HOME}/definitions.include

if [ $# -lt 1 ]; then
  print_syntax
  exit 3
else
  PRD_PATH=$1
fi

# check if the file is a zip product
AUX=$(echo $PRD_PATH | grep -c "zip")

if [ $AUX -eq 0 -a ! -d $PRD_PATH ]; then
  echo
  echo " Error: product must be a zip file or a directory ! "
  echo
  exit 10
fi

# check if the file path is valid
AUX=$(dirname $PRD_PATH)

if [ "${AUX:0:1}" = "." ]; then
  echo
  echo " Error: product must be specified a an absolute path ! "
  echo
  exit 11
fi

# product name
PRD_NAME=$(basename $PRD_PATH | sed "s/.zip//")
echo PRD_NAME=$PRD_NAME

# product type
PRD_TYPE=${PRD_NAME:4:11}
echo PRD_TYPE=$PRD_TYPE

# insert product
${SYSTEM_CORE}/insert_product_psql.sh $PRD_PATH $PRD_NAME $PRD_TYPE
ERROR=$?

exit $ERROR


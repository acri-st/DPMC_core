#!/bin/bash

# -------------------------------------------------------------------
#
# This script is use to fully remove a product from the DPMC database
#
# History:
#
# 2016-02-23 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : wrong parameters
# 10 : specified product not found in the database
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
  echo " Remove all product references in the database "
  exit 3
else
  PRD_NAME=$1
fi

# check if the product is referenced in the database
AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.product WHERE name='${PRD_NAME}';")

if [ $AUX -eq 0 ]; then
  echo " ---> Error : specified input product $PRD_NAME not found in the database"
  exit 10
fi

${PSQL_CMD} "select * from internal.delete_product_from_database('${PRD_NAME}');"

exit 0


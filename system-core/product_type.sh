#!/bin/bash

# -------------------------------------------------------------------
#
# This script returns the product type of a specified product
#
# History:
#
# 2021-11-26 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-i|-l] [-p prd_name] [-pt prd_type] "
  echo
  echo " -p prd_name : a product name is provided "
  echo " -pt prd_type : a product type is provided "
  echo " -i : display the identifier of the product type "
  echo " -l : display the processing level of the product type "
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

PRD_NAME=null
PRD_TYPE=null
IDENT=false
LEVEL=false

if [ -z "$1" ]; then
  print_syntax
  exit 0
fi

while :
do
  case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -p)
      PRD_NAME=$2
      shift 2
      ;;
    -pt)
      PRD_TYPE=$2
      shift 2
      ;;
    -i)
      IDENT=true
      shift
      ;;
    -l)
      LEVEL=true
      shift
      ;;
    -*)
      print_syntax
      echo
      echo " -----> Error: unknown option $1 !"
      echo
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

if [ "PRD_TYPE" = "null" ]; then
  if [ "PRD_NAME" = "null" ]; then
    echo
    echo " At least PRD_NAME or PRD_TYPE must be specified !"
    echo
    exit 2
  else
    PRD_TYPE=$(${PSQL_CMD} "SELECT pt.acronym FROM internal.product as p, internel.product_type as pt WHERE pt.id=p.product_type AND p.name like '%${PRD_NAME}%';" | sed "/^$/d")
  fi
fi

if $IDENT ; then
  ${PSQL_CMD} "SELECT pt.id FROM internal.product_type as pt WHERE pt.acronym like '%${PRD_TYPE}%';" | sed "/^$/d" | sed "s/ //g"
fi

if $LEVEL ; then
  ${PSQL_CMD} "SELECT pt.processing_level FROM internal.product_type as pt WHERE pt.acronym like '%${PRD_TYPE}%';" | sed "/^$/d" | sed "s/ //g"
fi

exit $ERROR


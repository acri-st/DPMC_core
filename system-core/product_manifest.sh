#!/bin/bash

# -------------------------------------------------------------------
#
# This script displays the product manifest
#
# History:
#
# 2016-12-13 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
#  5 : manifest not found
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 prd_name"
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

if [ "x$1" = "x" ]; then
  print_syntax
  exit 3 
else
  STRING=$1
fi

FPATH=$(${PSQL_CMD} "SELECT disk_location FROM public.files_location WHERE official_name like '%${STRING}%' ORDER BY disk_location;" | sed "s/  / /g" | sed "/^$/d")

if [ -d $FPATH ]; then
  if [ -f $FPATH/xfdumanifest.xml ]; then
    cat $FPATH/xfdumanifest.xml
  else
    echo " $FPATH/xfdumanifest.xml not found ! "
    exit 5
  fi
else
  unzip -p $FPATH $STRING/xfdumanifest.xml
fi

exit $ERROR


#!/bin/bash

# -------------------------------------------------------------------
#
# This script lists the existing software and associated sxac
#
# History:
#
# 2016-05-12 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
#  6 : invalid software name
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 string"
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

#FPATH=false
#NAMES_ONLY=false
#
#while :
#do
#  case "$1" in
#    -p)
#      FPATH=true
#      shift
#      ;;
#    -n)
#      NAMES_ONLY=true
#      shift
#      ;;
#    -*)
#      print_syntax
#      echo
#      echo " -----> Error: unknown option $1 !"
#      echo
#      exit 1
#      ;;
#    *)
#      break
#      ;;
#  esac
#done

if [ "x$1" = "x" ]; then
  STRING=""
else
  STRING=$1
fi

if [ $(${PSQL_CMD} "SELECT count(*) FROM internal.software WHERE name='${STRING}';") -eq 0 ]; then
  echo
  echo " -----> Error: software named $STRING not found in the database !"
  echo
  exit 6
fi

for ID in $(${PSQL_CMD} "SELECT id FROM internal.software WHERE name='${STRING}' order by id;") ; do
  echo
  echo Software Id = $ID
  ${PSQL_CMD} "SELECT * FROM internal.software WHERE id=$ID;"
  ${PSQL_CMD} "SELECT * FROM internal.software_x_auxiliary_configuration where software=$ID order by id;"
done 

echo
echo ----- software_x_auxiliary_configuration -----------

exit $ERROR


#!/bin/bash

# -------------------------------------------------------------------
#
# This scripts lists all media referenced in the database 
#
# History:
#
# 2018-11-26 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
#  5 : history id not specified
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: "
  echo
  echo "     $0 "
  echo
}

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

#if [ "x$1" = "x" ]; then
#  print_syntax
#  exit 0
#fi

source ${LTA_HOME}/definitions.include

MEDIA="NULL"

while :
do
  case "$1" in
    -m)
      MEDIA=$2
      shift 2
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

#if [ "$MEDIA" = "NULL" ]; then
#  echo
#  echo " Error: MEDIA shall be specified ! "
#  echo
#  exit 4
#fi

echo 
${PSQL_CMD} "select * from public.media_delivered order by id;" | sed "s/  / /g"

exit $ERROR


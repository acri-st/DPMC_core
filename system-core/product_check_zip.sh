#!/bin/bash

# -------------------------------------------------------------------
#
# This script checks if product(s) are valid (i.e. zip is valid)
#
# History:
#
# 2016-10-24 :  gb : initial version
# 2017-07-18 :  gb : process only one product at a time
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
#  6 : product name not specified
#  7 : product not found
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 -t|-z [-v] product_name "
  echo
  echo " -t : only check if product exists on disk "
  echo " -z : check if zip is valid "
  echo " -v : verbose mode "
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

PP=$$

FTEST=false
ZTEST=false
DEBUG=false

while :
do
  case "$1" in
    -t)
      FTEST=true
      shift
      ;;
    -z)
      ZTEST=true
      shift
      ;;
    -v)
      DEBUG=true
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

if [ "x$1" = "x" ]; then
  print_syntax
  echo
  echo " ---> Error: product name shall be specified! "
  echo
  exit 6
else
  PRD_NAME=$1
fi

# check if product exists
N=$(${PSQL_CMD} "SELECT count(*) FROM internal.product WHERE product.name = '${PRD_NAME}';")

if [ $N -eq 0 ]; then
  print_syntax
  echo
  echo " ---> Error: product name $PRD_NAME not found! "
  echo
  exit 7
fi

if ! $FTEST ; then
  if ! $ZTEST ; then
    print_syntax
    echo
    echo " ---> Error: at least -t or -z option shall be specified! "
    echo
    exit 8
  fi
fi
 
if $FTEST ; then
  ${PSQL_CMD} "SELECT disk_location FROM public.files_location WHERE official_name = '${PRD_NAME}';" \
    | sed "s/ S/S/" | sed "/^$/d" > zzz_$PP.txt
  for PRD_PATH in $(cat zzz_$PP.txt) ; do
    if [ -f $PRD_PATH -o -d $PRD_PATH ]; then
      echo $PRD_PATH
    else
      echo " ---> Error: $PRD_PATH not found on disk "
    fi
  done
fi

if $ZTEST ; then
  ${PSQL_CMD} "SELECT disk_location FROM public.files_location WHERE official_name = '${PRD_NAME}';" \
    | sed "s/ S/S/" | sed "/^$/d" > zzz_$PP.txt
  ERROR=0
  for PRD_PATH in $(cat zzz_$PP.txt) ; do
    AUX=$(zip -T $PRD_PATH | grep -v " OK")
    if [ ! -z "$AUX" ]; then
      ERROR=1
    fi
  done
  echo $ERROR
fi

/bin/rm -f zzz_$PP.txt



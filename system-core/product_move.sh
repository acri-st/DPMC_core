#!/bin/bash

# -------------------------------------------------------------------
#
# This script moves a product from its current location to a target 
# directory (the full path is created via build_prd_path script)
#
# Target directory shall exist before calling the script 
#
# History:
#
# 2017-02-01 :  gb : initial version
# 2019-06-13 :  gb : MOVE option added
# 2020-02-12 :  gb : correct bugs
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : wrong parameters
#  4 : specified product not found in database
#  5 : specified product not found on disk
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-m] product_name target_disk"
  echo
  echo " -m : move products instead of rsync it "
  echo " -d : debug mode "
  echo
}

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  exit 2 
fi

source ${LTA_HOME}/definitions.include

# check parameters
if [ $# -lt 2 ]; then
  print_syntax
  exit 3
fi

DEBUG=false
MOVE=false

while :
do
  case "$1" in
    -m)
      MOVE=true
      shift
      ;;
    -d)
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

if [ -z "$2" ]; then
  echo
  echo " -----> Error: product name and/or target disk not specified ! "
  echo
  exit 8
fi

PRD_NAME=$1
TARGET_DISK=$2

RESULT=$(${PSQL_CMD} "SELECT count(*) FROM internal.product where name='${PRD_NAME}';")

if [ $RESULT -eq 0 ]; then
  echo
  echo " -----> Error: product $PRD_NAME not found in database ! "
  echo
  exit 4
fi

RESULT=$(${PSQL_CMD} "SELECT count(*) FROM public.files_location WHERE official_name like '${PRD_NAME}';" | sed "s/  / /g" | sed "/^$/d")

if [ $RESULT -eq 0 ]; then
  echo
  echo " -----> Error: no path for product $PRD_NAME in database ! "
  echo
  exit 6
elif [ $RESULT -gt 1 ]; then
  echo
  echo " -----> Error: product $PRD_NAME has multiple paths in database ! "
  echo
  exit 7
fi

PRD_PATH=$(${PSQL_CMD} "SELECT disk_location FROM public.files_location WHERE official_name like '${PRD_NAME}';" | sed "s/ //g" | sed "/^$/d")

if $DEBUG ; then echo PRD_PATH=$PRD_PATH ; fi

if [ ! -d $TARGET_DISK ]; then
  echo
  echo " -----> Error: target disk $TARGET_DISK does not exist ! "
  echo
  exit 9
fi

if $DEBUG ; then echo Copy product to target directory ; fi

# MD5 of the original product
MD5a=$(md5sum $PRD_PATH | awk '{print $1}')

if $DEBUG ; then echo MD5a=$MD5a ; fi

PRD_FILE=$(basename $PRD_PATH)

TARGET_DIR=${TARGET_DISK}/$(build_prd_path.sh -i ${PRD_FILE})

if $DEBUG ; then echo TARGET_DIR=$TARGET_DIR ; fi

mkdir -p $TARGET_DIR

if $MOVE ; then
  mv -v $PRD_PATH $TARGET_DIR
  ERR=$?
else
  rsync -auv $PRD_PATH $TARGET_DIR
  ERR=$?
fi
ERR=0

if [ $ERR -ne 0 ]; then
  echo
  echo " -----> Error: error $ERR during copy ! "
  if ! $MOVE ; then
    if [ -f $TARGET_DIR/$PRD_FILE ]; then
      /bin/rm -f $TARGET_DIR/$PRD_FILE
    fi
  fi
  echo
  exit 11
fi

if [ ! -f $TARGET_DIR/$PRD_FILE ]; then
  echo
  echo " -----> Error: problem during copy - target file not found ! "
  echo
  exit 12
fi

# MD5 of the copies
MD5b=$(md5sum $TARGET_DIR/$PRD_FILE | awk '{print $1}')

if $DEBUG ; then echo MD5b=$MD5b ; fi

if [ "$MD5a" != "$MD5b" ]; then
  echo
  echo " -----> Error: problem during copy - checksums are not equal ! "
  if ! $MOVE ; then
    /bin/rm -f $TARGET_DIR/$PRD_FILE
  fi
  echo
  exit 13
fi

# insert new product location in the database  
product_insert.sh $TARGET_DIR/$PRD_FILE

# check that new location is correctly registered
RESULT=$(${PSQL_CMD} "SELECT count(*) FROM public.files_location WHERE official_name like '${PRD_NAME}';" | sed "s/  / /g" | sed "/^$/d")

if [ $RESULT -ne 2 ]; then
  echo
  echo " -----> Error: new product location incorrectly recorded in database (via nb of records!=2) ! "
  /bin/rm -f $TARGET_DIR/$PRD_FILE
  echo
  exit 14
fi

# double check...
RESULT=$(product_list.sh -p $(echo $PRD_FILE | sed "s/.zip//") | grep $TARGET_DIR)

if [ -z "$RESULT" ]; then
  echo
  echo " -----> Error: new product location incorrectly recorded in database (via product_list) ! "
  /bin/rm -f $TARGET_DIR/$PRD_FILE
  echo
  exit 14
fi

# remove the product from its old location
if [ -f $TARGET_DIR/$PRD_FILE ]; then
  /bin/rm -f $PRD_PATH
  # unreference old location of the product
  unreference_product.sh $PRD_PATH
fi

exit 0


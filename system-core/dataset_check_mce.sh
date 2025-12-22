#!/bin/bash

# -------------------------------------------------------------------
#
# This script checks if all products of a dataset are correctly referenced in the database 
#
# History:
#
# 2019-12-13 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

if [ $# -lt 1 ]; then
  echo
  echo " Syntax: $0 dataset_name"
  echo
  exit 3
else
  DS_NAME=$1
fi

source ${LTA_HOME}/definitions.include

P=$$
FICTMP=zzz_$P.tmp
FICTMP2=zzz2_$P.tmp
FICTMP3=zzz3_$P.tmp
FICTMP4=zzz4_$P.tmp

dataset_content.sh -n $DS_NAME > $FICTMP

echo " Number of products referenced in dataset .............. = $(cat $FICTMP | wc -l) "

dataset_content.sh -p $DS_NAME > $FICTMP2
cat $FICTMP2 | sed "s/.zip//" | awk -F"/" '{print $NF}' | sort > $FICTMP3

echo " Number of media catalog entry referenced in dataset .............. = $(cat $FICTMP3 | wc -l) "

echo " List of unreferenced products = "

cat $FICTMP $FICTMP3 $FICTMP3 | sort | uniq -u > $FICTMP4

if [ -s $FICTMP4 ]; then

  cat $FICTMP4

else

  echo " None "

fi
#${PSQL_CMD} "SELECT internal.delete_product_from_dataset_by_name('$DS_NAME','$PRD_NAME');" > /dev/null

/bin/rm -f zzz*_$P.tmp

exit $ERROR


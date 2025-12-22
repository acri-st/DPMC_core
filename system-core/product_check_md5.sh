#!/bin/bash

# -------------------------------------------------------------------
#
# This script checks if the MD5 of the files included in a product
# are correct (i.e. equal to manifest content)
#
# History:
#
# 2017-07-18 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 product_path "
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

DEBUG=false

while :
do
  case "$1" in
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

PRD_PATH=$1

P=$$

FICTMP1=zzz_1_$P.tmp
FICTMP2=zzz_2_$P.tmp
FICTMP3=zzz_3_$P.tmp

grep fileLocation $PRD_PATH/xfdumanifest.xml | sed "s/..*href=.//" | sed 's/"..*//' > $FICTMP1
grep checksum $PRD_PATH/xfdumanifest.xml | sed "s/..*MD5..//" | sed "s/..checksum..*//" > $FICTMP2
paste $FICTMP1 $FICTMP2 > $FICTMP3

ERROR=0

for FILE in $(cat $FICTMP1) ; do
  MD5=$(md5sum $PRD_PATH/$FILE | awk '{print $1}')
  REF=$(grep "^$FILE" $FICTMP3 | awk '{print $2}')
  if [ "$REF" != "$MD5" ]; then
    ERROR=1
  fi
  if $DEBUG ; then echo $FILE $REF $MD5 ; fi
done

echo $ERROR

/bin/rm -f $FICTMP1 $FICTMP2 $FICTMP3



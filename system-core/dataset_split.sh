#!/bin/bash

# -------------------------------------------------------------------
#
# This script split an existing dataset into sub-datasets taking 
# into account a media type (--> media size), a dataset name
# and an acronym (optional)
#
# History:
#
# 2018-05-30 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-d] -i dataset_in [-o dataset_out] [-a acronym] -m media_type "
  echo
  echo " -i : dataset in "
  echo " -m : media type (used to retrieve the maximum subset size)"
  echo " -a : acronym (grep acronym in dataset) "
  echo " -o : generic name of the output datasets (din_part_1, din_part_2, ...) "
  echo " -d : debug mode (just write the actions... do not perform any database change) "
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

DIN=null
MEDIA_TYPE=null
ACRONYM=null
DOUT=null
DEBUG=false

while :
do
  case "$1" in
    -d)
      DEBUG=true
      shift
      ;;
    -i)
      DIN=$2
      shift 2
      ;;
    -m)
      MEDIA_TYPE=$2
      shift 2
      ;;
    -a)
      ACRONYM=$2
      shift 2
      ;;
    -o)
      DOUT=$2
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

# check parameters
if [ "$DIN" = "null" ]; then
  print_syntax
  echo
  echo " Error: input dataset shall be specified ! "
  echo
  exit 4
fi

# retrieve maximum media size
if [ "$MEDIA_TYPE" = "null" ]; then
  print_syntax
  echo
  echo " Error: media type shall be specified ! "
  echo
  exit 4
fi

# outut datasets name is based on input dataset name
if [ "$DOUT" = "null" ]; then
  DOUT=${DIN}_part
fi

# check if specified dataset exists
if [ $(${PSQL_CMD} "select count(*) from internal.dataset where name ='${DIN}';") -eq 0 ]; then
  echo
  echo " Error: dataset $DIN not found ! "
  echo
  exit 5
else
  DATASET_IN=$DIN
fi

# check media type and retrieve maximum size
if [ $(${PSQL_CMD} "select count(*) from internal.media_type where name ='${MEDIA_TYPE}';") -eq 0 ]; then
  echo
  echo " Error: media_type $MEDIA_TYPE not found ! "
  echo
  echo " Valid media types are:"
  echo
  ${PSQL_CMD} "select * from internal.media_type;"
  echo
  exit 6
else
  AUX=$(${PSQL_CMD} "select capacity from internal.media_type where name ='${MEDIA_TYPE}';")
  # convert into bytes
  MAX_SIZE=$(printf "%.0f" $(echo "scale=0; $AUX*1000*1000*1000*1000" | bc -l))
fi

echo DATASET_IN=$DIN
echo DATASET_OUT=$DOUT
echo MEDIA_TYPE=$MEDIA_TYPE
echo MAX_SIZE=$MAX_SIZE

P=$$

FICTMP=zzz_$P.tmp

if [ "$ACRONYM" = "null" ]; then
  dataset_content.sh $DIN | awk -F"|" '{print $3,"|",$5}' | sed "s/ //g" > $FICTMP
else
  dataset_content.sh $DIN | grep $ACRONYM | awk -F"|" '{print $3,"|",$5}' | sed "s/ //g" > $FICTMP
fi

echo "Total number of products in $DIN = $(cat $FICTMP | wc -l)"

NCUR=1
DCUR=${DOUT}_$NCUR

# create the first sub-dataset
if $DEBUG ; then
  echo " Create $DCUR dataset"
  sleep 2
else
  echo " Create $DCUR dataset"
  dataset_create.sh $DCUR "subset of $DIN number $NCUR"
fi

# current size of list of products
SCUR=0

for LINE in $(cat $FICTMP) ; do
  
  PRD_NAME=$(echo $LINE | awk -F"|" '{print $1}')
  PRD_SIZE=$(echo $LINE | awk -F"|" '{print $2}')

  AUX=$((SCUR+PRD_SIZE))

  if [ $AUX -gt $MAX_SIZE ]; then
    # dataset is full... create a new one
    NCUR=$((NCUR+1))
    DCUR=${DOUT}_$NCUR
    SCUR=0
    if $DEBUG ; then
      echo " Create $DCUR dataset"
      sleep 2
    else
      echo " Create $DCUR dataset"
      dataset_create.sh $DCUR "subset of $DIN number $NCUR"
    fi
  fi

  # add the product to the current sub dataset
  if $DEBUG ; then
    echo " Add $PRD_NAME to $DCUR - cumulative size = $(echo $SCUR | awk '{printf "%.2f",$1/1000/1000/1000}') Gbytes "
  else
    echo " Add $PRD_NAME to $DCUR - cumulative size = $(echo $SCUR | awk '{printf "%.2f",$1/1000/1000/1000}') Gbytes "
    dataset_add_product.sh $DCUR $PRD_NAME
  fi

  SCUR=$((SCUR+PRD_SIZE))

done

/bin/rm -rf zzz*_$P.tmp

exit $ERROR


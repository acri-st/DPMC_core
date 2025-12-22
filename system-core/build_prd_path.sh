#!/bin/bash

# -------------------------------------------------------------------
#
# This script builds the product sub-dir to be used to store
# an ADF or a product in the reprocessing storage disk
# /disk/input or /disk/output has to be manually added at
# the beginning of this sub-dir to get the full path
#
# History:
#
# 2016-03-18 :  gb : initial version
# 2016-04-25 :  gb : add ARHIVE option
# 2016-05-18 :  gb : update ARCHIVE option
# 2016-06-10 :  gb : ARCHIVE option (product_type used instead of
#                    just 2 letters)
# 2018-05-07 :  gb : add -n to specify the number of characters of
#                    the product type
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  1 : wrong option
#  4 : no valid option
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo "Syntax: $0 option prd_name"
  echo
  echo "where option is:"
  echo
  echo "  -a for dissemination archive mode "
  echo "  -h for HSM archive mode "
  echo "  -i for an input product"
  echo "  -o for an output product"
  echo "  -n xxx to specify the number of characters for the product type (default 8)"
  echo
}

# default value of the exit code
ERROR=0

# default parameters value
DIR=NULL
ARCHIVE=0
NCPT=8

while :
do
  case "$1" in
    -i)
      DIR=input
      PRD_NAME=$2
      shift 2
      ;;
    -o)
      DIR=output
      PRD_NAME=$2
      shift 2
      ;;
    -a)
      DIR=dummy
      PRD_NAME=$2
      ARCHIVE=1
      shift
      ;;
    -n)
      NCPT=$2
      shift 2
      ;;
    -h)
      DIR=dummy
      PRD_NAME=$2
      ARCHIVE=2
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

if [ "$DIR" = "NULL" ]; then
  print_syntax
  echo
  echo " -----> Error: no valid option specified !"
  echo
  exit 4
fi

# S3A_OL_0_EFR____20160305T084547_20160305T084747_20160305T101953_0119_001_278______SVL_O_NR_001.SEN3
#           1    1    2    2    3    3    4    4    5    5    6    6    7    7    8    8    9    9
# 0    5    0    5    0    5    0    5    0    5    0    5    0    5    0    5    0    5    0    5   

PLATFORM=${PRD_NAME:0:3}
YEAR=${PRD_NAME:16:4}
MONTH=${PRD_NAME:20:2}
DAY=${PRD_NAME:22:2}
BASELINE=${PRD_NAME:91:3}
TYPE=${PRD_NAME:4:$NCPT}
TYPE_HSM=${PRD_NAME:4:5}

if [ $ARCHIVE -eq 1 ]; then
  echo $PLATFORM/$TYPE/$YEAR/$MONTH/$DAY
elif [ $ARCHIVE -eq 2 ]; then
  echo $PLATFORM/$TYPE_HSM/$YEAR/$MONTH/$DAY
else
  if [ "$DIR" = "input" ]; then
    echo $DIR/$PLATFORM/$YEAR/$MONTH/$DAY
  else
    echo $DIR/$BASELINE/$PLATFORM/$YEAR/$MONTH/$DAY
  fi
fi

exit $ERROR


#!/bin/bash

# -------------------------------------------------------------------
#
# This script split a product list into sub-lists taking 
# into account a maximum size
#
# History:
#
# 2018-05-31 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 -i list_in -d dataset -m max_size -o list_out  "
  echo "            -s list_in_with_size -m max_size -o list_out  "
  echo
  echo " -i : list of products names (only names) "
  echo " -s : list of products names + sizes "
  echo " -m : maximum size of each sub-list (in GBytes)"
  echo " -o : prefix of output list (lout_1.txt, lout_2.txt, ...) "
  echo " -d : dataset containing the products (only used to get fast access to products sizes) "
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

LIST=null
MAX_SIZE=null
LOUT=null
DIN=null
LSIZE=false

while :
do
  case "$1" in
    -i)
      LIST=$2
      shift 2
      ;;
    -s)
      LIST=$2
      LSIZE=true
      shift 2
      ;;
    -d)
      DIN=$2
      shift 2
      ;;
    -o)
      LOUT=$2
      shift 2
      ;;
    -m)
      MAX_SIZE=$2
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
if [ "$LIST" = "null" ]; then
  print_syntax
  echo
  echo " Error: products list shall be specified ! "
  echo
  exit 4
fi

if [ "$LOUT" = "null" ]; then
  print_syntax
  echo
  echo " Error: prefix of output lists shall be specified ! "
  echo
  exit 4
fi

if [ "$MAX_SIZE" = "null" ]; then
  print_syntax
  echo
  echo " Error: maximum size shall be specified ! "
  echo
  exit 4
else
  MAX_SIZE=$((MAX_SIZE*1000*1000*1000))
fi

P=$$

FICTMP=zzz_$P.tmp

echo "Total number of products in $LIST = $(cat $LIST | wc -l)"
#echo "Maximum size of one sub-list = $MAX_SIZE"

NCUR=1
LCUR=${LOUT}_${NCUR}.txt
/bin/rm -f $LCUR

if $LSIZE ; then
  # products names + sizes provides... just copy the file
  cp $LIST $FICTMP
else
  # generate the list of products from the specified dataset - if any
  if [ "$DIN" = "null" ]; then
    for PRD_NAME in $(cat $LIST) ; do
      echo $(product_list -s $PRD_NAME) | awk '{print $2,"|",$1}' | sed "s/ //g" | tee -a $FICTMP
    done
  else
    dataset_content.sh -p -s $DIN > $FICTMP
  fi
fi

# current size of list of products
SCUR=0

for LINE in $(cat $LIST) ; do
  
  PRD_PATH=$(grep $LINE $FICTMP | awk -F"|" '{print $1}')
  PRD_SIZE=$(grep $LINE $FICTMP | awk -F"|" '{print $2}')

  #echo PRD_PATH=$PRD_PATH
  #echo PRD_SIZE=$PRD_SIZE

  AUX=$((SCUR+PRD_SIZE))

  if [ $AUX -gt $MAX_SIZE ]; then
    # dataset is full... create a new one
    NCUR=$((NCUR+1))
    LCUR=${LOUT}_${NCUR}.txt
    /bin/rm -f $LCUR
    SCUR=0
  fi

  # add the product to the current sub-list
  echo $PRD_PATH >> $LCUR
  echo " Add $(basename $PRD_PATH) to $LCUR - cumulative size = $(echo $SCUR | awk '{printf "%.2f",$1/1000/1000/1000}') Gbytes "

  #echo $SCUR $PRD_SIZE
  SCUR=$((SCUR+PRD_SIZE))

done

/bin/rm -rf zzz*_$P.tmp

exit $ERROR


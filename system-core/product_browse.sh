#!/bin/bash

# -------------------------------------------------------------------
#
# This script displays the product image
#
# History:
#
# 2017-01-18 :  gb : initial version
# 2017-01-19 :  gb : option -s to save the image with the product name
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
#  4 : specified product not found
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-s][-r factor][-g string] prd_path"
  echo
  echo " -s : save the image using the product name "
  echo " -r : resize using factor in % (e.g. -r 50%)"
  echo " -g : look only for images containing string text"
  echo
}

# default value of the exit code
ERROR=0

SAVE=false
FACTOR=100
GREP=NULL

while :
do
  case "$1" in
    -s)
      SAVE=true
      shift
      ;;
    -r)
      FACTOR=$2
      shift 2
      ;;
    -g)
      GREP=$2
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

if [ -z "$1" ]; then
  print_syntax
  exit 0
else
  PRD_PATH=$1
fi

if [ ! -f ${PRD_PATH} ]; then
  echo
  echo " Product $PRD_PATH not found ! "
  exit
  exit 4
fi

PRD_NAME=$(echo $PRD_PATH | awk -F"/" '{print $NF}' | sed "s/.zip//")

echo
echo " Product content (png files only):"
echo " Select any by specifying option '-g string'"
unzip -l $PRD_PATH | grep png

if [ "$GREP" = "NULL" ]; then
  IMG_FILE=$(unzip -l $PRD_PATH | grep png | awk '{print $NF}' | head -1)
else
  IMG_FILE=$(unzip -l $PRD_PATH | grep png | grep $GREP | awk '{print $NF}' | head -1)
fi

echo
echo " Displayed image:"
echo $IMG_FILE

if [ -z "$IMG_FILE" ]; then
  echo
  echo " Image file not found ! "
  echo
  exit 5
fi

if $SAVE ; then

  IMG_NAME=$(echo $PRD_NAME | sed "s/SEN3/png/")
  unzip -p ${PRD_PATH} ${IMG_FILE} | convert - -resize ${FACTOR}% $IMG_NAME

else

  unzip -p ${PRD_PATH} ${IMG_FILE} | display -resize ${FACTOR}% -

fi

exit $ERROR


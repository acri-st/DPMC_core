#!/bin/bash

print_syntax() {
  echo
  echo " Syntax: "
  echo
  echo "     $0 -d /s3ome_data4 -p /working_dir/S3B_OL_0_EFR____20190201T171013_20190201T175359_20190201T190300_2626_021_283______LN1_O_NT_002.SEN3.zip "
  echo
  echo " -d the disk destination path where the product will be copied (mandatory) "
  echo " -p the product path which will be copied before ingestion (mandatory) "
  echo
}

if [ "x$1" = "x" ]; then
  print_syntax
  exit 0
fi

# Destination folder
DIR="NULL"
# Source product path
PRODUCT_PATH="NULL"

while :
do
  case "$1" in
    -d)
      DIR=$2
      shift 2
      ;;
    -p)
      PRODUCT_PATH=$2
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

# Check if the destination path has been specified
if [ "$DIR" = "NULL" ]; then
  echo
  echo " Error: The destination path shall be specified ! "
  echo
  exit 2
fi
# Check if the product path has been specified
if [ "$PRODUCT_PATH" = "NULL" ]; then
  echo
  echo " Error: The source product path shall be specified ! "
  echo
  exit 3
fi

# Extract product name from product path
PRODUCT_NAME=$(echo $PRODUCT_PATH | awk -F '/' '{print $NF}')
# Check if the product is already referenced in DB
ALREADY_EXIST=$(product_is_referenced.sh $(echo $PRODUCT_NAME | sed "s/.zip//"));
# If the product does not exist yet
if [ $ALREADY_EXIST -eq 0 ]; then
  # Get destiantion product path
  BUILD_PRD_PATH=$(build_prd_path.sh -i $PRODUCT_NAME)
  # Create all the path with destination folder, build product path and product name
  mkdir -p $DIR/$BUILD_PRD_PATH
  # Copy the source product to the destination path
  cp -r $PRODUCT_PATH $DIR/$BUILD_PRD_PATH
  # Ingest product in DB
  product_insert.sh $DIR/$BUILD_PRD_PATH/$PRODUCT_NAME
else
  # If the product is already referenced in DB
  echo 'This product already exists!'
fi


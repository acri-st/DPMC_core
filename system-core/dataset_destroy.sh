#!/bin/bash

# -------------------------------------------------------------------
#
# This script deletes a dataset record + remove the products from
# the database + remove the products from the disk
#
# History:
#
# 2016-03-23 :  gb : initial version
# 2016-06-09 :  gb : save the list of products before removing the
#                    dataset
# 2018-06-18 :  gb : no more remove xml file (no more copied)
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# 10 : specified dataset not found in the database
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 -d <dataset_name> [-l|-f] "
  echo
  echo " -d : dataset name "
  echo " -l : list dataset content to delete (simulation) "
  echo " -f : force the deletion expected by the simulation and destroy the dataset "
  echo
  echo " Examples: dataset_destroy.sh -d CRS_P2_S2_001_S3A_SR1 --> lists all product types "
  echo "           dataset_destroy.sh -d CRS_P2_S2_001_S3A_SR1 -l --> lists all products to remove "
  echo "           dataset_destroy.sh -d CRS_P2_S2_001_S3A_SR1 -f --> destroy the dataset "
  echo
}

if [ -z "$1" ]; then
  print_syntax
  exit 0
fi

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

DS_NAME=""
LIST=0
FORCE=0

while :
do
  case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -d)
      if [ -z "$2" ]; then
        print_syntax
        echo
        echo " -----> Error: missing dataset name after -d !"
        echo
        exit 0
      else
        DS_NAME=$2
        shift 2
      fi
      ;;
    -l)
      LIST=1
      shift
      ;;
    -f)
      FORCE=1
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

source ${LTA_HOME}/definitions.include

# check if dataset exists
AUX=$(${PSQL_CMD} "SELECT count(*) FROM internal.dataset AS d WHERE d.name='${DS_NAME}';")

if [ $AUX -eq 0 ]; then
  echo " ---> Error : dataset $DS_NAME not found in the database!"
  exit 10
fi

# scratch file
FICTMP=zzz_$$.tmp

# save the list of all products in the dataset
${SYSTEM_CORE}/dataset_content.sh -p ${DS_NAME} | sort > $FICTMP

# save the list of products
echo " Saving dataset content into ${SYSTEM_TMP}/dataset_destroy_${DS_NAME}.log"
cp -f $FICTMP ${SYSTEM_TMP}/dataset_destroy_${DS_NAME}.log

PRD_NB=$(${PSQL_CMD} "SELECT count(*) from internal.dataset as d, internal.dataset_x_product as dxp where d.name = '${DS_NAME}' and d.id = dxp.dataset_id;")
# Displays number of products in dataset
echo
echo " Number of products: ${PRD_NB}"
echo

# By default displays only product types
if [ $LIST -eq 0 -a $FORCE -eq 0 ]; then
  echo " Product types in $DS_NAME dataset:"
  dataset_content.sh -n ${DS_NAME} | awk '{print substr($1,5,11)}' | sort | uniq
  echo
# If at least -l or -v is given
else
  NL=0
  NLMAX=`wc -l $FICTMP | awk '{print $1}'`

  # loop over the products in the dataset, delete them from disk and remove them from dataset
  while [ $NL -lt $NLMAX ]; do
    NL=`expr $NL + 1`
    FPATH=`head -$NL $FICTMP | tail -1`

    if [ ! -z "${FPATH}" ]; then
      FNAME=$(basename $FPATH | sed "s/.zip//")
      if [ ${FORCE} -eq 0 ]; then
        echo "Deleting $FPATH $NL/$NLMAX (simulation)"
        echo "Removing $FNAME from dataset (simulation)"
        echo "Removing $FNAME from database (simulation)"
      else
        echo "Deleting $FPATH $NL/$NLMAX"
        if [ -f $FPATH ]; then
          /bin/rm -f $FPATH
        elif [ -d $FPATH ]; then
          /bin/rm -rf $FPATH
        else
          echo " $FPATH already removed "
        fi
        echo "Removing $FNAME from dataset ..."
        ${SYSTEM_CORE}/dataset_remove_product.sh ${DS_NAME} ${FNAME}
        echo "Removing $FNAME from database ..."
        ${SYSTEM_CORE}/product_destroy.sh ${FNAME}
      fi
    fi
  done

  # clean the dataset (remove products from the dataset)
  if [ ${FORCE} -eq 0 ]; then
    echo "Remove remaining products - if any - from dataset $DS_NAME (simulation)"
  else
    echo "Remove remaining products - if any - from dataset $DS_NAME"
    ${SYSTEM_CORE}/dataset_clean.sh ${DS_NAME}
  fi

  # remove the dataset (remove the dataset from the database)
  if [ ${FORCE} -eq 0 ]; then
    echo "Remove dataset $DS_NAME from database (simulation)"
  else
    echo "Remove dataset $DS_NAME from database"
    ${SYSTEM_CORE}/dataset_delete.sh ${DS_NAME}
  fi

  # remove scratch file
  /bin/rm -f $FICTMP
fi

exit $ERROR

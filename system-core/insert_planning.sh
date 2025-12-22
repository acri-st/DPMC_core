#!/bin/bash

source ${LTA_HOME}/definitions.include

SCRIPT_NAME=$0
SQL_NAME=${SYSTEM_CORE}/insert_planning.sql
TEMP_DIR=${SYSTEM_TMP}

if [ $# -lt 1 ]
then
  echo No planning file specified.
  echo Syntax: $SCRIPT_NAME file...
  exit 0
fi

FILES=$*

COUNT=0
for PRODUCT in $*
do
  if [ ! -f $PRODUCT ]; then
    echo $PRODUCT not found.
    continue
  fi
  NB_LINES=`cat $PRODUCT | wc -l`
  NB_LINES=`expr $NB_LINES - 1`
  head -n $NB_LINES $PRODUCT | tail +21 > ${TEMP_DIR}/planning.temp 
  if [ `cat ${TEMP_DIR}/planning.temp | wc -l` -gt 0 ] 
  then 
    $DB_CALL -f $SQL_NAME $DB_NAME 
    echo $PRODUCT
    COUNT=`expr $COUNT + 1`
  fi
  rm ${TEMP_DIR}/planning.temp
done
echo "$COUNT products were processed."
rm $TEMP_DIR/product.header


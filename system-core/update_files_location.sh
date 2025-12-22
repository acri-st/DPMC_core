#!/bin/pgbash 

if [ $# -lt 1 ]; then
 echo " Syntax: $0 files ..."
 exit 2
fi

source ${LTA_HOME}/definitions.include

exec_sql "$DB_CONNECT" > /dev/null

#BEGIN transaction;
    
BASE_DIR=`pwd`

while [ $# -gt 0 ]; do

 FILE=$1

 if [ `basename $FILE` != $FILE ]; then
    echo "Error: this script cannot process indirection (../ ./ etc...)"
    echo "skipping $FILE"
    shift
    continue
 fi

 SELECT internal.disk_location_create( '${FILE}',  '${BASE_DIR}/${FILE}' );

 shift

done

DISCONNECT all; > /dev/null

#END;

exit 0


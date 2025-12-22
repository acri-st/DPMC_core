#!/bin/pgbash

if [ $# -lt 1 ]; then
 echo
 echo " Syntax: $0 product_path ..."
 echo
 exit 2
fi

source ${LTA_HOME}/definitions.include

CONNECT_TODB > /dev/null

BEGIN transaction; > /dev/null

while [ $# -gt 0 ]; do

  FILE=$1

  SELECT internal.disk_location_delete('${FILE}'); > /dev/null

  shift
 
done

COMMIT; > /dev/null

DISCONNECT all; > /dev/null

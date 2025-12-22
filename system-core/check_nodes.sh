#!/bin/sh

source ${LTA_HOME}/definitions.include

if [ "x$1" = "x" ]; then
  LIST="1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20"
else
  LIST="$1"
fi

for i in $LIST ; do
  echo
  echo " Checking node $i "
  echo
  cexec :$i ls ${SYSTEM_TMP}/test_do_not_delete.txt
  echo $?
  echo
done


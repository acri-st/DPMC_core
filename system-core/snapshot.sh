#!/bin/sh

if [ $# -lt 1 ]; then
	exit 1
fi

if [ ! -f $1 ]; then
	exit 2
fi

LIST=$1

source ${LTA_HOME}/definitions.include

SLEEP_TIME=15

if [ -f $LIST.snapshot1 ]; then
	rm -f $LIST.snapshot1
fi

if [ -f $LIST.snapshot ]; then
        rm -f $LIST.snapshot
fi

for i in `cat $LIST`; do
	if [ -f $i ]; then
		MTIME=`${SYSTEM_CORE}/mtime $i`
		echo "$i;$MTIME" >> $LIST.snapshot1
	fi
done

sleep $SLEEP_TIME

for i in `cat $LIST.snapshot1`; do
	FILE=`echo $i | cut -f1 -d";"`
	MTIME1=`echo $i | cut -f2 -d";"`
	MTIME=`${SYSTEM_CORE}/mtime $FILE`
	if [ ${MTIME1} -eq ${MTIME} ]; then
		echo $FILE >> $LIST.snapshot
	fi
done

rm -f $LIST.snapshot1

exit 0
    

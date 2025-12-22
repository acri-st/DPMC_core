#!/bin/pgbash


source ${LTA_HOME}/definitions.include

FULL_PATH=$1

if [ ! -f $FULL_PATH ]; then
	RESULT=0
else
	DIRNAME=`dirname $FULL_PATH`
	BASENAME=`basename $FULL_PATH`

	SIZE_LINE=`head -90 $FULL_PATH | grep TOT_SIZE`

	if [ "$SIZE_LINE" != "" ]; then
		VIRTUAL_SIZE=`echo $SIZE_LINE | cut -f2 -d"+" | cut -f1 -d"<" | bc`
	else
		VIRTUAL_SIZE=-1
	fi

	REAL_SIZE=`$LTA_HOME/system-core/size $FULL_PATH`

	if [ $VIRTUAL_SIZE -eq $REAL_SIZE ]; then
		RESULT=1
	else
		RESULT=0
	fi
fi

echo $RESULT

exit $RESULT
    

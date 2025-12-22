#! /bin/sh
   
FILENAME=$1
BASENAME=`basename $1`

if [ "$BASENAME" = "$FILENAME" ]; then
	FILENAME=`pwd`/${FILENAME}	
fi

echo ${FILENAME}

exit 0    

#!/bin/pgbash 

if [ $# -ne 1 ]; then
	echo "usage : $0 product_path"
	exit 1
fi


source ${LTA_HOME}/definitions.include

NAME=`basename $1`

PROCESSING_STAGE=`echo $NAME | cut -b11`
CYCLE=`echo $NAME | cut -b40-42`
ORBIT=`echo $NAME | cut -b50-54`

if [ "$PROCESSING_STAGE" == "N" ]; then
	CONS=nrt
else
	CONS=ol	
fi

echo "$CONS/$CYCLE/$ORBIT"

exit 0
    

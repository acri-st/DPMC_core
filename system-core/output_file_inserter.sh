#! /bin/pgbash 

source ${LTA_HOME}/definitions.include

if [ -f $SYSTEM_CORE/.inserterlock ]; then
	exit 0
else
	touch $SYSTEM_CORE/.inserterlock
fi

CONNECT_TODB
    
SELECT directory_name, file_name, date_time, batch_id INTO :DIR_NAME, :FILE_NAME, :DATE_TIME, :BATCH_ID
FROM processing.output_file
ORDER BY date_time
LIMIT 1;

INDEX=1

while [ $SQLCODE -eq $SQL_OK ]; do

	if [ -f $SYSTEM_CORE/.inserterstop ]; then
       		break 
	fi

	(cd $DIR_NAME; $SYSTEM_CORE/insert_products.sh $FILE_NAME)

	DELETE FROM processing.output_file WHERE directory_name = '$DIR_NAME' AND file_name = '$FILE_NAME' AND date_time = '$DATE_TIME'; 

	INDEX=`expr $INDEX + 1`

	SELECT directory_name, file_name, date_time, batch_id INTO :DIR_NAME, :FILE_NAME, :DATE_TIME, :BATCH_ID
	FROM processing.output_file
	ORDER BY date_time
	LIMIT 1;

done

DISCONNECT all;

rm -f $SYSTEM_CORE/.inserterlock

exit 0

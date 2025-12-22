#!/bin/pgbash

source ${LTA_HOME}/definitions.include

if [ -f ${LTA_HOME}/system-core/update_media_current_physical_capacity.lock ]; then
	exit 1
fi

touch ${LTA_HOME}/system-core/update_media_current_physical_capacity.lock

CONNECT_TODB

BEGIN;

DECLARE cur CURSOR FOR

#SELECT media.id, media.name
#FROM internal.media join internal.media_type on media_type.id = media.media_type 
#WHERE not media_type.sequential and not media_type.removable
#and (exists (select * from processing.default_input_media_pool as x where x.media = media.id)
#or exists (select * from processing.default_output_media_pool as y where y.media = media.id))
#order by media.name; 

SELECT media.id, media.name
FROM internal.media join internal.media_type on media_type.id = media.media_type 
WHERE not media_type.sequential and not media_type.removable
and exists (select * from processing.default_output_media_pool as y where y.media = media.id)
order by media.name; 

while true; do
    FETCH IN cur INTO :v_id, :v_name;

    if [ $SQLCODE -ne $SQL_OK ]; then
        break;
    fi

	CAPACITY=`get_disk_free_space $v_name`
	echo $v_name $CAPACITY $v_id
	if [ "${CAPACITY}" != "NULL" ]; then
		echo "$v_name ${CAPACITY}"
		UPDATE internal.media SET current_physical_capacity = ${CAPACITY} WHERE id = $v_id;	
	fi

done

CLOSE cur;

COMMIT;

DISCONNECT all; 

rm -f ${LTA_HOME}/system-core/update_media_current_physical_capacity.lock


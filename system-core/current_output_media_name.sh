#! /bin/pgbash 


source ${LTA_HOME}/definitions.include

CONNECT_TODB 1>/dev/null  2>&1

select  processing.get_next_output_media_from_current_physical_capacity() into :current_media_id;

select media.name into :current_media_name
from internal.media
where $current_media_id = media.id;

echo $current_media_name 

DISCONNECT all; 1>/dev/null  2>&1

exit 0
    

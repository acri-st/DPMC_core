#! /bin/pgbash 


source ${LTA_HOME}/definitions.include

CONNECT_TODB 1>/dev/null  2>&1

select media.name into :current_media_name
from internal.media
where processing.get_next_input_media_from_current_physical_capacity() = media.id;

echo $current_media_name 

DISCONNECT all; 1>/dev/null  2>&1

exit 0
    

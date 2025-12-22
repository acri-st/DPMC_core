#! /bin/pgbash 

if [ $# -ne 1 ]; then
    echo "Usage : $0 [path]"
    echo "This script delete removed file links from database."
    exit 0
fi

source ${LTA_HOME}/definitions.include

CONNECT_TODB

BEGIN;

DECLARE cur CURSOR FOR
SELECT media.name, media.name || '/' || media_catalog.name, media.name || '/' || media_catalog.name || '/' || media_catalog_entry.name
FROM	internal.media join
	internal.media_catalog on (media_catalog.media = media.id) join 
	internal.media_catalog_entry on (media_catalog_entry.media_catalog = media_catalog.id)
WHERE media.name = '$1'
ORDER BY media.name, media_catalog.name, media_catalog_entry.name;

v_old_volume=
v_old_path=

while true; do
    FETCH IN cur INTO :v_volume, :v_path, :v_file_location;

    if [ $SQLCODE -ne $SQL_OK ]; then
        break;
    fi

    if [ ! -d $v_volume ]; then
	if [ "$v_old_volume" != "$v_volume" ]; then
	    echo "directory $v_volume does not exist (not mounted ?). skipping..."
	    v_old_volume=$v_volume
	fi
	continue
    fi

    if [ "$v_old_path" != "$v_path" ]; then
	echo "scanning $v_path..."
	v_old_path=$v_path
    fi

    if [ ! -f $v_file_location ]; then
	SELECT internal.disk_location_delete( '$v_file_location');
	echo "dereferencing $v_file_location"
    fi
    
done

CLOSE cur;

COMMIT;

DISCONNECT all;

    

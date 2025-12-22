#! /bin/pgbash 


source ${LTA_HOME}/definitions.include

CONNECT_TODB

echo "`SELECT hostname FROM processing.hosts WHERE not available;`" 
echo $1
echo $2

DISCONNECT all;

exit 0
    

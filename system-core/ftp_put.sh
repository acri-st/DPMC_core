#! /bin/pgbash

source ${LTA_HOME}/definitions.include

if [ $# -ne 2 ]; then
    echo "USAGE: $0 BATCH_ID FULL_FILE_NAME"
    exit 2
fi

BATCH_ID=$1
FULL_FILE_NAME=$2
DO_TRANSFER=1
LFTP_SCRIPT=$SYSTEM_TMP/$BATCH_ID.lftp

CONNECT_TODB

SELECT server_name, login, password INTO :SERVER_NAME, :LOGIN, :PASSWORD
FROM internal.request, internal.server_account, processing.batch
WHERE batch.batch_id = $BATCH_ID 
AND request.id = batch.request_id
AND server_account.id = request.server_account
AND server_type = 'ftp';

if [ $SQLCODE -ne $SQL_OK ]; then
   DO_TRANSFER=0 
fi

DISCONNECT All;

if [ $DO_TRANSFER -eq 1 ]; then
  echo "set hftp:proxy ${SOCKS_SERVER_ADDRESS}:${SOCKS_SERVER_PORT}" > $LFTP_SCRIPT
  echo "open -u $LOGIN,$PASSWORD $SERVER_NAME" >> $LFTP_SCRIPT
  echo "put $FULL_FILE_NAME" >> $LFTP_SCRIPT
  cat $LFTP_SCRIPT
  
  ssh ${FTP_MACHINE} ${FTP_SOFTWARE} -f $LFTP_SCRIPT

  rm $LFTP_SCRIPT
fi

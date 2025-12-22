#! /bin/pgbash

source ${LTA_HOME}/definitions.include

if [ $# -lt 4 ]; then
    echo "USAGE: $0 SERVER_NAME LOGIN PASSWORD {FULL_FILE_NAME}..."
    exit 2
fi

SERVER_NAME=$1
LOGIN=$2
PASSWORD=$3
DO_TRANSFER=1
LFTP_SCRIPT=${SYSTEM_TMP}"/send_by_ftp."`hostname`"."$$.lftp

if [ ${DO_TRANSFER} -eq 1 ]; then
  echo "set hftp:proxy ${SOCKS_SERVER_ADDRESS}:${SOCKS_SERVER_PORT}" > ${LFTP_SCRIPT}
  echo "open -u ${LOGIN},${PASSWORD} ${SERVER_NAME}" >> ${LFTP_SCRIPT}
  while [ "$4" != "" ]; do
    FULL_FILE_NAME=$4
    FILE_NAME=`basename $4`
    if [ -f ${FULL_FILE_NAME} ]; then
      echo "put ${FULL_FILE_NAME} -o ${FILE_NAME}" >> ${LFTP_SCRIPT} 
    else
      echo "${FULL_FILE_NAME} not found. skipping..."
    fi
    shift 1
  done
  
  ssh ${FTP_MACHINE} ${FTP_SOFTWARE} -f ${LFTP_SCRIPT}

  rm ${LFTP_SCRIPT}
fi

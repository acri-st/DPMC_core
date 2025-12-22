
#-----------------------------------------------------------
# Function send_mail_to_user
# Send an e-mail to a user
# Syntax: send_mail_to_user user_mail title body
#-----------------------------------------------------------
send_mail_to_user() {
  AUX_USR=$1
  AUX_TITLE=$2
  AUX_BODY1=$3
  AUX_BODY2=$4
  AUX_BODY3=$5
  AUX_BODY4=$6
  AUX_BODY5=$7
  AUX_BODY6=$8
  AUX_BODY7=$9
  /bin/mail ${AUX_USR} <<EOF
Subject: ${AUX_TITLE}

${AUX_BODY1}
${AUX_BODY2}
${AUX_BODY3}
${AUX_BODY4}
${AUX_BODY5}
${AUX_BODY6}
${AUX_BODY7}

EOF
}

CMG_USR_MAIL=gb@acri.fr
CMG_HOME=/cmg_project
CMG_OUT_DEVICE=/dev/st0

CMG_SCRIPTS=${CMG_HOME}/system-core
CMG_LOG_DIR=${CMG_HOME}/log

CMG_SOURCE=/cmg_in_01/data_from_dlt_tapes
CMG_BUFFER=/cmg_in_01/buffer
CMG_STORAGE=/cmg_in_04

CMG_IMPORT_LOCK=${CMG_SCRIPTS}/cmg_import.lock
CMG_IMPORT_LOG=${CMG_LOG_DIR}/cmg_import.log

CMG_INGEST_LOCK=${CMG_SCRIPTS}/cmg_ingest.lock
CMG_INGEST_LOG=${CMG_LOG_DIR}/cmg_ingest.log

CMG_READ_DLT_LOCK=${CMG_SCRIPTS}/cmg_read_dlt.lock
CMG_READ_DLT_LOG=${CMG_LOG_DIR}/cmg_read_dlt.log

TAPE_NAME_GEN="CMG_"

MT=mt
TAR=tar
MV=mv
CP=cp
TOUCH=touch

CMG_DEBUG=1
CMG_MOVE=MOVE

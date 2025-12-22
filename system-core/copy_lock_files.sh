#!/bin/sh -x

source ${LTA_HOME}/definitions.include

SOURCE=${LTA_HOME}/system-core

TARGET=${SYSTEM_TMP}

cd ${SOURCE}

/bin/rm -f ${TARGET}/ingest_*.lock
cp -p ingest_*.lock ${TARGET}

/bin/rm -f ${TARGET}/ingest_*.log
cp -p ingest_*.log ${TARGET}


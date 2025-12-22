#!/bin/sh -x

#-----------------------------------------------------------------------------
#
# Launcher for the script scheduler.sh
#
# Important: LTA_HOME must be set before calling this script
#
# 08/03/2003 : gb : initial version
# 24/06/2014 : gb : update for LTA implementation
# 27/04/2015 : gb : use scheduler_psql.sh
#
#-----------------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
# -------------------------------------------------------------------

if [ -z "${LTA_HOME}" ]; then
  echo
  echo " Error: environment is not correctly defined " 
  echo "   LTA_HOME is not set "
  echo
  exit 2
fi

ret=`ps -ef | grep scheduler_psql | grep -v is_scheduler  | grep -v grep`

ERR=$?

if [ $ERR -ne 0 ]; then
  cd ${LTA_HOME}/system-core
  if [ -f nohup.out ]; then
    DATTIM=`date '+%y%m%d_%H%M'`
    mv nohup.out nohup_${DATTIM}.out
  fi
  nohup ./scheduler_psql.sh &
fi

exit 0


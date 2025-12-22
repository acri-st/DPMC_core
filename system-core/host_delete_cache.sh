#!/bin/bash

# -------------------------------------------------------------------
#
# This script remove the cache of a specified node
#
# History:
#
# 2016-04-R01:  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 host_id"
  echo
  echo
}

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z "${LTA_HOME}" ]; then
  export LTA_HOME=/exports/dpmc/scripts
fi

source ${LTA_HOME}/definitions.include

if [ "x$1" = "x" ]; then
  print_syntax
  exit 3
else
  HOST_ID=$1
fi

# retrieve the host IP
IP=$(${PSQL_CMD} "SELECT ip_address FROM processing.hosts WHERE host_id=${HOST_ID};")

# retrieve the cache directory 
CACHE_DIR=$(${PSQL_CMD} "SELECT cache_dir FROM processing.hosts WHERE host_id=${HOST_ID};")

# remove cache content (data)
ssh ${IP} /bin/rm -rvf ${CACHE_DIR}/s3_cache/data/S*

# remove cache content (lock)
ssh ${IP} /bin/rm -rvf ${CACHE_DIR}/s3_cache/locks/S*

# cache size
echo
ssh ${IP} df -h ${CACHE_DIR}
echo

exit $ERROR


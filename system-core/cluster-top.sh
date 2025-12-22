#!/bin/pgbash

display_top() {
  clear
  echo "    Date: `date `"
  CONNECT_TODB >/dev/null
  SELECT coalesce(sum(ncpu),0) INTO :AVAIL FROM processing.hosts WHERE available = true;
  SELECT coalesce(sum(ncpu_available),0) INTO :USED FROM processing.available_hosts;
  SELECT coalesce(count(batch_id),0) INTO :QUEUE FROM processing.batch WHERE state = 'Queued';
  echo " Cluster [${SYSTEM_NAME}] status - Available threads: $USED/$AVAIL"   
  echo "                 Jobs in queue: $QUEUE"
  SELECT *
  FROM public.detail_top_s3
  ORDER BY batch $1;
  DISCONNECT all; >/dev/null
}

MANUAL=0
if [ "$1" = "manual" ]; then
  MANUAL=1
fi

ONCE=0
if [ "$1" = "once" ]; then
  ONCE=1
fi

FREQ=10
if [ "$1" = "freq" ]; then
  FREQ=$2
fi

source ${LTA_HOME}/definitions.include

if [ $MANUAL = "0" -a $ONCE = "0" ]; then

  while true; do
    display_top
    sleep $FREQ
  done

elif [ $ONCE = "0" ]; then

  KEY=""
  while [ "$KEY" != "q" ]; do
    if [ "$KEY" = "r" ]; then
      display_top DESC
    else
      display_top
    fi
    echo
    echo " Press <RETURN> to continue or q <RETURN> to exit "
    echo
    read KEY
  done

else 

  display_top

fi

#!/bin/sh

./set_lock_files.sh

ps -ef > ./clean_lock_state.tmp

grep ingest_ ./clean_lock_state.tmp > ./clean_lock_state.tmp2
grep python2 ./clean_lock_state.tmp >> ./clean_lock_state.tmp2

for ID in `cat ./clean_lock_state.tmp2 | awk '{print $2}'` ; do
  echo Killing process $ID
  kill -9 $ID
done

./remove_lock_files.sh

/bin/rm -f ./clean_lock_state.tmp ./clean_lock_state.tmp2


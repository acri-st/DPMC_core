#!/bin/pgbash

source ${LTA_HOME}/definitions.include

if [ $# -lt 3 ]; then
  echo
  echo Usage: $0 sender recipient subject [[body_file] [attachement_file]...]
  echo
  exit
fi

PID=$$

SENDER=$1
RECIPIENT=$2
SUBJECT=$3
if [ $# -ge 4 ]; then
	SEND_BODY=1
	BODY_FILE=$4
	if [ $# -ge 5 ]; then
		ATTACHEMENT_FILE=$5
	else
		ATTACHEMENT_FILE=
	fi
else
	SEND_BODY=0
fi

echo Subject: $SUBJECT > /tmp/$PID

if [ ${SEND_BODY} -eq 1 ]; then
	cat $BODY_FILE >> /tmp/$PID
fi

echo >> /tmp/$PID

#echo Content-Type: application/octet-stream >> /tmp/$PID
#echo name=$1 >> /tmp/$PID
#echo Content-Transfer-Encoding: x-uuencode >> /tmp/$PID
#echo Content-Disposition: attachment >> /tmp/$PID
#echo filename=$1 >> /tmp/$PID
#
# encode the file and put it with the header info

while [ "${ATTACHEMENT_FILE}" != "" ]; do
	$SPECIFIC_BIN/`uname`/uuencode ${ATTACHEMENT_FILE} `basename ${ATTACHEMENT_FILE}` >> /tmp/$PID
	shift
	ATTACHEMENT_FILE=$5
done

/usr/lib/sendmail -B 7BIT -F "$SENDER" $RECIPIENT < /tmp/$PID

ERROR=$?

rm /tmp/$PID

exit $ERROR

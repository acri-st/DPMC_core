#!/bin/pgbash

if [ "x$1" = "x" ]; then
  echo
  echo " Syntax: $0 product "
  echo
  exit 1
else
  PRD=$1
fi

P=$$
FICTMP=zzz_$P.tmp

. ${LTA_HOME}/definitions.include

CONNECT_TODB > /dev/null

set option_header=off;
set option_bottom=off;

select * from internal.product
where product.name like '%$1%'; > $FICTMP

if [ -s $FICTMP ]; then
  echo 1
else
  echo 0
fi

DISCONNECT all; > /dev/null

/bin/rm -f $FICTMP


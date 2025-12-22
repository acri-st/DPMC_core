#!/bin/pgbash

source ${LTA_HOME}/definitions.include

P=$$

FICTMP=zzz_$P.tmp

CONNECT_TODB
 
set option_header=off;
set option_bottom=off;
set option_separator='';

#BEGIN transaction;

select m.name || '/' || mc.name || '/' || product.name
from
  internal.product,
  internal.product_x_media_catalog_entry as pxmce,
  internal.media_catalog_entry as mce,
  internal.media_catalog as mc,
  internal.media as m 
where
  pxmce.product = product.id
  and mce.id = pxmce.media_catalog_entry
  and mc.id = mce.media_catalog
  and m.id = mc.media 
  and m.name like '%'
  and product.name like 'MER_RR__0P_LRA20090101%.N1' ; | sed "s/ //g" > $FICTMP

#COMMIT;

for FPATH in `cat $FICTMP` ; do

  FNAME=`basename $FPATH`

  select sp.start_absolute_orbit_number, p.id, round( extract(epoch from sp.stop_date_time) - extract(epoch from sp.start_date_time) ) into :ORB, :ID, :DUR
  from internal.product as p, internal.sensing_product as sp
  where p.name like '$FNAME'
  and sp.product = p.id ;

  echo $FNAME $ORBIT $PRD_ID $DURATION

done

DISCONNECT all;

/bin/rm -f $FICTMP

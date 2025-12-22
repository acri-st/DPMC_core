#! /bin/pgbash 

if [ $# -ne 1 ]; then
	echo "Usage : $0 product_name"
	exit 1
fi

PRODUCT_NAME=$1

source ${LTA_HOME}/definitions.include

CONNECT_TODB > /dev/null 2>&1

SET OPTION_HEADER=OFF;
SET OPTION_BOTTOM=OFF;
SET OPTION_ALIGNMENT=OFF;
SET OPTION_SEPARATOR=';';

select m.name || '/' || mc.name || '/' || product.name, pxmce.media_catalog_entry
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
  and product.name like '${PRODUCT_NAME}';

DISCONNECT all ; > /dev/null 2>&1

exit 0
    

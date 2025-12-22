#!/bin/bash

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  export LTA_HOME=/exports/dpmc/scripts
fi

source ${LTA_HOME}/definitions.include

if [ "x$1" = "x" ]; then
  echo
  echo " Syntax: $0 string "
  echo
  exit 1
else
  AUX=$1
fi

${PSQL_CMD} "select m.name || '/' || mc.name || '/' || product.name
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
  and product.name like '%$AUX%';"



#! /bin/pgbash
   
source ${LTA_HOME}/definitions.include

CONNECT_TODB 

for i in `find $1 -name *.N1`; do

PRODUCT_NAME=`get_official_name $i`
SIZE=`head -50 $i | grep TOT_SIZE | cut -b11-30`

echo $PRODUCT_NAME $SIZE

UPDATE internal.product SET size = ${SIZE} WHERE name = '${PRODUCT_NAME}';

done

DISCONNECT all;

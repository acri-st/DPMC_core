#! /bin/pgbash
   
source ${LTA_HOME}/definitions.include

if [ -f $1 ]; then
	PRODUCT_NAME=`get_official_name $1`     
else
	PRODUCT_NAME=$1
fi

CONNECT_TODB > /dev/null 2>&1

RESULT=0

SELECT 1 INTO :RESULT
FROM internal.product
WHERE name = '${PRODUCT_NAME}'
AND EXISTS (SELECT * FROM internal.product_x_media_catalog_entry WHERE product = product.id);

echo $RESULT

DISCONNECT all; > /dev/null 2>&1

exit 0    

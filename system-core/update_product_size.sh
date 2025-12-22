#! /bin/pgbash
   
source ${LTA_HOME}/definitions.include

if [ `is_in_envisat_format $1` -eq 1 ]; then
	PRODUCT_NAME=`get_official_name $1`     
	SIZE=`head -50 $1 | grep TOT_SIZE | cut -b11-30`

	CONNECT_TODB 

	UPDATE internal.product SET size = ${SIZE} WHERE name = '${PRODUCT_NAME}';

	DISCONNECT all;
fi

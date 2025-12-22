#! /bin/pgbash 

if [ $# -ne 2 ]; then
	echo "Usage $0 adf_file_path adf_version"
	exit 1
fi

ADF_FILE_PATH=$1
ADF_VERSION=$2
ADF_FILE_NAME=`basename $1`
ADF_FILE_DIR=`dirname $1`

source ${LTA_HOME}/definitions.include

ADF_PRODUCT_NAME=`get_official_name $ADF_FILE_PATH`
echo "PRODUCT NAME : $ADF_PRODUCT_NAME"

CONNECT_TODB 1> /dev/null 2>&1

UPDATE internal.auxiliary_product
SET version = '$ADF_VERSION'
FROM internal.product
WHERE product.name = '$ADF_PRODUCT_NAME'
AND auxiliary_product.product = product.id;

DISCONNECT all; 1> /dev/null 2>&1

exit 0
    

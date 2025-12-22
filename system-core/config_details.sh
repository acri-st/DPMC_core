#!/bin/bash

# -------------------------------------------------------------------
#
# This script displays the caracteristics of the processing
# configurations
#
# History:
#
# 2016-03-24 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: $0 [-p]"
  echo
  echo " -p : list products path "
  echo
}

config_list() {
  ${PSQL_CMD} "SELECT IPB.version as ipb, IPB.document, IPB.creation_date
  FROM internal.ipf_processing_baseline IPB ORDER BY IPB.id;"
}

config_full_details() {
${PSQL_CMD} "
SELECT 
                IPB.version as ipb,
                S.name as soft, 
                SXAC.ipf_baseline, 
                S.version as soft_version,
                P.name  
FROM 
                internal.ipf_processing_baseline IPB, 
                internal.ipf_processing_baseline_x_sxa IPBSXA,
                internal.software_x_auxiliary_configuration SXAC,
                internal.software S,
                internal.auxiliary_configuration AC,
                internal.auxiliary_configuration_detail ACD,
                internal.product P,
                internal.auxiliary_product AP
WHERE
                IPBSXA.ipf_processing_baseline_id=IPB.id AND
                IPBSXA.soft_x_aux_conf_id=SXAC.id AND
                SXAC.software=S.id AND
                SXAC.auxiliary_configuration=AC.id AND
                ACD.configuration=AC.id AND
                AP.product=P.id AND
                P.product_type=ACD.product_type AND             
                ACD.version=AP.version AND
                IPB.version like '$IPB_NAME' AND
                S.name like '$SOFT_NAME'
ORDER BY P.name;"
}

config_per_ipb() {
${PSQL_CMD} "
SELECT 
                S.name as soft, 
                SXAC.ipf_baseline, 
                S.version as soft_version,
                SXAC.creation_date as updated_on
FROM 
                internal.ipf_processing_baseline IPB, 
                internal.ipf_processing_baseline_x_sxa IPBSXA,
                internal.software_x_auxiliary_configuration SXAC,
                internal.software S,
                internal.auxiliary_configuration AC
WHERE
                IPBSXA.ipf_processing_baseline_id=IPB.id AND
                IPBSXA.soft_x_aux_conf_id=SXAC.id AND
                SXAC.software=S.id AND
                SXAC.auxiliary_configuration=AC.id AND
                IPB.version='$1'
ORDER BY S.name;"
}

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

# check parameters
if [ "x$1" = "x" ]; then
  print_syntax
  exit 1
fi

source ${LTA_HOME}/definitions.include

CPB=false
LIST=false
SOFT_NAME="%"
IPB_NAME="%"

while :
do
  case "$1" in
    -l)
      LIST=true
      shift
      ;;
    -s)
      SOFT_NAME="$2"
      shift 2
      ;;
    -i)
      IPB_NAME="$2"
      shift 2
      ;;
    -c)
      CPB=true
      shift
      ;;
    -*)
      print_syntax
      echo
      echo " -----> Error: unknown option $1 !"
      echo
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

if $LIST ; then
  config_list
  exit 0
fi

if $CPB ; then
  config_per_ipb $IPB_NAME
  exit 0
fi

config_full_details

exit $ERROR


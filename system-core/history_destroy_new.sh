#!/bin/bash

# -------------------------------------------------------------------
#
# This script removes history records from the database
# (from history and history_x_product tables)
# To automate the task, the first line has to be the header of the query resuts. Please use history_list --header.
#
# History:
#
# 2017-07-11 :  gb : initial version
# 2018-01-10 :  gb : add options (-h -i)
# 2020-07-02 :  jh : add options (-f, -p, -st, --dry-run)
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
#  4 : argument is not a number
#  5 : history id not found
#  6 : file note found
#  7 : error encountered during parsing the header
# -------------------------------------------------------------------

# default value of the exit code
ERROR=0

# default value of dry run
DRY_RUN=1

############ GLOBAL VARIABLES ############
ID=none
TAG=none
FILEPATH=""
SHOW_PRODUCT=false
SHOW_START_AND_STOP=false

PSQL_CMD_HEADER="psql -q -c"

# Header variables
PRODUCT_ID_POSITION=0
START_POSITION=0
STOP_POSITION=0
LOG_FILE_POSITION=0
##########################################

function print_syntax() {
  echo
  echo " Syntax: $0 -f filepath | -i id | -t tag [--dry-run 0|1] [-p] [-st]"
  echo
  echo "  -h          show this help, then exit"
  echo "  -f          filepath of the file containing the records to remove"
  echo "  -i id       specify the id of a history record"
  echo "  -t tag      specify the tag of a history record"
  echo "  --dry-run   set the dry run mode. DEFAULT 1"
  echo "  -p          print the product name"
  echo "  -st         print the start and stop times"
  echo
}

function parse_arguments() {
  while :; do
    case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -i)
      ID=$2
      if [[ ! "$ID" =~ ^[0-9$]+$ ]]; then
        echo "The provided id is not a valid integer. Aborted"
        exit 3
      fi
      shift 2
      ;;
    -t)
      TAG=$2
      shift 2
      ;;
    -f)
      FILEPATH=$2
      if [ ! -f "$FILEPATH" ]; then
        echo "$FILEPATH: File not found."
        exit 6
      fi
      shift 2
      ;;
    -st)
      SHOW_START_AND_STOP=true
      shift
      ;;
    -p)
      SHOW_PRODUCT=true
      shift
      ;;
    --dry-run)
      DRY_RUN=$2
      shift 2
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
}

function parse_header() {
  header=$(echo "$1" | sed "s/ //g" | sed "s/;/ /g")
  ln=1
  for elt in $header; do
    case "$elt" in
    started)
      START_POSITION=$ln
      ;;
    ended)
      STOP_POSITION=$ln
      ;;
    file_input_id)
      PRODUCT_ID_POSITION=$ln
      ;;
    log_file)
      LOG_FILE_POSITION=$ln
      ;;
    esac
    ln=$(expr $ln + 1)
  done
  if [ $START_POSITION = 0 ] || [ $STOP_POSITION = 0 ] || [ $PRODUCT_ID_POSITION = 0 ] || [ $LOG_FILE_POSITION = 0 ]; then
    echo "Issue encountered during parsing the header."
    echo -e "Start position: $START_POSITION\nStop position: $STOP_POSITION\nProduct id position: $PRODUCT_ID_POSITION\nLog file position: $LOG_FILE_POSITION"
    exit 7
  fi
}

############################
########### MAIN ###########
############################
function main() {
  # check if working environment variable is set
  if [ -z ${LTA_HOME} ]; then
    echo
    echo "LTA_HOME is not defined"
    echo
    exit 2
  fi

  # source ${LTA_HOME}/definitions.include

  if [ "$?" -ne 0 ]; then
    echo
    echo "${LTA_HOME}/definitions.include: File not found"
    echo
    exit 2
  fi

  if [ "$#" -lt 2 ]; then
    print_syntax
    exit 3
  fi

  # Parsing arguments
  parse_arguments "$@"

  # Checking Filepath
  if [ -z "$FILEPATH" -a "$ID" = "none" -a "$TAG" = "none" ]; then
    echo "Filepath or ID or TAG is mandatory."
    print_syntax
    exit 6
  fi

  # Enabling dry run mode
  if [ ! "$DRY_RUN" = 0 ]; then
    echo -e "\e[33mDRY RUN ENABLED\e[39m"
    PSQL_CMD_RUN="echo ${PSQL_CMD}"
    RM_RUN="echo rm"
  else
    PSQL_CMD_RUN="${PSQL_CMD}"
    RM_RUN="rm"
  fi

  if [ ! "$ID" = "none" ]; then
    date_rdm=$(date +"%N")
    query_results=$(${PSQL_CMD_HEADER} "SELECT started, ended, file_input_id, log_file FROM processing.history WHERE history_id = '$ID' ;" -A -F ';')
  elif [ ! "$TAG" = "none" ]; then
    date_rdm=$(date +"%N")
    query_results=$(${PSQL_CMD_HEADER} "SELECT started, ended, file_input_id, log_file FROM processing.history WHERE tag = '$TAG' ;" -A -F ';')
  else
    query_results=$(cat $FILEPATH)
  fi

  NB_ROWS=$(echo "${query_results}" | grep "row" | sed -r "s/[^0-9]//g")
  if [ "$NB_ROWS" -eq 0 ]; then
    echo "No row found. Do nothing."
    exit 0
  fi

  # Remove empty lines
  query_results=$(echo "${query_results}" | sed '/^[[:space:]]*$/d')

  # Removing undesired lines eg: (3 rows) ----+---+--
  query_results=$(echo "${query_results}" | sed -r '/\([0-9]+ row(s)?\)/d' | sed '/-+/d' )
  
  ln=0
  while read line; do
    if [ $ln = 0 ]; then
      # first line must be the header
      header="$line"
      parse_header "$header"
    else
      run_cmd=1
      product_id=$(echo $line | sed "s/ //g" | cut -d ";" -f$PRODUCT_ID_POSITION)
      start_stop=$(echo $line | sed "s/ //g" | cut -d ";" -f$START_POSITION,$STOP_POSITION)
      log_file=$(echo $line | sed "s/ //g" | cut -d ";" -f$LOG_FILE_POSITION)

      if [ "$SHOW_PRODUCT" = "true" ]; then
        echo "$product_id"
        run_cmd=0
      fi
      if [ "$SHOW_START_AND_STOP" = "true" ]; then
        echo "$start_stop"
        run_cmd=0
      fi

      if [ "$run_cmd" = 1 ]; then
        ${RM_RUN} ${log_file}
        ${PSQL_CMD_RUN} "DELETE FROM processing.history_x_product AS hxp WHERE hxp.product = ${product_id};"
        ${PSQL_CMD_RUN} "DELETE FROM processing.history AS h WHERE h.file_input_id = ${product_id};"
      fi

    fi
    ln=$(expr $ln + 1)
  done <<<"${query_results}"

}

main $@
exit $ERROR

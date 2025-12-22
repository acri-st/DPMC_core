#!/bin/bash

# -------------------------------------------------------------------
#
# This script lists history records in error and get start and stop time 
#
# History:
#
# 2019-02-04 :  jmr : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
# -------------------------------------------------------------------

print_syntax() {
  echo
  echo " Syntax: "
  echo
  echo "     $0 -t tag "
  echo "     $0 -t tag -st"
  echo "     $0 -t tag -s"
  echo "     $0 -t tag -l"
  echo "     $0 -t tag -p"
  echo "     $0 -t tag -e"
  echo "     $0 -t tag -d"
  echo
  echo " -t for records with a specific tag "
  echo " -st for start and stop result "
  echo " -s search for string in logs "
  echo " -x search for string not in logs "
  echo " -p search for string \"input_product_name\" in logs "
  echo " -e search for string \"[E]\" in logs "
  echo " -d search for logs in Done state "
  echo " -l display the log filename "
  echo
}

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2 
fi

if [ "x$1" = "x" ]; then
  print_syntax
  exit 0
fi

source ${LTA_HOME}/definitions.include

TAG="NULL"
STARTSTOP="NULL"
STRING="NULL"
LOGS="NULL"
INPUTPRODUCT="NULL"
ERR="NULL"
DONE="NULL"
XCLUDE="NULL"

while :
do
  case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -t)
      TAG=$2
      shift 2
      ;;
    -st)
      STARTSTOP=true
      shift
      ;;
    -s)
      STRING=$2
      shift 2
      ;;
    -x)
      XCLUDE=$2
      shift 2
      ;;
    -l)
      LOGS=true
      shift
      ;;
    -p)
      INPUTPRODUCT=true
      shift
      ;;
    -e)
      ERR=true
      shift
      ;;
    -d)
      DONE=true
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

if [ "$ERR" != "NULL" ]; then
  STRING="\[E\]"
fi

if [ "$TAG" != "NULL" ]; then
  if [ "$DONE" != "NULL" ]; then
    logs=$(history_list.sh -t "$TAG" -l | grep Done);
  else
    logs=$(history_list.sh -t "$TAG" -l | grep Err);
  fi
  if [ "$STARTSTOP" != "NULL" ]; then
    if [ "$LOGS" != "NULL" ]; then
      for i in $logs
      do
        echo $i
        grep "start_time ," $i | sed "s/start_time , stop_time =====> (u'//" | sed "s/',) (u'/;/" | sed "s/',)/;/"
      done
    else
      for i in $logs
      do
        grep "start_time ," $i | sed "s/start_time , stop_time =====> (u'//" | sed "s/',) (u'/;/" | sed "s/',)/;/"
      done
    fi
  elif [ "$STRING" != "NULL" ]; then
    if [ "$LOGS" != "NULL" ]; then
      for i in $logs
      do
        if [ $(grep -c "$STRING" $i) -ne 0 ]; then
          echo
          echo " $i "
          echo
          grep "$STRING" $i
        fi
      done
    else
      for i in $logs
      do
        grep "$STRING" $i
      done
    fi
  elif [ "$XCLUDE" != "NULL" ]; then
    for i in $logs
    do
      if [ $(grep -c "$XCLUDE" $i) -eq 0 ]; then
        echo " $i "
      fi
    done
  elif [ "$INPUTPRODUCT" != "NULL" ]; then
    if [ "$LOGS" != "NULL" ]; then
      for i in $logs
      do
        grepString=$(grep "input_product_name" $i | sed "s/input_product_name  ===>  //" | wc -l)
        if [ $grepString -ne 0 ]; then
          echo $i
          grep "input_product_name" $i | sed "s/input_product_name  ===>  //"
        fi
      done
    else
      for i in $logs
      do
        grep "input_product_name" $i | sed "s/input_product_name  ===>  //"
      done
    fi
  fi
fi

exit $ERROR

#!/bin/bash

# -------------------------------------------------------------------
#
# This script copy or move the log files of a dataset
#
# History:
#
# 2018-05-28 :  gb : initial version
#
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Error codes
#  2 : LTA_HOME is not set
#  3 : syntax error
# -------------------------------------------------------------------


print_syntax() {
  echo
  echo " Syntax: $0 [-m] -s SOURCE -t TARGET [-z]"
  echo
  echo " -s + SOURCE : source directory path"
  echo " -t + TARGET : target directory path"
  echo " -m : the log files are moved (default copied)"
  echo " -z : the TARGET directory will be tgz"
  echo
  echo " Examples: log_copy_files.sh -m /s3ome_data2/output/REP_010 /s3ome_data2/output/REP_010_logs "
  echo
}

# default value of the exit code
ERROR=0

# check if working environment variable is set
if [ -z ${LTA_HOME} ]; then
  log_error "LTA_HOME is not defined"
  exit 2
fi

source ${LTA_HOME}/definitions.include

MOVED=false
TGZ=false
SOURCE=NULL
TARGET=NULL

while :
do
  case "$1" in
    -h)
      print_syntax
      exit 0
      ;;
    -m)
      MOVE=true
      shift
      ;;
    -z)
      TGZ=true
      shift
      ;;
    -s)
      SOURCE=$2
      shift 2
      ;;
    -t)
      TARGET=$2
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

if [ "$SOURCE" = "NULL" ]; then
  print_syntax
  echo " Error --> SOURCE shall be specified "
  exit 4
elif [ ! -d $SOURCE ] ; then
  echo " Error --> source $SOURCE not found "
  exit 4
fi

if [ "$TARGET" = "NULL" ]; then
  print_syntax
  echo " Error --> TARGET shall be specified "
  exit 5
elif [ ! -d $TARGET ] ; then
  echo " Error --> target $TARGET not found "
  exit 5
fi

for i in $(find $SOURCE -maxdepth 6 -name "log*" ) ; do
  #j=$(echo $i | sed "s/..*REP/REP/")
  j=$(echo $i | sed "s/..*CRS/CRS/")
  echo $j
  d=${TARGET}/$(dirname $j)
  mkdir -p $d
  if $MOVE ; then
    mv -vf $i $d
  else
    cp -vf $i $d
  fi
done

if $TGZ ; then
  cd $TARGET
  cd ..
  DIR=$(basename $TARGET)
  tar cvfz ${DIR}.tgz ./$DIR
fi

exit $ERROR


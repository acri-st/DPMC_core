#!/bin/bash

source ${LTA_HOME}/definitions.include

python /exports/dpmc/scripts/system-core/detect_gaps.py $*

STATUS=$?

exit $STATUS

#!/usr/bin/python
# -*- coding: utf-8 -*
import argparse
from datetime import datetime, timedelta
import psycopg2
import os


#########################################################################################
#                                                                                       #
#                                  FUNCTION DECLARATION                                 #
#                                                                                       #
#########################################################################################

# Function which execute a get query without changes on DB
def getQueryDB(db, host, user, psswd, query):
    conn = None
    # Declare list of results given by the query
    result = []
    try:
        # We format params with database name, user name and user password
        params = "dbname=" + db + " user=" + user + " host=" + host + " password=" + psswd
        # psycopg2 library allow us to connect via the connect function
        conn = psycopg2.connect(params)
        # Declare a cursor is mandatory to execute a query
        cur = conn.cursor()
        # Execute the query given in argument
        cur.execute(query)

        # fetchall is used to fetch all rows of a query result, returning a list of tuples
        row = cur.fetchall()
        # We declare a delimiter to format each row
        delimiter = " | "
        # We browse all rows
        for rowNb in range(len(row)):
            # Display each row with an understandable format
            result.append(delimiter.join([str(elem) for elem in row[rowNb]]))
        # Close the cursor
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        if conn is not None:
            # Close the connection
            conn.close()
        # Return list of results given by the query
        return result

# Function which tests the validity of the date passed through the variable -tr
def checkDate(date):
    try:
        return datetime.strptime(date, "%Y%m%dT%H%M%S")
    except ValueError:
        msg = "Not a valid date: '{0}'.".format(date)
        raise argparse.ArgumentTypeError(msg)

#########################################################################################
#                                                                                       #
#                                        PROGRAM                                        #
#                                                                                       #
#########################################################################################

# DESCRIPTION:
# This script is used to compute average performance of a run.
# It get start et stop time of the computation.
# It get the measurement time of each products and compute the average performance
# EXAMPLE :
# python history_perf.py -t rep_018_sl1 -nj 38
# It means we compute average performance of the jobs generated during rep_018_sl1 reprocessing wuth 38 jobs in parallel

# Arguments declaration
parser = argparse.ArgumentParser(description='Arguments description for history_perf.py')
# Mandatory argument but only one can be given at the same time
required = parser.add_argument_group('Required arguments')
required.add_argument('-t',
                    action="store",
                    dest="tag",
                    help='Reprocessing tag',
                    default=None,
                    required=True,
                    type=str)
optional = parser.add_argument_group('Optional arguments')
optional.add_argument('-nj',
                    action="store",
                    dest="nbParallelJobs",
                    help='Number of jobs in parallel',
                    default=None,
                    type=int)
optional.add_argument('-st',
                    action="store",
                    dest="startTime",
                    help='Take into account only history records after the parameter',
                    default=None,
                    type=checkDate)
optional.add_argument('-et',
                    action="store",
                    dest="endTime",
                    help='Take into account only history records before the parameter',
                    default=None,
                    type=checkDate)

args = parser.parse_args()

# We store all arguments in variables
tag = args.tag
nbParallelJobs = args.nbParallelJobs
startTime = args.startTime
endTime = args.endTime

if __name__ == "__main__":
    # Database parameters config
    database = ""
    host = ""
    user = ""
    password = ""
    # If DB_NAME, DB_USER and DB_PASSWORD are mentionned as environment variables
    if "DB_NAME" in os.environ and "DB_USER" in os.environ and "DB_PASSWORD" in os.environ and "DB_SERVER" in os.environ:
        # We store the database name from environment variable
        database = os.environ['DB_NAME']
        # We store the server from environment variable
        host = os.environ['DB_SERVER']
        # We store the user name from environment variable
        user = os.environ['DB_USER']
        # We store the user password from environment variable
        password = os.environ['DB_PASSWORD']
        pass
    # If at least one variable is missing
    else:
        # Path to th file containing information
        filePath = os.environ["LTA_HOME"] + "/system-core/db.include"
        # Open directly the db.include file
        dbFile = open(filePath, "r")
        # We browse all lines
        for line in dbFile:
            # Get the line containing DB_NAME
            if line.split("=")[0] == "DB_NAME":
                database = str(line.split("=")[1])
            # Get the line containing DB_USER
            if line.split("=")[0] == "DB_USER":
                user = str(line.split("=")[1])
            # Get the line containing DB_PASSWORD
            if line.split("=")[0] == "DB_PASSWORD":
                password = str(line.split("=")[1])
            # Get the line containing DB_SERVER
            if line.split("=")[0] == "DB_SERVER":
                host = str(line.split("=")[1])
            # If we already have all information, no need to continue browsing lines
            if database and user and password:
                break
        # Close file stream
        dbFile.close()
    # Query to check if the tag exists
    query = "SELECT * FROM processing.history WHERE tag = '" + tag + "'"
    # Store query result
    tagExists = getQueryDB(database, host, user, password, query)
    # Compute the performance, only if there is generated products with the related tag
    if len(tagExists) > 0:
        options = ""
        if startTime is not None:
            options = " and h.ended > '" +str(startTime)+ "'"
        if endTime is not None:
            options = options + " and h.started < '" +str(endTime)+ "'"
        # Query to get all products ordered by name
        query = "SELECT DISTINCT h.history_id, h.started, h.ended, p.name FROM processing.history as h, internal.product as p, processing.history_x_product as hxp WHERE h.tag = '" + tag + "' and h.state = 'Done' and hxp.history=h.history_id and hxp.product=p.id" + options
        # Store query result
        histories = getQueryDB(database, host, user, password, query)
        # Initialize the sum of performance for each job
        sumOfPerformance = 0
        # Initialize total number of jobs
        numberOfJobs = 0
        # Initilaize the sum of measurement times
        sumOfMeasTime = 0
        # Initialize the sum of processing times
        sumOfProcTime = 0
        # Loop on history records
        for hist in histories:
            # Store history id to retrieve related product
            history_id = hist.split(' | ')[0]
            # Store start time of computation
            start = hist.split(' | ')[1]
            # Store stop time of computation
            stop = hist.split(' | ')[2]
            # Store the product name 
            productName = hist.split(' | ')[3]
            # Store measurement time
            measTime = productName[64:68]
            if measTime != '____':
                # Format start and stop times as datetime
                if len(start.split('.')) > 1:
                    startDatetime = datetime.strptime(start, "%Y-%m-%d %H:%M:%S.%f")
                else:
                    startDatetime = datetime.strptime(start, "%Y-%m-%d %H:%M:%S")
                if len(stop.split('.')) > 1:
                    stopDatetime = datetime.strptime(stop, "%Y-%m-%d %H:%M:%S.%f")
                else:
                    stopDatetime = datetime.strptime(stop, "%Y-%m-%d %H:%M:%S")
                # Store processing time
                procTime = (stopDatetime - startDatetime).seconds
                # Sum measurement time with other jobs measurement time
                sumOfMeasTime = sumOfMeasTime + int(measTime)
                # Sum processing time with other jobs processing time
                sumOfProcTime = sumOfProcTime + int(procTime)
        
        # Get all 'jobs_parallel' key from batch_parameters and compute the average of jobs in parallel
        query = "SELECT AVG(CAST(h.batch_parameters->>'jobs_in_parallel' as integer)) FROM processing.history as h WHERE h.tag='" + tag + "' and CAST(h.batch_parameters->>'jobs_in_parallel' as integer) IS NOT NULL and h.state = 'Done'" + options
        jobsList = getQueryDB(database, host, user, password, query)
        # If the number of jobs in parallel is given as parameter, it is priority
        if nbParallelJobs is None:
            # If there is no average result (for example because no jobs have the key 'jobs_in_parallel' in batch_parameters) we set to 1
            if str(jobsList[0]) != 'None':
                # Initialize average of parallel jobs
                nbParallelJobs = int(float(jobsList[0]))
            else:
                nbParallelJobs = 1

        # Compute average performance
        averagePerformance = (float(sumOfMeasTime) / float(sumOfProcTime)) * nbParallelJobs
        print('Average performance: ' + str(averagePerformance))
        print('Number of jobs in parallel: ' + str(nbParallelJobs))
        print('Total measurement times: ' + str(sumOfMeasTime) + 's')
        print('Total computation times: ' + str(sumOfProcTime) + 's')
    else:
        print('The tag ' + tag + ' does not exist')

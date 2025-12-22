#!/usr/bin/python
# -*- coding: utf-8 -*
"""
coverage_compute is a script that checks the reprocessed dataset is matching start and stop times from OPE dataset
"""
import argparse
import math
import multiprocessing as mp
import os
import sys
from datetime import datetime

import psycopg2

# Retrieve the number of processes we can create on the current machine
# NB_OF_PROCESSES = mp.cpu_count() if mp.cpu_count() is not None else 1


#########################################################################################
#                                                                                       #
#                                  FUNCTION DECLARATION                                 #
#                                                                                       #
#########################################################################################

# Function which execute a get query without changes on DB
def init_db(db, host, user, psswd):
    # We format params with database name, user name and user password
    params = "dbname=" + db + " user=" + user + " host=" + host + " password=" + psswd
    # psycopg2 library allow us to connect via the connect function
    conn = psycopg2.connect(params)
    # Declare a cursor is mandatory to execute a query
    cur = conn.cursor()
    return conn, cur


def exec_query(cur, query):
    cur.execute(query)
    return cur.fetchall()


def close_db(conn, cur):
    # closing the cursor and the connection to the postgres db
    cur.close()
    conn.close()


# Function which tests the validity of the date passed through the variable -tr
def checkDate(date):
    try:
        return datetime.strptime(date, "%Y%m%dT%H%M%S")
    except ValueError:
        msg = "Not a valid date: '{0}'.".format(date)
        raise argparse.ArgumentTypeError(msg)


# function which compare the external product list and the processing list
def compare_external_processing_lists(external, processing):
    file = None
    if args.output_file is not None:
        # Opening file to write
        file = open(args.output_file, "a+")

    # Loop over OPE list
    for opePrd in external:
        opeName = opePrd[0]
        extStart = opePrd[1]
        extStop = opePrd[2]
        opeDuration = extStop - extStart

        found = False
        # Loop over the reprocessed dataset list
        for rep in processing:
            repName = rep[0]
            repStart = rep[1]
            repStop = rep[2]

            # End condition
            if repStart <= extStop and repStop >= extStart:
                found = True
                intersectDuration = min(repStop, extStop) - max(repStart, extStart)

                percentageMatching = str((100.0 * intersectDuration.seconds) / opeDuration.seconds) + "%"
                content = "('{}', '{}', '{}', {}, '{}', '{}', '{}', {}, '{}')".format(
                                      opeName, str(extStart), str(extStop), opeDuration.seconds,
                                      repName, str(repStart), str(repStop),
                                      intersectDuration.seconds,
                                      percentageMatching)
                if args.output_file is not None:
                    file.write(content + "\n")
                else:
                    print(content)
            if extStop < repStart:
                # We can break because we sort the reprocessedDataset by startDate then at one point the repStart will pass the extStop+
                # We can skip the remain elements to gain efficiency
                break
                pass

        if not found:
            content = "('{}', '{}', '{}', {}, ' ', ' ', ' ', '0', '0%')".format(opeName, str(extStart), str(extStop), opeDuration.seconds)
            if args.output_file is not None:
                file.write(content + "\n")
            else:
                print(content)


#########################################################################################
#                                                                                       #
#                                        PROGRAM                                        #
#                                                                                       #
#########################################################################################

# EXAMPLES :
# - Check the reprocessed dataset is matching start and stop times from OPE dataset
# python checkOPElist.py -t eum_s3b_sr1 -d CRS_P2_S2_001_S3B_SR1

# Arguments declaration
parser = argparse.ArgumentParser(description='Arguments description for checkOPElist.py')
# Mandatory argument but only one can be given at the same time
required = parser.add_argument_group('Required arguments')
required.add_argument('-t',
                      action="store",
                      dest="tag",
                      help='Tag name of dataset from external list',
                      default=None,
                      required=True,
                      type=str)
required.add_argument('-d',
                      action="store",
                      dest="dataset",
                      help='Reprocessing dataset name',
                      default=None,
                      required=True,
                      type=str)
required.add_argument('-p',
                      action="store",
                      dest="period",
                      help='Period to limit products with format YYYYMMDDTHHMMSS',
                      nargs=2,
                      default=['20000101T000000', '21000101T000000'],
                      type=str)
required.add_argument('-pt',
                      action="store",
                      dest="productType",
                      help='Limit to products with related product type',
                      default=None,
                      type=str)
required.add_argument('-o',
                      action="store",
                      dest="output_file",
                      help='Specify an output file to redirect the print',
                      default=None,
                      type=str)
required.add_argument('-multi',
                      action="store",
                      dest="multi_thread",
                      help='Choose to run in multi processing mode with given number of processes to launch. (Run `lscpu $|$ grep CPU\\(s $|$ head -1` on Linux to fetch the available cores on the current machine) Default in mono processing mode',
                      default=1,
                      type=int)
args = parser.parse_args()

# We store all arguments in variables
tag = args.tag
dataset = args.dataset
startTimeLimit = checkDate(args.period[0])
stopTimeLimit = checkDate(args.period[1])
productType = args.productType
output_file = args.output_file
NB_OF_PROCESSES = args.multi_thread
if output_file is not None:
    try:
        output_file = open(args.output_file, "w+")
        output_file.close()
    except Exception as err:
        print("Cannot write in that file " + args.output_file)
        print(err)
        exit(0)

if __name__ == "__main__":
    # Remote config
    database = ""
    host = ""
    user = ""
    password = ""
    # If DB_NAME, DB_USER and DB_PASSWORD are mentioned as environment variables
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

    # initializing the db
    conn, cur = init_db(database, host, user, password)

    if productType is not None:
        # Format query
        query = "SELECT name, start, stop FROM public.prd_external WHERE tag= '{}' AND name like '%{}%' AND start >= '{}' AND stop <= '{}' ORDER BY name".format(
            tag, productType, startTimeLimit, stopTimeLimit)
    else:
        # Format query
        query = "SELECT name, start, stop FROM public.prd_external WHERE tag= '{}' AND start >= '{}' AND stop <= '{}' ORDER BY name ".format(
            tag, startTimeLimit, stopTimeLimit)

    # Store list of OPE products
    external_dataset = exec_query(cur, query)

    if productType is not None:
        query = "SELECT  p.name, sp.start_date_time, sp.stop_date_time\
                FROM internal.sensing_product AS sp JOIN internal.product AS p ON p.id = sp.product \
                JOIN internal.dataset_x_product AS dxp ON p.id = dxp.product_id JOIN internal.dataset AS d ON dxp.dataset_id = d.id \
                WHERE d.name = '{}' AND p.name LIKE '%{}%'\
                ORDER BY sp.start_date_time ASC".format(dataset, productType)
    else:
        query = "SELECT  p.name, sp.start_date_time, sp.stop_date_time\
                FROM internal.sensing_product AS sp JOIN internal.product AS p ON p.id = sp.product \
                JOIN internal.dataset_x_product AS dxp ON p.id = dxp.product_id JOIN internal.dataset AS d ON dxp.dataset_id = d.id \
                WHERE d.name = '{}'\
                ORDER BY sp.start_date_time ASC".format(dataset)

    reprocessed_dataset = exec_query(cur, query)

    if NB_OF_PROCESSES == 1:
        compare_external_processing_lists(external_dataset, reprocessed_dataset)
    else:
        processes_list = []
        try:
            external_dataset_length = len(external_dataset)
            # Calculate the slices
            slices = []
            slice_length = int(math.floor(external_dataset_length / NB_OF_PROCESSES) + 1)

            slices.append([0, slice_length])
            for i in range(1, NB_OF_PROCESSES - 1):
                slices.append([slice_length * i, slice_length * (i + 1)])
            slices.append([slice_length * (NB_OF_PROCESSES - 1), external_dataset_length])

            # Slice the external dataset into multiple tables to compare
            # Create a new process for each slice and start it
            for first, last in slices:
                process = mp.Process(target=compare_external_processing_lists, args=(external_dataset[first:last], reprocessed_dataset))
                processes_list.append(process)
                process.start()
            # Waiting for all processes to finish
            [p.join() for p in processes_list]

        except Exception as err:
            print("An error occurred during the comparison")
            print(err)
            close_db(conn, cur)
            sys.exit(1)

    # Closing the connection to the db
    close_db(conn, cur)

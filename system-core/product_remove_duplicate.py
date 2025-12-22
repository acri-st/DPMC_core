#!/usr/bin/python
# -*- coding: utf-8 -*
import argparse
from datetime import datetime
import psycopg2
import os
import subprocess

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

# Function which execute a query with changes committed on DB
def setQueryDB(db, host, user, psswd, query):
    conn = None
    try:
        # We format params with database name, user name and user password
        params = "dbname=" + db + " user=" + user + " host=" + host + " password=" + psswd
        # psycopg2 library allow us to connect via the connect function
        conn = psycopg2.connect(params)
        # Declare a cursor is mandatory to execute a query
        cur = conn.cursor()
        # Execute the query given in argument
        cur.execute(query)
        
        # Instead of display results, we commit the changes to the database
        conn.commit()
        # Close the cursor
        cur.close()
        # Return code which means the query has been executed without error
        return 0
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
        # Return error code which means the query execution encounter an error
        return 1
    finally:
        if conn is not None:
            # Close the connection
            conn.close()

# Function which delete a product in DB
def deleteProduct (product):
    # Check if the product is archived
    query = "SELECT * FROM s3ome.hsm_copy WHERE product_name like '%" + product + "%'"
    archivedPrd = getQueryDB(database, host, user, password, query)
    # Get product id
    query = "SELECT id FROM internal.product WHERE name like '%" + product + "%'"
    productId = getQueryDB(database, host, user, password, query)
    # If the product is archived we can delete the product
    if len(archivedPrd) > 0 :
        # First delete product in sensing_product table
        query = "DELETE FROM internal.sensing_product WHERE product = " + productId[0]
        setQueryDB(database, host, user, password, query)
        print('DELETE internal.sensing_product')
        # Second delete product in product_x_media_catalog_entry table
        query = "DELETE FROM internal.product_x_media_catalog_entry WHERE product = " + productId[0]
        setQueryDB(database, host, user, password, query)
        print('DELETE FROM internal.product_x_media_catalog_entry')
        # Third delete product in media_catalog_entry table
        query = "DELETE FROM internal.media_catalog_entry WHERE id = (SELECT media_catalog_entry FROM internal.product_x_media_catalog_entry WHERE product = "+productId[0]+")"
        setQueryDB(database, host, user, password, query)
        print('DELETE FROM internal.media_catalog_entry')
        # Finally delete product in product table
        query = "DELETE FROM internal.product WHERE id = " + productId[0]
        setQueryDB(database, host, user, password, query)
        print('DELETE FROM internal.product')
    # Else, we first archive the product before delete it
    else:
        # Archive product
        exeCommand = "/exports/dpmc/scripts/scripts/archive_products/copy_to_archive.sh -i " + productId[0] + " -t /mount/internal/work-st/_archivage1c/servers/psonfs085"
        print(exeCommand)
        try:
            subprocess.call([exeCommand])
            print("Run /exports/dpmc/scripts/scripts/archive_products/copy_to_archive.sh -i %s -t /mount/internal/work-st/_archivage1c/servers/psonfs085" % productId[0])
            # Delete the product
            deleteProduct(product)
        except:
            print(product + 'ignored')
#########################################################################################
#                                                                                       #
#                                        PROGRAM                                        #
#                                                                                       #
#########################################################################################

# DESCRIPTION:
# This script is used to clean duplicates in DB.
# It get products with same start and stop times from same center.
# It keeps the one with the most recent generation time if the other product is archived, else it archives and delete it
# EXAMPLE :
# python product_remove_duplicate.py -s S3A -pt OL_0_EFR
# It means we want to check S3A_OL_0_EFR products

# Arguments declaration
parser = argparse.ArgumentParser(description='Arguments description for product_remove_duplicate.py')
# Mandatory argument but only one can be given at the same time
required = parser.add_argument_group('Required arguments')
required.add_argument('-s',
                    action="store",
                    dest="satellite",
                    help='Satellite',
                    default=None,
                    required=True,
                    type=str),
required.add_argument('-pt',
                    action="store",
                    dest="productType",
                    help='Product type',
                    default=None,
                    required=True,
                    type=str),
required.add_argument('-f',
                    action="store_true",
                    dest="force",
                    help='Remove products')

args = parser.parse_args()

# We store all arguments in variables
satellite = args.satellite
productType = args.productType
force = args.force

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

    # Query to get all products ordered by name
    query = "SELECT name FROM internal.product WHERE name like '%" + satellite + "_" + productType + "%' ORDER BY name"
    # Store query result
    products = getQueryDB(database, host, user, password, query)
    # Declare previosu start, stop and generation times and product name
    oldStartTime = ""
    oldStopTime = ""
    oldGenerationTime = ""
    oldProduct = ""

    # Loop on products
    for product in products:
        # For each product, declare start, stop and generation times
        currentStartTime = product[16:31]
        currentStopTime = product[32:47]
        currentGenerationTime = product[48:63]
        # If the previous start and stop times are equals to the current start and stop times
        if oldStartTime == currentStartTime and oldStopTime == currentStopTime :
            # Declare centers
            oldProductCenter = oldProduct[82:85]
            currentProductCenter = product[82:85]
            # If the previous product is coming from EUMETSAT, keep it
            if oldProductCenter == 'MAR' and currentProductCenter != 'MAR':
                if (force == True):
                    print('REMOVING ' + product)
                    deleteProduct(product)
                else:
                    print('DELETE : ' + product + ' & KEEP : ' + oldProduct)
            # If the current product is coming from EUMETSAT, keep it
            elif currentProductCenter == 'MAR' and oldProductCenter != 'MAR':
                if (force == True):
                    print('REMOVING ' + oldProduct)
                    deleteProduct(oldProduct)
                else:
                    print('DELETE : ' + oldProduct + ' & KEEP : ' + product)
            # If both the previous and the current product are coming from EUMETSAT, check product version
            elif currentProductCenter == 'MAR' and oldProductCenter == 'MAR':
                # It means, we have a duplicate, so we compare generation time
                # If the current product is older than the previous, we delete the current
                if datetime.strptime(currentGenerationTime, "%Y%m%dT%H%M%S") < datetime.strptime(oldGenerationTime, "%Y%m%dT%H%M%S"):
                    if (force == True):
                        print('REMOVING ' + product)
                        deleteProduct(product)
                    else:
                        print('DELETE : ' + product + ' & KEEP : ' + oldProduct)
                # If the current product is more recent than the previous, we delete the previous
                elif datetime.strptime(currentGenerationTime, "%Y%m%dT%H%M%S") > datetime.strptime(oldGenerationTime, "%Y%m%dT%H%M%S"):
                    if (force == True):
                        print('REMOVING ' + oldProduct)
                        deleteProduct(oldProduct)
                    else:
                        print('DELETE : ' + oldProduct + ' & KEEP : ' + product)
                
        # Else, it is not a duplicate
        else:
            # So, we set the current product as the previous product for next loop turn
            oldProduct = product
            oldStartTime = currentStartTime
            oldStopTime = currentStopTime
            oldGenerationTime = currentGenerationTime

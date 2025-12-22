#!/usr/bin/env python

import datetime
import argparse
import sys
sys.path.append("/exports/dpmc/scripts/system-core")
import storage


def valid_date(s):
#Function that tests the validity of the date passed through the variable -tr
    try:
        return datetime.datetime.strptime(s, "%Y%m%dT%H%M%S")
    except ValueError:
        msg = "Not a valid date: '{0}'.".format(s)
        raise argparse.ArgumentTypeError(msg)



#Argparse to pass shell-style variable
parser = argparse.ArgumentParser(description='Arguments description for dataset_content.py')
g = parser.add_mutually_exclusive_group()
parser.add_argument('-d',
                    action="store",
                    dest="DATASET",
                    help='Dataset ID or name',
                    required=True)
g.add_argument('-p',
                    action="store_true",
                    dest="PATH",
                    help='Lists products path within dataset')
parser.add_argument('-i',
                    action="store_true",
                    dest="IDS",
                    help='Lists products IDs within dataset')
g.add_argument('-n',
                    action="store_true",
                    dest="NAME",
                    help='Lists products name within dataset')
parser.add_argument('-s',
                    action="store_true",
                    dest="SIZE",
                    help='Get the size of each product within dataset')
g.add_argument('-S',
                    action="store_true",
                    dest="SUMSIZE",
                    help='Get total size of the products within dataset')
results = parser.parse_args()


try:
    DATASET = int(results.DATASET)
except:
    DATASET = results.DATASET
PATH = results.PATH
IDS = results.IDS
NAME = results.NAME
SIZE = results.SIZE
SUMSIZE = results.SUMSIZE
ALL = False

if PATH is False and IDS is False and NAME is False and SIZE is False and SUMSIZE is False:
    ALL= True
if PATH is True and SIZE is True and (IDS is True or NAME is True or SUMSIZE is True):
    parser.print_help()
    sys.exit()
if PATH is True and IDS is True and (SIZE is True or NAME is True or SUMSIZE is True):
    parser.print_help()
    sys.exit()

#Database connection
conn = storage.connect()
cursor = conn.cursor()


if isinstance(DATASET, int):
    MAIN_CONDITION = "WHERE d.id = %s" % DATASET
elif isinstance(DATASET, str):
    MAIN_CONDITION = "WHERE d.name = '%s'" % DATASET
else:
    parser.print_help()
    sys.exit()


if SUMSIZE:
    cursor.execute("""SELECT SUM(p.size)
                    from internal.product p
                    join internal.dataset_x_product dxp on dxp.product_id = p.id
                    join internal.dataset d on d.id = dxp.dataset_id """ + MAIN_CONDITION)

if SIZE and PATH is False:
    cursor.execute("""SELECT p.size
                    from internal.product p
                    join internal.dataset_x_product dxp on dxp.product_id = p.id
                    join internal.dataset d on d.id = dxp.dataset_id """ + MAIN_CONDITION + "ORDER BY p.name")

if IDS:
    cursor.execute("""SELECT p.id
                    from internal.product p
                    join internal.dataset_x_product dxp on dxp.product_id = p.id
                    join internal.dataset d on d.id = dxp.dataset_id """ + MAIN_CONDITION + "ORDER BY p.id")
if NAME:
    cursor.execute("""SELECT p.name
                    from internal.product p
                    join internal.dataset_x_product dxp on dxp.product_id = p.id
                    join internal.dataset d on d.id = dxp.dataset_id """ + MAIN_CONDITION + "ORDER BY p.name")

if PATH:
    if SIZE:
        cursor.execute("""SELECT fl.disk_location, p.size
                        from internal.product p
                        join public.files_location fl on fl.product_id = p.id
                        join internal.dataset_x_product dxp on dxp.product_id = p.id
                        join internal.dataset d on d.id = dxp.dataset_id """ + MAIN_CONDITION + "order by p.name")
    elif IDS:
        cursor.execute("""SELECT fl.disk_location, p.id
                        from internal.product p
                        join public.files_location fl on fl.product_id = p.id
                        join internal.dataset_x_product dxp on dxp.product_id = p.id
                        join internal.dataset d on d.id = dxp.dataset_id """ + MAIN_CONDITION + "order by p.name")
    else:
        cursor.execute("""SELECT fl.disk_location
                        from internal.product p
                        join public.files_location fl on fl.product_id = p.id
                        join internal.dataset_x_product dxp on dxp.product_id = p.id
                        join internal.dataset d on d.id = dxp.dataset_id """ + MAIN_CONDITION + "ORDER BY p.name")

if ALL:
    cursor.execute("""SELECT d.name, d.id,p.name, p.id, p.size
                    from internal.product p
                    join internal.dataset_x_product dxp on dxp.product_id = p.id
                    join internal.dataset d on d.id = dxp.dataset_id """ + MAIN_CONDITION + "ORDER BY p.id")


row = cursor.fetchall()
conn.close()
r = " | "

for e in range(len(row)):
    print(r.join([str(x) for x in row[e]]))

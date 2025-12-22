import configparser
import psycopg2

config = configparser.ConfigParser()
config.read('/exports/dpmc/scripts/system-core/config.ini')

def connect():
    return psycopg2.connect(host = config['psqlDB']['host'],
                           user = config['psqlDB']['user'],
                           password = config['psqlDB']['pass'],
                           database = config['psqlDB']['db'])

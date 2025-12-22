#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os, sys, argparse
from datetime import datetime, timedelta

def detect_gaps(ficin, delta, fmt_seconds, fmt_intervals, mode_start_time, mode_stop_time, mode_generation_time):

	f = open(ficin,'r')
	lignes  = f.readlines()
	f.close()

	start_date_old=datetime(2000,01,01,0,0,0)
	stop_date_old=datetime(2000,01,01,0,0,0)
	generation_date_old=datetime(2000,01,01,0,0,0)
	ligne_old='dummy'

	for ligne in lignes:

		start_date_new=datetime(int(ligne[16:20]), int(ligne[20:22]), int(ligne[22:24]), int(ligne[25:27]), int(ligne[27:29]), int(ligne[29:31]))
		stop_date_new=datetime(int(ligne[32:36]), int(ligne[36:38]), int(ligne[38:40]), int(ligne[41:43]), int(ligne[43:45]), int(ligne[45:47]))
		generation_date_new=datetime(int(ligne[48:52]), int(ligne[52:54]), int(ligne[54:56]), int(ligne[57:59]), int(ligne[59:61]), int(ligne[61:63]))

                if mode_start_time:
			stop_date_new = start_date_new

                if mode_stop_time:
                        start_date_new = stop_date_new

		duration=start_date_new-stop_date_old

                if mode_generation_time:
			duration=generation_date_new-generation_date_old

		if duration > timedelta(seconds=delta):
			if ligne_old != 'dummy':
				if fmt_seconds:
					print ligne_old.rstrip(), duration.days * 86400 + duration.seconds
				else:
					if fmt_intervals:
						duration_in_seconds = duration.days * 86400 + duration.seconds
                                                if mode_generation_time:
							print generation_date_old.strftime('%Y%m%dT%H%M%S'), generation_date_new.strftime('%Y%m%dT%H%M%S'), duration_in_seconds
 						else:
							print stop_date_old.strftime('%Y%m%dT%H%M%S'), start_date_new.strftime('%Y%m%dT%H%M%S'), duration_in_seconds

					else:
						print ligne_old.rstrip(), duration
				
		start_date_old=start_date_new
		stop_date_old=stop_date_new
		generation_date_old=generation_date_new
		ligne_old=ligne

if __name__ == '__main__':
   
	parser = argparse.ArgumentParser(description='Check for time gaps in a list of products')
	parser.add_argument('ficin', help='List of products')
	parser.add_argument('delta', type=int, help='Minimum gap duration')
	parser.add_argument('-s','--seconds', action="store_true", help='Display the gap duration in seconds')
	parser.add_argument('-i','--intervals', action="store_true", help='Provides start and stop times of the gaps')
	parser.add_argument('-st','--start_time', action="store_true", help='Only use start times')
	parser.add_argument('-et','--stop_time', action="store_true", help='Only use stop times')
	parser.add_argument('-gt','--generation_time', action="store_true", help='Only use generation times')
	args = parser.parse_args()

	sys.exit( detect_gaps(args.ficin,args.delta,args.seconds,args.intervals,args.start_time,args.stop_time,args.generation_time) )


import json
import urllib.request
from pprint import pprint
from dataclasses import dataclass
import argparse

def get_listing():
	content = urllib.request.urlopen("https://www.timetablegenerator.io/api/v1/school/mcmaster").read()
	return json.loads(content)

def get_locations(listing):
	result = set()
	for department in listing['courses'].values():
		for course in department:
			for section in course.get('core', []):
				for time in section['times']:
					result |= {time[-1]}
	return result

@dataclass(unsafe_hash=True)
class TimeSlot:
	day_of_week: str
	start_time: (str, str)
	end_time: (str, str)

def decode_timeslot(encoded):
	return TimeSlot(encoded[1], (encoded[2], encoded[3]), (encoded[4], encoded[5])), encoded[6]

short_day_to_friendly = {
	'mo' : 'Monday',
	'tu' : 'Tuesday',
	'we' : 'Wednesday',
	'th' : 'Thursday',
	'fr' : 'Friday',
	'sa' : 'Saturday',
	'su' : 'Sunday',
}

def main():
	parser = argparse.ArgumentParser()
	parser.add_argument('--day', type=str, default='')
	parser.add_argument('--time', type=str, default='')
	parser.add_argument('--building', type=str, default='')
	args = parser.parse_args()

	listing = get_listing()
	locations = get_locations(listing)
	#pprint(locations)

	unoccupied = locations.copy()
	user_time = tuple(map(int, args.time.split(':')))
	for department in listing['courses'].values():
		for course in department:
			for section in course.get('core', []):
				for time in section['times']:
					if len(time) > 1:
						time, location = decode_timeslot(time)
						if time.day_of_week == args.day and time.start_time <= user_time < time.end_time:
							unoccupied -= {location}
	print(f'Unoccupied rooms for time : {short_day_to_friendly[args.day]} {user_time}')
	if args.building:
		print(f'|> Filtered to building {args.building}')
		result = [x for x in unoccupied if x.startswith(args.building)]
	else:
		result = unoccupied
	print('='* 20)
	pprint(result)

if __name__ == '__main__':
	main()
function get_locations(listing) {
    let result = new Set();
    let process_sections = function(sections) {
        for (let section of sections) {
            for (let time of section.times) {
                result.add(time[time.length - 1]);
            }
        }
    };
    for (let department in listing.courses) {
        for (let course of listing.courses[department]) {
            if (course.hasOwnProperty('core')) {
                process_sections(course.core);
            }
            if (course.hasOwnProperty('tutorial')) {
                process_sections(course.tutorial);
            }
            // exclude lab locations because they are
            // generally locked / unsuitable
            //if (course.hasOwnProperty('lab')) {
            //    process_sections(course.lab);
            //}
        }
    }
    return result;
}

function decode_timeslot(time) {
    return [
        {
            day_of_week: time[1],
            start_time: [time[2], time[3]],
            end_time: [time[4], time[5]],
        },
        time[6]
    ];
}

function time_le(time1, time2) {
    return (time1[0] < time2[0])
            || (time1[0] === time2[0] && time1[1] <= time2[1]);
}

function get_current_time() {
    let today = new Date();
    let current_time = [today.getHours(), today.getMinutes()];
    let timeslots = [
        [8, 30],
        [9, 30],
        [10, 30],
        [11, 30],
        [12, 30],
        [13, 30],
        [14, 30],
        [15, 30],
        [16, 30],
        [17, 30],
        [19, 0]
    ];
    let chosen_slot = -1;
    let next_day = false;
    for (let i = 0; i < timeslots.length; i++) {
        let last_iter = i === timeslots.length - 1;
        if (time_le(timeslots[i], current_time) && (last_iter || !time_le(timeslots[i+1], current_time))) {
            if (time_sub(current_time, timeslots[i]) < 40) {
                chosen_slot = i;
            } else if (last_iter) {
                chosen_slot = 0;
                next_day = true;
            } else {
                chosen_slot = i + 1;
            }
            break;
        }
    }
    if (chosen_slot === -1) {
        throw 'bug in slot choosing logic';
    }
    return [today.getDay() + next_day, chosen_slot];
}

function time_sub(time1, time2) {
    return 60 * (time1[0] - time2[0]) + (time1[1] - time2[1]);
}

function time_print(time) {
    return time[0] + ':' + time[1];
}

function find_current_lectures(listing, day_of_week, start_time, end_time) {
    let result = [];
    for (let department in listing.courses) {
        for (let course of listing.courses[department]) {
            if (course.term !== 1) {
                continue;
            }
            if (course.hasOwnProperty('core')) {
                for (let section of course.core) {
                    for (let timeslot of section.times) {
                        if (timeslot.length > 1) {
                            let [time, location] = decode_timeslot(timeslot);
                            if (time.day_of_week === day_of_week
                                && time_le(time.start_time, end_time)
                                && time_le(start_time, time.end_time)) {
                                result.push(`${location}<br>
                                            ${course.name}<br>
                                            ${time_print(time.start_time)}-${time_print(time.end_time)}`);
                            }
                        }
                    }
                }
            }
        }
    }
    return result;
}

function find_unoccupied(listing, day_of_week, start_time, end_time) {
    let locations = get_locations(listing);
    let process_sections = function(sections) {
        for (let section of sections) {
            for (let timeslot of section.times) {
                if (timeslot.length > 1) {
                    let [time, location] = decode_timeslot(timeslot);
                    if (time.day_of_week === day_of_week
                        && time_le(time.start_time, end_time)
                        && time_le(start_time, time.end_time)) {
                        locations.delete(location);
                    }
                }
            }
        }
    };
    for (let department in listing.courses) {
        for (let course of listing.courses[department]) {
            if (course.term !== 1) {
                continue;
            }
            if (course.hasOwnProperty('core')) {
                process_sections(course.core);
            }
            if (course.hasOwnProperty('tutorial')) {
                process_sections(course.tutorial);
            }
            if (course.hasOwnProperty('lab')) {
                process_sections(course.lab);
            }
        }
    }
    return locations;
}

function handle_form_submit(event) {
    let building_input = document.getElementById('input-building');
    let day_of_week = document.getElementById('input-day').value;
    let start_time = document.getElementById('input-time-start').value.split(':').map(Number);
    let time_length = Number(document.getElementById('input-time-length').value);
    let end_time = [start_time[0] + time_length, start_time[1] - 1];

    let filtered = [];
    let empty_only_selector = document.getElementById('input-empty-only');
    if (empty_only_selector.value === 'Empty') {
        let unoccupied = Array.from(find_unoccupied(listing, day_of_week, start_time, end_time));
        filtered = unoccupied.filter(loc => loc.startsWith(building_input.value));
        filtered.sort();
    } else if (empty_only_selector.value === 'All') {
        let curr_lectures = find_current_lectures(listing, day_of_week, start_time, end_time);
        let unoccupied = Array.from(find_unoccupied(listing, day_of_week, start_time, end_time));
        filtered = curr_lectures.concat(unoccupied).filter(loc => loc.startsWith(building_input.value));
        filtered.sort();
    } else {
        throw 'Unexpected selection value';
    }
    let output_div = document.getElementById('request-output');
    output_div.innerHTML = '';
    for (let room of filtered) {
        let room_div = document.createElement('div');
        room_div.className = 'output-item';
        room_div.innerHTML = room;
        output_div.appendChild(room_div);
    }
    output_div.scrollIntoView({behavior: 'smooth', block: 'end'});
}

window.onload = function() {
    let input_form = document.getElementById('submit-data');
    input_form.addEventListener('click', handle_form_submit, false);
    let input_building = document.getElementById('input-building');
    input_building.onkeydown = function (event) {
        if (event.keyCode === 13) {
            handle_form_submit(undefined);
        }
    };
    let [curr_day_of_week, curr_timeslot] = get_current_time();
    document.getElementById('input-day').selectedIndex = curr_day_of_week;
    document.getElementById('input-time-start').selectedIndex = curr_timeslot;

};

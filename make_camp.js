function get_locations(listing) {
    let result = new Set();
    for (let department in listing.courses) {
        for (let course of listing.courses[department]) {
            if (course.hasOwnProperty('core')) {
                for (let section of course.core) {
                    for (let time of section.times) {
                        result.add(time[time.length - 1]);
                    }
                }
            }
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
        [19, 0],
        [22, 0]
    ];
    let chosen_slot = -1;
    for (let i = 0; i < timeslots.length; i++) {
        if (i === timeslots.length) {
            chosen_slot = 0;
            break;
        }
        if (time_le(timeslots[i], current_time) && !time_le(timeslots[i+1], current_time)) {
            if (time_sub(timeslots[i+1], current_time) > 40) {
                chosen_slot = i;
            } else {
                chosen_slot = i + 1;
            }
            break;
        }
    }
    if (chosen_slot === -1) {
        throw 'bug in slot choosing logic';
    }
    return [today.getDay(), chosen_slot];
}

function time_sub(time1, time2) {
    return 60 * (time1[0] - time2[0]) + (time1[1] - time2[1]);
}

function find_unoccupied(listing, day_of_week, start_time, end_time) {
    let locations = get_locations(listing);
    for (let department in listing.courses) {
        for (let course of listing.courses[department]) {
            if (course.hasOwnProperty('core')) {
                for (let section of course.core) {
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
            }
        }
    }
    return locations;
}

function handle_form_submit(event) {
    let building_input = document.getElementById('input-building');
    let day_of_week = document.getElementById('input-day').value;
    let start_time = document.getElementById('input-time-start').value.split(':');
    let time_length = Number(document.getElementById('input-time-length').value);
    let end_time = [start_time[0] + time_length, start_time[1]];
    let unoccupied = Array.from(find_unoccupied(listing, day_of_week, start_time, end_time));
    let filtered = unoccupied.filter(loc => loc.startsWith(building_input.value));
    filtered.sort();
    let output_div = document.getElementById('request-output');
    output_div.innerHTML = '';
    for (let room of filtered) {
        let room_div = document.createElement('div');
        room_div.className = 'output-item';
        room_div.innerHTML = room;
        output_div.appendChild(room_div);
    }
    console.log(filtered);
}

window.onload = function() {
    let input_form = document.getElementById('submit-data');
    input_form.addEventListener('click', handle_form_submit, false);
    let [curr_day_of_week, curr_timeslot] = get_current_time();
    document.getElementById('input-day').selectedIndex = curr_day_of_week;
    document.getElementById('input-time-start').selectedIndex = curr_timeslot;

};

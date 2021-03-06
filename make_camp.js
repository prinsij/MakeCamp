'use strict';
(function() {
    const CURRENT_TERM = 2;
    const App = {
        day: null,
        day_dropdown: '#input-day',
        time: null,
        time_dropdown: '#input-time-start',
        duration: null,
        smart_filter: null,
        duration_dropdown: '#input-time-length',
        room_type: "Empty",
        room_type_dropdown: '#input-empty-only',
        submit_button: '#submit-data',
        submit_button_csearch: '#submit-data-csearch',
        smart_filter_check: 'filter-rooms-check',
        building_input: '#input-building',
        course_input: '#input-course',
        output_container: '#request-output',
        tab_list: '#tab-list'
    };
    App.update_value = function($item, key) {
        App[key] = $item.data('value');
        $item.parent().parent().children('.dropdown-toggle').text($item.text());
    }
    App.hook = function(element, key) {
        $(element).find('.dropdown-menu > .dropdown-item').click(function() {
            App.update_value($(this), key);
        });
    }
    App.start = function() {
        this.hook(this.day_dropdown, 'day');
        this.hook(this.time_dropdown, 'time');
        this.hook(this.duration_dropdown, 'duration');
        this.hook(this.room_type_dropdown, 'room_type');

        $(this.tab_list).click(this.clear_output.bind(App));
        $(this.submit_button).click(this.handle_form_submit.bind(App));
        $(this.submit_button_csearch).click(this.handle_course_form_submit.bind(App));
        $(this.building_input).keydown(function(event) {
            if (event.key === 'Enter') {
                App.handle_form_submit.call(App, undefined);
            }
        });
        $(this.course_input).keydown(function(event) {
            if (event.key === 'Enter') {
                App.handle_course_form_submit.call(App, undefined);
            }
        });
        const [curr_day_of_week, curr_timeslot] = this.get_current_time();
        $(this.day_dropdown).find('.dropdown-menu > .dropdown-item:nth-child('+(curr_day_of_week+1)+')').each(function() {
            App.update_value($(this), 'day');
        });
        $(this.time_dropdown).find('.dropdown-menu > .dropdown-item:nth-child('+(curr_timeslot+1)+')').each(function() {
            App.update_value($(this), 'time');
        });
        $(this.duration_dropdown).find('.dropdown-menu > .dropdown-item[data-default]').each(function() {
            App.update_value($(this), 'duration');
        });
        $(this.room_type_dropdown).find('.dropdown-menu > .dropdown-item[data-default]').each(function() {
            App.update_value($(this), 'room_type');
        });
        const checkbox = document.getElementById(this.smart_filter_check);
        this.smart_filter = checkbox.checked;
        checkbox.addEventListener('change', () => {
            this.smart_filter = checkbox.checked;
        })
    };

    App.get_locations = function(listing) {
        const result = new Set();
        const process_sections = function (sections) {
            for (const section of sections) {
                for (const time of section.times) {
                    result.add(time[time.length - 1]);
                }
            }
        };
        for (const department in listing.courses) {
            for (const course of listing.courses[department]) {
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

    App.decode_timeslot = function(time) {
        return [
            {
                day_of_week: time[1],
                start_time: [time[2], time[3]],
                end_time: [time[4], time[5]],
            },
            time[6]
        ];
    }

    App.time_le = function(time1, time2) {
        return (time1[0] < time2[0])
            || (time1[0] === time2[0] && time1[1] <= time2[1]);
    }

    App.is_good_room = function(room) {
        if (!room.hasOwnProperty('building')) {
            return false;
        } else if (room.building === 'JHE') {
            return true;
        } else if (room.building === 'BSB') {
            return -1 <= room.floor && room.floor <= 2;
        } else if (room.building === 'MDCL') {
            return room.floor === 1;
        } else if (room.building === 'TSH') {
            return -1 <= room.floor && room.floor <= 1;
        } else if (room.building === 'CNH') {
            return -1 <= room.floor && room.floor <= 1;
        } else if (room.building === 'ETB') {
            return -1 <= room.floor && room.floor <= 1;
        } else if (room.building === 'LRW') {
            return -1 <= room.floor && room.floor <= 1;
        } else if (room.building === 'ITB') {
            return -1 <= room.floor && room.floor <= 1;
        }
        return true;
    }

    App.parse_room = function(roomstr) {
        // don't worry about nested or multiple parens and such
        const room_without_comments = roomstr.replace(/\(.*\)/mg, '');
        const [building, number] = roomstr.split(' ');

        if (number === undefined) {
            return {
                literal: room_without_comments
            };
        }

        let section = '';
        let floor = '1';
        let room = '';
        if (number[0] === 'B') {
            floor = - Number.parseInt(number[1]);
            room = Number.parseInt(number.substr(2));
        } else if (!number[0].match(/\d/)){
            section = number[0];
            floor = Number.parseInt(number[1]);
            room = Number.parseInt(number.substr(2));
        } else {
            floor = Number.parseInt(number[0]);
            room = Number.parseInt(number.substr(1));
        }

        if (!Number.parseInt(room)) {
            return {
                literal: room_without_comments
            };
        }

        return {
            building: building,
            floor: floor,
            room: room,
            section: section,
            literal: room_without_comments
        };
    }

    App.get_current_time = function() {
        const today = new Date();
        const current_time = [today.getHours(), today.getMinutes()];
        const timeslots = [
            [[8, 30], [9, 30]],
            [[9, 30], [10, 30]],
            [[10, 30], [11, 30]],
            [[11, 30], [12, 30]],
            [[12, 30], [13, 30]],
            [[13, 30], [14, 30]],
            [[14, 30], [15, 30]],
            [[15, 30], [16, 30]],
            [[16, 30], [17, 30]],
            [[17, 30], [19, 0]],
            [[19, 0], [22, 0]]
        ];
        let chosen_slot = -1;
        let next_day = false;
        if (this.time_le(current_time, timeslots[0][0])) {
            // before first
            chosen_slot = 0;
        } else if (this.time_le(timeslots[timeslots.length - 1][1], current_time)) {
            // after last
            chosen_slot = 0;
            next_day = true;
        } else {
            for (let i = 0; i < timeslots.length; i++) {
                const last_iter = i === timeslots.length - 1;
                if (this.time_le(timeslots[i][0], current_time) && (last_iter || this.time_le(current_time, timeslots[i][1]))) {
                    if (this.time_sub(timeslots[i][1], current_time) > 20) {
                        // more than 20m from end
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
        }
        if (chosen_slot === -1) {
            throw 'bug in slot choosing logic';
        }
        return [today.getDay() + next_day, chosen_slot];
    }

    App.time_sub = function(time1, time2) {
        return 60 * (time1[0] - time2[0]) + (time1[1] - time2[1]);
    }

    App.time_print = function(time) {
        return time[0] + ':' + (time[1].toString().length === 1 ? '0' : '') + time[1];
    }

    App.grab_lecture_info = function(time, location, course) {
        return {
            day: time.day_of_week,
            start_time: time.start_time,
            end_time: time.end_time,
            course_name: course.name,
            course_code: course.code,//course.code.split(' ')[1],
            location: App.parse_room(location)
        };
    }

    App.format_lecture_info = function(obj) {
        return `<div>${obj.location.literal}
                  <span class="ccode">${obj.course_code}</span>
                  <span class="time">${this.time_print(obj.start_time)}-${this.time_print(obj.end_time)}</span>
                </div>
                <span class="cname">${obj.course_name}</span>`
    }

    App.find_current_lectures = function(listing, day_of_week, start_time, end_time) {
        const result = [];
        for (const department in listing.courses) {
            for (const course of listing.courses[department]) {
                if (course.term !== CURRENT_TERM) {
                    continue;
                }
                if (course.hasOwnProperty('core')) {
                    for (const section of course.core) {
                        for (const timeslot of section.times) {
                            if (timeslot.length > 1) {
                                const [time, location] = this.decode_timeslot(timeslot);
                                if (time.day_of_week === day_of_week
                                    && this.time_le(time.start_time, end_time)
                                    && this.time_le(start_time, time.end_time)) {
                                    result.push(App.grab_lecture_info(time, location, course));
                                }
                            }
                        }
                    }
                }
            }
        }
        return result;
    }

    App.find_unoccupied = function(listing, day_of_week, start_time, end_time) {
        const locations = this.get_locations(listing);
        const process_sections = function (sections) {
            for (const section of sections) {
                for (const timeslot of section.times) {
                    if (timeslot.length > 1) {
                        const [time, location] = App.decode_timeslot(timeslot);
                        if (time.day_of_week === day_of_week
                            && App.time_le(time.start_time, end_time)
                            && App.time_le(start_time, time.end_time)) {
                            locations.delete(location);
                        }
                    }
                }
            }
        };
        for (const department in listing.courses) {
            for (const course of listing.courses[department]) {
                if (course.term !== CURRENT_TERM) {
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
        return Array.from(locations).map(App.parse_room);
    }

    App.short_to_long_day_of_week = function(short) {
        return {
            'mo': 'Monday',
            'tu': 'Tuesday',
            'we': 'Wednesday',
            'th': 'Thursday',
            'fr': 'Friday',
            'sa': 'Saturday',
            'su': 'Sunday'
        }[short];
    }

    App.handle_course_form_submit = function(event) {
        const substr = $(this.course_input).val().toUpperCase();
        const matching_courses = [];
        for (const department in listing.courses) {
            for (const course of listing.courses[department]) {
                if (course.term !== CURRENT_TERM) {
                    continue;
                }
                if (course.name.toUpperCase().search(substr) !== -1 || course.code.toUpperCase().search(substr) !== -1) {
                    if (course.hasOwnProperty('core')) {
                        let this_course = [];
                        for (const section of course.core) {
                            for (const timeslot of section.times) {
                                if (timeslot.length > 1) {
                                    const [time, location] = this.decode_timeslot(timeslot);
                                    const obj = App.grab_lecture_info(time, location, course);
                                    this_course.push(
                                        `<div>${obj.location.literal}<span>${App.short_to_long_day_of_week(time.day_of_week)}</span>
                                           <span class="time">${this.time_print(obj.start_time)}-${this.time_print(obj.end_time)}</span>
                                         </div>`);
                                }
                            }
                        }
                        this_course = [`<span class="ccode">${course.code}</span><span class="cname">${course.name}</span>`].concat(Array.from(new Set(this_course)));
                        if (this_course.length > 1) {
                            matching_courses.push(this_course);
                        }
                    }
                }
            }
        }
        App.display_output(matching_courses);
    }

    App.clear_output = function() {
        $(this.output_container).empty();
    }

    App.display_output = function(output_strs) {
        App.clear_output();
        const output_container = $(this.output_container);
        function inner(output_strs) {
            for (const item of output_strs) {
                if (Array.isArray(item)) {
                    let sublist = '';
                    for (const iitem of item.slice(1)) {
                        sublist += `<li class="list-group-item">${iitem}</li>`;
                    }
                    output_container.append(`<li class="list-group-item text-center">${item[0]}<ul class="list-group">${sublist}</ul></li>`);
                } else {
                    output_container.append(
                        $(`<li class="list-group-item">${item}</li>`)
                    );
                }
            }
        }
        inner(output_strs);
    }

    App.handle_form_submit = function(event) {
        const building = $(this.building_input).val().toUpperCase();
        const day_of_week = this.day;
        const start_time = this.time.split(':').map(Number);
        const time_length = Number(this.duration);
        const end_time = [start_time[0] + time_length, start_time[1] - 1];

        let fetch_lectures = () => {
            let curr_lectures = this.find_current_lectures(listing, day_of_week, start_time, end_time)
                .filter(obj => !App.smart_filter || App.is_good_room(obj.location))
                .filter(obj => obj.location.hasOwnProperty('building') && obj.location.building.startsWith(building));
            return Array.from(new Set(curr_lectures));
        };

        let fetch_unoccupied = () => {
            return Array.from(this.find_unoccupied(listing, day_of_week, start_time, end_time))
                .filter(obj => !App.smart_filter || App.is_good_room(obj))
                .filter(loc => loc.hasOwnProperty('building') && loc.building.startsWith(building));
        };

        let filtered = [];
        if (this.room_type === 'Empty') {
            filtered = fetch_unoccupied();
        } else if (this.room_type === 'All') {
            filtered = fetch_lectures().concat(fetch_unoccupied());
        } else if (this.room_type === 'Lectures') {
            filtered = fetch_lectures();
        } else {
            throw 'Unexpected selection value: ' + this.room_type;
        }

        filtered.sort(function(x, y) {
            function get_key(q) {
                return q.hasOwnProperty('location') ? q.location.literal : q.literal;
            }
            return get_key(x) < get_key(y) ? -1
                : get_key(x) > get_key(y) ? 1
                    : 0;
        });

        let output_strs = filtered.map(obj => {
            if (!obj.hasOwnProperty('course_code')) {
                return obj.literal;
            }
            return App.format_lecture_info(obj);
        });
        App.display_output(output_strs);
    }
    window.App = App;
    window.addEventListener('load', function() {
        window.App.start();
    })
})();

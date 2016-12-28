// jshint esversion: 6
const CAL_FORM = 'dddd DD/MM';
const EV_FORM = 'YYYY-MM-DD';
const HOUR_FORM = 'hh:mm:ss';
const MAX_WIDTH = 97;

let period = function* (from, to) {
	let [current, end, c] = [from, to.add(1, 'days'), 1];
	while (current.isBefore(end)) {
		yield new Day(current, c++);
		current.add(1, 'days');
	}
};

let encapsulate = function(type, data, options = Object) {
	let [style, unit] = ['', ''];
	for (let prop in options) {
		unit = (prop === 'order') ? '' : '%';
		style += `${prop}:${options[prop]}${unit};`;
	}
	return `<div class="${type}" style=${style}>${data}</div>`;
};

let filterPosition = function(element) {
	return element != this;
};

let handleCollision = function(events, dayPeriod) {
	// Step 0 : ordering events
	events.sort((a, b) => {
		return (a.startTime < b.startTime) ? -1
			: (a.startTime > b.startTime) ? 1
			: 0;
	});

	// Step 1: Initialize timeslots.
	let timeslots = [];
	for (let i=0; i<dayPeriod; i++) {
		timeslots[i] = [];
	}

	// Step 2: Arrange the events by timeslot.
	for (let i=0; i<events.length; i++) {
		for (let j=events[i].startTime; j<events[i].endTime; j++) {
			timeslots[j].push(i);
		}
	}

	// Step 3: Get each event it's horizontal position,
	//         and the maximum number of collisions.
	let max_nb_col = 0;
	for (let timeslot of timeslots) {
		// Proceeds if there's at least one event in the timeslot
		if (timeslot.length > 0) {
			if (timeslot.length > max_nb_col) max_nb_col = timeslot.length;
			let positions = Object.keys(timeslot);
			// Store the position for each event.
			for (let id of timeslot) {
				let event = events[id];
				if (!event.position) {
					event.position = positions.shift();
				} else {
					positions = positions.filter(filterPosition, event.position);
				}
			}
		}
	}
	return [events, max_nb_col];
};

class Day {
	constructor(date, order) {
		this.date = moment(date);
		this.order = order;
		this._dayStart = 0;
		this._dayPeriod = 0;
		this.events = [];
		this.max_nb_col = 0;
		
	}
	
	addEvents(events) {
		[this.events, this.max_nb_col] = [...handleCollision(events, this.dayPeriod)];
	}

	get calForm () {return this.date.format(CAL_FORM);}

	get evForm  () {return this.date.format(EV_FORM);}

	get dayStart () {return this._dayStart;}

	set dayStart (dayStart) {this._dayStart = dayStart;}

	get dayPeriod () {return this._dayPeriod;}

	set dayPeriod (dayPeriod) {this._dayPeriod = dayPeriod;}
}

class Html {
	constructor(calendar, dayPeriod) {
		this.calendar  = calendar;
	}

	buildEvent(event, dayPeriod, max_nb_col) {
		let options = {
			top   : _.round(event.startTime / dayPeriod * 100),
			height: _.round((event.endTime - event.startTime) / dayPeriod * 100),
			width : _.round(MAX_WIDTH / max_nb_col)
		};
		options.left = event.position * (options.width + 1);
		return encapsulate('event', event.name, options);
	}

	buildDay(day) {
		let header = encapsulate('header', day.calForm);
		let events = '';
		for (let event of day.events) {
			events += this.buildEvent(event, day.dayPeriod, day.max_nb_col);
		}
		events = encapsulate('event-wrapper', events);
		return encapsulate('day-wrapper', header + events, {order: day.order});
	}

	genarate() {
		let html = '';
		for (let day of this.calendar) {
			html += this.buildDay(day);
		}
		return html;
	}
}

function buildCalendar(selector, data) {
	let dayStart  = moment(data.dayStartTime, HOUR_FORM);
	let dayEnd    = moment(data.dayEndTime, HOUR_FORM);
	let dayPeriod = dayEnd.diff(dayStart, 'minutes');

	let calendar = new Set();
	let events   = _.groupBy(data.events.map((e) => {
		e.startTime = moment(e.startTime, HOUR_FORM).diff(dayStart, 'minutes');
		e.endTime   = moment(e.endTime, HOUR_FORM).diff(dayStart, 'minutes');
		return e;
	}), 'date');
	// 1- Build calendar
	for (let day of period(moment(data.from), moment(data.to))) {
		day.dayStart = dayStart;
		day.dayPeriod = dayPeriod;
		day.addEvents(events[day.evForm] || []);
		calendar.add(day);
	}
	// 2- Build template and display
	let template = new Html(calendar, dayPeriod);
	selector.append(template.genarate());
}

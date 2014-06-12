//var socket = io.connect('http://robotastic.com');
var channels;
var per_page;
var socket;


var groups = [{
	name: 'Fire/EMS',
	code: 'group-fire'
}, {
	name: 'DC Common',
	code: 'group-common'
}, {
	name: 'Services',
	code: 'group-services'
}];
var tags = [{
	name: 'Emergency Ops',
	code: 'tag-ops'
}, {
	name: 'EMS',
	code: 'tag-ems'
}, {
	name: 'Fire Dispatch',
	code: 'tag-fire-dispatch'
}, {
	name: 'Fire',
	code: 'tag-fire'
}, {
	name: 'Hospital',
	code: 'tag-hospital'
}, {
	name: 'Interop',
	code: 'tag-interop'
}, {
	name: 'Law Dispatch',
	code: 'tag-law-dispatch'
}, {
	name: 'Public Works',
	code: 'tag-public-works'
}, {
	name: 'Public Health',
	code: 'tag-public-health'
}, {
	name: 'Parks',
	code: 'tag-parks'
}, {
	name: 'Water',
	code: 'tag-water'
}, {
	name: 'Paratransit',
	code: 'tag-paratransit'
}, {
	name: 'Security',
	code: 'tag-security'
}, {
	name: 'St. Elizabeth',
	code: 'tag-st-e'
}, {
	name: 'Transportation',
	code: 'tag-transportation'
}];

if(typeof console === "undefined") {
    console = {
        log: function() { },
        debug: function() { }
    };
}



function print_source_row(source) {



	
	var newrow = $("<tr class='call-row'/>");

	newrow.append("<td>" + source._id + "</td>");
	for (tgNum in source.value) {
		tgTotal = source.value[tgNum];
		if (typeof channels[tgNum] == 'undefined') {
			newrow.append("<td>" + tgNum + "</td>");
			newrow.append("<td></td>");
			newrow.append("<td></td>");
			newrow.append("<td>" + tgTotal + "</td>");
		} else {
			newrow.append("<td>" + tgNum + "</td>");
			newrow.append("<td>" + channels[call.talkgroup].desc + "</td>");
			newrow.append("<td>" + channels[call.talkgroup].group + "</td>");
			newrow.append("<td>" + tgTotal+ "</td>");
		}
	
	}


		$("#source_table").append(newrow);

}



function nav_click() {
	var url = $(this).data('url');
	fetch_calls("/calls" + url);

}

function fetch_sources() {



	//console.log("Trying to fetch data from this url: " + url);
	$.ajax({
		url: "/source_list",
		type: "GET",
		dataType: "json",
		contentType: "application/json",
		cache: false,
		timeout: 5000,
		complete: function() {
			//called when complete
			//console.log('process complete');
		},

		success: function(data) {
			$("#source_table").empty();
			if (typeof data !== "undefined") {
				for (var i = 0; i < data.length; i++) {
					print_source_row(data[i]);
				}
			}

		},

		error: function() {
			//console.log('process error');
		},
	});
}

function find_code_name(code) {
	var i;
	if (code.substring(0, 3) == 'tg-') {
		tg_num = parseInt(code.substring(3));

		if (channels.hasOwnProperty(tg_num)) {
			var tg = channels[tg_num];
			return tg.desc;

		}

	}
	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		if (group.code == code) {
			return group.name
		}
	}
	for (var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		if (tag.code == code) {
			return tag.name;
		}
	}
	return 'All';
}

function init_table() {
	per_page = 20;

	$('#filter-title').html("All");
	fetch_sources();

}


$(document).ready(function() {

	now_playing = null;

	$.ajax({
		url: "/channels",
		type: "GET",
		contentType: "application/json",
		success: function(data) {
			channels = data.channels;
			init_table();
		}
	});

});

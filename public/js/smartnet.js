//var socket = io.connect('http://robotastic.com');
var channels;
var current_page;
var per_page;
var filter_code;

function play_call(filename) {
	console.log("trying to play: " + filename);
	$("#jquery_jplayer_1").jPlayer("setMedia", {
		mp3: "/media" + filename
	}).jPlayer("play");
}

function print_call_row(call) {
	var newdata = $("<td/>");
	newdata.html(call.talkgroup);
	newdata.click(function() {
		play_call(call.filename)
	});
	var time = new Date(call.time);
	var newrow = $("<tr/>");
	newrow.append(newdata);
	newrow.append("<td>" + channels[call.talkgroup].alpha + "</td>");
	newrow.append("<td>" + channels[call.talkgroup].desc + "</td>");
	newrow.append("<td>" + channels[call.talkgroup].group + "</td>");
	newrow.append("<td>" + time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds() + "</td>");
	newrow.append("<td>" + call.len + "</td>");
	$("#call_table").prepend(newrow);
}

function filter_calls() {
	var code = $(this).data("code");
	var name = $(this).data("name");
	$('#filter-title').html(name);
	filter_code = code;
	fetch_calls(0);
}

function add_filters() {
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
		name: 'EMS-Tac',
		code: 'tag-ems-tac'
	}, {
		name: 'EMS-Talk',
		code: 'tag-ems-talk'
	}, {
		name: 'Fire Dispatch',
		code: 'tag-fire-dispatch'
	}, {
		name: 'Fire-Tac',
		code: 'tag-fire-tac'
	}, {
		name: 'Fire-Talk',
		code: 'tag-fire-talk'
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
		name: 'Law Tac',
		code: 'tag-law-tac'
	}, {
		name: 'Public Works',
		code: 'tag-public-works'
	}, {
		name: 'Security',
		code: 'tag-security'
	}, {
		name: 'Transportation',
		code: 'tag-transportation'
	}];
	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		$("#group-filter").append($('<li><a href="#">' + group.name + '</a></li>').data('code', group.code).data('name', group.name).click(filter_calls));
	}
	for (var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		$("#tag-filter").append($('<li><a href="#">' + tag.name + '</a></li>').data('code', tag.code).data('name', tag.name).click(filter_calls));
	}
}

function page_click() {
	var page = $(this).data("page");

	fetch_calls(page);
}

function fetch_calls(offset) {
	$.ajax({
		url: "/calls",
		type: "POST",
		dataType: "json",
		data: JSON.stringify({
			offset: offset,
			per_page: per_page,
			filter_code: filter_code
		}),
		contentType: "application/json",
		cache: false,
		timeout: 5000,
		complete: function() {
			//called when complete
			console.log('process complete');
		},

		success: function(data) {
			console.log(data);
			$("#call_table").empty();
			if (typeof data.calls !== "undefined") {
				console.log(data.calls.length);
				var time = new Date(data.calls[0].time);
				$('#filter-date').html(time.toDateString());
				for (var i = 0; i < data.calls.length; i++) {
					console.log(data.calls[i]);
					print_call_row(data.calls[i]);

				}
			}
			if (typeof data.offset !== "undefined") {
				current_page = data.offset;
			}
			if (typeof data.count !== "undefined") {
				count = data.count;
				page = current_page - 2;
				$("#pages").empty();
				if (current_page > 1) {

					$("#pages").append($('<li><a href="#">&laquo;</a></li>').data("page", current_page - 1).click(page_click));
				} else {

					$("#pages").append($('<li class="disabled"><a href="#">&laquo;</a></li>'));
				}
				for (var i = 0; i < 5;) {
					if (page < 1) {
						page++;
					} else {
						if (page == current_page) {

							$("#pages").append($('<li class="active"><a href="#">' + page + '</a></li>').data("page", page).click(page_click));
						} else {
							if (((page - 1) * per_page) > count) {
								break;
							} else {

								$("#pages").append($('<li><a href="#">' + page + '</a></li>').data("page", page).click(page_click));

							}

						}
						page++;
						i++;
					}
				}
				if ((page * per_page) < count) {

					$("#pages").append($('<li><a href="#">&raquo;</a></li>').data("page", page + 1).click(page_click));

				} else {

					$("#pages").append($('<li class="disabled"><a href="#">&raquo;</a></li>'));
				}

			}
		},

		error: function() {
			console.log('process error');
		},
	});
}

function init_table() {
	per_page = 20;
	current_page = 1;
	filter_code = "";
	$('#filter-title').html("All");
	fetch_calls(0);

}
$(document).ready(function() {
	$.ajax({
		url: "/channels",
		type: "GET",
		contentType: "application/json",
		success: function(data) {
			console.log("got data");
			channels = data.channels
			init_table();
		}
	});
    $(function () {
	    $("#datetimepicker1").datetimepicker({});
    });
	add_filters();
});
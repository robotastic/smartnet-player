//var socket = io.connect('http://robotastic.com');
var channels;
var current_page;
var per_page;
var socket;
var live = false;
var now_playing = null;
var autoplay = false;

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

function play_call(row) {
	var filename = row.data("filename");

	now_playing = row;
	console.log("trying to play: " + filename);
	row.removeClass("live-call");
	row.addClass("now-playing");
	$("#jquery_jplayer_1").jPlayer("setMedia", {
		wav: "/media" + filename
	}).jPlayer("play");
}

function call_over(event) {
	if (now_playing) {
		now_playing.removeClass("now-playing");
	}
	if (autoplay) {
		if (live) {
			if (now_playing.prev().length != 0) {
				play_call(now_playing.prev());
			} else {
				now_playing = null;
			}
		} else {
			if (now_playing.next().length != 0) {
				play_call(now_playing.next());
			} else {
				now_playing = null;
			}
		}

	} else {
		now_playing = null;
	}
}


function print_call_row(call, direction, live) {



	var time = new Date(call.time);
	var newrow = $("<tr/>").data('filename', call.filename);

	if (live) {
		newrow.addClass("live-call");
	}

	var buttoncell = $("<td/>");
	var playbutton = $('<span class="glyphicon glyphicon-play call-play"></span>');
	playbutton.click(function() {
		row = $(this).closest("tr");
		play_call(row);
	});

	buttoncell.append(playbutton);
	newrow.append(buttoncell);
	if (typeof channels[call.talkgroup] == 'undefined') {
		newrow.append("<td>" + call.talkgroup + "</td>");
		newrow.append("<td>Uknown</td>");
		newrow.append("<td>Uknown</td>");
	} else {
		newrow.append("<td>" + channels[call.talkgroup].alpha + "</td>");
		newrow.append("<td>" + channels[call.talkgroup].desc + "</td>");
		newrow.append("<td>" + channels[call.talkgroup].group + "</td>");
	}
	newrow.append("<td>" + time.toLocaleTimeString() + "</td>");
	newrow.append("<td>" + call.len + "</td>");
	var actioncell = $("<td/>");
	var callview = $('<a href="/call/' + call.objectId + '"><span class="glyphicon glyphicon-link call-link"></span></a>');
	var linkview = $('<span class="glyphicon glyphicon-cloud-upload"></span>');
	var btngroup = $('<td/>');

	poptent = "<b>Evntually, you will be able to share calls using Twitter</b>";
	popoverOptions = {
		container: 'body',
		title: 'share',
		placement: 'top',
		html: true,
		content: poptent,
		trigger: 'hover'
	};
	linkview.popover(popoverOptions);
	btngroup.append(callview);
	btngroup.append(linkview);
	newrow.append(btngroup);

	if (live) {
		if (autoplay && (now_playing == null)) {
			var delay = Math.floor(Math.random() * 1000) + 500;
			setTimeout(play_call, delay, newrow);
		}
	}

	if (direction == 'newer') {
		$("#call_table").prepend(newrow);
	} else {
		$("#call_table").append(newrow);
	}

}

function filter_calls() {
	var code = $(this).data("code");
	var name = $(this).data("name");
	$('#filter-title').html(name);
	filter_code = code;
	fetch_calls();
	if (live) {
		socket.emit('code', {
			code: filter_code
		});
	}
}

function add_filters() {


	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		$("#group-filter").append($('<li><a href="#">' + group.name + '</a></li>').data('code', group.code).data('name', group.name).click(filter_calls));
	}
	for (var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		$("#tag-filter").append($('<li><a href="#">' + tag.name + '</a></li>').data('code', tag.code).data('name', tag.name).click(filter_calls));
	}
}

function add_tg_filter() {
	for (var chan_num in channels) {
		if (channels.hasOwnProperty(chan_num)) {
			var tg = channels[chan_num];
			$("#tg-filter").append($('<li><a href="#">' + tg.desc + '</a></li>').data('code', 'tg-' + chan_num).data('name', tg.desc).click(filter_calls));

		}
	}
}

function page_click() {
	var page = $(this).data("page");

	fetch_calls();
}

function nav_click() {
	var url = $(this).data('url');
	fetch_calls(url);
}

function fetch_calls(url) {

	if (!url) {
		url = "/calls";

		if (filter_date != "") {
			var url = url + "/newer/" + filter_date.getTime();
		}
		if (filter_code != "") {
			var url = url + "/" + filter_code;
		}
	}
	console.log("Trying to fetch data from this url: " + url);
	$.ajax({
		url: url,
		type: "GET",
		dataType: "json",
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
				for (var i = 0; i < data.calls.length; i++) {
					console.log(data.calls[i]);
					print_call_row(data.calls[i], data.direction, false);
				}
			}
			
			if (data.direction == 'newer') {
				var newer_time = new Date(data.calls[data.calls.length - 1].time);
				var older_time = new Date(data.calls[0].time);
			} else {
				var older_time = new Date(data.calls[data.calls.length - 1].time);
				var newer_time = new Date(data.calls[0].time);
			}

			var newer_url = '/newer/' + newer_time;
			var older_url = '/older/' + older_time;

			if (filter_code != '') {
				newer_url = newer_url + "/" + filter_code;
				older_url = older_url + "/" + filter_code;
			}

			$('#btn-older').data('url', older_url);
			$('#btn-newer').data('url', newer_url);

		},

		error: function() {
			console.log('process error');
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
	current_page = 1;

	$('#filter-title').html("All");
	fetch_calls();

}

function socket_connect() {

	if (!socket) {
		console.log('func socket_connect');
		socket = io.connect('http://robotastic.com');
		socket.on('calls', function(data) {
			console.log("Socket.io - Recv: " + data);
			if (typeof data.calls !== "undefined") {
				for (var i = 0; i < data.calls.length; i++) {
					print_call_row(data.calls[i], 'newer', true);
				}
			}
			if (typeof data.talkgroup !== "undefined") {
				print_call_row(data, 'newer', true);
			}

		});
		socket.on('ready', function(data) {
			console.log("Ready: " + data);
			socket.emit('code', {
				code: filter_code
			});
		});
	} else {
		console.log('func socket_reconnect');
		socket.socket.reconnect();
	}
}



function socket_disconnect() {
	console.log('func socket_disconnect');
	if (socket) socket.disconnect();
}

$(document).ready(function() {

	now_playing = null;

	$.ajax({
		url: "/channels",
		type: "GET",
		contentType: "application/json",
		success: function(data) {
			channels = data.channels;
			add_filters();
			add_tg_filter();
			init_table();
			if (filter_code) {
				$('#filter-title').html(find_code_name(filter_code));
			}
			// if the page got loaded with a filtered date
			if (filter_date) {
				$('#filter-date').html(filter_date.toDateString());
			}
		}
	});


	$(function() {
		$('.form_datetime').datetimepicker({
			format: "MM dd yyyy - hh:ii",
			autoclose: true,
			minuteStep: 10,
			showMeridian: true
		}).on('changeDate', function(ev) {
			socket_disconnect();


			$('#filter-date').html(ev.date.toDateString());
			var userOffset = ev.date.getTimezoneOffset() * 60000
			filter_date = new Date(ev.date.getTime() + userOffset);
			fetch_calls();
			live = false;
		});
	});
	$("#jquery_jplayer_1").jPlayer({
		ready: function() {
			$(this).jPlayer();
		},
		swfPath: "/js",
		supplied: "wav"
	});
	$("#jquery_jplayer_1").bind($.jPlayer.event.ended, function(event) {
		call_over(event);
	});
	$('#live-btn').on('click', function(e) {
		socket_connect();
		filter_date = "";
		$('#filter-date').html("Live");
		fetch_calls();
		live = true;
	});
	$('#btn-newer').on('click', nav_click);
	$('#btn-older').on('click', nav_click);
	$('#nav-filter').affix({
		offset: {
			top: 0
		}
	})
	autoplayOptions = {
		placement: 'bottom',
		title: 'Autoplay'
	};
	$('#autoplay-btn').tooltip(autoplayOptions);
	$('#autoplay-btn').on('click', function(e) {
		autoplay = !autoplay;
		if (autoplay) {
			$('#autoplay-btn').addClass('active');
		} else {
			$('#autoplay-btn').removeClass('active');
		}
	});

});
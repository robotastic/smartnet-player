//var socket = io.connect('http://robotastic.com');
var channels;
var current_page;
var per_page;
var socket;
var live = false;
var now_playing = null;
var autoplay = false;

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
	if (now_playing){
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
			}
			else
			{
				now_playing = null;
			}
		}

	} else {
		now_playing = null;
	}
}


function print_call_row(call, live) {
	
	

	var time = new Date(call.time);
	var newrow = $("<tr/>").data('filename', call.filename);

	if(live) {
		newrow.addClass("live-call");
	}

	var buttoncell = $("<td/>");
	var playbutton = $('<span class="glyphicon glyphicon-play call-play"></span>');
	playbutton.click(function() {
		row = $(this).closest( "tr" );
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
	var callview = $('<a href="/call/'+call.objectId+'"><span class="glyphicon glyphicon-link call-link"></span></a>');
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


    if(live) {
		$("#call_table").prepend(newrow);
		if (autoplay && (now_playing==null)) {
			var delay = Math.floor(Math.random() * 1000) + 500;
			setTimeout(play_call,delay,newrow);
		}
    } else {

		$("#call_table").append(newrow);
    }	

}

function filter_calls() {
	var code = $(this).data("code");
	var name = $(this).data("name");
	$('#filter-title').html(name);
	filter_code = code;
	fetch_calls(0);
	if (live) {
		socket.emit('code', { code: filter_code });
	}
}

function add_filters() {
	var tgs = []
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

function add_tg_filter() {
	for (var chan_num in channels) {
        if (channels.hasOwnProperty(chan_num)) {
           var tg = channels[chan_num];
           $("#tg-filter").append($('<li><a href="#">' + tg.desc + '</a></li>').data('code', 'tg-'+chan_num).data('name', tg.desc).click(filter_calls));

        }
    }
}

function page_click() {
	var page = $(this).data("page");

	fetch_calls(page);
}

function fetch_calls(offset) {

	if (filter_date!="") {
		var date_string = filter_date.toDateString() + " " + filter_date.toLocaleTimeString();		
	} else {
		var date_string = null;
	}
	$.ajax({
		url: "/calls",
		type: "POST",
		dataType: "json",
		data: JSON.stringify({
			offset: offset,
			per_page: per_page,
			filter_code: filter_code,
			filter_date: date_string
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
				for (var i = 0; i < data.calls.length; i++) {
					console.log(data.calls[i]);
					print_call_row(data.calls[i], false);
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

	$('#filter-title').html("All");
	fetch_calls(0);

}

function socket_connect() {

	if (!socket) {
		console.log('func socket_connect');
		socket = io.connect('http://robotastic.com');
		socket.on('calls', function(data) {
			console.log("Socket.io - Recv: " + data);
			if (typeof data.calls !== "undefined") {
				for (var i = 0; i < data.calls.length; i++) {
					print_call_row(data.calls[i], true);
				}
			}
			if (typeof data.talkgroup !== "undefined") {
				print_call_row(data, true);
			}

		});
		socket.on('ready', function (data) {
    		console.log("Ready: " + data);
    		socket.emit('code', { code: filter_code });
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
			console.log("got data");
			channels = data.channels
			add_tg_filter();
			init_table();
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
			var userOffset = ev.date.getTimezoneOffset()*60000
			filter_date = new Date(ev.date.getTime() + userOffset);
			fetch_calls(0);
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
	$('#live-btn').on('click', function (e) {
		socket_connect();
     	filter_date = "";
     	$('#filter-date').html("Live");
     	fetch_calls(0);
     	live = true;
	});
	$('#nav-filter').affix({offset: { top: 0 }})
	add_filters();
	autoplayOptions = {
		placement: 'bottom',
		title: 'Autoplay'
	};
	$('#autoplay-btn').tooltip(autoplayOptions);
	$('#autoplay-btn').on('click', function (e) {
		autoplay = !autoplay;
		if (autoplay) {
			$('#autoplay-btn').addClass('active');	
		} else {
			$('#autoplay-btn').removeClass('active');
		}
	});

});
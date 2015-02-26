//var socket = io.connect('http://robotastic.com');
var channels;
var source_names = {};
var per_page;
var socket;
var live = false;
var star = false;
var now_playing = null;
var autoplay = false;

var groups = [{
	name: 'Fire',
	code: 'group-fire'
}, {
	name: 'Medical',
	code: 'group-medical'
}, {
	name: 'Services',
	code: 'group-services'
}, {
	name: 'Emergency',
	code: 'group-emergency'
}, {
	name: 'Police',
	code: 'group-police'
}, {
	name: 'Security',
	code: 'group-security'
}, {
	name: 'Transportation',
	code: 'group-transportation'
}];


if(typeof console === "undefined") {
    console = {
        log: function() { },
        debug: function() { }
    };
}


function tweet_char_count() {
    // 140 is the max message length
    var remaining = 117 - $('#modal-tweet-text').val().length;
    $('#modal-tweet-char-left').text(remaining + ' chars left');
}

function twitter_success(user_login) {
	$('#user-bar').html('<div class="user-login-link"><a href="/logout">Log Out</a></div><img src="' + user_login.photos[0].value + '" class="img-circle pull-right">');
	user = {
		displayName: user_login.displayName,
		id: user_login.id,
		photo: user_login.photos[0].value,
		username: user_login.username
	}
}

function tweet_call(tweet) {
	var data = {tweet: tweet};
$.ajax({
		url: "/tweet",
		type: "POST",
		dataType: "json",
		cache: false,
		data: data,
		timeout: 5000,
		complete: function() {
			//called when complete
			//console.log('process complete');
		},

		success: function(data) {
			
		},

		error: function() {
			//console.log('process error');
		},
	});

}

function star_call(row) {
	var objectId = row.data("objectId");
	var url = "/star/" + objectId;

	$.ajax({
		url: url,
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
			$(".star-count", row).text(data.stars);
			$(".star-button", row).unbind( "click" );
			if (data.stars==1) {
				$(".star-button", row).removeClass('glyphicon-star-empty').addClass('glyphicon-star');
				$(".star-button", row).unbind( "mouseenter" );
				$(".star-button", row).unbind( "mouseleave" );
			}
		},

		error: function() {
			//console.log('process error');
		},
	});
}


function play_call(row) {
	var filename = row.data("filename");
	var ext = filename.split('.').pop();
	var setMedia = {};
	setMedia[ext] = "/media" + filename;

	if (now_playing) {
		now_playing.removeClass("now-playing");
	}
	now_playing = row;
	//console.log("trying to play: " + filename);
	row.removeClass("live-call");
	row.addClass("now-playing");

	$("#jquery_jplayer_1").jPlayer("setMedia", setMedia).jPlayer("play");

}


function call_over(event) {
	if (now_playing) {
		now_playing.removeClass("now-playing");
	}
	if (autoplay) {
		if (now_playing.prev().length != 0) {
			play_call(now_playing.prev());
		} else {
			now_playing = null;
		}
	} else {
		now_playing = null;
	}
}

function source_string(call) {
	var srcString = "";
	if (call.srcList) {
		for (var src in call.srcList) {
			srcNum = call.srcList[src];
			if (source_names.hasOwnProperty(srcNum)) {
				srcString = srcString + source_names[srcNum].shortName + " ";
			} else {
				srcString = srcString + srcNum + " ";
			}
		}
	}

	return srcString;
}

function print_call_row(call, direction, live) {



	var time = new Date(call.time);
	var newrow = $("<tr class='call-row'/>").data('filename', call.filename).data('objectId', call.objectId);

	if (live) {
		newrow.addClass("live-call");
	}

	var buttoncell = $("<td/>");
	//var playbutton = $('<span class="glyphicon glyphicon-play call-play"></span>');
	var playbutton = $('<i class="icon-play call-play"></i><span class="glyphicon glyphicon-play call-play"></span>');
	playbutton.click(function() {
		row = $(this).closest("tr");
		play_call(row);
	});

	buttoncell.append(playbutton);
	newrow.append(buttoncell);
	
	if (typeof channels[call.talkgroup] == 'undefined') {
		newrow.append("<td>" + call.len + "</td>");
		newrow.append("<td>" + call.talkgroup + "</td>");
		newrow.append("<td>" + time.toLocaleTimeString() + " - " + time.toLocaleDateString()  + "</td>");
		newrow.append("<td>" + source_string(call) + "</td>");
		newrow.append("<td>" + call.talkgroup + "</td>");
		newrow.append("<td>Uknown</td>");
		newrow.append("<td>Uknown</td>");
	} else {
		newrow.append("<td>" + call.len + "</td>");
		newrow.append("<td>" + channels[call.talkgroup].alpha + "</td>");
		newrow.append("<td>" + time.toLocaleTimeString() + " - " + time.toLocaleDateString()  +"</td>");
		newrow.append("<td>" + source_string(call) + "</td>");
		newrow.append("<td>" + call.talkgroup + "</td>");
		newrow.append("<td>" + channels[call.talkgroup].desc + "</td>");
		newrow.append("<td>" + channels[call.talkgroup].group + "</td>");
	}
	
	
	var actioncell = $("<td/>");
	/*
	var callview = $('<a href="/call/' + call.objectId + '"><span class="glyphicon glyphicon-link call-link"></span></a>');
	var linkview = $('<span class="glyphicon glyphicon-cloud-upload"></span>');
	*/

	var callview = $('<a href="/call/' + call.objectId + '"><i class="icon-file call-link"> </i></a><a href="/call/' + call.objectId + '"><span class="glyphicon glyphicon-link call-link"></span></a>');
	var linkview = $('<i class="icon-share-alt"> </i><span class="glyphicon glyphicon-bullhorn"></span>');
	var downloadview = $('<a href="http://openmhz.com/media' + call.filename +'"><span class="glyphicon glyphicon-download-alt download-link"></span></a>');
	if (call.stars == 0 ) {
		var starbutton = $('<span class="glyphicon glyphicon-star-empty star-button"></span>');
		var	starcount = $('<span class="star-count"></span>');
		starbutton.mouseenter(function() { 
			$( this ).removeClass('glyphicon-star-empty').addClass('glyphicon-star');
		});
		starbutton.mouseleave(function() { 
			$( this ).removeClass('glyphicon-star').addClass('glyphicon-star-empty');
		});
	} else {
		var starbutton = $('<span class="glyphicon glyphicon-star star-button"></span>');
		var	starcount = $('<span class="star-count">' + call.stars + '</span>');
	}
	downloadview.mousedown(function() {
		row = $(this).closest("tr");
		star_call(row);
	});
	starbutton.click(function() {
		row = $(this).closest("tr");
		star_call(row);
	});

	var btngroup = $('<td/>');

	poptent = "Share Call on Twitter";
	if (!user) {
		poptent = poptent + ". You need to Authenticate first.";
	}
	popoverOptions = {
		container: 'body',
		title: 'Tweet',
		placement: 'top',
		html: true,
		content: poptent,
		trigger: 'hover'
	};

	linkview.popover(popoverOptions);
	linkview.click(function() {
		if (!user) {
			window.open("/auth/twitter", "twitterAuthWindow", "menubar=0,resizable=0,location,width=600,height=400");
		} else {
			$('#modal-tweet').modal({
	  			keyboard: false
			});
			var row = $(this).closest("tr");
			var objectId = row.data("objectId");
			$('#modal-tweet-url').text('+ http://openmhz.com/call/'+ objectId);
			$('#modal-tweet-text-url').val('http://openmhz.com/call/'+ objectId);
		}
	});




	btngroup.append(callview);
	btngroup.append(linkview);
	btngroup.append(downloadview);

	btngroup.append(starbutton);
	btngroup.append(starcount);
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
		socket.send(JSON.stringify({
			type: 'code',
 			code: filter_code
		}));
		/*socket.emit('code', {
			code: filter_code
		});*/
	}
}

function add_filters() {


	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		$("#group-filter").append($('<li><a href="#">' + group.name + '</a></li>').data('code', group.code).data('name', group.name).click(filter_calls));
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



function nav_click() {
	var url = $(this).data('url');
	fetch_calls("/calls" + url);

}

function fetch_calls(url) {

	if (!url) {
		if (star) {
			url = "/stars";
		} else {
			url = "/calls";
		}
		if (filter_date != "") {
			var url = url + "/newer/" + filter_date.getTime();
		}
		if (filter_code != "") {
			var url = url + "/" + filter_code;
		}
	}
	//console.log("Trying to fetch data from this url: " + url);
	$.ajax({
		url: url,
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
			var browser_url = url.substring(6);
			browser_url = '/scanner' + browser_url;
			if (window.history && history.pushState) {
				window.history.pushState(data, "page 2", browser_url);
			}
			$("#call_table").empty();
			if (typeof data.calls !== "undefined") {
				for (var i = 0; i < data.calls.length; i++) {
					//console.log(data.calls[i]);
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

			var newer_url = '/newer/' + newer_time.getTime();
			var older_url = '/older/' + older_time.getTime();

			if (filter_code != '') {
				newer_url = newer_url + "/" + filter_code;
				older_url = older_url + "/" + filter_code;
			}

			$('.older-btn').data('url', older_url);
			$('.newer-btn').data('url', newer_url);
			if (data.count <= per_page) {
				if (data.direction == 'newer') {
					$('.newer-btn').hide();
				} else {
					$('.older-btn').hide();
				}
			} else {
				$('.newer-btn').show();
				$('.older-btn').show();
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

	return 'All';
}

function init_table() {
	per_page = 20;

	$('#filter-title').html("All");
	fetch_calls();

}




function socket_connect() {
	console.log("Trying to connect");
	if (!socket) {
		console.log('func socket_connect');
		socket = new WebSocket('ws://openmhz.com/');
    socket.onmessage = function(e) {
        console.log(e.data); //prints [Object object] string and not the object
        var message = JSON.parse(e.data);
        if (typeof message.type !== "undefined") {
	        if (message.type == 'calls') {
	        	if (typeof message.calls !== "undefined") {
					for (var i = 0; i < message.calls.length; i++) {
						print_call_row(message.calls[i], 'newer', true);
					}
				}
				if (typeof message.talkgroup !== "undefined") {
					print_call_row(message, 'newer', true);
				}
	        }
   		}	




    };
    socket.onopen = function(e) {
    	socket.send(JSON.stringify({
    		type: 'code',
 			code: filter_code
		}));
    };
}
    /*
		socket = io.connect('http://openmhz.com');
		socket.on('calls', function(data) {
			//console.log("Socket.io - Recv: " + data);
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
			//console.log("Ready: " + data);
			socket.emit('code', {
				code: filter_code
			});
		});
	} else {
		//console.log('func socket_reconnect');
		socket.socket.reconnect();
	}*/
}



function socket_disconnect() {
	console.log('func socket_disconnect');
	if (socket) socket.close();
}

$(document).ready(function() {

	now_playing = null;

	$.ajax({
		url: "/channels",
		type: "GET",
		contentType: "application/json",
		success: function(data) {
			channels = data.channels;
			source_names = data.source_names;
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
			showMeridian: true,
			endDate: new Date()
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
		swfPath: "/js/Jplayer.swf",
		supplied: "m4a",
		solution: "html,flash" //,
		//preload: "metadata"
	});
	$("#jquery_jplayer_1").bind($.jPlayer.event.ended, function(event) {
		call_over(event);
	});
	$('#live-btn').on('click', function(e) {
		live = !live;
		if (live) {
			socket_connect();
			filter_date = "";
			$('#filter-date').html("Live");
			fetch_calls();
			$('#live-btn').addClass('active');
		} else {
			socket_disconnect();
			filter_date = "";
			$('#filter-date').html("");
			$('#live-btn').removeClass('active');
		}
	});
	$('#star-btn').on('click', function(e) {
		star = !star;
		fetch_calls();
		if (star) {
			$('#star-btn').addClass('active');
		} else {
			$('#star-btn').removeClass('active');
		}
	});
	$('.newer-btn').on('click', nav_click);
	$('.older-btn').on('click', nav_click);
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
		$('#autoplay-btn').blur();
	});

	$('#modal-tweet-text').change(tweet_char_count);
    $('#modal-tweet-text').keyup(tweet_char_count);

	$('#modal-tweet-btn').on('click', function(e) {
		var tweet = $('#modal-tweet-text').val() + ' ' + $('#modal-tweet-text-url').val();
		tweet_call(tweet);
		$('#modal-tweet-text').val('');
		$('#modal-tweet').modal('hide');
	});
	$('#user-login-btn').on('click', function(e) {
		window.open("/auth/twitter", "twitterAuthWindow", "menubar=0,resizable=0,location,width=600,height=400");
	});

});
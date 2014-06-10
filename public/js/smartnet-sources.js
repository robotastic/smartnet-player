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
		newrow.append("<td>" + call.freq + "</td>");
		newrow.append("<td>" + call.talkgroup + "</td>");
		newrow.append("<td>Uknown</td>");
		newrow.append("<td>Uknown</td>");
	} else {
		newrow.append("<td>" + call.len + "</td>");
		newrow.append("<td>" + channels[call.talkgroup].alpha + "</td>");
		newrow.append("<td>" + time.toLocaleTimeString() + " - " + time.toLocaleDateString()  +"</td>");
		newrow.append("<td>" + call.freq + "</td>");
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



function nav_click() {
	var url = $(this).data('url');
	fetch_calls("/calls" + url);

}

function fetch_sources(url) {



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

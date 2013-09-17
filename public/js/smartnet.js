//var socket = io.connect('http://robotastic.com');
var channels;
var current_page;
var per_page;

function play_call(filename) {
	console.log("trying to play: " + filename);
	$("#jquery_jplayer_1").jPlayer("setMedia", {
		mp3: "/media/" + filename
	}).jPlayer("play");
}

function print_call_row(filename, talkgroup) {
    
	newdata = $("<td/>");
	newdata.html(talkgroup);
	newdata.click(function() {
		play_call(filename)
	});
	newrow = $("<tr/>");
	newrow.append(newdata);
    newrow.append("<td>"+channels[talkgroup].alpha+"</td>");
    newrow.append("<td>"+channels[talkgroup].desc+"</td>");
    newrow.append("<td>"+channels[talkgroup].group+"</td>");

	$("#call_table").prepend(newrow);
}

function fetch_calls(offset) {
	$.ajax({
		url: "/calls",
		type: "POST",
		dataType: "json",
	    data: JSON.stringify({
			offset: offset
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
			if (typeof data.calls !== "undefined") {
			    console.log(data.calls.length);
				for (var i = 0; i < data.calls.length; i++) {
				    console.log(data.calls[i]);
					print_call_row(data.calls[i].filename, data.calls[i].talkgroup);
				}
			}
			if (typeof data.offset !== "undefined") {
				current_page = data.offset / per_page;
			}
			if (typeof data.count !== "undefined") {
				count = data.count;
				page = current_page-2;
				if (current_page>1) {
					html = '<li><a href="#">&laquo;</a></li>';
				} else {
					html = '<li class="disabled"><a href="#">&laquo;</a></li>';
				}
				for (var i=0; i <5;) {
					if (page < 1) {
						page ++;
					} else {
						if (page == current_page) {
							html = html + '<li class="active"><a href="#">'+ page + '</a></li>';
						} else {
							if (((page-1) * per_page) > count) {
								break;
							} else { 
								html = html + '<li><a href="#">'+ page + '</a></li>';
							}

						}
						page++;
						i++;
					}
				}
				if ((page*per_page) > count) {
					html = html + '<li><a href="#">&raquo;</a></li>';
				} else {
					html = html + '<li class="disabled"><a href="#">&raquo;</a></li>';
				}
				$("#pages").html(html);
			}
		},

		error: function() {
			console.log('process error');
		},
	});
}

function init_table() {
	per_page=20;
	current_page=1;

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

});
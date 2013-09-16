//var socket = io.connect('http://robotastic.com');
var channels;

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

function init_table() {
	$.ajax({
		url: "/calls",
		type: "POST",
		dataType: "json",
	    data: JSON.stringify({
			num: 20,
			tg: 4000
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
		},

		error: function() {
			console.log('process error');
		},
	});



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
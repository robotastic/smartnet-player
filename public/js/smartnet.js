//var socket = io.connect('http://robotastic.com');

function play_call(filename) {
	console.log("trying to play: " + filename);
	$("#jquery_jplayer_1").jPlayer("setMedia", {
		mp3: "/media/" + filename
	}).jPlayer("play");
}

function print_call_row(filename, talkgroup) {
	newdiv = $("<div/>");
	newdiv.html(talkgroup);
	newdiv.click(function() {
		play_call(filename)
	});
	newli = $("<li/>");
	newli.append(newdiv);

	$("#call_list").prepend(newli);
}
$(document).ready(function() {
	$.ajax({
		url: "/calls",
		type: "POST",
		dataType: "json",
		data: {
			num: 20,
			tg: 4000
		},
		contentType: "application/json",
		cache: false,
		timeout: 5000,
		complete: function() {
			//called when complete
			console.log('process complete');
		},

		success: function(data) {
			if (typeof data.calls !== "undefined") {
				for (var i = 0; i < data.calls.length; i++) {
					print_call_row(data.calls[i].filename, data.calls[i].talkgroup);
				}
			}
		},

		error: function() {
			console.log('process error');
		},
	});

});
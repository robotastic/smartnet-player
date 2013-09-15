//var socket = io.connect('http://robotastic.com');
        
function print_call_row(filename, talkgroup) {
	$("#call_list").append("<li><a href='/media/"+ filename +"'>"+ talkgroup + "</a></li>");
}


function play_call(filename) {
	$("#jquery_jplayer_1").jPlayer("setMedia", {
      mp3: filename
    }).jPlayer("play");
}
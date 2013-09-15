//var socket = io.connect('http://robotastic.com');

function play_call(filename) {
	$("#jquery_jplayer_1").jPlayer("setMedia", {
      mp3: filename
    }).jPlayer("play");
}
        
function print_call_row(filename, talkgroup) {
	newdiv = document.createElement("div");
	newdb.html(talkgroup);
	newdiv.click(function() {play_call(filename) });
	newli = document.createElement( "li" );
	newli.append(newdiv);
	
	$("#call_list").append( newli  );
}



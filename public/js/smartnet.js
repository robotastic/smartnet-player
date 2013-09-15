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
	newdiv.click(function() {play_call(filename) });
    newli = $( "<li/>" );
	newli.append(newdiv);
	
	$("#call_list").append( newli  );
}



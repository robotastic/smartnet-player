var socket = io.connect('http://robotastic.com');
        
function print_call_row(filename, talkgroup) {
	$("#call_list").append("<li><a href='/media/"+ filename +"'>"+ talkgroup + "</a></li>");
}

socket.on('calls', function (data) {

		if (typeof data.calls !== "undefined")	{
			for (var i = 0; i < data.calls.length; i++) {
    			print_call_row(data.calls[i].filename, data.calls[i].talkgroup);
			}			
		}	
		if (typeof data.talkgroup !== "undefined")	{
			print_call_row(data.filename, data.talkgroup);
		}	
        console.log(data);
        //socket.emit('my other event', { my: 'data' });
 });

function play_call(filename) {
	$("#jquery_jplayer_1").jPlayer("setMedia", {
      mp3: filename
    }).jPlayer("play");
}
function play_call(filename) {
	$("#jquery_jplayer_1").jPlayer("setMedia", {
      mp3: filename
    }).jPlayer("play");
}
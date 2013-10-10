

self.update_timer = function (event) {
    var status = event.jPlayer.status;
    $('.jtimer').text($.jPlayer.convertTime(status.duration - status.currentTime));
    var percent = (status.currentTime / status.duration) * 100;
    $(".bar").css("width", precent + "%");
};


$(document).ready(function() {
	var local_item =!{JSON.stringify(item)};
	var filename = '/media' + local_item.path + local_item.name;
	$("#jquery_jplayer_1").jPlayer({
	    ready: function(event) {
	        $(this).jPlayer("setMedia", {
	            wav: filename
	        });
	    },
	    swfPath: "/js",
	    supplied: "wav"
	})
	.bind($.jPlayer.event.timeupdate, self.update_timer);
});
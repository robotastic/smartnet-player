//var socket = io.connect('http://robotastic.com');
var channels;
var current_page;
var per_page;

function play_call(filename) {
	console.log("trying to play: " + filename);
	$("#jquery_jplayer_1").jPlayer("setMedia", {
		mp3: "/media" + filename
	}).jPlayer("play");
}

function print_call_row(path, filename, talkgroup, len) {
    
	newdata = $("<td/>");
	newdata.html(talkgroup);
	newdata.click(function() {
		play_call(path+filename)
	});
	newrow = $("<tr/>");
	newrow.append(newdata);
    newrow.append("<td>"+channels[talkgroup].alpha+"</td>");
    newrow.append("<td>"+channels[talkgroup].desc+"</td>");
    newrow.append("<td>"+channels[talkgroup].group+"</td>");
	newrow.append("<td>"+len+"</td>");
	$("#call_table").prepend(newrow);
}

function add_filters() {
	var groups =  [  
			{	name: 'Fire/EMS',
				code: 'group-fire'
			},
			{	name: 'DC Common',
				code: 'group-common'
			},
			{
				name: 'Services',
				code: 'group-services' 
			}
		];
	for (var i = 0; i < groups.length; i++) {
    	var group = groups[i];
		$("#group-filter").append($('<li><a href="#">' + group.name + '</a></li>').click(function() {filter_calls(group.code)}));
	}
}
function fetch_calls(offset) {
	$.ajax({
		url: "/calls",
		type: "POST",
		dataType: "json",
	    data: JSON.stringify({
			offset: offset,
			per_page: per_page
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
					print_call_row(data.calls[i].path,data.calls[i].filename, data.calls[i].talkgroup,data.calls[i].len);
				}
			}
			if (typeof data.offset !== "undefined") {
				current_page = data.offset;
			}
			if (typeof data.count !== "undefined") {
				count = data.count;
				page = current_page-2;
				$("#pages").empty();
				if (current_page>1) {
					
				    $("#pages").append($('<li><a href="#">&laquo;</a></li>').click(function() {fetch_calls(current_page-1)}));
				} else {
					
				    $("#pages").append($('<li class="disabled"><a href="#">&laquo;</a></li>'));
				}
				for (var i=0; i <5;) {
					if (page < 1) {
						page ++;
					} else {
						if (page == current_page) {
							
						    $("#pages").append($('<li class="active"><a href="#">'+ page + '</a></li>').click(function() {fetch_calls(page)} ));
						} else {
							if (((page-1) * per_page) > count) {
								break;
							} else { 
								
							    $("#pages").append($('<li><a href="#">'+ page + '</a></li>').click(function() {fetch_calls(page)} ));
						
							}

						}
						page++;
						i++;
					}
				}
				if ((page*per_page) < count) {
					//html = html + '<li><a href="#">&raquo;</a></li>';
				    $("#pages").append($('<li><a href="#">&raquo;</a></li>').click( function() {fetch_calls(current_page+1)} ));
				
				} else {
					//html = html + '<li class="disabled"><a href="#">&raquo;</a></li>';
				    $("#pages").append($('<li class="disabled"><a href="#">&raquo;</a></li>'));
				}
				
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
    $(".form_datetime").datetimepicker({
        format: "dd MM yyyy - hh:ii",
        minuteStep: 10,
        autoclose: true
    });
    add_filters();
});

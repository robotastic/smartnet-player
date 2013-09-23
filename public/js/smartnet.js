//var socket = io.connect('http://robotastic.com');
var channels;
var current_page;
var per_page;
var filter_code;

function play_call(filename) {
	console.log("trying to play: " + filename);
	$("#jquery_jplayer_1").jPlayer("setMedia", {
		mp3: "/media" + filename
	}).jPlayer("play");
}

function print_call_row(call) {
	path, filename, talkgroup, len
    data.calls[i].path,data.calls[i].filename, data.calls[i].talkgroup,data.calls[i].data.calls[i].len
	newdata = $("<td/>");
	newdata.html(call.talkgroup);
	newdata.click(function() {
		play_call(call.filename)
	});
	newrow = $("<tr/>");
	newrow.append(newdata);
    newrow.append("<td>"+channels[call.talkgroup].alpha+"</td>");
    newrow.append("<td>"+channels[call.talkgroup].desc+"</td>");
    newrow.append("<td>"+channels[call.talkgroup].group+"</td>");
    newrow.append("<td>"+call.time.getHours() + ":" +call.time.getMinutes() + ":" + call.time.getSeconds()+"</td>");
	newrow.append("<td>"+call.len+"</td>");
	$("#call_table").prepend(newrow);
}

function filter_calls() {
	var code = $(this).data("code");
	filter_code = code;
	fetch_calls(0);
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
		$("#group-filter").append($('<li><a href="#">' + group.name + '</a></li>').data('code', group.code).click(filter_calls));
	}
}

function page_click() {
    var page = $(this).data("page");

	fetch_calls(page);
}

function fetch_calls(offset) {
	$.ajax({
		url: "/calls",
		type: "POST",
		dataType: "json",
	    data: JSON.stringify({
			offset: offset,
			per_page: per_page,
			filter_code: filter_code
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
		    $("#call_table").empty();
			if (typeof data.calls !== "undefined") {
			    console.log(data.calls.length);
				for (var i = 0; i < data.calls.length; i++) {
				    console.log(data.calls[i]);
					print_call_row(data.calls[i]);
						
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
					
				    $("#pages").append($('<li><a href="#">&laquo;</a></li>').data("page", current_page-1).click(page_click));
				} else {
					
				    $("#pages").append($('<li class="disabled"><a href="#">&laquo;</a></li>'));
				}
				for (var i=0; i <5;) {
					if (page < 1) {
						page ++;
					} else {
						if (page == current_page) {
							
						    $("#pages").append($('<li class="active"><a href="#">'+ page + '</a></li>').data("page", page).click(page_click ));
						} else {
							if (((page-1) * per_page) > count) {
								break;
							} else { 
								
							    $("#pages").append($('<li><a href="#">'+ page + '</a></li>').data("page", page).click( page_click ));
						
							}

						}
						page++;
						i++;
					}
				}
				if ((page*per_page) < count) {
					
				    $("#pages").append($('<li><a href="#">&raquo;</a></li>').data("page", page+1).click( page_click ));
				
				} else {
					
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
	filter_code="";
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
        autoclose: true,
        todayBtn:  1,
        startView: 2,
        todayHighlight: 1
    });

    add_filters();
});

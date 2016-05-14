function fetch_calls(url, success, error) {


	console.log("Trying to fetch data from this url: " + url);
	$.ajax({
		url: url,
		type: "GET",
		dataType: "json",
		contentType: "application/json",
		cache: false,
		timeout: 5000,
		complete: function() {
			//called when complete
			console.log('process complete');
		},

		success: function(data) {
			var browser_url = url.substring(6);
			browser_url = '/scanner' + browser_url;
			if (window.history && history.pushState) {
				window.history.pushState(data, "page 2", browser_url);
			}
			sucess(data);


		},

		error: function() {
			error();
		},
	});
}

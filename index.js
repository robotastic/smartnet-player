
var fs = require('fs');
var path = require('path');
var config = require('./config.json');
var Db = require('mongodb').Db,
	Connection = require('mongodb').Connection,
	Server = require('mongodb').Server;

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;
var scanner = new Db('scanner', new Server(host, port, {}));
var db;

scanner.open(function(err, scannerDb) {
	db = scannerDb;
	scannerDb.collection('transmissions', function(err, transCollection) {
		scannerDb.authenticate(config.dbUser, config.dbPass, function() { });
	});
});



var app = express()
function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}
app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))
app.use(stylus.middleware(
  { src: __dirname + '/public'
  , compile: compile
  }
))
app.use(express.static(__dirname + '/public'))

app.get('/', function (req, res) {
  

rawCollection.find(function(err, cursor) {
cursor.each(function(err, item) {
	if (item) {
	}
});
});
});	

app.listen(3000);	

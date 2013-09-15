var express = require('express');
var watch = require('watch');
var app = express(),
  http = require('http'),
  server = http.createServer(app),
  io = require('socket.io').listen(server);

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
  scannerDb.authenticate(config.dbUser, config.dbPass, function() {});
});



function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}
app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))

app.use(express.static(__dirname + '/public'))

app.get('/', function(req, res) {



  res.render('player', {
    calls: []
  });



});


watch.createMonitor('/home/luke/smartnet-sync/rx', function(monitor) {
  monitor.files['*.mp3'];
  monitor.on("created", function(f, stat) {
    if (path.extname(f) == '.mp3') {
      name = path.basename(f, '.mp3');
      var regex = /([0-9]*)-([0-9]*)/
      var result = name.match(regex);
      tg = parseInt(result[1]);
      time = new Date(parseInt(result[2]) * 1000);
      transItem = {
        talkgroup: tg,
        time: time,
        name: path.basename(f);
      };
      transCollection.insert(transItem);
      console.log("Added: " + f);
      fs.rename(f, '/srv/www/robotastic.com/public/media/' + path.basename(f), function(err) {
        if (err)
          throw err;
        console.log('Moved: ' + f);
        socket.emit('call', {
            filename: path.basename(f), talkgroup: tg
        });
      });

    }
  });
});

io.sockets.on('connection', function(socket) {

  calls = [];
  db.collection('transmissions', function(err, transCollection) {
    transCollection.find(function(err, cursor) {
      cursor.each(function(err, item) {
        if (item) {
          call = {
            talkgroup: item.talkgroup,
            filename: item.name
          };
          calls.push(call);
        } else {



          socket.emit('calls', {
            calls: calls
          });

        }
      });
    });
  });
});
server.listen(3004);
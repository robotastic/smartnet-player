var mkdirp = require('mkdirp');
var probe = require('node-ffprobe');
var app = express(),
  http = require('http'),
  server = http.createServer(app);

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
var channels = {};

scanner.open(function(err, scannerDb) {
  db = scannerDb;
  scannerDb.authenticate(config.dbUser, config.dbPass, function() {});
});

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}

fs.readdir('/home/luke/smartnet-upload', function(err, f) {
  if (err) throw err;
  if ((path.extname(f) == '.mp3')) {
    var name = path.basename(f, '.mp3');
    var regex = /([0-9]*)-([0-9]*)/
    var result = name.match(regex);
    var tg = parseInt(result[1]);
    var time = new Date(parseInt(result[2]) * 1000);
    var base_path = '/srv/www/robotastic.com/public/media';
    var local_path = "/" + time.getFullYear() + "/" + time.getMonth() + "/" + time.getDate() + "/";
    mkdirp(base_path + local_path, function(err) {
      if (err) console.error(err);
    });
    var target_file = base_path + local_path + path.basename(f);
    fs.rename(f, target_file, function(err) {
      if (err)
        throw err;
      console.log('Moved: ' + f);
      probe(target_file, function(err, probeData) {
      

      transItem = {
        talkgroup: tg,
        time: time,
        name: path.basename(f),
        path: local_path,
        len: probeData.format.duration,
        rate: audioProperties.sampleRate
      };
      db.collection('transmissions', function(err, transCollection) {
        transCollection.insert(transItem);
        console.log("Added: " + f);
      });

    });

      });

  }
});
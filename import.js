var mkdirp = require('mkdirp');
var probe = require('node-ffprobe');
var wav = require('wav');



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

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}

function add_file(files, i) {
    if ( i< files.length) {
    var f = path.join(source_path, files[i]);
    console.log("Trying: " +f);

    //    if ((path.extname(f) == '.mp3')) {
    //      var name = path.basename(f, '.mp3');
    if ((path.extname(f) == '.wav')) {
      var name = path.basename(f, '.wav');
      var regex = /([0-9]*)-([0-9]*)/
      var result = name.match(regex);
      var tg = parseInt(result[1]);
      var time = new Date(parseInt(result[2]) * 1000);
      var base_path = '/srv/www/robotastic.com/public/media';
      var local_path = "/" + time.getFullYear() + "/" + time.getMonth() + "/" + time.getDate() + "/";
      var target_path = base_path + local_path;
      console.log("Target Path: " + target_path);

      mkdirp.sync(base_path + local_path, function(err) {
        if (err) console.log(err);
      });
      var target_file = base_path + local_path + path.basename(f);
      console.log("Target File: " + target_file + " Source: " + f);
      fs.renameSync(f, target_file);
      console.log('Moved: ' + f);
      var input = fs.createReadStream(target_file);
      input.pipe(reader);
      reader.on('readable', function() {

        transItem = {
          talkgroup: tg,
          time: time,
          name: path.basename(f),
          path: local_path
        };
        transItem.len = reader.chunkSize / reader.byteRate;
        
        db.collection('transmissions', function(err, transCollection) {
          transCollection.insert(transItem);
          console.log("Added: " + f);
          input.unpipe(reader);
          add_file(files,i);
        });

      });
    }
  }
}


var reader = new wav.Reader();
var source_path = '/home/luke/smartnet-upload';

scanner.open(function(err, scannerDb) {
  db = scannerDb;
  scannerDb.authenticate(config.dbUser, config.dbPass, function() {});


  var files = fs.readdirSync(source_path);
  console.log("Found " + files.length + " Files");
  add_file(files,0);
});
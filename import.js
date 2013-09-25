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

scanner.open(function(err, scannerDb) {
  db = scannerDb;
  scannerDb.authenticate(config.dbUser, config.dbPass, function() {});
});

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}

var reader = new wav.Reader();
var source_path = '/home/luke/smartnet-upload';
fs.readdir(source_path, function(err, files) {
  if (err) throw err;
  files.map(function(file) {
    return path.join(source_path, file);
  }).filter(function(file) {
    return fs.statSync(file).isFile();
  }).forEach(function(f) {
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
      fs.renameSync(f, target_file, function(err) {
        if (err)
          throw err;
        console.log('Moved: ' + f);
        var input = fs.createReadStream(target_file);
        input.pipe(reader);
        reader.once('readable', function () {
        //probe(target_file, function(err, probeData) {

  console.log('WaveHeader Size:\t%d',  12);
  console.log('ChunkHeader Size:\t%d', 8);
  console.log('FormatChunk Size:\t%d', reader.subchunk1Size);
  console.log('RIFF ID:\t%s',          reader.riffId);
  console.log('Total Size:\t%d',       reader.chunkSize);
  console.log('Wave ID:\t%s',          reader.waveId);
  console.log('Chunk ID:\t%s',         reader.chunkId);
  console.log('Chunk Size:\t%d',       reader.subchunk1Size);
  console.log('Compression format is of type: %d', reader.audioFormat);
  console.log('Channels:\t%d',         reader.channels);
  console.log('Sample Rate:\t%d',      reader.sampleRate);
  console.log('Bytes / Sec:\t%d',      reader.byteRate);
  console.log('wBlockAlign:\t%d',      reader.blockAlign);
  console.log('Bits Per Sample Point:\t%d', reader.bitDepth);
  // TODO: this should end up being "44" or whatever the total length of the WAV
  //       header is. maybe emit "format" at this point rather than earlier???
  console.log('wavDataPtr: %d',       0);
  console.log('wavDataSize: %d',      reader.subchunk2Size);
  console.log('Lenght: %d', reader.chunkSize / reader.byteRate);
          transItem = {
            talkgroup: tg,
            time: time,
            name: path.basename(f),
            path: local_path
          };
          transItem.len = reader.chunkSize / reader.byteRate;
          /*
          if (err) {
            console.log("Error with FFProbe: " + err);
            transItem.len = -1;
          } else {
            transItem.len = probeData.format.duration;
          }*/
          db.collection('transmissions', function(err, transCollection) {
            transCollection.insert(transItem);
            console.log("Added: " + f);
          });

        });

      });

    }

  });

});
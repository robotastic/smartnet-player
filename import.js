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
    if (i < files.length) {
        var f = path.join(source_path, files[i]);
        console.log("Trying: " + f);

        if ((path.extname(f) == '.m4a')) {
            var name = path.basename(f, '.m4a');
            /*if ((path.extname(f) == '.wav') && (monitor.files[f] === undefined)) {
              var name = path.basename(f, '.wav');*/
            var regex = /([0-9]*)-([0-9]*)_([0-9.]*)/
            var result = name.match(regex);
            //console.log(name);
            //console.log(util.inspect(result));
            if (result != null) {
                var tg = parseInt(result[1]);
                var time = new Date(parseInt(result[2]) * 1000);
                var freq = parseFloat(result[3]);
                //var base_path = '/srv/www/openmhz.com/media';
                var base_path = '/srv/www/openmhz.com/public/media';
                var local_path = "/" + time.getFullYear() + "/" + time.getMonth() + "/" + time.getDate() + "/";
                mkdirp.sync(base_path + local_path, function (err) {
                    if (err) console.error(err);
                });
                var target_file = base_path + local_path + path.basename(f);
                var json_file = path.dirname(f) + "/" + name + ".json";
                fs.readFile(json_file, 'utf8', function (err, data) {
                    if (err) {
                        console.log('JSON Error: ' + err);
                        console.log("Base: " + base_path + " Local: " + local_path + " Basename: " + path.basename(f));
                        console.log("F Path: " + path.dirname(f));
                        var srcList = [];
                    } else {
                        try {
                            data = JSON.parse(data);
                        } catch (e) {
                            console.log(e);
                        }
                        var srcList = data.srcList;
                        fs.unlink(json_file, function (err) {
                            if (err)
                                console.log('JSON Delete Error: ' + err + " JSON: " + json_file);
                        });
                    }


                    fs.rename(f, target_file, function (err) {
                        if (err) {
                            console.log("Rename Error: " + err);
                            console.log("Base: " + base_path + " Local: " + local_path + " Basename: " + path.basename(f));
                            console.log("F Path: " + path.dirname(f));
                            //throw err;

                        } else {
                            setTimeout(function () {
                                probe(target_file, function (err, probeData) {

                                    transItem = {
                                        talkgroup: tg,
                                        time: time,
                                        name: path.basename(f),
                                        freq: freq,
                                        stars: 0,
                                        path: local_path,
                                        srcList: srcList
                                    };
                                    //transItem.len = reader.chunkSize / reader.byteRate;

                                    if (err) {
                                        console.log("Error with FFProbe: " + err);
                                        transItem.len = -1;
                                    } else {
                                        transItem.len = probeData.format.duration;
                                    }
                                    db.collection('transmissions', function (err, transCollection) {
                                        transCollection.insert(transItem, function (err, objects) {
                                            if (err) console.warn(err.message);
                                            var objectId = transItem._id;

                                            //console.log("Added: " + f);
                                            var call = {
                                                objectId: objectId,
                                                talkgroup: transItem.talkgroup,
                                                filename: transItem.path + transItem.name,
                                                stars: transItem.stars,
                                                freq: transItem.freq,
                                                time: transItem.time,
                                                srcList: transItem.srcList,
                                                len: Math.round(transItem.len)
                                            };

                                            // we only want to notify clients if the clip is longer than 1 second.
                                            if (transItem.len >= 1) {
                                                notify_clients(call);
                                            }
                                        });
                                    });
                                });
                            }, 5000);
                        }
                    });
                });
            }
        }

        
        add_file(files, i + 1);
    }

}




var source_path = '/home/luke/smartnet-upload';

scanner.open(function (err, scannerDb) {
    db = scannerDb;
    scannerDb.authenticate(config.dbUser, config.dbPass, function () {});


    var files = fs.readdirSync(source_path);
    console.log("Found " + files.length + " Files");
    add_file(files, 0);
});

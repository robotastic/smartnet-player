var express = require('express');
var watch = require('watch');
var probe = require('node-ffprobe');
var util = require("util");
var wav = require('wav');


var mkdirp = require('mkdirp');
var app = express(),
  http = require('http'),
  server = http.createServer(app),
  io = require('socket.io').listen(server);
var csv = require('csv');
var fs = require('fs');
var path = require('path');
var config = require('./config.json');
var mongo = require('mongodb');
var BSON = mongo.BSONPure;
var Db = mongo.Db,
  Connection = require('mongodb').Connection,
  Server = require('mongodb').Server;

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;
var scanner = new Db('scanner', new Server(host, port, {}));
var db;
var channels = {};
var clients = [];



scanner.open(function(err, scannerDb) {
  db = scannerDb;
  scannerDb.authenticate(config.dbUser, config.dbPass, function() {});
});
csv()
  .from.path('ChanList.csv', {
    columns: true
  })
  .to.array(function(data, count) {
    console.log("Loaded " + count + " talkgroups.");
  })
  .transform(function(row) {

    channels[row.Num] = {
      alpha: row.Alpha,
      desc: row.Description,
      tag: row.Tag,
      group: row.Group
    };
    return row;
  });

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}
var talkgroup_filters = {};
talkgroup_filters['group-fire'] = [1616, 1632, 1648, 1680, 1696, 1712, 1744, 1760, 1776, 1808, 1824, 1840, 1872, 1888, 1904, 1920, 1936, 1952, 1968, 2000, 2016, 2048, 2064, 2080, 2096, 2112, 2128, 2144, 2160, 2176, 2192, 2224, 2240, 2272, 2288, 2304, 2320, 2336, 2352, 2368, 2384, 2400, 2416, 2432, 2448, 2464, 2480, 2496, 2512, 2592, 2608, 2640, 2720, 2736, 2752, 2848, 2864, 2880, 9808, 9824, 9840, 9872, 9984, 10032, 40000, 40032];

talkgroup_filters['group-common'] = [2656, 2672, 9936, 9968, 16624, 19248, 33616, 33648, 35536, 35568, 37456, 37488, 37648, 37680, 59952, 59968];
talkgroup_filters['group-services'] = [33840, 33872, 33904, 34128, 34192, 34288, 34320, 34352, 34384, 34416, 34448, 34480, 34512, 34576, 34608, 34672, 34800, 34832, 34864, 35024, 35056, 35088, 35152, 35184, 35216, 35248, 35408, 35440, 35600, 35664, 36880, 37040, 37200, 37232, 37328, 37456, 37488, 40080];
talkgroup_filters['tag-ops'] = [33872, 33904];
talkgroup_filters['tag-ems-tac'] = [1904, 1920];
talkgroup_filters['tag-ems-talk'] = [1936];
talkgroup_filters['tag-fire-dispatch'] = [1616, 40000, 40032];
talkgroup_filters['tag-fire-tac'] = [1632, 1648, 1680, 1696, 1712, 1744, 1760, 1776, 1808, 1824, 1840, 1872, 1888, 1968, 2016, 2048, 2064, 2080, 2096, 2112, 2128, 2144, 2160, 2176, 2192, 2224, 2240, 2640, 2720, 2736, 2848, 2864, 2880, 9808, 9824, 9840, 9872];
talkgroup_filters['tag-hospital'] = [2272, 2288, 2304, 2320, 2336, 2352, 2368, 2384, 2400, 2416, 2432, 2448, 2464, 2480, 2496, 2512, 36880];
talkgroup_filters['tag-interop'] = [1952, 2592, 2656, 2672, 9936, 9968, 9984, 10032, 19248, 33616, 33648, 35536, 35568, 37456, 37488, 37648, 37680, 59952, 59968, 59984, 60000];
talkgroup_filters['tag-law-tac'] = [35440, 37232];
talkgroup_filters['tag-public-works'] = [33584, 33840, 34288, 34320, 34384, 34416, 34448, 34480, 34512, 34576, 34608, 34672, 34800, 35024, 35056, 35088, 35184, 35216, 35248, 35600, 37040, 37200, 37328, 40080];
talkgroup_filters['tag-security'] = [34128, 34192, 34352, 34832, 34864, 35152];
talkgroup_filters['tag-transportation'] = [35664];

function build_filter(code, start_time) {
  var filter = {};
  if (code.substring(0, 3) == 'tg-') {
    tg_num = parseInt(code.substring(3));
    filter = {
      talkgroup: tg_num
    };
    console.log(util.inspect(filter));
  } else {
    switch (code) {
      case 'group-fire':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'group-common':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'group-services':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-ops':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-ems-tac':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-ems-talk':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-fire-dispatch':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-fire-tac':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-fire-talk':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-hospital':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-interop':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-law-dispatch':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-law-tac':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-public-works':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-security':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
      case 'tag-transportation':
        filter = {
          talkgroup: {
            $in: talkgroup_filters[code]
          }
        };
        break;
    }
  }
  if (start_time) {
    var start = new Date(start_time);

    filter.time = {
      $gte: start
    };

  }
  filter.len = {
      $gte: 1.0
  };
  return filter;

}


app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))

app.use(express.static(__dirname + '/public'))
app.use(express.bodyParser());

app.get('/', function(req, res) {
  var filter_code = "";
  var filter_date = "";
  res.render('player', {
    filter_date: filter_date,
    filter_code: filter_code
  });
});

app.post('/', function(req, res) {
  var filter_code = req.body.filter_code;
  if (!filter_code) filter_code = "";
  var filter_date = req.body.filter_date;
  if (!filter_date) filter_date = "";
  console.log("Code: " + filter_code + " Date: "+filter_date);
  console.log(util.inspect(req.body));
  res.render('player', {
    filter_date: filter_date,
    filter_code: filter_code
  });
});

app.get('/about', function(req, res) {
  res.render('about', {});
});

app.get('/channels', function(req, res) {

  res.contentType('json');
  res.send(JSON.stringify({
    channels: channels
  }));


});

app.get('/call/:id', function(req, res) {
  var objectId = req.params.id;
  var o_id = new BSON.ObjectID(objectId);
  db.collection('transmissions', function(err, transCollection) {
    transCollection.findOne({
        '_id': o_id
      },
      function(err, item) {
        //console.log(util.inspect(item));
        if (item) {
          var time = new Date(item.time);
          var timeString = time.toLocaleString();

          res.render('call', {
            item: item,
            channel: channels[item.talkgroup],
            time: timeString
          });

        } else {
          res.send(404, 'Sorry, we cannot find that!');
        }
      });
  });
});

app.post('/calls', function(req, res) {
 
  var per_page = req.body.per_page;
  var offset = req.body.offset;
  var filter_code = req.body.filter_code;
  var start_time = req.body.filter_date;
  var filter = build_filter(filter_code, start_time);
  var sort_order = {};

  if (start_time == null) {
    sort_order['time'] = -1;
  } else {
    sort_order['time'] = 1;
  }
  //console.log("Sort Order: " + util.inspect(sort_order) + " start time: " + start_time + " Filter: " + util.inspect(filter));

  calls = [];
  db.collection('transmissions', function(err, transCollection) {
    transCollection.find(filter).count(function(e, count) {
      transCollection.find(filter, function(err, cursor) {
        cursor.skip(offset * per_page).sort(sort_order).limit(per_page).each(function(err, item) {
          if (item) {
            call = {
              objectId: item._id,
              talkgroup: item.talkgroup,
              filename: item.path + item.name,
              time: item.time,
              len: Math.round(item.len) + 's'
            };
            calls.push(call);
          } else {
            res.contentType('json');
            res.send(JSON.stringify({
              calls: calls,
              count: count,
              offset: offset
            }));
          }
        });
      });
    });
  });

});
app.get('/stats', function(req, res) {
  res.render('stats', {});
});
app.get('/volume', function(req, res) {

  var stats = {};
  var chan_count = 0;
  var db_count = 0;

  db.collection('call_volume', function(err, collection) {
    for (var chan_num in channels) {
      var historic = new Array();
      chan_count++;

      for (hour = 0; hour < 25; hour++) {

        historic[hour] = 0;
      }
      stats[chan_num] = {
        name: channels[chan_num].alpha,
        desc: channels[chan_num].desc,
        num: chan_num,
        historic: historic
      };
      var query = {
        "_id.talkgroup": parseInt(chan_num)
      };
      collection.find(query).toArray(function(err, results) {
        db_count++;
        if (err) console.log(err);
        if (results && (results.length > 0)) {
          for (var i = 0; i < results.length; i++) {
            stats[results[0]._id.talkgroup].historic[results[i]._id.hour] = results[i].value.count;
          }
        }
        if (chan_count == db_count) {
          res.contentType('json');
          res.send(JSON.stringify(stats));
        }
      });

    }
  });
});

function notify_clients(call) {

  for (var i = 0; i < clients.length; i++) {
    if (clients[i].code == "") {
      console.log("Call TG # is set to All");
      clients[i].socket.emit('calls', call);
    } else {
      if (typeof talkgroup_filters[clients[i].code] !== "undefined") {
        console.log("Talkgroup filter found: " + clients[i].code);
        if (talkgroup_filters[clients[i].code].indexOf(call.talkgroup) > -1) {
          console.log("Call TG # Found in filer");
          clients[i].socket.emit('calls', call);
        }
      }
    }
  }
}
watch.createMonitor('/home/luke/smartnet-upload', function(monitor) {
  //monitor.files['*.mp3'];
  monitor.files['*.wav'];


  monitor.on("created", function(f, stat) {
    /*if ((path.extname(f) == '.mp3') && (monitor.files[f] === undefined)) {
      var name = path.basename(f, '.mp3');*/
    if ((path.extname(f) == '.wav') && (monitor.files[f] === undefined)) {
      var name = path.basename(f, '.wav');
      var regex = /([0-9]*)-([0-9]*)/
      var result = name.match(regex);
      var tg = parseInt(result[1]);
      var time = new Date(parseInt(result[2]) * 1000);
      var base_path = '/srv/www/robotastic.com/public/media';
      var local_path = "/" + time.getFullYear() + "/" + time.getMonth() + "/" + time.getDate() + "/";
      mkdirp.sync(base_path + local_path, function(err) {
        if (err) console.error(err);
      });
      var target_file = base_path + local_path + path.basename(f);
      fs.rename(f, target_file, function(err) {
        if (err)
          throw err;
        console.log('Moved: ' + f);
        var reader = new wav.Reader();
        var input = fs.createReadStream(target_file);
        input.pipe(reader);
        reader.once('format', function() {
          //probe(target_file, function(err, probeData) {

          transItem = {
            talkgroup: tg,
            time: time,
            name: path.basename(f),
            path: local_path,
          };
          transItem.len = reader.chunkSize / reader.byteRate;

          /*if (err) {
            console.log("Error with FFProbe: " + err);
            transItem.len = -1;
          } else {
            transItem.len = probeData.format.duration;
          }*/
          db.collection('transmissions', function(err, transCollection) {
            transCollection.insert(transItem, function(err, objects) {
              if (err) console.warn(err.message);
              var objectId = transItem._id;

              console.log("Added: " + f);
              var call = {
                objectId: objectId,
                talkgroup: transItem.talkgroup,
                filename: transItem.path + transItem.name,
                time: transItem.time,
                len: Math.round(transItem.len) + 's'
              };
              notify_clients(call);
            });
          });


          /*
          io.sockets.emit('calls', {
            talkgroup: transItem.talkgroup,
            filename: transItem.path + transItem.name,
            time: transItem.time,
            len: Math.round(transItem.len)+'s'
          });*/
        });
        reader.on('data', function(chunk) {
          //console.log('got %d bytes of data', chunk.length);
        });
        reader.on('end', function() {
          console.log('Finished Reading File');
          input.unpipe(reader);

        });
      });

    }
  });
});


io.sockets.on('connection', function(socket) {
  var client = {
    id: socket.id,
    socket: socket,
    code: null
  };
  console.log("Client Joined: " + socket.id);
  clients.push(client);

  socket.on('disconnect', function() {
    clients.splice(clients.indexOf(client), 1);
    console.log(socket.id + ' disconnected');
    //remove user from db
  });
  socket.on('code', function(data) {
    console.log("Filter-Code: " + data + " Socket ID: " + socket.id);
    var index = clients.indexOf(client);
    clients[index].code = data.code;
    console.log("Clients: " + util.inspect(clients));
  });
  socket.emit('ready', {});
});
server.listen(3004);
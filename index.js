var express = require('express');
var watch = require('watch');
var probe = require('node-ffprobe');
var util = require("util");
var wav = require('wav');
var schedule = require('node-schedule');

var mkdirp = require('mkdirp');
var app = express(),
  http = require('http'),
  server = http.createServer(app),
  io = require('socket.io').listen(server);
var csv = require('csv');
var sys = require('sys');
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
var stats = {};

io.set('log level', 1);

scanner.open(function(err, scannerDb) {
  db = scannerDb;
  scannerDb.authenticate(config.dbUser, config.dbPass, function() {});
  //do the initial build of the stats
  db.collection('call_volume', function(err, collection) {
    build_stat(collection);
  });
});

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
    var tg_array = new Array();
    tg_array.push(parseInt(row.Num));
    talkgroup_filters['tg-' + row.Num] = tg_array;
    return row;
  });

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}

function build_stat(collection) {
  var chan_count = 0;
  stats = {};
  var db_count = 0;
  for (var chan_num in channels) {
    var historic = new Array();
    chan_count++;

    for (hour = 0; hour < 24; hour++) {

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
        for (var chan_num in stats) {
          var chan = stats[chan_num];
          var erase_me = true;
          for (var i = 0; i < chan.historic.length; i++) {
            if (chan.historic[i] != 0) {
              erase_me = false;
              break;
            }
          }
          if (erase_me) {
            delete stats[chan_num];
          }
        }

      }
    });

  }
}

function build_call_volume() {

  map = function() {
    var now = new Date();
    var difference = now.getTime() - this.time.getTime();
    var hour = Math.floor(difference / 1000 / 60 / 60);
    emit({
      hour: hour,
      talkgroup: this.talkgroup
    }, {
      count: 1
    });
  }

  reduce = function(key, values) {
    var count = 0;

    values.forEach(function(v) {
      count += v['count'];
    });

    return {
      count: count
    };
  }
  db.collection('transmissions', function(err, transCollection) {
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    transCollection.mapReduce(map, reduce, {
      query: {
        time: {
          $gte: yesterday
        }
      },
      out: {
        replace: "call_volume"
      }
    }, function(err, collection) {
      if (err) console.error(err);
      if (collection) {
        build_stat(collection);
      }
    });
  });
}


schedule.scheduleJob({
  minute: 0
}, function() {
  build_call_volume();
});



app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))

app.use(express.static(__dirname + '/public'))
app.use(express.bodyParser());



app.get('/about', function(req, res) {
  res.render('about', {});
});

/*
app.get('/media*', function(req, res) {
  //sys.puts(util.inspect(req.headers, showHidden=false, depth=0));

  var file = '/srv/www/openmhz.com' + req.url;
  var stat = fs.statSync(file);

  //console.log ("File: " + file);
  if (!stat.isFile()) return;

  var start = 0;
  var end = 0;
  var range = req.header('Range');
  if (range != null) {
    start = parseInt(range.slice(range.indexOf('bytes=') + 6,
      range.indexOf('-')));
    end = parseInt(range.slice(range.indexOf('-') + 1,
      range.length));
  }
  if (isNaN(end) || end == 0) end = stat.size - 1;

  if (start > end) return;

  sys.puts('Browser requested bytes from ' + start + ' to ' +
    end + ' of file ' + file);

  var date = new Date();

  res.writeHead(206, { // NOTE: a partial http response
    // 'Date':date.toUTCString(),
    'Connection': 'close',
    // 'Cache-Control':'private',
    // 'Content-Type':'video/webm',
    // 'Content-Length':end - start,
    'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
    // 'Accept-Ranges':'bytes',
    // 'Server':'CustomStreamer/0.0.1',
    'Transfer-Encoding': 'chunked'
  });

  var stream = fs.createReadStream(file, {
    flags: 'r',
    start: start,
    end: end
  });
  stream.pipe(res);
});
*/
app.get('/channels', function(req, res) {

  res.contentType('json');
  res.send(JSON.stringify({
    channels: channels
  }));


});

app.get('/card/:id', function(req, res) {
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
          var timeString = time.toLocaleTimeString("en-US");
          var dateString = time.toDateString();
          res.render('card', {
            item: item,
            channel: channels[item.talkgroup],
            time: timeString,
            date: dateString
          });

        } else {
          res.send(404, 'Sorry, we cannot find that!');
        }
      });
  });
});


app.get('/star/:id', function(req, res) {
  var objectId = req.params.id;
  var o_id = new BSON.ObjectID(objectId);
  db.collection('transmissions', function(err, transCollection) {
    transCollection.findAndModify({'_id': o_id}, [],
     {$inc: {stars: 1}}, {new: true},
    function(err, object) {

      if (err){
      console.warn(err.message); // returns error if no matching object found
      }else{
            res.contentType('json');
            res.send(JSON.stringify({
              stars: object.stars
            }));  
      }
    
  });
  });
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
          var timeString = time.toLocaleTimeString("en-US");
          var dateString = time.toDateString();
          res.render('call', {
            item: item,
            channel: channels[item.talkgroup],
            time: timeString,
            date: dateString,
            objectId: objectId
          });

        } else {
          res.send(404, 'Sorry, we cannot find that!');
        }
      });
  });
});

function get_calls(query, res) {

  var calls = [];
  db.collection('transmissions', function(err, transCollection) {
    transCollection.find(query.filter).count(function(e, count) {
      transCollection.find(query.filter, function(err, cursor) {
        cursor.sort(query.sort_order).limit(20).each(function(err, item) {
          if (item) {
            call = {
              objectId: item._id,
              talkgroup: item.talkgroup,
              filename: item.path + item.name,
              time: item.time,
              freq: item.freq,
              stars: item.stars,
              len: Math.round(item.len) + 's'
            };
            calls.push(call);
          } else {
            res.contentType('json');
            res.send(JSON.stringify({
              calls: calls,
              count: count,
              direction: query.direction
            }));
          }
        });
      });
    });
  });


}

function build_filter(code, start_time, direction, stars) {
  var filter = {};
  if (code) {
    if (code.substring(0, 3) == 'tg-') {
      tg_num = parseInt(code.substring(3));
      filter = {
        talkgroup: tg_num
      };
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
  }

  if (start_time) {
    var start = new Date(start_time);
    if (direction == 'newer') {
      filter.time = {
        $gte: start
      };
    } else {
      filter.time = {
        $lte: start
      };
    }

  }
  filter.len = {
    $gte: 1.0
  };

  if (stars) {
    filter.stars = { $gt: 0};
  }
  var sort_order = {};
  if (direction == 'newer') {
    sort_order['time'] = 1;
  } else {
    sort_order['time'] = -1;
  }

  var query = {};
  query['filter'] = filter;
  query['direction'] = direction;
  query['sort_order'] = sort_order;

  return query;
}

app.get('/calls/newer/:time/:filter_code?*', function(req, res) {
  var filter_code = req.params.filter_code;
  var start_time = parseInt(req.params.time);
  var query = build_filter(filter_code, start_time, 'newer', false);

  get_calls(query, res);
});

app.get('/calls/older/:time/:filter_code?*', function(req, res) {
  var filter_code = req.params.filter_code;
  var start_time = parseInt(req.params.time);
  var query = build_filter(filter_code, start_time, 'older', false);

  get_calls(query, res);
});

app.get('/calls/:filter_code?*', function(req, res) {
  var filter_code = req.params.filter_code;
  var query = build_filter(filter_code, null, 'older', false);

  get_calls(query, res);
});

app.get('/stars/newer/:time/:filter_code?*', function(req, res) {
  var filter_code = req.params.filter_code;
  var start_time = parseInt(req.params.time);
  var query = build_filter(filter_code, start_time, 'newer', true);

  get_calls(query, res);
});

app.get('/stars/older/:time/:filter_code?*', function(req, res) {
  var filter_code = req.params.filter_code;
  var start_time = parseInt(req.params.time);
  var query = build_filter(filter_code, start_time, 'older', true);

  get_calls(query, res);
});

app.get('/stars/:filter_code?*', function(req, res) {
  var filter_code = req.params.filter_code;
  var query = build_filter(filter_code, null, 'older', true);

  get_calls(query, res);
});



app.get('/scanner/newer/:time/:filter_code?*', function(req, res) {
  var filter_code = req.params.filter_code;
  var filter_date = parseInt(req.params.time);
  if (!filter_code) filter_code = "";

  if (!filter_date) {
    var filter_date = "''";
  } else {
    var filter_date = "new Date(" + filter_date + ")";
  }

  res.render('player', {
    filter_date: filter_date,
    filter_code: filter_code
  });
});


app.get('/scanner/:filter_code?*', function(req, res) {
  var filter_code = req.params.filter_code;
  var filter_date = parseInt(req.params.time);
  if (!filter_code) filter_code = "";


  var filter_date = "''";


  res.render('player', {
    filter_date: filter_date,
    filter_code: filter_code
  });
});

app.get('/beta', function(req, res) {
  var filter_code = "";
  var filter_date = "''";
  res.render('beta', {
    filter_date: filter_date,
    filter_code: filter_code
  });
});

app.get('/', function(req, res) {
  var filter_code = "";
  var filter_date = "''";
  res.render('player', {
    filter_date: filter_date,
    filter_code: filter_code
  });
});

app.post('/', function(req, res) {
  var filter_code = req.body.filter_code;
  if (!filter_code) filter_code = "";
  var filter_date = "new Date('" + req.body.filter_date + "');";
  if (!filter_date) filter_date = "\'\'";

  res.render('player', {
    filter_date: filter_date,
    filter_code: filter_code
  });
});

app.get('/stats', function(req, res) {
  res.render('stats', {});
});
app.get('/volume', function(req, res) {

  res.contentType('json');
  res.send(JSON.stringify(stats));
});

function notify_clients(call) {

  for (var i = 0; i < clients.length; i++) {
    if (clients[i].code == "") {
      //console.log("Call TG # is set to All");
      clients[i].socket.emit('calls', call);
    } else {
      if (typeof talkgroup_filters[clients[i].code] !== "undefined") {
        //console.log("Talkgroup filter found: " + clients[i].code);

        if (talkgroup_filters[clients[i].code].indexOf(call.talkgroup) > -1) {
          //console.log("Call TG # Found in filer");
          clients[i].socket.emit('calls', call);
        }
      }
    }
  }
}
watch.createMonitor('/home/luke/smartnet-upload', function(monitor) {
  monitor.files['*.m4a'];
  //monitor.files['*.wav'];


  monitor.on("created", function(f, stat) {
    /*if ((path.extname(f) == '.m4a') && (monitor.files[f] === undefined)) {
      var name = path.basename(f, '.m4a');
      var regex = /([0-9]*)-([0-9]*)/
      var result = name.match(regex);
      var tg = parseInt(result[1]);
      var time = new Date(parseInt(result[2]) * 1000);

      var base_path = '/srv/www/openmhz.com/public/media';
      var local_path = "/" + time.getFullYear() + "/" + time.getMonth() + "/" + time.getDate() + "/";
      mkdirp.sync(base_path + local_path, function(err) {
        if (err) console.error(err);
      });
      var target_file = base_path + local_path + path.basename(f);
      fs.rename(f, target_file, function(err) {
        if (err)
          throw err;
      });
    }*/
    if ((path.extname(f) == '.m4a') && (monitor.files[f] === undefined)) {
      var name = path.basename(f, '.m4a');
    /*if ((path.extname(f) == '.wav') && (monitor.files[f] === undefined)) {
      var name = path.basename(f, '.wav');*/
      var regex = /([0-9]*)-([0-9]*)_([0-9.]*)/
      var result = name.match(regex);
      var tg = parseInt(result[1]);
      var time = new Date(parseInt(result[2]) * 1000);
      var freq = parseFloat(result[3]);
      //var base_path = '/srv/www/openmhz.com/media';
      var base_path = '/srv/www/openmhz.com/public/media';
      var local_path = "/" + time.getFullYear() + "/" + time.getMonth() + "/" + time.getDate() + "/";
      mkdirp.sync(base_path + local_path, function(err) {
        if (err) console.error(err);
      });
      var target_file = base_path + local_path + path.basename(f);


      fs.rename(f, target_file, function(err) {
        if (err)
          throw err;

        probe(target_file, function(err, probeData) {

          transItem = {
            talkgroup: tg,
            time: time,
            name: path.basename(f),
            freq: freq,
            stars: 0,
            path: local_path
          };
          //transItem.len = reader.chunkSize / reader.byteRate;

          if (err) {
            //console.log("Error with FFProbe: " + err);
            transItem.len = -1;
          } else {
            transItem.len = probeData.format.duration;
          }
          db.collection('transmissions', function(err, transCollection) {
            transCollection.insert(transItem, function(err, objects) {
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
                len: Math.round(transItem.len) + 's'
              };

              // we only want to notify clients if the clip is longer than 1 second.
              if (transItem.len >= 1) {
                notify_clients(call);
              }
            });
          });

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
  //console.log("Client Joined: " + socket.id);
  clients.push(client);

  socket.on('disconnect', function() {
    clients.splice(clients.indexOf(client), 1);
    //console.log(socket.id + ' disconnected');
    //remove user from db
  });
  socket.on('code', function(data) {
    //console.log("Filter-Code: " + data + " Socket ID: " + socket.id);
    var index = clients.indexOf(client);
    clients[index].code = data.code;
  });
  socket.emit('ready', {});
});
server.listen(3004);
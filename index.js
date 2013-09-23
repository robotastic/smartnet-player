var express = require('express');
var watch = require('watch');
var probe = require('node-ffprobe');



var mkdirp = require('mkdirp');
var app = express(),
  http = require('http'),
  server = http.createServer(app),
  io = require('socket.io').listen(server);
var csv = require('csv');
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

function build_filter(code, start_time) {
  var filter = {};
  switch (code) {
    case 'group-fire':
      filter = {
        talkgroup: {
          $in: [1616, 1632, 1648, 1680, 1696, 1712, 1744, 1760, 1776, 1808, 1824, 1840, 1872, 1888, 1904, 1920, 1936, 1952, 1968, 2000, 2016, 2048, 2064, 2080, 2096, 2112, 2128, 2144, 2160, 2176, 2192, 2224, 2240, 2272, 2288, 2304, 2320, 2336, 2352, 2368, 2384, 2400, 2416, 2432, 2448, 2464, 2480, 2496, 2512, 2592, 2608, 2640, 2720, 2736, 2752, 2848, 2864, 2880, 9808, 9824, 9840, 9872, 9984, 10032, 40000, 40032]
        }
      };
      break;
    case 'group-common':
      filter = {
        talkgroup: {
          $in: [2656, 2672, 9936, 9968, 16624, 19248, 33616, 33648, 35536, 35568, 37456, 37488, 37648, 37680, 59952, 59968]
        }
      };
      break;
    case 'group-services':
      filter = {
        talkgroup: {
          $in: [33840, 33872, 33904, 34128, 34192, 34288, 34320, 34352, 34384, 34416, 34448, 34480, 34512, 34576, 34608, 34672, 34800, 34832, 34864, 35024, 35056, 35088, 35152, 35184, 35216, 35248, 35408, 35440, 35600, 35664, 36880, 37040, 37200, 37232, 37328, 37456, 37488, 40080]
        }
      };
      break;
    case 'tag-ops':
      filter = {
        talkgroup: {
          $in: [33872, 33904]
        }
      };
      break;
    case 'tag-ems-tac':
      filter = {
        talkgroup: {
          $in: [1904, 1920]
        }
      };
      break;
    case 'tag-ems-talk':
      filter = {
        talkgroup: {
          $in: [1936]
        }
      };
      break;
    case 'tag-fire-dispatch':
      filter = {
        talkgroup: {
          $in: [1616, 40000, 40032]
        }
      };
      break;
    case 'tag-fire-tac':
      filter = {
        talkgroup: {
          $in: [1632, 1648, 1680, 1696, 1712, 1744, 1760, 1776, 1808, 1824, 1840, 1872, 1888, 1968, 2016, 2048, 2064, 2080, 2096, 2112, 2128, 2144, 2160, 2176, 2192, 2224, 2240, 2640, 2720, 2736, 2848, 2864, 2880, 9808, 9824, 9840, 9872]
        }
      };
      break;
    case 'tag-fire-talk':
      filter = {
        talkgroup: {
          $in: [2000, 2608, 2752]
        }
      };
      break;
    case 'tag-hospital':
      filter = {
        talkgroup: {
          $in: [2272, 2288, 2304, 2320, 2336, 2352, 2368, 2384, 2400, 2416, 2432, 2448, 2464, 2480, 2496, 2512, 36880]
        }
      };
      break;
    case 'tag-interop':
      filter = {
        talkgroup: {
          $in: [1952, 2592, 2656, 2672, 9936, 9968, 9984, 10032, 19248, 33616, 33648, 35536, 35568, 37456, 37488, 37648, 37680, 59952, 59968, 59984, 60000]
        }
      };
      break;
    case 'tag-law-dispatch':
      filter = {
        talkgroup: {
          $in: [16624, 35408]
        }
      };
      break;
    case 'tag-law-tac':
      filter = {
        talkgroup: {
          $in: [35440, 37232]
        }
      };
      break;
    case 'tag-public-works':
      filter = {
        talkgroup: {
          $in: [33584, 33840, 34288, 34320, 34384, 34416, 34448, 34480, 34512, 34576, 34608, 34672, 34800, 35024, 35056, 35088, 35184, 35216, 35248, 35600, 37040, 37200, 37328, 40080]
        }
      };
      break;
    case 'tag-security':
      filter = {
        talkgroup: {
          $in: [34128, 34192, 34352, 34832, 34864, 35152]
        }
      };
      break;
    case 'tag-transportation':
      filter = {
        talkgroup: {
          $in: [35664]
        }
      };
      break;



  }
  if (start_time) {
    var start = new Date(start_time);
    filter.time = {$gte:start};
  }
  return filter;

}


app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(express.logger('dev'))

app.use(express.static(__dirname + '/public'))
app.use(express.bodyParser());

app.get('/', function(req, res) {
  res.render('player', {
    calls: []
  });
});

app.get('/channels', function(req, res) {

  res.contentType('json');
  res.send(JSON.stringify({
    channels: channels
  }));


});

app.post('/calls', function(req, res) {
  console.log(req.body.offset);
  var per_page = req.body.per_page;
  var offset = req.body.offset;
  var filter_code = req.body.filter_code;
  var start_time = req.body.filter_date;
  var filter = build_filter(filter_code, start_time);
  var sort_order = {};

  if (start_time==null) {
    sort_order['time'] = -1;
  } else {
    sort_order['time'] = 1;
  }


  calls = [];
  db.collection('transmissions', function(err, transCollection) {
    transCollection.find(filter).count(function(e, count) {
      transCollection.find(filter, function(err, cursor) {
        cursor.skip(offset*per_page).sort(sort_order).limit(per_page).each(function(err, item) {
          if (item) {
            call = {
              talkgroup: item.talkgroup,
              filename: item.path + item.name,
              time: item.time,
              len: item.len
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

watch.createMonitor('/home/luke/smartnet-upload', function(monitor) {
  monitor.files['*.mp3'];
  monitor.on("created", function(f, stat) {
    if ((path.extname(f) == '.mp3') && (monitor.files[f] === undefined)) {
      var name = path.basename(f, '.mp3');
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
        probe(target_file, function(err, probeData) {

          transItem = {
            talkgroup: tg,
            time: time,
            name: path.basename(f),
            path: local_path,
          };
          if (err) {
            console.log("Error with FFProbe: " + err);
            transItem.len = -1;
          } else {
            transItem.len = probeData.format.duration;
          }
          db.collection('transmissions', function(err, transCollection) {
            transCollection.insert(transItem);
            console.log("Added: " + f);

          });

          io.sockets.emit('calls', {
            talkgroup: transItem.talkgroup,
            filename: transItem.path + transItem.name,
            time: transItem.time,
            len: transItem.len
          });
        });

      });

    }
  });
});

io.sockets.on('connection', function(socket) {

  console.log("Client Joined: " + socket.id);

});
server.listen(3004);
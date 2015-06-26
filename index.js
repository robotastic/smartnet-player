var express = require('express');
var watch = require('watch');
var probe = require('node-ffprobe');
var util = require("util");
var wav = require('wav');
var schedule = require('node-schedule');

var mkdirp = require('mkdirp');
var app = express(),
  http = require('http'),
  server = http.createServer(app);
  var WebSocketServer = require('websocket').server;
//  io = require('socket.io').listen(server);
//var WebSocketServer = require('ws').Server;

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
var passport = require('passport'),
  TwitterStrategy = require('passport-twitter').Strategy;
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');



var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;
var scanner = new Db('scanner', new Server(host, port, {}));
var db;
var channels = {};
var clients = [];
var stats = {};
var affiliations = {};
var sources = {};
var source_names = {};

//io.set('log level', 1);

scanner.open(function(err, scannerDb) {
  db = scannerDb;
  scannerDb.authenticate(config.dbUser, config.dbPass, function() {
    //do the initial build of the stats
    db.collection('call_volume', function(err, collection) {
      build_stat(collection);
    });
    db.collection('source_names', function(err, collection){
      collection.find().toArray(function(err, results) {
        for (var src in results) {
          source_names[results[src]._id] = { name: results[src].name, shortName: results[src].shortName};
        }
        
      });
    });
    build_unit_affiliation();
    db.collection('source_list', function(err, collection) {

    collection.find( function(err, cursor) {
      cursor.sort({"value.total":-1}).toArray(function(err, results) {
      sources = results;
    });
    });

    });
  });
});


var numResults = 50;
var talkgroup_filters = {};
/*talkgroup_filters['group-fire'] = [1616, 1632, 1648, 1680, 1696, 1712, 1744, 1760, 1776, 1808, 1824, 1840, 1872, 1888, 1904, 1920, 1936, 1952, 1968, 2000, 2016, 2048, 2064, 2080, 2096, 2112, 2128, 2144, 2160, 2176, 2192, 2224, 2240, 2272, 2288, 2304, 2320, 2336, 2352, 2368, 2384, 2400, 2416, 2432, 2448, 2464, 2480, 2496, 2512, 2592, 2608, 2640, 2720, 2736, 2752, 2848, 2864, 2880, 9808, 9824, 9840, 9872, 9984, 10032, 40000, 40032];

talkgroup_filters['group-common'] = [2656, 2672, 9936, 9968, 16624, 19248, 33616, 33648, 35536, 35568, 37456, 37488, 37648, 37680, 59952, 59968];

talkgroup_filters['group-services'] = [33840, 33872, 33904, 34128, 34192, 34288, 34320, 34352, 34384, 34416, 34448, 34480, 34512, 34576, 34608, 34672, 34800, 34832, 34864, 35024, 35056, 35088, 35152, 35184, 35216, 35248, 35408, 35440, 35600, 35664, 36880, 37040, 37200, 37232, 37328, 37456, 37488, 40080];
talkgroup_filters['tag-ops'] = [33872, 33904];
talkgroup_filters['tag-ems'] = [1904, 1920, 1936, 2720];
talkgroup_filters['tag-fire-dispatch'] = [1616, 40000, 40032];
talkgroup_filters['tag-fire'] = [1632, 1648, 1680, 1696, 1712, 1744, 1760, 1776, 1808, 1824, 1840, 1872, 1888, 1968, 2016, 2048, 2064, 2080, 2096, 2112, 2128, 2144, 2160, 2176, 2192, 2224, 2240, 2640, 2736, 2848, 2864, 2880, 9808, 9824, 9840, 9872];
talkgroup_filters['tag-hospital'] = [2272, 2288, 2304, 2320, 2336, 2352, 2368, 2384, 2400, 2416, 2432, 2448, 2464, 2480, 2496, 2512, 36880];
talkgroup_filters['tag-interop'] = [1952, 2592, 2656, 2672, 9936, 9968, 9984, 10032, 19248, 33616, 33648, 35536, 35568, 37456, 37488, 37648, 37680, 59952, 59968, 59984, 60000];
talkgroup_filters['tag-law-dispatch'] = [ 16624 ];
talkgroup_filters['tag-paratransit'] = [ 35664 ];
talkgroup_filters['tag-parks'] = [ 35248 ];
talkgroup_filters['tag-parking'] = [ 34800,34608 ];
talkgroup_filters['tag-public-works'] = [ 37328,37200,37040 ];
talkgroup_filters['tag-public-health'] = [ 34480,34448,34416,33584 ];
talkgroup_filters['tag-security'] = [37232,35440,35408,35152,34864,34832,34192,34128,33840];
talkgroup_filters['tag-st-e'] = [ 34384,34368,34352,34320,34288 ];
talkgroup_filters['tag-transportation'] = [ 40080,35632,35600,34576,34512 ];
talkgroup_filters['tag-water'] = [ 35088,35056,35024 ];*/


fs.createReadStream('ChanList.csv').pipe(csv.parse({columns: [ 'Num', 'Hex', 'Mode', 'Alpha', 'Description', 'Tag', 'Group' ]})).pipe(csv.transform(function(row) {     
    console.log(row);
        channels[row.Num] = {
      alpha: row.Alpha,
      desc: row.Description,
      tag: row.Tag,
      group: row.Group
    };
    var tg_array = new Array();
    tg_array.push(parseInt(row.Num));
    talkgroup_filters['tg-' + row.Num] = tg_array;

    var tag_key = 'group-' + row.Group.toLowerCase();
    if (!(tag_key in talkgroup_filters)) {
      talkgroup_filters[tag_key] = new Array();
    }
    talkgroup_filters[tag_key].push(parseInt(row.Num));

    return row;
    // handle each row before the "end" or "error" stuff happens above
})).on('readable', function(){
  while(this.read()){}
}).on('end', function() {
    // yay, end
}).on('error', function(error) {
    // oh no, error
});
/*
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
  });*/

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}

function build_affiliation_array(collection) {
  affiliations = {};
  collection.find().toArray(function(err, results) {
      if (err) console.log(err);
      if (results && (results.length > 0)) {
        for (var i = 0; i < results.length; i++) {
          console.log(util.inspect(results[i]));
          affiliations[results[i]._id.tg] = results[i].value.unit_count;
        }
      }
      console.log(util.inspect(affiliations));
  });

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

function build_unit_affiliation() {
    map = function() {
    var now = new Date();
    var difference = now.getTime() - this.date.getTime();
    var minute = Math.floor(difference / 1000 / 60 / 5);
    emit({
      tg: this.tg
    }, {
      count: this.count,
      minute: minute

    });
  }

  reduce = function(key, values) {
  var result = {
    unit_count: []
  };
values.forEach(function(v){
        result.unit_count[v.minute] = v.count;
});
return result;
  }


db.collection('affiliation', function(err, afilCollection) {
    var now = new Date();
    afilCollection.mapReduce(map, reduce, {
      query: {
          date: { // 18 minutes ago (from now)
              $gt: new Date(now.getTime() - 1000 * 60 * 60)
          }
      },
      out: {
        replace: "recent_affiliation"
      }
    }, function(err, collection) {
      if (err) console.error(err);
      if (collection) {
        build_affiliation_array(collection);
      }
    });
  });

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

function build_source_list() {
  map = function() {
    if (this.srcList) {
    for (var idx = 0; idx < this.srcList.length; idx++) {
        var key = this.srcList[idx];
        var value = {};
        value[this.talkgroup] = 1;

        emit(key, value);
    }
    }
}
finalize = function(key, values) {
    var count=0;
    for(var k in values)
    {
        count += values[k];
    }

    values['total'] = count;
    return values;
}

reduce = function(key, values) {
    var talkgroups = {};



    values.forEach(function(v) {
        for(var k in v) { // iterate colors                                                                                                                                       
            if(!talkgroups[k]) // init missing counter                                                                                                                            
            {
                talkgroups[k] = 0;
            }
            talkgroups[k] += v[k];

        }

    });



    return talkgroups;
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
        replace: "source_list"
      },
      finalize: finalize
    }, function(err, collection) {
      if (err) console.error(err);
      if (collection) {
        //build_stat(collection);
      }
    });
  });
}


app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
//app.use(express.logger('dev'))
app.use(logger());

  //app.use(express.cookieParser());
  app.use(cookieParser());
  //app.use(express.bodyParser());
  app.use(bodyParser());
  //app.use(express.methodOverride());
  app.use(require('method-override')())
  app.use(session({ secret: 'keyboard dog', key: 'sid', cookie: { secure: true , maxAge: 3600000}}));
 /* app.use(express.session({ secret: 'keyboard cat',
            cookie : {
              maxAge: 3600000 // see below
            } 
          }));*/
  //app.use(express.cookieSession({ secret: 'keyboard cat' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());

app.use(express.static(__dirname + '/public'));


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Twitter profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  console.log("Serializer user: " + user.id );
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    db.collection('users', function(err, usersCollection) {
    usersCollection.findOne({
        '_id': id
      },
      function(err, item) {
        console.log("Deserialize user: " + item.id);
        if (item) {
          console.log("User deserialized: " + item.id);
          done(null, item);

        } else {
          console.log("User not deserialized");
         done(null, null);

        }
      });
  });

  
});

// Use the TwitterStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a token, tokenSecret, and Twitter profile), and
//   invoke a callback with a user object.
twitterAuthn = new TwitterStrategy({
    consumerKey: config.twitterConsumerKey, 
    consumerSecret: config.twitterConsumerSecret, 
    callbackURL: "http://openmhz.com/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      profile.token = token;
      profile.tokenSecret = tokenSecret;
      //console.log(profile);
      // To keep the example simple, the user's Twitter profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Twitter account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
);

passport.use(twitterAuthn);

app.get('/account', ensureAuthenticated, function(req, res){
  //console.log(req);
  res.render('account', { user: req.user });
});

app.post('/tweet', ensureAuthenticated, function(req, res){
  var user = req.user;
  var tweet = req.body.tweet;
  twitterAuthn._oauth.post("https://api.twitter.com/1.1/statuses/update.json", user.token, user.tokenSecret, {"status": tweet }, "application/json",  
                          function (error, data, twit_res) { 
                              if (error) {          
                                  console.error(error);
                                  res.send(error);                 
                              } else {  
                                  res.send(tweet);            
                                  console.log("Sent: " + tweet); 
                              }                     
                          }                         
  );

});

app.get('/login', function(req, res){
  //console.log(req);
  res.render('login', { user: req.user });
});

// GET /auth/twitter
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Twitter authentication will involve redirecting
//   the user to twitter.com.  After authorization, the Twitter will redirect
//   the user back to this application at /auth/twitter/callback
app.get('/auth/twitter',
  passport.authenticate('twitter'),
  function(req, res){
    // The request will be redirected to Twitter for authentication, so this
    // function will not be called.
  });

// GET /auth/twitter/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function(req, res) {
    
      db.collection('users', function(err, transCollection) {
        var user = req.user;
        //console.log(user);
        transCollection.update({_id: user.id}, {$set: user}, {upsert: true }, function(err, objects) {
          if (err) console.warn(err.message);

        });
      });
    res.redirect('/success');
  });

app.get('/success', function(req, res) {

  var user = req.user;
  res.render('success', {
    user: user
  });
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  //console.log(req);
  if (req.isAuthenticated()) { console.log("Success!");return next(); }
  res.redirect('/login')
}



app.all('*', function(req, res, next) {
       res.header("Access-Control-Allow-Origin", "*");
       res.header("Access-Control-Allow-Headers", "X-Requested-With");
       res.header('Access-Control-Allow-Headers', 'Content-Type');
       next();
});


app.get('/about', function(req, res) {
  res.render('about', {});
});

app.get('/channels', function(req, res) {


  res.contentType('json');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.send(JSON.stringify({
    channels: channels,
    source_names: source_names
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
          res.setHeader('Access-Control-Allow-Origin','*');
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
            res.setHeader('Access-Control-Allow-Origin','*');
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

          res.setHeader('Access-Control-Allow-Origin','*');
          res.render('call', {
            item: item,
            channel: channels[item.talkgroup],
            talkgroup: item.talkgroup,
            time: timeString,
            date: dateString,
            objectId: objectId,
            freq: item.freq,
            srcList: item.srcList,
            audioErrors: item.audioErrors,
            headerErrors: item.headerErrors,
            headerCriticalErrors: item.headerCriticalErrors,
            symbCount: item.symbCount,
            recNum: item.recNum
          });

        } else {
          res.send(404, 'Sorry, we cannot find that!');
        }
      });
  });
});

function get_calls(query, res) {

  var calls = [];
  console.log(util.inspect(query.filter));
  db.collection('transmissions', function(err, transCollection) {
    transCollection.find(query.filter).count(function(e, count) {
      transCollection.find(query.filter, function(err, cursor) {
        cursor.sort(query.sort_order).limit(numResults).each(function(err, item) {
          if (item) {
            call = {
              objectId: item._id,
              talkgroup: item.talkgroup,
              filename: item.path + item.name,
              time: item.time,
              freq: item.freq,
              srcList: item.srcList,
              stars: item.stars,
              len: Math.round(item.len)
            };
            calls.push(call);
          } else {
            res.contentType('json');
            res.setHeader('Access-Control-Allow-Origin','*');
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
    } else if (code.substring(0, 4) == 'src-') {
      src_num = parseInt(code.substring(4));
      filter = {
        srcList: src_num
      };
    } else if (code.substring(0, 6) == 'group-') {
          filter = {
            talkgroup: {
              $in: talkgroup_filters[code]
            }
          };
    } else {
      switch (code) {
        case 'tag-ops':
        case 'tag-ems':
        case 'tag-fire-dispatch':
        case 'tag-fire':
        case 'tag-hospital':
        case 'tag-interop':
        case 'tag-law-dispatch':
        case 'tag-public-works':
        case 'tag-public-health':
        case 'tag-paratransit':
        case 'tag-st-e':
        case 'tag-water':
        case 'tag-parks':
        case 'tag-parking':
        case 'tag-security':
         case 'tag-transportation':
         case 'tag-water':
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
        $gt: start
      };
    } else {
      filter.time = {
        $lt: start
      };
    }

  }
  filter.len = {
    $gte: -1.0
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

app.get('/calls/newer/:time', function(req, res) {
  var start_time = parseInt(req.params.time);
  var query = build_filter(null, start_time, 'newer', false);

  get_calls(query, res);
});

app.get('/calls/newer/:time/:filter_code', function(req, res) {
  var filter_code = req.params.filter_code;
  var start_time = parseInt(req.params.time);
  var query = build_filter(filter_code, start_time, 'newer', false);

  get_calls(query, res);
});

app.get('/calls/older/:time', function(req, res) {

  var start_time = parseInt(req.params.time);
  console.log("time: " + start_time );
  console.log(util.inspect(req.params));
  var query = build_filter(null, start_time, 'older', false);

  get_calls(query, res);
});
app.get('/calls/older/:time/:filter_code', function(req, res) {
  var filter_code = req.params.filter_code;
  var start_time = parseInt(req.params.time);
  console.log("time: " + start_time + " Filter code: " + filter_code);
  console.log(util.inspect(req.params));
  var query = build_filter(filter_code, start_time, 'older', false);

  get_calls(query, res);
});

app.get('/calls', function(req, res) {
  var filter_code = req.params.filter_code;
  var query = build_filter(null, null, 'older', false);

  get_calls(query, res);
});

app.get('/calls/:filter_code', function(req, res) {
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



app.get('/scanner/newer/:time', function(req, res) {

  var filter_date = parseInt(req.params.time);
  var user = req.user;




  if (!filter_date) {
    var filter_date = "''";
  } else {
    var filter_date = "new Date(" + filter_date + ")";
  }

  res.render('player', {
    filter_date: filter_date,
    filter_code: "",
    user: user
  });
});


app.get('/scanner/newer/:time/:filter_code', function(req, res) {
  var filter_code = req.params.filter_code;
  var filter_date = parseInt(req.params.time);
  var user = req.user;


  if (!filter_code) filter_code = "";

  if (!filter_date) {
    var filter_date = "''";
  } else {
    var filter_date = "new Date(" + filter_date + ")";
  }

  res.render('player', {
    filter_date: filter_date,
    filter_code: filter_code,
    user: user
  });
});


app.get('/scanner', function(req, res) {

  var filter_date = parseInt(req.params.time);
  var user = req.user;




  var filter_date = "''";


  res.render('player', {
    filter_date: filter_date,
    filter_code: "",
    user: user
  });
});

app.get('/scanner/:filter_code', function(req, res) {
  var filter_code = req.params.filter_code;
  var filter_date = parseInt(req.params.time);
  var user = req.user;

  if (!filter_code) filter_code = "";


  var filter_date = "''";


  res.render('player', {
    filter_date: filter_date,
    filter_code: filter_code,
    user: user
  });
});

/*
app.get('/beta', function(req, res) {
  var filter_code = "";
  var filter_date = "''";
  var user = req.user;
  res.render('beta', {
    filter_date: filter_date,
    filter_code: filter_code,
    user: user
  });
});*/

app.get('/', function(req, res) {
  var filter_code = "";
  var filter_date = "''";
  var user = req.user;
  res.render('player', {
    filter_date: filter_date,
    filter_code: filter_code,
    user: user
  });
});

app.post('/', function(req, res) {
  var filter_code = req.body.filter_code;
  if (!filter_code) filter_code = "";
  var filter_date = "new Date('" + req.body.filter_date + "');";
  if (!filter_date) filter_date = "\'\'";
  var user = req.user;
  res.render('player', {
    filter_date: filter_date,
    filter_code: filter_code,
    user: user
  });
});

app.get('/sources', function(req, res) {
  res.render('sources');
});

app.get('/afil', function(req, res) {
  res.render('afil', {});
});

app.get('/stats', function(req, res) {
  res.render('stats', {});
});
app.get('/volume', function(req, res) {
  res.contentType('json');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.send(JSON.stringify(stats));
});
app.get('/affiliation', function(req, res) {
  res.contentType('json');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.send(JSON.stringify(affiliations));
});
app.get('/source_list', function(req, res) {
  res.contentType('json');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.send(JSON.stringify(sources));
});

app.get('/call_info/:id', function(req, res) {
  var objectId = req.params.id;
  var o_id = new BSON.ObjectID(objectId);
  res.contentType('json');
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

          res.setHeader('Access-Control-Allow-Origin','*');
          res.send({
            item: item,
            channel: channels[item.talkgroup],
            talkgroup: item.talkgroup,
            time: timeString,
            date: dateString,
            objectId: objectId,
            freq: item.freq,
            srcList: item.srcList,
            audioErrors: item.audioErrors,
            headerErrors: item.headerErrors,
            headerCriticalErrors: item.headerCriticalErrors,
            symbCount: item.symbCount,
            recNum: item.recNum
          });

        } else {
          res.send(404, 'Sorry, we cannot find that!');
        }
      });
  });
});


app.get('/clients', function(req, res) {
  res.render('clients', {clients: clients});
});

function notify_clients(call) {
  call.type = "calls";
  console.log("New Call sending to " + clients.length + " clients");
  for (var i = 0; i < clients.length; i++) {
    //console.log(util.inspect(clients[i].socket));
    if (clients[i].code == "") {
      //console.log("Call TG # is set to All");
      console.log(" - Sending one");
      clients[i].socket.send(JSON.stringify(call));
    } else {
      if (typeof talkgroup_filters[clients[i].code] !== "undefined") {
        //console.log("Talkgroup filter found: " + clients[i].code);

        if (talkgroup_filters[clients[i].code].indexOf(call.talkgroup) > -1) {
          //console.log("Call TG # Found in filer");
          console.log(" - Sending one filter");
          clients[i].socket.send(JSON.stringify(call));
        }
      }
    }
  }
}
watch.createMonitor('/home/luke/smartnet-upload', function(monitor) {
  monitor.files['*.m4a'];
  //monitor.files['*.wav'];


  monitor.on("created", function(f, stat) {

    if ((path.extname(f) == '.json') && (monitor.files[f] === undefined))  {
      var name = path.basename(f, '.json');
      var regex = /([0-9]*)-unit_check/
      var result = name.match(regex);
      if (result!=null) 
      {
        console.log("Unit Check: " + f);
        fs.readFile(f, 'utf8', function (err, data) {
          console.log("Error: " + err);

            if (!err) {
              try {
              data = JSON.parse(data);
              } catch (e) {
                // An error has occured, handle it, by e.g. logging it
                data.talkgroups = {};
                console.log(e);
              }
              console.log("Data: " + util.inspect(data));
              db.collection('affiliation', function(err, affilCollection) {

                for (talkgroup in data.talkgroups) {
                  var affilItem = {
                    tg: talkgroup,
                    count: data.talkgroups[talkgroup],
                    date: new Date()
                  };
                
                    affilCollection.insert(affilItem, function(err, objects) {
                      if (err) console.warn(err.message);
                      
                    });
                }
              });
              
            }
        });
      }
    }
    if ((path.extname(f) == '.m4a') && (monitor.files[f] === undefined)) {
      var name = path.basename(f, '.m4a');
    /*if ((path.extname(f) == '.wav') && (monitor.files[f] === undefined)) {
      var name = path.basename(f, '.wav');*/
      var regex = /([0-9]*)-([0-9]*)_([0-9.]*)/
      var result = name.match(regex);
      //console.log(name);
      //console.log(util.inspect(result));
      if (result!=null) 
      {
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
        var json_file = path.dirname(f) + "/" + name + ".json";
        fs.readFile(json_file, 'utf8', function (err, data) {
          if (err) {
            console.log('JSON Error: ' + err);
                          console.log("Base: " + base_path + " Local: " + local_path + " Basename: " + path.basename(f));
              console.log("F Path: " + path.dirname(f));
                var srcList = [];
                var headerCriticalErrors = 0;
                var headerErrors = 0;
                var audioErrors = 0;
                var symbCount = 0;
                var srcList = 0;
                var recNum = 0;            
          } else {
                 data = JSON.parse(data);
                var srcList = data.srcList;
                var headerCriticalErrors = data.headerCriticalErrors;
                var headerErrors = data.headerErrors;
                var audioErrors = data.audioErrors;
                var symbCount = data.symbCount;
                var srcList = data.srcList;
                var recNum = data.num;
                fs.unlink(json_file, function (err) {
                if (err) 
                console.log('JSON Delete Error: ' + err + " JSON: " + json_file);
              });
          }
         
          
          fs.rename(f, target_file, function(err) {
            if (err) {
              console.log("Rename Error: " + err);
              console.log("Base: " + base_path + " Local: " + local_path + " Basename: " + path.basename(f));
              console.log("F Path: " + path.dirname(f));
              //throw err;
  
            } else {
            
            probe(target_file, function(err, probeData) {

              transItem = {
                talkgroup: tg,
                time: time,
                name: path.basename(f),
                freq: freq,
                stars: 0,
                path: local_path,
                srcList: srcList,
                headerCriticalErrors: headerCriticalErrors,
                headerErrors: headerErrors,
                audioErrors: audioErrors,
                symbCount: symbCount,
                srcList: srcList,
                recNum: recNum
              };
              //transItem.len = reader.chunkSize / reader.byteRate;

              if (err) {
                console.log("Error with FFProbe: " + err);
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
                    len: Math.round(transItem.len)
                  };

                  // we only want to notify clients if the clip is longer than 1 second.
                  if (transItem.len >= 1) {
                    notify_clients(call);
                  }
                });
              });
           });
            }
          });
        });
      }
    }
  });
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log(('Rejected: ' + new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    } else {
      console.log(('Accepted: ' + new Date()) + ' Connection from origin ' + request.origin + ' rejected.'); 
    }

    var connection = request.accept(null, request.origin);
    var client = {
      socket: connection,
      code: null
    };
    clients.push(client);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
          var data = JSON.parse(message.utf8Data);
          if (typeof data.type !== "undefined") {
            if (data.type == 'code') {
              var index = clients.indexOf(client);
              if (index != -1) {
                clients[index].code = data.code;
                console.log("Client " + index + " code set to: " + data.code);
              } else {
                console.log("Client not Found!");
              }
            }


          }
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        for(var i = 0; i < clients.length; i++) {
          // # Remove from our connections list so we don't send
          // # to a dead socket
          if(clients[i].socket == connection) {
            clients.splice(i);
            break;
          }
        }
    });
});



schedule.scheduleJob({
  minute: 0
}, function() {
  build_unit_affiliation();
});


schedule.scheduleJob({
  minute: new schedule.Range(0, 59, 5)
}, function() {
  build_call_volume();
});

schedule.scheduleJob({
  minute: 30,
  hour: 1
}, function() {
  build_source_list();
});


server.listen(3004);
db = db.getMongo().getDB("scanner"); 
db.auth("scanner","vcW6rEixic3kdBWj"); 

map = function() {
    //hour = this.time.getHours();
    var difference = now.getTime() - this.time.getTime();
    var hour =  Math.floor(difference/1000/60/60);

    print(hour + " " + difference + " " + this.talkgroup);
    emit({hour: hour, talkgroup: this.talkgroup}, {count: 1});
}

reduce = function(key, values) {
  var count = 0;

  values.forEach(function(v) {
    count += v['count'];
  });

  return {count: count};
}
yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
db.transmissions.mapReduce(map, reduce, {query:{ time: {$gte: yesterday}},out: "call_volume"});
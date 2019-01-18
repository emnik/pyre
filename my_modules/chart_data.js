var sqlite = require('../my_modules/sqliteAsync')


async function get_graph_data (req) {
    // this function is used when I need to update the graph data
    var interval
    var labels = []
    var temps = []
    var sql = ""
    graph_data = {}
  
    if (req.body.sensor === 'undefined' || req.body.sensor == null) {
      throw new ReferenceError(req.body)
    } 

    var selected_sensors = req.body.sensor
    var duration = ((req.body.duration !== 'undefined' && req.body.duration !== null) ? req.body.duration : '1') // in hours
  

    if (duration <= 24) {

      if (duration === 1) {
        interval = 120
      } else {
        interval = duration * 150
      }
      
      // axisX = time
      sql = "SELECT " +
        // "datetime((timestamp/1000)/"+interval+"*"+interval+", 'unixepoch', 'localtime') as localtime, " +
        // "date((timestamp/1000)/"+interval+"*"+interval+", 'unixepoch', 'localtime') as date, " +
        "strftime('%H:%M', (timestamp/1000)/"+interval+"*"+interval+", 'unixepoch', 'localtime') as axisX, " +
        'ROUND(avg(value),2) as temp, ' +
        'sensor_id '+
        'FROM sensor_data ' +
        "WHERE timestamp/1000 >= ((strftime('%s', 'now') - strftime('%S', 'now') + strftime('%f', 'now'))-3600*"+duration+") " +
        'AND sensor_id IN (' + selected_sensors + ') ' +
        'GROUP BY axisX, sensor_id ' +
        'ORDER BY axisX ASC, sensor_id ASC;'
  
    } else {
        
      interval = 24 * 3600;
  
      // axisX = date
      sql = 'SELECT date as axisX, ' +
        'ROUND(avg(value),2) as temp, ' +
        'sensor_id ' +
        'FROM sensor_history ' +
        "WHERE date >= date('now', '-" + (duration/24) +" day') " +
        'AND sensor_id IN (' + selected_sensors + ') ' +
        'GROUP BY axisX, sensor_id ' +
        'ORDER BY axisX ASC, sensor_id ASC;'
    }
 

    var sensorData = await sqlite.allAsync(sql);
    // console.log(sensorData)

    var sensorsSQL = 'SELECT * from sensors WHERE id IN (' + selected_sensors + ') ORDER BY id ASC;';
    var sensors = await sqlite.allAsync(sensorsSQL);
    // console.log(sensors)


return new Promise(function(resolve, reject){ 
  try {
    var prioritySum=0;
    for (var j=0; j<sensors.length; j++){
      prioritySum += sensors[j].priority
    }

    // console.log(sensorData.length)

    var k=0;
    var counter = sensorData.length;
    // console.log('counter='+counter);
    while (k<counter){
      
        var avgtemp=0;
        var x = sensorData[k].axisX;
        var legit=true;
        var i=0;
        while (i<sensors.length){
          // console.log("k="+k)
          if (sensorData[k]!=undefined && sensorData[k].axisX==x){
            // console.log("x="+x)
            avgtemp += sensorData[k].temp*sensors[i].priority
          }
          else {
            legit=false;
            counter--;
            break;
          }
          i++;
          k++;
        }
        // console.log(k)
    
        if (legit){
          labels.push(x);
          temps.push(Math.round(avgtemp/prioritySum*100)/100);
        }
      
    }

    resolve({status:'success', data:{labels:labels, temps:temps}})
    // return {status:'success', data:{labels:labels, temps:temps}};
  }
  catch (err) {
    console.error(err);
    reject({status:'error'});
    // return {status:'error'};
  }
})

}

module.exports.get_graph_data = get_graph_data
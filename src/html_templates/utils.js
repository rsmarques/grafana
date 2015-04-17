//Object Handling Utils
function is_object(mixed_var) {
  if (Object.prototype.toString.call(mixed_var) === '[object Array]') {
    return false;
  }
  return mixed_var !== null && typeof mixed_var == 'object';
}

function merge(a, b, operator) {

  var cache = {};
  cache = unpackObject(a, cache, operator);
  cache = unpackObject(b, cache, operator);

  return cache;
}

function unpackObject(a, cache, operator) {
  for (prop in a) {
    if (a.hasOwnProperty(prop)) {
      if (cache[prop] === undefined) {
        cache[prop] = a[prop];
      } else {
        if (typeof cache[prop] === typeof a[prop]) {
          if (is_object(a[prop])) {
            cache[prop] = merge(cache[prop], a[prop]);
          } else {
            eval('cache[prop] ' + operator + '= a[prop]');
          }
        }
      }
    }
  }
  return cache;
}

//InfluxDb Utils
function getInfluxDbData(query, datasource, settings){

  var username    = settings.datasources[datasource].username;
  var password    = settings.datasources[datasource].password;
  var url         = settings.datasources[datasource].url;

  var getUrl      = url + '/series?q=' + query + '&u=' + username + '&p=' + password;
  var result;

  $.ajax({

    url: getUrl,
    async: false,  
    success: function (data) {
      result = arrangeInfluxDbData(data);
    }
  });

  return result;
}

function arrangeInfluxDbData(data) {

  data = data[0];

  if (data && data['points'] !== undefined && data['columns'] !== undefined) {
    points   = data['points'];
    columns  = data['columns'];

    result = _.map(points, function(value, key){
      var obj = {};

      for (var i = 0; i < value.length; i++){
        obj[columns[i]] = value[i];
      }

      return obj;
    });

    return result;
  }
  else return [];
}

function groupByKey(array, key){

  // [] or {} ??? To think
  var obj = {};

  for (var i = 0; i < array.length; i++){

    var point     = array[i];
    var value     = point[key];
    // if (!obj[keyValue]){
    //   obj[keyValue] = [];
    // }
    obj[value]    = point;
  }

  return obj;

}

function createQuery(table, select, where, groupBy){

  var query = "select ";

  query += select ? select + " " : "* ";
  query += " from " + table + " ";

  // If query has conditions a where clause is built
  if (where.length > 0) {
    query += " where ";
    for (var i = 0; i < where.length; i++) {
      query += i == 0 ? where[i] + " " : "and " + where[i] + " ";
    }
  }
  if (groupBy) query += " group by " + groupBy;

  return query;

}

//groups data by an array of timestamps
function groupByTime(dates, data, key){

  var obj       = {};
  var dataIndex = 0;

  for (var i = 0; i < dates.length; i++){
    var d = [];
    startDate = dates[i].date;
    endDate   = i == dates.length - 1 ? new Date() : dates[i+1].date;

    while (dataIndex < data.length && new Date(data[dataIndex].time) < endDate){
      if (new Date(data[dataIndex].time) < startDate) {
        dataIndex++;
        continue;
      }

      var value = data[dataIndex][key];
      if (d.indexOf(value) == -1) d.push(value);
      dataIndex++;
    }

    obj[dates[i].str] = d;
  }

  return obj;

}

//Datetime Utils
function getMonday(d) {

  d = new Date(d);
  var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1);
  return new Date(d.setDate(diff));
}

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

function datesBetween(timespan, startDate, endDate){

  var dates   = [];
  var end     = typeof endDate !== "undefined" ? new Date(endDate) : new Date();
  var current = new Date(startDate);

  if (timespan == 'm') current.setDate(1);
  else if (timespan == 'w') current = getMonday(startDate);

  while (current < end) {

    dates.push({'date' : new Date(current), 'str' : formatDate(current)}); 
    switch(timespan) {
      case 'd':
        current.setDate(current.getDate()+1);
        break;
      case 'w':
        current.setDate(current.getDate()+7);
        break;
      case 'm':
        current.setMonth(current.getMonth() + 1, 1);
        break;
      default:
        current.setDate(current.getDate()+7);
    }
  }

  return dates;
}

function dateDiffInDays(a, b) {
  var _MS_PER_DAY = 1000 * 60 * 60 * 24;

  // Discard the time and time-zone information.
  var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function getMonthNames(){
  var monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

  return monthNames;
}

//Style functions
function addTimeSpan(str){
  return '<br><span class="timespan">' + str + '</span>';
}

function updateProgressBar(id, value){
  document.getElementById(id).value = value;
}

function setScorecardColor(docId, realized, logic, objective){

  if (eval(realized + logic + objective)){
    document.getElementById(docId).style.backgroundColor = "green";
  }
  else if (eval(realized + logic + objective * 0.8)){
    document.getElementById(docId).style.backgroundColor = "yellow";
  }
  else{
    document.getElementById(docId).style.backgroundColor = "red";
  }
}

function insertBlankCells(rowArray){

  for (var i = 0; i < rowArray.length; i++) {
    var row       = rowArray[i];
    var blankCell = row.insertCell(-1);
    
    blankCell.style.borderBottom = "hidden";
    blankCell.style.borderTop    = "hidden";
  }
}

//Simple funtion utils
function performance(a, b){

  return (a/b * 100).toFixed(1);
}

function sum(array){
  return array.reduce(function(a, b) { return a + b });
}

function average(array){

  var total = 0;

  for(var i = 0; i < array.length; i++) {
      total += array[i];
  }

  return (total/array.length);
}

function intersect(array1, array2) {
  return array1.filter(function(n) {
    return array2.indexOf(n) != -1
  });
}

function occurrences(array){

  var occs = {};

  for(var i = 0; i< array.length; i++) {
      var n   = array[i];
      occs[n] = occs[n] ? occs[n] + 1 : 1;
  }
  return occs;
}
